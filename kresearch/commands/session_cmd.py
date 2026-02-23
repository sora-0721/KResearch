"""Handler for the /session slash command."""

from __future__ import annotations

import json

from rich.console import Console
from rich.panel import Panel
from rich.table import Table

from kresearch.commands.registry import command

console = Console()

_USAGE = (
    "[bold]Usage:[/bold]\n"
    "  /session info    Show current session details\n"
    "  /session export  Export session state to JSON\n"
    "  /session reset   Clear the current session"
)


@command("session", "Session management")
async def handle_session(args: str, ctx: dict) -> None:
    """Handle ``/session <info|export|reset>``."""
    parts = args.strip().split()
    sub = parts[0].lower() if parts else ""

    if sub == "info":
        _info(ctx)
    elif sub == "export":
        await _export(ctx)
    elif sub == "reset":
        _reset(ctx)
    else:
        console.print(_USAGE)


# ------------------------------------------------------------------
# Sub-commands
# ------------------------------------------------------------------


def _info(ctx: dict) -> None:
    """Display detailed session information."""
    session = ctx.get("session")
    if session is None:
        console.print("[yellow]No active session.[/yellow]")
        return

    summary = session.get_summary()

    table = Table(title="Session Info", show_header=False)
    table.add_column("Key", style="bold cyan")
    table.add_column("Value")

    for key, value in summary.items():
        if isinstance(value, dict):
            formatted = ", ".join(f"{k}={v}" for k, v in value.items())
        else:
            formatted = str(value)
        table.add_row(key, formatted)

    console.print(table)


async def _export(ctx: dict) -> None:
    """Export the full session state to a JSON file."""
    session = ctx.get("session")
    if session is None:
        console.print("[yellow]No active session.[/yellow]")
        return

    config = ctx["config"]
    output_dir = config.output_dir
    output_dir.mkdir(parents=True, exist_ok=True)

    filename = f"session_{session.id[:8]}.json"
    path = output_dir / filename

    data = {
        "id": session.id,
        "original_query": session.original_query,
        "created_at": session.created_at.isoformat(),
        "phase": session.phase_name,
        "status": session.status,
        "parsed_intent": session.parsed_intent,
        "perspectives": session.perspectives,
        "task_graph": session.task_graph.to_dict(),
        "mind_map": session.mind_map.to_dict(),
        "final_report": session.final_report,
    }

    path.write_text(json.dumps(data, indent=2, default=str))
    console.print(f"[green]Session exported to[/green] {path}")


def _reset(ctx: dict) -> None:
    """Reset the current session."""
    if ctx.get("session") is None:
        console.print("[yellow]No active session to reset.[/yellow]")
        return

    ctx["session"] = None
    console.print("[green]Session cleared.[/green]")
