"""Seven-level epistemic consistency checker."""

from __future__ import annotations

import json
import logging
from typing import Any

logger = logging.getLogger(__name__)

# The seven consistency-check levels in order of evaluation.
CHECK_LEVELS = [
    "logical",
    "temporal",
    "numerical",
    "source",
    "perspective",
    "evidential",
    "inferential",
]

_SYSTEM_PROMPT = """\
You are an epistemic consistency auditor. Given a set of claims from a \
research mind map, check for {level} inconsistencies.

Rules for each level:
- logical: detect contradictions, fallacies, or mutually exclusive claims
- temporal: detect anachronisms or conflicting timelines
- numerical: detect contradictory statistics, figures, or measurements
- source: detect when the same source is cited for opposing conclusions
- perspective: detect when a single perspective contradicts itself
- evidential: detect when evidence is used to support conflicting claims
- inferential: detect flawed reasoning chains or unjustified leaps

Return a JSON array. Each element must have:
- "node_ids": list of node IDs involved
- "description": brief explanation of the inconsistency
- "severity": one of "low", "medium", "high", "critical"

If no inconsistencies are found, return an empty array: []
Return ONLY valid JSON. No markdown fences."""


async def check_consistency(
    mind_map, llm_provider
) -> list[dict[str, Any]]:
    """Run all 7 consistency levels against the mind map.

    Returns a flat list of inconsistency dicts, each tagged with its level.
    """
    all_issues: list[dict[str, Any]] = []
    nodes_payload = _serialize_nodes(mind_map)

    if not nodes_payload:
        logger.info("No nodes in mind map; skipping consistency check")
        return all_issues

    for level in CHECK_LEVELS:
        issues = await _check_level(level, nodes_payload, llm_provider)
        for issue in issues:
            issue["level"] = level
        all_issues.extend(issues)
        logger.debug("Level '%s' found %d issues", level, len(issues))

    return all_issues


async def _check_level(
    level: str, nodes_payload: str, llm_provider
) -> list[dict[str, Any]]:
    """Run a single consistency-check level via the LLM."""
    prompt = _SYSTEM_PROMPT.format(level=level)
    user_msg = (
        f"Check these mind-map nodes for {level} inconsistencies:\n\n"
        f"{nodes_payload}"
    )

    try:
        response = await llm_provider.complete(
            messages=[{"role": "user", "content": user_msg}],
            model=None,
            temperature=0.2,
            max_tokens=2048,
            json_mode=True,
            system_prompt=prompt,
        )
        raw = response["content"]
        parsed = json.loads(raw) if isinstance(raw, str) else raw

        if isinstance(parsed, list):
            return [_validate_issue(item) for item in parsed if item]
        return []
    except (json.JSONDecodeError, KeyError, TypeError) as exc:
        logger.warning("Consistency check '%s' failed to parse: %s", level, exc)
        return []


def _validate_issue(item: Any) -> dict[str, Any]:
    """Ensure an issue dict has all required keys."""
    if not isinstance(item, dict):
        return {"node_ids": [], "description": str(item), "severity": "low"}
    item.setdefault("node_ids", [])
    item.setdefault("description", "Unspecified inconsistency")
    item.setdefault("severity", "medium")
    if item["severity"] not in ("low", "medium", "high", "critical"):
        item["severity"] = "medium"
    return item


def _serialize_nodes(mind_map) -> str:
    """Serialize mind-map nodes into a compact text representation."""
    data = mind_map.to_dict()
    nodes = data.get("nodes", {})
    if not nodes:
        return ""
    entries = []
    for nid, ndata in nodes.items():
        entries.append(
            f"[{nid}] ({ndata.get('confidence', '?')}) "
            f"{ndata.get('content', '')[:200]}"
        )
    return "\n".join(entries)
