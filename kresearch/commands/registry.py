"""Command registry for slash commands."""

from __future__ import annotations

from typing import Any, Callable, Coroutine

_commands: dict[str, Callable[..., Coroutine]] = {}
_help_texts: dict[str, str] = {}


def register_command(
    name: str,
    handler: Callable[..., Coroutine],
    help_text: str = "",
) -> None:
    """Register a slash command handler."""
    _commands[name] = handler
    _help_texts[name] = help_text


def command(name: str, help_text: str = ""):
    """Decorator to register a command handler."""
    def decorator(func: Callable[..., Coroutine]) -> Callable[..., Coroutine]:
        register_command(name, func, help_text)
        return func
    return decorator


async def execute_command(name: str, args: str, ctx: dict[str, Any]) -> None:
    """Execute a registered command by name."""
    _ensure_commands_loaded()
    handler = _commands.get(name)
    if handler is None:
        print(f"Unknown command: /{name}. Type /help for available commands.")
        return
    await handler(args, ctx)


def get_all_commands() -> dict[str, str]:
    """Return dict of command_name → help_text."""
    _ensure_commands_loaded()
    return dict(_help_texts)


_loaded = False


def _ensure_commands_loaded() -> None:
    """Import all command modules to trigger registration."""
    global _loaded
    if _loaded:
        return
    _loaded = True
    # Import each command module so @command decorators execute
    from kresearch.commands import (  # noqa: F401
        model_cmd,
        search_cmd,
        config_cmd,
        export_cmd,
        status_cmd,
        help_cmd,
        rag_cmd,
        session_cmd,
    )
