"""Rotas de persistência, histórico e cópias de segurança."""
from pathlib import Path
from typing import Any, Literal
import io
import json
import tempfile
import zipfile
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from storage import Conflict, now

router = APIRouter(prefix='/api')
Kind = Literal['preset', 'custom', 'group']


class Document(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    data: dict[str, Any]
    revision: int | None = None


class Config(BaseModel):
    config: dict[str, Any]
    revision: int = Field(ge=0)


class BrowserImport(BaseModel):
    active: dict[str, Any] | None = None
    presets: dict[str, dict[str, Any]] = Field(default_factory=dict)
    custom: dict[str, dict[str, Any]] = Field(default_factory=dict)


@router.get('/config/carregar')
def load_config(request: Request):
    item = request.app.state.store.get('config')
    return {'ok': True, 'config': item['data'] if item else None, 'revision': item['revision'] if item else 0}


@router.post('/config/salvar')
def save_config(payload: Config, request: Request):
    try:
        revision = request.app.state.store.save('config', 'active', payload.config, payload.revision)
        return {'ok': True, 'revision': revision}
    except Conflict as exc:
        raise HTTPException(409, str(exc)) from exc


@router.post('/persistencia/importar')
def import_browser(payload: BrowserImport, request: Request):
    request.app.state.store.import_browser(payload.model_dump())
    return {'ok': True}


@router.get('/biblioteca/{kind}')
def library(kind: Kind, request: Request):
    return {'ok': True, 'items': request.app.state.store.library(kind)}


@router.post('/biblioteca/{kind}')
def save_document(kind: Kind, payload: Document, request: Request):
    if not payload.name.strip():
        raise HTTPException(422, 'Informe um nome.')
    try:
        revision = request.app.state.store.save(kind, payload.name.strip(), payload.data, payload.revision)
        return {'ok': True, 'revision': revision}
    except Conflict as exc:
        raise HTTPException(409, str(exc)) from exc


@router.delete('/biblioteca/{kind}')
def delete_document(kind: Kind, name: str, request: Request):
    request.app.state.store.delete(kind, name)
    return {'ok': True}


@router.get('/config/versoes')
def versions(request: Request):
    with request.app.state.store.connect() as db:
        rows = db.execute("SELECT revision,created_at FROM document_versions WHERE kind='config' AND name='active' ORDER BY revision DESC LIMIT 100").fetchall()
    return {'ok': True, 'items': [dict(row) for row in rows]}


@router.get('/config/versoes/{revision}')
def version(revision: int, request: Request):
    with request.app.state.store.connect() as db:
        row = db.execute("SELECT data FROM document_versions WHERE kind='config' AND name='active' AND revision=?", (revision,)).fetchone()
    if not row:
        raise HTTPException(404, 'Versão não encontrada.')
    return {'ok': True, 'config': json.loads(row['data'])}


@router.get('/lotes')
def history(request: Request):
    return {'ok': True, 'items': request.app.state.batches.list()}


@router.get('/lotes/{batch_id}')
def detail(batch_id: str, request: Request):
    try:
        return {'ok': True, 'lote': request.app.state.batches.get(batch_id)}
    except KeyError as exc:
        raise HTTPException(404, 'Lote não encontrado.') from exc


@router.post('/lotes/{batch_id}/retomar', status_code=202)
def resume(batch_id: str, request: Request):
    try:
        request.app.state.batches.resume(batch_id)
        return {'ok': True, 'lote_id': batch_id}
    except KeyError as exc:
        raise HTTPException(404, 'Lote não encontrado.') from exc
    except Conflict as exc:
        raise HTTPException(409, str(exc)) from exc


def zip_response(buffer, name):
    buffer.seek(0)
    return StreamingResponse(buffer, media_type='application/zip', headers={'Content-Disposition': f'attachment; filename="{name}"'})


@router.get('/lotes/{batch_id}/zip')
def download_batch(batch_id: str, request: Request):
    try:
        files = request.app.state.batches.files(batch_id)
    except KeyError as exc:
        raise HTTPException(404, 'Lote não encontrado.') from exc
    if not files:
        raise HTTPException(404, 'Nenhum arquivo íntegro disponível. Retome o lote para gerar os arquivos.')
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, 'w', zipfile.ZIP_DEFLATED) as archive:
        for path in files:
            archive.write(path, path.name)
    return zip_response(buffer, f'certificados_{batch_id}.zip')


@router.get('/backup')
def backup(request: Request):
    service = request.app.state.batches
    # Do not archive half-written conversion files.
    if not service.lock.acquire(blocking=False):
        raise HTTPException(409, 'Aguarde o lote terminar para baixar uma cópia de segurança.')
    try:
        buffer = io.BytesIO()
        with tempfile.TemporaryDirectory() as temporary:
            snapshot = Path(temporary) / 'certificaflow.sqlite3'
            request.app.state.store.backup(snapshot)
            with zipfile.ZipFile(buffer, 'w', zipfile.ZIP_DEFLATED) as archive:
                archive.write(snapshot, 'dados/certificaflow.sqlite3')
                for folder in request.app.state.backup_folders:
                    for path in folder.rglob('*'):
                        if path.is_file() and not path.is_symlink():
                            archive.write(path, str(Path(folder.name) / path.relative_to(folder)))
                archive.writestr('backup.json', json.dumps({'version': 1, 'created_at': now()}, indent=2))
        return zip_response(buffer, 'certificaflow_backup.zip')
    finally:
        service.lock.release()
