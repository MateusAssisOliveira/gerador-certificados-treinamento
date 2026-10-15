"""Visual color themes for certificate rendering (Ported from legacy templates & SKILL.md)."""

from .models import ColorRGB, ThemeStyle

THEMES: dict[str, ThemeStyle] = {
    "ouro_azul": ThemeStyle(
        name="Ouro Real & Azul Marinho",
        primary=ColorRGB.from_hex("#1A2B4C"),
        secondary=ColorRGB.from_hex("#C5A059"),
        text=ColorRGB.from_hex("#333333"),
        background=ColorRGB.from_hex("#FDFBF7"),
        border=ColorRGB.from_hex("#C5A059"),
    ),
    "esmeralda": ThemeStyle(
        name="Verde Esmeralda Nobre",
        primary=ColorRGB.from_hex("#0F3D2E"),
        secondary=ColorRGB.from_hex("#B08E3C"),
        text=ColorRGB.from_hex("#282828"),
        background=ColorRGB.from_hex("#F7FAF8"),
        border=ColorRGB.from_hex("#0F3D2E"),
    ),
    "classico": ThemeStyle(
        name="Clássico Minimalista",
        primary=ColorRGB.from_hex("#1E1E1E"),
        secondary=ColorRGB.from_hex("#787878"),
        text=ColorRGB.from_hex("#323232"),
        background=ColorRGB.from_hex("#FFFFFF"),
        border=ColorRGB.from_hex("#1E1E1E"),
    ),
    "rubi": ThemeStyle(
        name="Rubi Imperial & Dourado",
        primary=ColorRGB.from_hex("#6B182B"),
        secondary=ColorRGB.from_hex("#D4AF37"),
        text=ColorRGB.from_hex("#2D2D2D"),
        background=ColorRGB.from_hex("#FCF8F9"),
        border=ColorRGB.from_hex("#6B182B"),
    ),
}


def get_theme(theme_name: str) -> ThemeStyle:
    """Retorna o tema de estilo visual solicitado ou o padrão ouro_azul."""
    return THEMES.get(theme_name, THEMES["ouro_azul"])
