"""KResearch UI module -- Rich-based terminal rendering."""

from .console import get_console
from .display import DisplayManager

__all__ = ["get_console", "DisplayManager"]
