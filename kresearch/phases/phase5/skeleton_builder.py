"""Skeleton builder: creates a structured report outline from the mind map."""

from __future__ import annotations

import json
import logging
from typing import Any

from kresearch.core.mind_map import EpistemicMindMap

logger = logging.getLogger(__name__)

_SKELETON_SYSTEM_PROMPT = """\
You are a research report architect. Given a research query, parsed intent, \
and a set of mind-map nodes (each with an ID, content, confidence level, and \
sources), produce a structured JSON report skeleton.

Group related nodes into thematic sections. Each section should have:
- "heading": a clear section title
- "key_points": list of 2-5 bullet-point strings summarising what this \
section should cover
- "source_node_ids": list of mind-map node IDs that feed into this section

The top-level JSON must have:
- "title": a concise, informative report title
- "sections": list of section objects as described above

Return ONLY valid JSON. No markdown fences, no commentary."""


def _serialize_nodes(mind_map: EpistemicMindMap) -> list[dict]:
    """Convert mind-map nodes to a compact list for the LLM prompt."""
    data = mind_map.to_dict()
    nodes = []
    for nid, node_data in data.get("nodes", {}).items():
        nodes.append({
            "id": nid,
            "type": node_data.get("node_type", "CONCEPT"),
            "content": node_data.get("content", ""),
            "confidence": node_data.get("confidence", "UNVERIFIED"),
            "sources": node_data.get("sources", []),
        })
    return nodes


async def build_skeleton(
    mind_map: EpistemicMindMap,
    query: str,
    intent: dict[str, Any] | None,
    llm_provider: Any,
) -> dict[str, Any]:
    """Build a report skeleton by clustering mind-map nodes into sections.

    Returns a dict with keys: title, sections (list of section dicts).
    """
    nodes = _serialize_nodes(mind_map)
    if not nodes:
        logger.warning("Mind map is empty; returning minimal skeleton.")
        return {
            "title": intent.get("topic", query) if intent else query,
            "sections": [{"heading": "Findings", "key_points": [], "source_node_ids": []}],
        }

    intent_summary = json.dumps(intent, default=str) if intent else "N/A"
    user_msg = (
        f"Research query: {query}\n\n"
        f"Parsed intent: {intent_summary}\n\n"
        f"Mind-map nodes ({len(nodes)} total):\n"
        f"{json.dumps(nodes, indent=2, default=str)}"
    )

    response = await llm_provider.complete(
        messages=[{"role": "user", "content": user_msg}],
        model=llm_provider.available_models[0],
        temperature=0.3,
        max_tokens=2048,
        json_mode=True,
        system_prompt=_SKELETON_SYSTEM_PROMPT,
    )

    raw = response["content"]
    skeleton = json.loads(raw) if isinstance(raw, str) else raw

    # Ensure required keys
    skeleton.setdefault("title", query)
    skeleton.setdefault("sections", [])
    for section in skeleton["sections"]:
        section.setdefault("heading", "Untitled Section")
        section.setdefault("key_points", [])
        section.setdefault("source_node_ids", [])

    logger.info(
        "Built skeleton: '%s' with %d sections",
        skeleton["title"],
        len(skeleton["sections"]),
    )
    return skeleton
