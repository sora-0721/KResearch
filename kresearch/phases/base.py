"""Abstract base class for research phases."""

from __future__ import annotations

import abc
from typing import Any

from kresearch.core.session import ResearchSession
from kresearch.core.event_bus import EventBus


class Phase(abc.ABC):
    """Base class for all Omega Workflow phases."""

    def __init__(
        self,
        session: ResearchSession,
        ctx: dict[str, Any],
        event_bus: EventBus,
    ) -> None:
        self.session = session
        self.ctx = ctx
        self.config = ctx["config"]
        self.event_bus = event_bus

    @property
    @abc.abstractmethod
    def phase_number(self) -> int:
        """1-based phase number."""

    @property
    @abc.abstractmethod
    def phase_name(self) -> str:
        """Human-readable phase name."""

    @abc.abstractmethod
    async def execute(self) -> None:
        """Run this phase, mutating session in place."""

    async def validate_preconditions(self) -> bool:
        """Check if this phase can run. Override for custom checks."""
        return True

    async def _get_llm(self):
        """Convenience: get the configured LLM provider."""
        from kresearch.llm.factory import get_llm_provider
        return get_llm_provider(self.config)

    async def _get_search(self):
        """Convenience: get the configured search provider."""
        from kresearch.search.factory import get_search_provider
        return get_search_provider(self.config)
