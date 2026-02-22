"""Handler for the /search slash command."""

from __future__ import annotations

from rich.console import Console
from rich.table import Table

from kresearch.commands.registry import command
from kresearch.search.models import FREE_PROVIDERS, SEARCH_PROVIDERS
from kresearch.search.registry import list_providers

console = Console()


@command("search", "Switch or list search providers")
async def handle_search(args: str, ctx: dict) -> None:
    """Handle ``/search [list | <provider>]``."""
    parts = args.strip().split()

    if not parts or parts[0] == "list":
        _show_providers(ctx)
        return

    _switch_provider(parts[0].lower(), ctx)


# ------------------------------------------------------------------
# Sub-commands
# ------------------------------------------------------------------


def _show_providers(ctx: dict) -> None:
    """Print a Rich table of all search providers."""
    table = Table(
        title="Search Providers",
        show_header=True,
        header_style="bold cyan",
    )
    table.add_column("Provider", style="bold")
    table.add_column("Description")
    table.add_column("Tier", justify="center")

    config = ctx["config"]
    current = config.search.provider

    registered = set(list_providers())

    for name, description in sorted(SEARCH_PROVIDERS.items()):
        tier = "[green][FREE][/green]" if name in FREE_PROVIDERS else "Paid"
        label = name
        if name == current:
            label = f"[bold green]{name} (active)[/bold green]"
        elif name not in registered:
            label = f"[dim]{name}[/dim]"
        table.add_row(label, description, tier)

    console.print(table)


def _switch_provider(provider: str, ctx: dict) -> None:
    """Switch the active search provider."""
    known = set(SEARCH_PROVIDERS.keys())
    if provider not in known:
        console.print(
            f"[red]Unknown provider:[/red] {provider}\n"
            f"Available: {', '.join(sorted(known))}"
        )
        return

    config = ctx["config"]
    config.search.provider = provider
    console.print(f"[green]Search provider set to[/green] {provider}")
