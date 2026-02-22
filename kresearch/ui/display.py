"""DisplayManager: subscribes to EventBus and renders live UI updates."""

from __future__ import annotations

from typing import TYPE_CHECKING

from rich.live import Live
from rich.table import Table

from .console import get_console
from .panels import (
    build_error_panel,
    build_phase_panel,
    build_results_panel,
)
from .phase_display import (
    display_phase_complete,
    display_phase_error,
    display_phase_start,
)

if TYPE_CHECKING:
    from kresearch.core.event_bus import Event, EventBus


class DisplayManager:
    """Subscribes to EventBus events and renders Rich UI updates."""

    def __init__(self, event_bus: EventBus) -> None:
        self._bus = event_bus
        self._console = get_console()
        self._live: Live | None = None
        self._current_phase: int = 0
        self._phase_name: str = ""
        self._results: list[dict] = []

    # ------------------------------------------------------------------
    # Setup
    # ------------------------------------------------------------------

    async def setup(self) -> None:
        """Subscribe to all relevant EventBus events."""
        self._bus.subscribe("phase.start", self._on_phase_start)
        self._bus.subscribe("phase.complete", self._on_phase_complete)
        self._bus.subscribe("phase.error", self._on_phase_error)
        self._bus.subscribe("retrieval.result", self._on_retrieval_result)
        self._bus.subscribe("task.progress", self._on_task_progress)
        self._bus.subscribe("session.complete", self._on_session_complete)

    # ------------------------------------------------------------------
    # Event handlers
    # ------------------------------------------------------------------

    async def _on_phase_start(self, event: Event) -> None:
        phase_num = event.data.get("phase_num", 0)
        phase_name = event.data.get("phase_name", "")
        self._current_phase = phase_num
        self._phase_name = phase_name
        display_phase_start(phase_num, phase_name)

    async def _on_phase_complete(self, event: Event) -> None:
        phase_num = event.data.get("phase_num", 0)
        stats = event.data.get("stats", {})
        display_phase_complete(phase_num, stats)

    async def _on_phase_error(self, event: Event) -> None:
        phase_num = event.data.get("phase_num", 0)
        error = event.data.get("error", "Unknown error")
        display_phase_error(phase_num, error)

    async def _on_retrieval_result(self, event: Event) -> None:
        result = event.data.get("result", {})
        self._results.append(result)
        title = result.get("title", "Untitled")
        source = result.get("provider", "unknown")
        self._console.print(
            f"  [info]Retrieved:[/info] {title} [dim]({source})[/dim]"
        )

    async def _on_task_progress(self, event: Event) -> None:
        completed = event.data.get("completed", 0)
        total = event.data.get("total", 0)
        label = event.data.get("label", "Tasks")
        if total > 0:
            self._console.print(
                f"  [info]{label}:[/info] {completed}/{total}"
            )

    async def _on_session_complete(self, event: Event) -> None:
        self._console.print()
        self._console.rule("[success]Research Complete[/success]")

    # ------------------------------------------------------------------
    # Live display helpers
    # ------------------------------------------------------------------

    def start_live(self) -> Live:
        """Start a Rich Live context for real-time updates."""
        self._live = Live(
            self._build_status_table(),
            console=self._console,
            refresh_per_second=4,
        )
        self._live.start()
        return self._live

    def stop_live(self) -> None:
        """Stop the Rich Live context."""
        if self._live is not None:
            self._live.stop()
            self._live = None

    def update_live(self) -> None:
        """Refresh the live display with current state."""
        if self._live is not None:
            self._live.update(self._build_status_table())

    def _build_status_table(self) -> Table:
        """Build a summary table for live display."""
        table = Table(title="KResearch Status", expand=True)
        table.add_column("Field", style="highlight")
        table.add_column("Value")
        table.add_row("Phase", f"{self._current_phase} - {self._phase_name}")
        table.add_row("Results", str(len(self._results)))
        return table
