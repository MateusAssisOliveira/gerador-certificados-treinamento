"""Automated tests for cryptography and security primitives (AES-256-GCM, HMAC, Masking)."""

import pytest

from app.core.security import (
    decrypt_data,
    encrypt_data,
    generate_cpf_hmac,
    hash_password,
    mask_cpf,
    normalize_cpf,
    verify_password,
)


def test_cpf_normalization():
    """Testa a normalização de CPF sintético para apenas dígitos."""
    assert normalize_cpf("123.456.789-01") == "12345678901"
    assert normalize_cpf("  12345678901  ") == "12345678901"
    assert normalize_cpf("123-456-789.01") == "12345678901"
    assert normalize_cpf("") == ""
    assert normalize_cpf(None) == ""


def test_cpf_masking():
    """Testa o mascaramento seguro de CPF sintético para documentos."""
    # Dado sintético de teste
    cpf_sintetico = "123.456.789-01"
    mascarado = mask_cpf(cpf_sintetico)
    assert mascarado == "***.456.789-**"
    assert "123" not in mascarado
    assert "01" not in mascarado

    # CPF inválido/parcial
    assert mask_cpf("12345") == "***.***.***-**"


def test_aes_gcm_encrypt_decrypt_cycle():
    """Testa o ciclo de cifragem e decifragem com AES-256-GCM usando dados sintéticos."""
    dado_sintetico = "DADO_SINTETICO_TESTE_12345678901"
    encrypted = encrypt_data(dado_sintetico)

    assert isinstance(encrypted, bytes)
    # 12 bytes nonce + tamanho do texto + 16 bytes tag GCM
    assert len(encrypted) >= 12 + len(dado_sintetico) + 16

    decrypted = decrypt_data(encrypted)
    assert decrypted == dado_sintetico


def test_aes_gcm_nonce_uniqueness():
    """Garante que duas cifragens do mesmo dado geram ciphertexts distintos (nonce aleatório)."""
    dado = "DADO_SINTETICO_REPETIDO"
    cifra_1 = encrypt_data(dado)
    cifra_2 = encrypt_data(dado)

    assert cifra_1 != cifra_2
    assert decrypt_data(cifra_1) == dado
    assert decrypt_data(cifra_2) == dado


def test_aes_gcm_tampering_detection():
    """Verifica se alteração de qualquer byte do ciphertext dispara erro de integridade GCM."""
    dado = "DADO_SINTETICO_INTEGRIDADE"
    cifra = bytearray(encrypt_data(dado))

    # Adultera o último byte (tag de autenticação)
    cifra[-1] ^= 0xFF

    with pytest.raises(ValueError, match="Falha na autenticação dos dados cifrados"):
        decrypt_data(bytes(cifra))


def test_aes_gcm_truncated_payload():
    """Verifica rejeição imediata de payload truncado."""
    with pytest.raises(ValueError, match="Payload cifrado inválido ou truncado"):
        decrypt_data(b"muito_curto")


def test_hmac_blind_index_deterministic():
    """Testa que o blind index HMAC-SHA256 é determinístico e imune a formatação."""
    cpf_formatado = "123.456.789-01"
    cpf_puro = "12345678901"
    outro_cpf = "987.654.321-09"

    hmac_1 = generate_cpf_hmac(cpf_formatado)
    hmac_2 = generate_cpf_hmac(cpf_puro)
    hmac_outro = generate_cpf_hmac(outro_cpf)

    assert isinstance(hmac_1, str)
    assert len(hmac_1) == 64  # SHA-256 hex digest
    assert hmac_1 == hmac_2
    assert hmac_1 != hmac_outro


def test_password_hashing():
    """Testa hash e verificação de senha com bcrypt."""
    senha = "SenhaForteSegura@2026!"
    hashed = hash_password(senha)

    assert hashed != senha
    assert verify_password(senha, hashed) is True
    assert verify_password("SenhaIncorreta", hashed) is False
