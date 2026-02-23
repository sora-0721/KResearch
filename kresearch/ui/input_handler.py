"""Input handling utilities for KResearch."""

from __future__ import annotations

import asyncio

from rich.prompt import Confirm, Prompt

from .console import get_console


async def get_input(prompt: str) -> str:
    """Prompt the user for text input (async-friendly).

    Runs the blocking Rich prompt in a thread executor so the
    event loop is not blocked.
    """
    console = get_console()
    loop = asyncio.get_running_loop()
    result = await loop.run_in_executor(
        None,
        lambda: Prompt.ask(prompt, console=console),
    )
    return result


async def get_confirmation(prompt: str) -> bool:
    """Prompt the user for a yes/no confirmation (async-friendly)."""
    console = get_console()
    loop = asyncio.get_running_loop()
    result = await loop.run_in_executor(
        None,
        lambda: Confirm.ask(prompt, console=console),
    )
    return result


def parse_command(line: str) -> tuple[str, str]:
    """Parse a user input line into (command, args).

    If the line starts with '/' or '!', the first token is treated
    as the command and the remainder as arguments.  Otherwise the
    command is empty and the full line is returned as args.

    Examples
    --------
    >>> parse_command("/search quantum computing")
    ('search', 'quantum computing')
    >>> parse_command("!help")
    ('help', '')
    >>> parse_command("plain text input")
    ('', 'plain text input')
    """
    stripped = line.strip()
    if not stripped:
        return ("", "")

    if stripped[0] in ("/", "!"):
        stripped = stripped[1:]
        parts = stripped.split(None, 1)
        command = parts[0] if parts else ""
        args = parts[1] if len(parts) > 1 else ""
        return (command, args)

    return ("", stripped)
