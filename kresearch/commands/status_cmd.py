"""Handler for the /status slash command."""

from __future__ import annotations

from rich.console import Console
from rich.panel import Panel
from rich.table import Table
from rich.text import Text

from kresearch.commands.registry import command

console = Console()


@command("status", "Show current session progress")
async def handle_status(args: str, ctx: dict) -> None:
    """Handle ``/status``."""
    session = ctx.get("session")
    if session is None:
        console.print("[yellow]No active session.[/yellow]")
        return

    # -- Phase info --
    phase_text = Text()
    phase_text.append("Phase: ", style="bold")
    phase_text.append(
        f"{session.phase_name} ({session.current_phase})",
        style="cyan",
    )
    phase_text.append("\nStatus: ", style="bold")
    phase_text.append(session.status, style="green")
    phase_text.append("\nQuery: ", style="bold")
    phase_text.append(session.original_query or "(none)", style="italic")

    console.print(Panel(phase_text, title="Session", border_style="blue"))

    # -- Task graph progress --
    progress = session.task_graph.get_progress()
    task_table = Table(
        title="Task Graph",
        show_header=True,
        header_style="bold cyan",
    )
    task_table.add_column("Metric", style="bold")
    task_table.add_column("Count", justify="right")

    task_table.add_row("Total", str(progress["total"]))
    task_table.add_row("Completed", f"[green]{progress['completed']}[/green]")
    task_table.add_row("Running", f"[yellow]{progress['running']}[/yellow]")
    task_table.add_row("Pending", str(progress["pending"]))
    task_table.add_row("Failed", f"[red]{progress['failed']}[/red]")

    console.print(task_table)

    # -- Mind map stats --
    stats = session.mind_map.get_statistics()
    mm_lines: list[str] = [
        f"Nodes: {stats['total_nodes']}",
        f"Edges: {stats['total_edges']}",
    ]
    if stats.get("by_type"):
        mm_lines.append("By type: " + ", ".join(
            f"{k}={v}" for k, v in sorted(stats["by_type"].items())
        ))
    if stats.get("by_confidence"):
        mm_lines.append("By confidence: " + ", ".join(
            f"{k}={v}" for k, v in sorted(stats["by_confidence"].items())
        ))

    console.print(Panel(
        "\n".join(mm_lines),
        title="Mind Map",
        border_style="magenta",
    ))

    # -- Extras --
    extras = (
        f"Documents retrieved: {len(session.retrieved_documents)}\n"
        f"Verifications: {len(session.verification_results)}\n"
        f"Conflicts: {len(session.conflicts)}\n"
        f"Draft iterations: {len(session.draft_iterations)}\n"
        f"Final report: {'Yes' if session.final_report else 'No'}"
    )
    console.print(Panel(extras, title="Artifacts", border_style="green"))
