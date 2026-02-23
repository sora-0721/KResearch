"""ResearchSession: top-level container for a research run."""

from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Optional

from .mind_map import EpistemicMindMap
from .task_graph import TaskGraph

_PHASES = [
    "INIT",
    "PARSE_INTENT",
    "PLAN_TASKS",
    "RETRIEVE",
    "VERIFY",
    "DISCOURSE",
    "DRAFT",
    "REVIEW",
    "FINALISE",
]


@dataclass
class ResearchSession:
    """Holds all state for a single research session."""

    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    original_query: str = ""
    created_at: datetime = field(default_factory=datetime.utcnow)

    # Intent & perspectives
    parsed_intent: Optional[dict] = None
    perspectives: list[dict] = field(default_factory=list)

    # Core structures
    task_graph: TaskGraph = field(default_factory=TaskGraph)
    mind_map: EpistemicMindMap = field(default_factory=EpistemicMindMap)

    # Phase outputs
    retrieved_documents: list[Any] = field(default_factory=list)
    verification_results: list[Any] = field(default_factory=list)
    conflicts: list[Any] = field(default_factory=list)
    draft_iterations: list[Any] = field(default_factory=list)
    final_report: Optional[str] = None

    # Progress tracking
    current_phase: int = 0
    status: str = "initialized"

    # ---- Methods ----

    def advance_phase(self) -> str:
        """Move to the next phase. Returns the new phase name."""
        if self.current_phase < len(_PHASES) - 1:
            self.current_phase += 1
        self.status = _PHASES[self.current_phase]
        return self.status

    @property
    def phase_name(self) -> str:
        return _PHASES[self.current_phase]

    def get_summary(self) -> dict:
        """Return a concise summary of the session state."""
        return {
            "id": self.id,
            "query": self.original_query,
            "created_at": self.created_at.isoformat(),
            "phase": self.phase_name,
            "phase_index": self.current_phase,
            "status": self.status,
            "task_progress": self.task_graph.get_progress(),
            "mind_map_stats": self.mind_map.get_statistics(),
            "documents_retrieved": len(self.retrieved_documents),
            "verifications": len(self.verification_results),
            "conflicts_found": len(self.conflicts),
            "drafts": len(self.draft_iterations),
            "has_final_report": self.final_report is not None,
        }
