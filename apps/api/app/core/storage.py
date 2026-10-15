"""Storage service interface and CSV sanitization utilities (LGPD & Security)."""

from __future__ import annotations

import os
import re
import uuid
from pathlib import Path
from typing import Protocol

# ---------------------------------------------------------------------------
# Proteção contra CSV Injection
# ---------------------------------------------------------------------------

CSV_INJECTION_CHARS = ("=", "+", "-", "@", "\t", "\r")


def sanitize_csv_cell(value: str | None) -> str:
    """
    Higieniza células de texto ao exportar planilhas/CSVs para impedir CSV Injection.
    Se a célula iniciar com =, +, -, @ ou caracteres de controle, prefixa com apóstrofo (').
    """
    if value is None:
        return ""
    text = str(value).strip()
    if not text:
        return ""
    if text.startswith(CSV_INJECTION_CHARS):
        return f"'{text}"
    return text


# ---------------------------------------------------------------------------
# Protocolo do Serviço de Armazenamento
# ---------------------------------------------------------------------------


class StorageService(Protocol):
    def create_upload_signed_url(self, file_key: str, expires_in: int = 3600) -> dict[str, str]:
        """Gera uma URL assinada para upload direto pelo cliente."""
        ...

    def get_file_bytes(self, file_key: str) -> bytes:
        """Lê os bytes de um arquivo armazenado."""
        ...

    def save_file_bytes(self, file_key: str, data: bytes) -> None:
        """Salva bytes diretamente no storage (usado em testes ou processamento interno)."""
        ...

    def put_file_bytes(
        self, file_key: str, content: bytes, content_type: str = "application/octet-stream"
    ) -> None:
        """Salva bytes com especificação de content-type."""
        ...

    def delete_file(self, file_key: str) -> None:
        """Remove um arquivo do storage."""
        ...


# ---------------------------------------------------------------------------
# Implementação Local / Fallback / Testes
# ---------------------------------------------------------------------------


class LocalStorageService:
    """Armazenamento em disco local utilizado em ambiente de testes ou desenvolvimento offline."""

    def __init__(self, base_dir: Path | None = None):
        self.base_dir = base_dir or (Path.cwd() / "storage_data")
        self.base_dir.mkdir(parents=True, exist_ok=True)

    def _resolve_path(self, file_key: str) -> Path:
        # Previne directory traversal
        clean_key = re.sub(r"\.\.[\\/]", "", file_key).lstrip("/\\")
        target_path = self.base_dir / clean_key
        target_path.parent.mkdir(parents=True, exist_ok=True)
        return target_path

    def create_upload_signed_url(self, file_key: str, expires_in: int = 3600) -> dict[str, str]:
        target_path = self._resolve_path(file_key)
        # Em modo local/teste, simulamos uma URL assinada apontando para a chave do arquivo
        return {
            "upload_url": f"/api/v1/uploads/direct/{file_key}",
            "file_key": file_key,
            "target_path": str(target_path),
        }

    def get_file_bytes(self, file_key: str) -> bytes:
        target_path = self._resolve_path(file_key)
        if not target_path.exists():
            raise FileNotFoundError(f"Arquivo '{file_key}' não encontrado no storage local.")
        return target_path.read_bytes()

    def save_file_bytes(self, file_key: str, data: bytes) -> None:
        target_path = self._resolve_path(file_key)
        target_path.write_bytes(data)

    def put_file_bytes(
        self, file_key: str, content: bytes, content_type: str = "application/octet-stream"
    ) -> None:
        self.save_file_bytes(file_key, content)

    def delete_file(self, file_key: str) -> None:
        target_path = self._resolve_path(file_key)
        if target_path.exists():
            target_path.unlink()


def generate_file_key(tenant_id: str, folder: str, filename: str) -> str:
    """Gera uma chave determinística e segura para o arquivo dentro do namespace do tenant."""
    unique_id = uuid.uuid4().hex[:12]
    ext = os.path.splitext(filename)[1].lower()
    clean_name = re.sub(r"[^a-zA-Z0-9_-]", "_", os.path.splitext(filename)[0])[:40]
    return f"tenants/{tenant_id}/{folder}/{unique_id}_{clean_name}{ext}"


# Instância padrão de storage (em testes e dev usa LocalStorageService)
storage: StorageService = LocalStorageService()
