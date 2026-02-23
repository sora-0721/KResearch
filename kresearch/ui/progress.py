"""Progress tracking utilities for KResearch."""

from __future__ import annotations

from typing import TYPE_CHECKING

from rich.progress import (
    BarColumn,
    MofNCompleteColumn,
    Progress,
    SpinnerColumn,
    TaskProgressColumn,
    TextColumn,
    TimeElapsedColumn,
    TimeRemainingColumn,
)

from .console import get_console

if TYPE_CHECKING:
    from rich.progress import TaskID

    from kresearch.core.event_bus import Event, EventBus


def create_phase_progress() -> Progress:
    """Create a Progress instance styled for research phases."""
    return Progress(
        SpinnerColumn(),
        TextColumn("[highlight]{task.description}[/highlight]"),
        BarColumn(bar_width=30),
        TaskProgressColumn(),
        TimeElapsedColumn(),
        console=get_console(),
    )


def create_task_progress() -> Progress:
    """Create a Progress instance for individual tasks."""
    return Progress(
        SpinnerColumn(spinner_name="dots"),
        TextColumn("[info]{task.description}[/info]"),
        BarColumn(bar_width=20),
        MofNCompleteColumn(),
        TimeRemainingColumn(),
        console=get_console(),
    )


class ProgressTracker:
    """Wraps a Rich Progress bar and syncs with EventBus events."""

    def __init__(self, event_bus: EventBus) -> None:
        self._bus = event_bus
        self._progress: Progress | None = None
        self._task_ids: dict[str, TaskID] = {}

    async def setup(self) -> None:
        """Subscribe to progress-related events."""
        self._bus.subscribe("progress.start", self._on_start)
        self._bus.subscribe("progress.advance", self._on_advance)
        self._bus.subscribe("progress.finish", self._on_finish)

    def start(self) -> Progress:
        """Create and start the progress display."""
        self._progress = create_phase_progress()
        self._progress.start()
        return self._progress

    def stop(self) -> None:
        """Stop the progress display."""
        if self._progress is not None:
            self._progress.stop()
            self._progress = None
        self._task_ids.clear()

    # ------------------------------------------------------------------
    # Event handlers
    # ------------------------------------------------------------------

    async def _on_start(self, event: Event) -> None:
        """Handle progress.start: add a new task to the progress bar."""
        if self._progress is None:
            self.start()
        assert self._progress is not None
        key = event.data.get("key", "task")
        description = event.data.get("description", key)
        total = event.data.get("total", 100)
        task_id = self._progress.add_task(description, total=total)
        self._task_ids[key] = task_id

    async def _on_advance(self, event: Event) -> None:
        """Handle progress.advance: increment a task."""
        if self._progress is None:
            return
        key = event.data.get("key", "task")
        advance = event.data.get("advance", 1)
        task_id = self._task_ids.get(key)
        if task_id is not None:
            self._progress.advance(task_id, advance=advance)

    async def _on_finish(self, event: Event) -> None:
        """Handle progress.finish: mark a task complete."""
        if self._progress is None:
            return
        key = event.data.get("key", "task")
        task_id = self._task_ids.get(key)
        if task_id is not None:
            self._progress.update(task_id, completed=self._progress.tasks[task_id].total)
