"""Phase runner — orchestrates the 5-phase Omega Workflow."""

from __future__ import annotations

import time
from typing import Any

from kresearch.core.session import ResearchSession
from kresearch.core.event_bus import EventBus
from kresearch.utils.logger import get_logger

logger = get_logger(__name__)


class PhaseRunner:
    """Executes all research phases sequentially on a session."""

    def __init__(self, ctx: dict[str, Any]) -> None:
        self.ctx = ctx
        self.config = ctx["config"]
        self.event_bus: EventBus = ctx["event_bus"]

    async def run(self, query: str) -> ResearchSession:
        """Run the full 5-phase pipeline for the given query."""
        session = ResearchSession(original_query=query)
        self.ctx["session"] = session

        await self.event_bus.publish("research.start", {"query": query})
        start = time.time()

        phases = self._build_phases(session)
        for phase in phases:
            phase_name = phase.phase_name
            await self.event_bus.publish(
                "phase.start",
                {"phase": phase.phase_number, "name": phase_name},
            )
            try:
                await phase.execute()
                session.advance_phase()
                await self.event_bus.publish(
                    "phase.complete",
                    {"phase": phase.phase_number, "name": phase_name},
                )
            except Exception as exc:
                logger.error("Phase %s failed: %s", phase_name, exc)
                await self.event_bus.publish(
                    "phase.failed",
                    {"phase": phase.phase_number, "error": str(exc)},
                )
                break

        elapsed = time.time() - start
        await self.event_bus.publish(
            "research.complete",
            {"query": query, "elapsed": elapsed},
        )
        self._print_summary(session, elapsed)
        return session

    def _build_phases(self, session: ResearchSession) -> list:
        """Instantiate and return all 5 phases in order."""
        from kresearch.phases.phase1.intent_parser import IntentParser
        from kresearch.phases.phase2.swarm_coordinator import SwarmCoordinator
        from kresearch.phases.phase3.verification_engine import VerificationEngine
        from kresearch.phases.phase4.conflict_detector import ConflictDetector
        from kresearch.phases.phase5.diffusion_writer import DiffusionWriter

        args = (session, self.ctx, self.event_bus)
        return [
            IntentParser(*args),
            SwarmCoordinator(*args),
            VerificationEngine(*args),
            ConflictDetector(*args),
            DiffusionWriter(*args),
        ]

    def _print_summary(self, session: ResearchSession, elapsed: float) -> None:
        """Print a brief summary after research completes."""
        try:
            from rich.console import Console
            from rich.panel import Panel
            console = Console()
            stats = session.get_summary()
            body = (
                f"Phases completed: {stats['phase_index']}/5\n"
                f"Mind map nodes: {stats.get('mind_map_stats', {}).get('total_nodes', 0)}\n"
                f"Time: {elapsed:.1f}s"
            )
            console.print(Panel(body, title="Research Complete",
                                border_style="green"))
        except ImportError:
            print(f"\n--- Research Complete ({elapsed:.1f}s) ---")
