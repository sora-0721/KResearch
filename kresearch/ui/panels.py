"""Rich panel builders for KResearch UI."""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

from rich.panel import Panel
from rich.table import Table
from rich.text import Text

if TYPE_CHECKING:
    from kresearch.core.session import ResearchSession

# Phase number to theme style mapping.
_PHASE_STYLES: dict[int, str] = {
    1: "phase1",
    2: "phase2",
    3: "phase3",
    4: "phase4",
    5: "phase5",
}


def build_research_panel(session: ResearchSession) -> Panel:
    """Build an overview panel for the current research session."""
    summary = session.get_summary()
    table = Table(show_header=False, expand=True, box=None)
    table.add_column("Key", style="highlight", ratio=1)
    table.add_column("Value", ratio=3)
    table.add_row("Query", summary.get("query", "N/A"))
    table.add_row("Phase", summary.get("phase", "N/A"))
    table.add_row("Status", summary.get("status", "N/A"))
    table.add_row("Documents", str(summary.get("documents_retrieved", 0)))
    table.add_row("Verifications", str(summary.get("verifications", 0)))
    table.add_row("Conflicts", str(summary.get("conflicts_found", 0)))

    mind_map = summary.get("mind_map_stats", {})
    nodes = mind_map.get("total_nodes", 0)
    edges = mind_map.get("total_edges", 0)
    table.add_row("Mind Map", f"{nodes} nodes / {edges} edges")

    return Panel(table, title="[highlight]KResearch Session[/highlight]")


def build_phase_panel(
    phase_num: int, phase_name: str, status: str
) -> Panel:
    """Build a panel summarising a single phase."""
    style = _PHASE_STYLES.get(phase_num, "info")
    status_style = "success" if status == "complete" else "warning"

    body = Text()
    body.append(f"Phase {phase_num}: ", style=style)
    body.append(phase_name, style="highlight")
    body.append(f"\nStatus: ", style="info")
    body.append(status, style=status_style)

    return Panel(body, title=f"[{style}]Phase {phase_num}[/{style}]")


def build_results_panel(results: list[Any]) -> Panel:
    """Build a panel listing retrieval results."""
    if not results:
        return Panel("[info]No results yet.[/info]", title="Results")

    table = Table(expand=True)
    table.add_column("#", style="dim", width=4)
    table.add_column("Title", style="highlight", ratio=3)
    table.add_column("Source", ratio=1)

    for idx, result in enumerate(results[:20], start=1):
        title = str(result.get("title", "Untitled"))
        source = str(result.get("provider", "unknown"))
        table.add_row(str(idx), title, source)

    if len(results) > 20:
        table.add_row("...", f"+{len(results) - 20} more", "")

    return Panel(table, title=f"[highlight]Results ({len(results)})[/highlight]")


def build_error_panel(error: str) -> Panel:
    """Build an error panel."""
    return Panel(
        f"[error]{error}[/error]",
        title="[error]Error[/error]",
        border_style="red",
    )
