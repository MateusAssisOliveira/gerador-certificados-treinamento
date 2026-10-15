"""Pure PDF Renderer package (ReportLab + PyPDF).

This package has ZERO dependencies on FastAPI, SQLAlchemy, or network calls,
making it 100% portable for serverless functions, background workers, or CLI.
"""

from .engine import render_single_certificate
from .models import CertificateLayout, ColorRGB, SignatureField, ThemeStyle
from .themes import THEMES, get_theme

__all__ = [
    "render_single_certificate",
    "CertificateLayout",
    "SignatureField",
    "ThemeStyle",
    "ColorRGB",
    "THEMES",
    "get_theme",
]
