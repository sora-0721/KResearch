"""Handler for the /help slash command."""

from __future__ import annotations

from rich.console import Console
from rich.table import Table

from kresearch.commands.registry import command, get_all_commands

console = Console()


@command("help", "Show all available commands")
async def handle_help(args: str, ctx: dict) -> None:
    """Handle ``/help``."""
    commands = get_all_commands()

    table = Table(
        title="Available Commands",
        show_header=True,
        header_style="bold cyan",
    )
    table.add_column("Command", style="bold green")
    table.add_column("Description")

    for name, help_text in sorted(commands.items()):
        table.add_row(f"/{name}", help_text)

    console.print(table)
    console.print(
        "\n[dim]Type /command --help for detailed usage of each command.[/dim]"
    )
