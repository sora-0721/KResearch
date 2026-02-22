"""ConflictDetector phase: detect and resolve epistemic conflicts."""

from __future__ import annotations

import logging
import uuid
from typing import Any

from kresearch.core.mind_map_node import ConfidenceLevel
from kresearch.phases.base import Phase
from .consistency_checker import check_consistency
from .source_hierarchy import rank_sources
from .markov_resolver import resolve_conflicts

logger = logging.getLogger(__name__)


class ConflictDetector(Phase):
    """Phase 4 -- Epistemic Conflict Resolution.

    Detects contradictions in the mind map, runs a 7-level consistency
    check, applies source hierarchy ranking, resolves conflicts via
    Markov-based resolution, and updates confidence levels.
    """

    @property
    def phase_number(self) -> int:
        return 4

    @property
    def phase_name(self) -> str:
        return "Epistemic Conflict Resolution"

    async def execute(self) -> None:
        """Run the full Phase-4 pipeline."""
        await self.event_bus.publish(
            "phase.start", {"phase": self.phase_number}
        )
        mind_map = self.session.mind_map
        llm = await self._get_llm()

        # Step 1 -- detect contradictions already flagged
        contested = mind_map.get_contested_nodes()
        logger.info("Found %d pre-existing contested nodes", len(contested))

        # Step 2 -- 7-level consistency check
        inconsistencies = await check_consistency(mind_map, llm)
        logger.info("Consistency check found %d issues", len(inconsistencies))

        # Step 3 -- merge detected contradictions with consistency issues
        conflicts = self._build_conflict_list(contested, inconsistencies)

        # Step 4 -- rank sources involved in each conflict
        for conflict in conflicts:
            sources = self._collect_sources(mind_map, conflict.get("node_ids", []))
            conflict["ranked_sources"] = rank_sources(sources)

        # Step 5 -- resolve conflicts using Markov resolver
        resolutions = await resolve_conflicts(conflicts, mind_map, llm)
        logger.info("Resolved %d conflicts", len(resolutions))

        # Step 6 -- apply resolution outcomes to mind map
        self._apply_resolutions(resolutions, mind_map)

        # Step 7 -- store conflicts in session
        self.session.conflicts = resolutions

        self.session.advance_phase()
        await self.event_bus.publish(
            "phase.complete",
            {
                "phase": self.phase_number,
                "conflicts_found": len(conflicts),
                "conflicts_resolved": len(resolutions),
            },
        )

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _build_conflict_list(
        self, contested: list, inconsistencies: list[dict],
    ) -> list[dict]:
        """Merge contested nodes and consistency issues into conflicts."""
        conflicts: list[dict[str, Any]] = []
        for node in contested:
            conflicts.append({
                "conflict_id": str(uuid.uuid4()),
                "node_ids": [node.id],
                "description": f"Node already CONTESTED: {node.content[:80]}",
                "severity": "high",
                "level": "pre-existing",
            })
        for issue in inconsistencies:
            conflicts.append({
                "conflict_id": str(uuid.uuid4()),
                "node_ids": issue.get("node_ids", []),
                "description": issue.get("description", ""),
                "severity": issue.get("severity", "medium"),
                "level": issue.get("level", "unknown"),
            })
        return conflicts

    @staticmethod
    def _collect_sources(mind_map, node_ids: list[str]) -> list[dict]:
        """Gather source dicts from the specified nodes."""
        sources: list[dict] = []
        for nid in node_ids:
            node = mind_map.get_node(nid)
            if node is None:
                continue
            for src in node.sources:
                entry = src if isinstance(src, dict) else {"url": str(src)}
                if entry not in sources:
                    sources.append(entry)
        return sources

    @staticmethod
    def _apply_resolutions(resolutions: list[dict], mind_map) -> None:
        """Update mind-map node confidence based on resolutions."""
        for res in resolutions:
            winning_id = res.get("winning_node")
            if winning_id:
                node = mind_map.get_node(winning_id)
                if node:
                    node.update_confidence(ConfidenceLevel.HIGH)
            for nid in res.get("rejected_nodes", []):
                node = mind_map.get_node(nid)
                if node:
                    node.update_confidence(ConfidenceLevel.CONTESTED)
                    node.metadata["contest_reason"] = res.get("reason", "")
