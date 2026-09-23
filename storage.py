"""SQLite local: transações curtas, revisões e importação não destrutiva."""
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
import hashlib
import json
import sqlite3


def now():
    return datetime.now(timezone.utc).isoformat()


def encode(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True, default=str)


class Conflict(ValueError):
    pass


class Store:
    def __init__(self, path):
        self.path = Path(path)

    @contextmanager
    def connect(self):
        db = sqlite3.connect(self.path, timeout=30)
        db.row_factory = sqlite3.Row
        db.execute('PRAGMA foreign_keys=ON')
        db.execute('PRAGMA synchronous=FULL')
        try:
            with db:
                yield db
        finally:
            db.close()

    def initialize(self, legacy=None):
        self.path.parent.mkdir(parents=True, exist_ok=True)
        with self.connect() as db:
            db.execute('PRAGMA journal_mode=WAL')
            version = db.execute('PRAGMA user_version').fetchone()[0]
            if version > 1:
                raise RuntimeError('Banco criado por uma versão mais recente da aplicação.')
            db.executescript('''
                CREATE TABLE IF NOT EXISTS documents (
                    kind TEXT NOT NULL, name TEXT NOT NULL, revision INTEGER NOT NULL,
                    data TEXT NOT NULL, updated_at TEXT NOT NULL, PRIMARY KEY(kind,name));
                CREATE TABLE IF NOT EXISTS document_versions (
                    kind TEXT NOT NULL, name TEXT NOT NULL, revision INTEGER NOT NULL,
                    data TEXT NOT NULL, created_at TEXT NOT NULL,
                    PRIMARY KEY(kind,name,revision));
                CREATE TABLE IF NOT EXISTS imports (digest TEXT PRIMARY KEY, created_at TEXT NOT NULL);
                CREATE TABLE IF NOT EXISTS batches (
                    id TEXT PRIMARY KEY, request_id TEXT NOT NULL UNIQUE,
                    name TEXT NOT NULL, model_name TEXT NOT NULL, model BLOB NOT NULL,
                    config TEXT NOT NULL, pdf INTEGER NOT NULL,
                    status TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
                    error TEXT);
                CREATE TABLE IF NOT EXISTS batch_items (
                    batch_id TEXT NOT NULL REFERENCES batches(id), position INTEGER NOT NULL,
                    data TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pendente',
                    attempts INTEGER NOT NULL DEFAULT 0, docx TEXT, pdf TEXT,
                    docx_hash TEXT, pdf_hash TEXT, error TEXT,
                    PRIMARY KEY(batch_id,position));
                CREATE TABLE IF NOT EXISTS attempts (
                    id INTEGER PRIMARY KEY, batch_id TEXT NOT NULL, position INTEGER NOT NULL,
                    started_at TEXT NOT NULL, finished_at TEXT, status TEXT NOT NULL, error TEXT,
                    FOREIGN KEY(batch_id,position) REFERENCES batch_items(batch_id,position));
                PRAGMA user_version=1;
            ''')
        if legacy and Path(legacy).exists():
            # Keep the source file untouched, including on invalid JSON.
            raw = Path(legacy).read_text(encoding='utf-8-sig')
            try:
                data = json.loads(raw)
                if not isinstance(data, dict):
                    raise ValueError('A configuração antiga não é um objeto JSON.')
                self.import_browser({'active': data}, source='arquivo-json')
            except (ValueError, TypeError) as exc:
                raise RuntimeError(f'Não foi possível importar {legacy}: {exc}. O original foi preservado.') from exc

    def get(self, kind, name='active'):
        with self.connect() as db:
            row = db.execute('SELECT * FROM documents WHERE kind=? AND name=?', (kind, name)).fetchone()
        return {**dict(row), 'data': json.loads(row['data'])} if row else None

    def library(self, kind):
        with self.connect() as db:
            rows = db.execute('SELECT * FROM documents WHERE kind=? ORDER BY name', (kind,)).fetchall()
        return [{**dict(row), 'data': json.loads(row['data'])} for row in rows]

    @staticmethod
    def _save(db, kind, name, data, revision=None):
        row = db.execute('SELECT revision FROM documents WHERE kind=? AND name=?', (kind, name)).fetchone()
        current = row['revision'] if row else 0
        if revision is not None and revision != current:
            raise Conflict('Os dados foram alterados em outra aba. Recarregue antes de salvar; seu rascunho foi mantido no navegador.')
        last = db.execute('SELECT COALESCE(MAX(revision),0) FROM document_versions WHERE kind=? AND name=?', (kind, name)).fetchone()[0]
        number, stamp, payload = last + 1, now(), encode(data)
        db.execute('INSERT INTO document_versions VALUES (?,?,?,?,?)', (kind, name, number, payload, stamp))
        db.execute('INSERT OR REPLACE INTO documents VALUES (?,?,?,?,?)', (kind, name, number, payload, stamp))
        return number

    def save(self, kind, name, data, revision=None):
        with self.connect() as db:
            db.execute('BEGIN IMMEDIATE')
            return self._save(db, kind, name, data, revision)

    def delete(self, kind, name):
        # Retain versions; future recreation continues the revision sequence.
        with self.connect() as db:
            db.execute('BEGIN IMMEDIATE')
            db.execute('DELETE FROM documents WHERE kind=? AND name=?', (kind, name))

    def import_browser(self, payload, source='navegador'):
        digest = hashlib.sha256((source + encode(payload)).encode()).hexdigest()
        with self.connect() as db:
            db.execute('BEGIN IMMEDIATE')
            if db.execute('SELECT 1 FROM imports WHERE digest=?', (digest,)).fetchone():
                return
            for kind, key in [('preset', 'presets'), ('custom', 'custom')]:
                for name, value in payload.get(key, {}).items():
                    existing = db.execute('SELECT data FROM documents WHERE kind=? AND name=?', (kind, name)).fetchone()
                    if existing and existing['data'] == encode(value):
                        continue
                    if existing:
                        name = f'{name} (importado {digest[:10]})'
                    self._save(db, kind, name, value)
            active = payload.get('active')
            if isinstance(active, dict) and active:
                existing = db.execute("SELECT data FROM documents WHERE kind='config' AND name='active'").fetchone()
                if not existing:
                    self._save(db, 'config', 'active', active)
                elif existing['data'] != encode(active):
                    self._save(db, 'preset', f'Recuperado de {source} {digest[:10]}', active)
            db.execute('INSERT INTO imports VALUES (?,?)', (digest, now()))

    def backup(self, target):
        with self.connect() as source:
            destination = sqlite3.connect(target)
            try:
                source.backup(destination)
            finally:
                destination.close()
