"""Seed the EpistemicMindMap with initial structure from parsed intent."""

from __future__ import annotations

import logging
from typing import Any

from kresearch.core.mind_map import EpistemicMindMap
from kresearch.core.mind_map_node import (
    ConfidenceLevel,
    MindMapNode,
    NodeType,
)

logger = logging.getLogger(__name__)


async def initialize_mind_map(
    query: str,
    intent: dict[str, Any],
    perspectives: list[dict[str, Any]],
) -> EpistemicMindMap:
    """Create and populate an :class:`EpistemicMindMap` from Phase-1 outputs.

    Structure::

        ROOT (CONCEPT) -- the query topic
         +-- PERSPECTIVE node  (per expert viewpoint)
              +-- QUESTION node (per research question)

    All nodes begin at :attr:`ConfidenceLevel.UNVERIFIED`.

    Parameters
    ----------
    query:
        The original research query.
    intent:
        Parsed intent dict (used for topic label).
    perspectives:
        List of perspective dicts with *name* and *questions*.

    Returns
    -------
    EpistemicMindMap
        A seeded mind map ready for enrichment in later phases.
    """
    mind_map = EpistemicMindMap()

    # ---- Root node (CONCEPT) ----
    topic = intent.get("topic", query)
    root = MindMapNode(
        node_type=NodeType.CONCEPT,
        content=topic,
        confidence=ConfidenceLevel.UNVERIFIED,
        metadata={"role": "root", "complexity": intent.get("complexity")},
    )
    mind_map.add_node(root)

    # ---- Perspective and question nodes ----
    for perspective in perspectives:
        p_name = perspective.get("name", "Expert")

        p_node = MindMapNode(
            node_type=NodeType.PERSPECTIVE,
            content=p_name,
            confidence=ConfidenceLevel.UNVERIFIED,
            perspectives=[p_name],
            metadata={
                "role": perspective.get("role", ""),
                "expertise": perspective.get("expertise", []),
            },
        )
        mind_map.add_node(p_node)
        mind_map.add_edge(root.id, p_node.id, "has_perspective")

        for question in perspective.get("questions", []):
            q_node = MindMapNode(
                node_type=NodeType.QUESTION,
                content=question,
                confidence=ConfidenceLevel.UNVERIFIED,
                perspectives=[p_name],
                metadata={"source_perspective": p_name},
            )
            mind_map.add_node(q_node)
            mind_map.add_edge(p_node.id, q_node.id, "investigates")

    stats = mind_map.get_statistics()
    logger.info(
        "Initialised mind map: %d nodes, %d edges",
        stats["total_nodes"],
        stats["total_edges"],
    )
    return mind_map
