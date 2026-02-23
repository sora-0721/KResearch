"""JSON exporter for KResearch sessions."""

from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path
from typing import TYPE_CHECKING

from kresearch.export.base import Exporter

if TYPE_CHECKING:
    from kresearch.core.session import ResearchSession


class JSONExporter(Exporter):
    """Export a full research session as a JSON file."""

    @property
    def format_name(self) -> str:
        return "json"

    async def export(
        self,
        content: str,
        session: ResearchSession,
        path: Path,
    ) -> Path:
        """Serialize the session and report to *path* as JSON."""
        path.parent.mkdir(parents=True, exist_ok=True)

        data = _build_payload(content, session)
        path.write_text(
            json.dumps(data, indent=2, default=str, ensure_ascii=False),
            encoding="utf-8",
        )
        return path


# ------------------------------------------------------------------
# Helpers
# ------------------------------------------------------------------


def _build_payload(content: str, session: ResearchSession) -> dict:
    """Construct the full JSON export payload."""
    now = datetime.utcnow().isoformat(timespec="seconds") + "Z"

    return {
        "metadata": {
            "session_id": session.id,
            "original_query": session.original_query,
            "created_at": session.created_at.isoformat(),
            "exported_at": now,
            "phase": session.phase_name,
            "status": session.status,
        },
        "report": content,
        "parsed_intent": session.parsed_intent,
        "perspectives": session.perspectives,
        "task_graph": session.task_graph.to_dict(),
        "mind_map": session.mind_map.to_dict(),
        "artifacts": {
            "documents_retrieved": len(session.retrieved_documents),
            "verifications": len(session.verification_results),
            "conflicts": len(session.conflicts),
            "draft_iterations": len(session.draft_iterations),
        },
    }
