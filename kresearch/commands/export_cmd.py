"""Handler for the /export slash command."""

from __future__ import annotations

from pathlib import Path

from rich.console import Console

from kresearch.commands.registry import command

console = Console()


@command("export", "Export last report as markdown or JSON")
async def handle_export(args: str, ctx: dict) -> None:
    """Handle ``/export <md|json> [path]``."""
    parts = args.strip().split(maxsplit=1)

    if not parts:
        console.print("[red]Usage:[/red] /export <md|json> [path]")
        return

    fmt = parts[0].lower()
    custom_path = parts[1].strip() if len(parts) > 1 else None

    if fmt not in ("md", "json"):
        console.print(
            f"[red]Unknown format:[/red] {fmt}\n"
            "Supported formats: md, json"
        )
        return

    session = ctx.get("session")
    if session is None:
        console.print("[red]No active session.[/red]")
        return

    if session.final_report is None:
        console.print(
            "[yellow]No final report available yet.[/yellow] "
            "Complete the research pipeline first."
        )
        return

    # Lazy import to avoid circular dependency at module level
    from kresearch.export import ExportManager

    manager = ExportManager()
    format_name = "markdown" if fmt == "md" else "json"
    path = Path(custom_path) if custom_path else None

    try:
        result = await manager.export(
            format_name=format_name,
            content=session.final_report,
            session=session,
            path=path,
        )
        console.print(f"[green]Exported to[/green] {result}")
    except Exception as exc:
        console.print(f"[red]Export failed:[/red] {exc}")
