"""KResearch Rich theme definition."""

from __future__ import annotations

from rich.theme import Theme

# Color mappings for KResearch UI elements.
KRESEARCH_THEME: dict[str, str] = {
    "phase1": "cyan",
    "phase2": "blue",
    "phase3": "yellow",
    "phase4": "magenta",
    "phase5": "green",
    "success": "bold green",
    "error": "bold red",
    "warning": "yellow",
    "info": "dim",
    "highlight": "bold white",
}


def get_theme() -> Theme:
    """Return a Rich Theme built from KRESEARCH_THEME."""
    return Theme(KRESEARCH_THEME)
