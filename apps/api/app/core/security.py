"""Security utilities: AES-256-GCM encryption, HMAC blind indexing, password hashing, and JWT tokens."""

from __future__ import annotations

import hashlib
import hmac
import os
import re
from datetime import UTC, datetime, timedelta
from typing import Any

import bcrypt
import jwt
from cryptography.exceptions import InvalidTag
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from app.core.config import settings

# ---------------------------------------------------------------------------
# Key Derivation Helpers
# ---------------------------------------------------------------------------


def _get_aes_key(key_str: str | None = None) -> bytes:
    """Deriva uma chave AES de 256 bits (32 bytes) a partir da string de configuração."""
    raw = (key_str or settings.ENCRYPTION_KEY).encode("utf-8")
    # Usa SHA-256 para garantir que a chave tenha exatamente 32 bytes
    return hashlib.sha256(raw).digest()


def _get_hmac_secret(secret_str: str | None = None) -> bytes:
    """Retorna o segredo em bytes para o HMAC-SHA256."""
    return (secret_str or settings.HMAC_SECRET).encode("utf-8")


# ---------------------------------------------------------------------------
# Normalização e Mascaramento de CPF
# ---------------------------------------------------------------------------


def normalize_cpf(cpf: str | None) -> str:
    """Remove caracteres não numéricos de um CPF."""
    if not cpf:
        return ""
    return re.sub(r"\D", "", str(cpf).strip())


def mask_cpf(cpf: str | None) -> str:
    """
    Retorna o CPF mascarado para exibição segura em documentos: '***.456.789-**'.
    Nunca expõe os primeiros 3 nem os últimos 2 dígitos.
    """
    digitos = normalize_cpf(cpf)
    if len(digitos) != 11:
        return "***.***.***-**"
    return f"***.{digitos[3:6]}.{digitos[6:9]}-**"


# ---------------------------------------------------------------------------
# Criptografia AES-256-GCM em Nível de Aplicação
# ---------------------------------------------------------------------------


def encrypt_data(data: str | bytes, key_override: str | None = None) -> bytes:
    """
    Cifra dados com AES-256-GCM.
    Gera um nonce aleatório único de 96 bits (12 bytes) para cada chamada.
    Retorna: nonce (12 bytes) + ciphertext + tag de autenticação GCM (16 bytes).
    """
    if isinstance(data, str):
        payload = data.encode("utf-8")
    else:
        payload = data

    key = _get_aes_key(key_override)
    aesgcm = AESGCM(key)
    nonce = os.urandom(12)
    ciphertext = aesgcm.encrypt(nonce, payload, None)
    return nonce + ciphertext


def decrypt_data(encrypted_payload: bytes, key_override: str | None = None) -> str:
    """
    Decifra dados cifrados com AES-256-GCM.
    Valida a tag de autenticação; lança ValueError se o payload tiver sido adulterado.
    """
    if not encrypted_payload or len(encrypted_payload) < 28:
        raise ValueError("Payload cifrado inválido ou truncado.")

    nonce = encrypted_payload[:12]
    ciphertext = encrypted_payload[12:]
    key = _get_aes_key(key_override)
    aesgcm = AESGCM(key)

    try:
        decrypted_bytes = aesgcm.decrypt(nonce, ciphertext, None)
        return decrypted_bytes.decode("utf-8")
    except InvalidTag as err:
        raise ValueError(
            "Falha na autenticação dos dados cifrados (dados adulterados ou chave incorreta)."
        ) from err


# ---------------------------------------------------------------------------
# Blind Index Determinístico com HMAC-SHA256
# ---------------------------------------------------------------------------


def generate_cpf_hmac(cpf: str | None, secret_override: str | None = None) -> str:
    """
    Gera um hash HMAC-SHA256 determinístico para o CPF normalizado.
    Permite busca pontual e deduplicação no banco sem armazenar o CPF em claro.
    """
    digitos = normalize_cpf(cpf)
    if not digitos:
        return ""
    secret = _get_hmac_secret(secret_override)
    return hmac.new(secret, digitos.encode("utf-8"), hashlib.sha256).hexdigest()


# ---------------------------------------------------------------------------
# Hash e Verificação de Senhas
# ---------------------------------------------------------------------------


def hash_password(password: str) -> str:
    """Gera hash seguro de senha utilizando bcrypt."""
    salt = bcrypt.gensalt(rounds=12)
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed.decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifica uma senha em texto claro contra o hash bcrypt."""
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception:
        return False


# ---------------------------------------------------------------------------
# Tokens JWT
# ---------------------------------------------------------------------------


def create_access_token(data: dict[str, Any], expires_delta: timedelta | None = None) -> str:
    """Cria um token JWT com expiração e dados informados."""
    to_encode = data.copy()
    now = datetime.now(UTC)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "iat": now})
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt


def decode_access_token(token: str) -> dict[str, Any]:
    """Decodifica e valida um token JWT. Lança jwt.PyJWTError em caso de falha."""
    return jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
