"""Data models and type definitions for pdf_renderer (Pure package)."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass(frozen=True)
class ColorRGB:
    r: float
    g: float
    b: float

    @classmethod
    def from_hex(cls, hex_str: str) -> ColorRGB:
        """Converte uma string hex (#RRGGBB ou RRGGBB) em ColorRGB (0.0 a 1.0)."""
        clean = hex_str.lstrip("#")
        if len(clean) != 6:
            return cls(0.0, 0.0, 0.0)
        return cls(
            r=int(clean[0:2], 16) / 255.0,
            g=int(clean[2:4], 16) / 255.0,
            b=int(clean[4:6], 16) / 255.0,
        )


@dataclass
class ThemeStyle:
    name: str
    primary: ColorRGB
    secondary: ColorRGB
    text: ColorRGB
    background: ColorRGB
    border: ColorRGB


@dataclass
class SignatureField:
    name: str
    role: str


@dataclass
class CertificateLayout:
    orientation: str = "landscape"  # "landscape" ou "portrait"
    theme_name: str = "ouro_azul"
    institution: str = "CENTRO DE DESENVOLVIMENTO & CAPACITAÇÃO PROFISSIONAL"
    title: str = "CERTIFICADO"
    subtitle: str = "DE CONCLUSÃO E PARTICIPAÇÃO"
    body_template: str = (
        "Certificamos que {{NOME}}, portador(a) do CPF {{CPF}}, concluiu com êxito o treinamento "
        "de {{CURSO}}, com carga horária de {{CARGA_HORARIA}}, concluído em {{DATA}}."
    )
    signatures: list[SignatureField] = field(
        default_factory=lambda: [
            SignatureField("Prof. Coordenador(a)", "Coordenação Pedagógica"),
            SignatureField("Diretoria Acadêmica", "Direção Geral"),
        ]
    )
    show_border: bool = True
    show_qr_code: bool = True
    public_verification_url: str = "https://certificaflow.com/verify"
    extra_field_positions: dict[str, Any] = field(default_factory=dict)
