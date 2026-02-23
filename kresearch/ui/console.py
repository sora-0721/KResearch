"""Singleton Rich console for KResearch."""

from __future__ import annotations

from rich.console import Console

from .theme import get_theme

_console: Console | None = None


def get_console() -> Console:
    """Return the global Console instance, creating it on first call."""
    global _console
    if _console is None:
        _console = Console(theme=get_theme())
    return _console


# ---------------------------------------------------------------------------
# Convenience helpers
# ---------------------------------------------------------------------------


def print_error(msg: str) -> None:
    """Print an error message styled with [error]."""
    get_console().print(f"[error]ERROR:[/error] {msg}")


def print_success(msg: str) -> None:
    """Print a success message styled with [success]."""
    get_console().print(f"[success]{msg}[/success]")


def print_warning(msg: str) -> None:
    """Print a warning message styled with [warning]."""
    get_console().print(f"[warning]WARNING:[/warning] {msg}")


def print_info(msg: str) -> None:
    """Print an informational message styled with [info]."""
    get_console().print(f"[info]{msg}[/info]")
