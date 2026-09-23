"""Fila local persistente. Um executor serializa a conversão pelo Word."""
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import hashlib
import json
import os
import threading
import uuid
import zipfile

from storage import encode, now, Conflict
from gerar_certificados import gerar_certificado_docx, converter_para_pdf, normalizar_nome_arquivo


def checksum(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


class Batches:
    def __init__(self, store, output, render=gerar_certificado_docx, convert=converter_para_pdf):
        self.store, self.output = store, Path(output)
        self.render, self.convert = render, convert
        self.lock = threading.RLock()
        self.executor = None
        self.stopping = threading.Event()
        self.process_lock = None

    def start(self):
        # Prevent two server processes from recovering/executing the same queue.
        path = self.store.path.with_suffix('.lock')
        path.parent.mkdir(parents=True, exist_ok=True)
        self.process_lock = open(path, 'a+b')
        self.process_lock.seek(0)
        self.process_lock.write(b'0')
        self.process_lock.flush()
        self.process_lock.seek(0)
        try:
            if os.name == 'nt':
                import msvcrt
                msvcrt.locking(self.process_lock.fileno(), msvcrt.LK_NBLCK, 1)
            else:
                import fcntl
                fcntl.flock(self.process_lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except OSError as exc:
            self.process_lock.close()
            raise RuntimeError('Já existe uma instância usando este banco. Use apenas um processo do servidor.') from exc
        with self.store.connect() as db:
            db.execute("UPDATE batches SET status='interrompido', updated_at=? WHERE status IN ('fila','processando')", (now(),))
            db.execute("UPDATE batch_items SET status='pendente' WHERE status='processando'")
            db.execute("UPDATE attempts SET status='interrompido', finished_at=? WHERE finished_at IS NULL", (now(),))
        self.stopping.clear()
        self.executor = ThreadPoolExecutor(max_workers=1, thread_name_prefix='certificados')

    def close(self):
        self.stopping.set()
        if self.executor:
            self.executor.shutdown(wait=True)
        if self.process_lock:
            self.process_lock.close()

    def create(self, model, participants, pdf, config, name, request_id, model_name=None):
        model_bytes = Path(model).read_bytes()
        with zipfile.ZipFile(Path(model)) as doc:
            if 'word/document.xml' not in doc.namelist():
                raise ValueError('Modelo Word inválido.')
        batch_id, stamp = uuid.uuid4().hex, now()
        with self.store.connect() as db:
            db.execute('BEGIN IMMEDIATE')
            existing = db.execute('SELECT id FROM batches WHERE request_id=?', (request_id,)).fetchone()
            if existing:
                return existing['id']
            db.execute('INSERT INTO batches VALUES (?,?,?,?,?,?,?,?,?,?,?)',
                       (batch_id, request_id, name, model_name or Path(model).name, model_bytes,
                        encode(config), int(pdf), 'fila', stamp, stamp, None))
            db.executemany('INSERT INTO batch_items(batch_id,position,data) VALUES (?,?,?)',
                           [(batch_id, n, encode(data)) for n, data in enumerate(participants, 1)])
        self.executor.submit(self.run, batch_id)
        return batch_id

    def get(self, batch_id):
        with self.store.connect() as db:
            batch = db.execute('SELECT id,name,model_name,pdf,status,created_at,updated_at,error FROM batches WHERE id=?', (batch_id,)).fetchone()
            if not batch:
                raise KeyError(batch_id)
            rows = db.execute('SELECT * FROM batch_items WHERE batch_id=? ORDER BY position', (batch_id,)).fetchall()
            attempts = db.execute('SELECT * FROM attempts WHERE batch_id=? ORDER BY id', (batch_id,)).fetchall()
        items = [{**dict(row), 'data': json.loads(row['data'])} for row in rows]
        return {**dict(batch), 'items': items, 'attempts': [dict(a) for a in attempts], 'total': len(items),
                'successes': sum(i['status'] == 'sucesso' for i in items),
                'failures': sum(i['status'] == 'erro' for i in items)}

    def list(self):
        with self.store.connect() as db:
            rows = db.execute('''SELECT b.id,b.name,b.model_name,b.status,b.created_at,b.error,
                COUNT(i.position) AS total,
                SUM(CASE WHEN i.status='sucesso' THEN 1 ELSE 0 END) AS successes,
                SUM(CASE WHEN i.status='erro' THEN 1 ELSE 0 END) AS failures
                FROM batches b LEFT JOIN batch_items i ON i.batch_id=b.id
                GROUP BY b.id ORDER BY b.created_at DESC LIMIT 200''').fetchall()
        return [dict(row) for row in rows]

    def resume(self, batch_id):
        with self.store.connect() as db:
            db.execute('BEGIN IMMEDIATE')
            row = db.execute('SELECT status FROM batches WHERE id=?', (batch_id,)).fetchone()
            if not row:
                raise KeyError(batch_id)
            if row['status'] in ('fila', 'processando'):
                raise Conflict('Este lote já está em processamento.')
            db.execute("UPDATE batches SET status='fila',error=NULL,updated_at=? WHERE id=?", (now(), batch_id))
        self.executor.submit(self.run, batch_id)

    def valid(self, folder, name, digest):
        if not name or not digest:
            return False
        path = folder / name
        return path.is_file() and checksum(path) == digest

    def run(self, batch_id):
        # Files + backup use the same lock; SQL transactions never cover conversion.
        with self.lock:
            try:
                with self.store.connect() as db:
                    batch = db.execute('SELECT * FROM batches WHERE id=?', (batch_id,)).fetchone()
                    db.execute("UPDATE batches SET status='processando',updated_at=? WHERE id=?", (now(), batch_id))
                folder = self.output / batch_id
                folder.mkdir(parents=True, exist_ok=True)
                model = folder / '_modelo.docx'
                model.write_bytes(batch['model'])
                for item in self.get(batch_id)['items']:
                    if self.stopping.is_set():
                        break
                    if item['status'] == 'sucesso' and self.valid(folder, item['docx'], item['docx_hash']) and (not batch['pdf'] or self.valid(folder, item['pdf'], item['pdf_hash'])):
                        continue
                    self.run_item(batch, item, folder, model)
                status = 'interrompido' if self.stopping.is_set() else ('com_erros' if self.get(batch_id)['failures'] else 'concluido')
                with self.store.connect() as db:
                    db.execute('UPDATE batches SET status=?,updated_at=? WHERE id=?', (status, now(), batch_id))
            except Exception as exc:
                with self.store.connect() as db:
                    db.execute("UPDATE batches SET status='interrompido',error=?,updated_at=? WHERE id=?", (str(exc), now(), batch_id))

    def run_item(self, batch, item, folder, model):
        ident = (batch['id'], item['position'])
        with self.store.connect() as db:
            db.execute("UPDATE batch_items SET status='processando',attempts=attempts+1,error=NULL WHERE batch_id=? AND position=?", ident)
            attempt = db.execute('INSERT INTO attempts(batch_id,position,started_at,status) VALUES (?,?,?,?)', (*ident, now(), 'processando')).lastrowid
        docx_name, docx_hash, pdf_name, pdf_hash = item['docx'], item['docx_hash'], None, None
        error = None
        try:
            data = dict(item['data'])
            name = str(data.get('NOME') or '').strip()
            if not name:
                raise ValueError('Campo NOME está vazio.')
            filename = f"{item['position']:05d}_{normalizar_nome_arquivo(name)[:100]}"
            target = folder / (filename + '.docx')
            if not self.valid(folder, docx_name, docx_hash):
                temporary = folder / (filename + '.tmp.docx')
                self.render(model, data, temporary)
                with zipfile.ZipFile(temporary) as document:
                    if document.testzip() or 'word/document.xml' not in document.namelist():
                        raise ValueError('Documento gerado inválido.')
                temporary.replace(target)
                docx_name, docx_hash = target.name, checksum(target)
                with self.store.connect() as db:
                    db.execute('UPDATE batch_items SET docx=?,docx_hash=? WHERE batch_id=? AND position=?', (docx_name, docx_hash, *ident))
            if batch['pdf']:
                # Isolated staging folder prevents a stale PDF being mistaken for success.
                import tempfile
                import shutil
                with tempfile.TemporaryDirectory(dir=folder, prefix='_pdf_') as staging:
                    staged = Path(staging) / target.name
                    shutil.copy2(target, staged)
                    com = None
                    if os.name == 'nt':
                        try:
                            import pythoncom
                            pythoncom.CoInitialize()
                            com = pythoncom
                        except ImportError:
                            pass
                    try:
                        converted = self.convert(staged)
                    finally:
                        if com:
                            com.CoUninitialize()
                    if not converted or not Path(converted).is_file() or not Path(converted).read_bytes().startswith(b'%PDF-'):
                        raise RuntimeError('Falha na conversão PDF. Verifique Word ou LibreOffice e tente novamente. O DOCX foi preservado.')
                    pdf = target.with_suffix('.pdf')
                    Path(converted).replace(pdf)
                    pdf_name, pdf_hash = pdf.name, checksum(pdf)
        except Exception as exc:
            error = str(exc)
        status = 'erro' if error else 'sucesso'
        with self.store.connect() as db:
            db.execute('UPDATE batch_items SET status=?,docx=?,docx_hash=?,pdf=?,pdf_hash=?,error=? WHERE batch_id=? AND position=?',
                       (status, docx_name, docx_hash, pdf_name, pdf_hash, error, *ident))
            db.execute('UPDATE attempts SET status=?,error=?,finished_at=? WHERE id=?', (status, error, now(), attempt))
            db.execute('UPDATE batches SET updated_at=? WHERE id=?', (now(), batch['id']))

    def files(self, batch_id):
        batch = self.get(batch_id)
        folder = self.output / batch_id
        return [folder / item[key] for item in batch['items'] for key in ('docx', 'pdf')
                if self.valid(folder, item[key], item[key + '_hash'])]
