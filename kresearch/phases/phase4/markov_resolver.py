"""Markov-based epistemic conflict resolver."""

from __future__ import annotations

import json
import logging
import uuid
from datetime import datetime
from typing import Any

from .source_hierarchy import rank_source

logger = logging.getLogger(__name__)

_RESOLVE_PROMPT = """\
You are a conflict-resolution specialist for a research system. Given a \
conflict between claims and their transition-probability scores, decide \
which claim is most likely correct.

Return a JSON object with:
- "winning_node_id": the ID of the most credible node
- "rejected_node_ids": list of IDs for rejected nodes
- "reason": a 1-2 sentence explanation
- "confidence": float between 0.0 and 1.0

Return ONLY valid JSON. No markdown fences."""


async def resolve_conflicts(
    conflicts: list[dict[str, Any]], mind_map, llm_provider,
) -> list[dict[str, Any]]:
    """Resolve each conflict using Markov transition probabilities."""
    resolutions: list[dict[str, Any]] = []
    for conflict in conflicts:
        node_ids = conflict.get("node_ids", [])
        if not node_ids:
            continue
        probs = _calculate_probabilities(node_ids, mind_map)
        resolution = await _resolve_single(conflict, probs, mind_map, llm_provider)
        resolution["conflict_id"] = conflict.get("conflict_id", str(uuid.uuid4()))
        resolutions.append(resolution)
    return resolutions


def _calculate_probabilities(
    node_ids: list[str], mind_map,
) -> dict[str, float]:
    """Compute transition probability per node from credibility, recency, corroboration."""
    scores: dict[str, float] = {}
    for nid in node_ids:
        node = mind_map.get_node(nid)
        if node is None:
            scores[nid] = 0.0
            continue
        cred = _avg_credibility(node)
        recency = _recency_score(node)
        corroboration = min(len(node.sources) / 5.0, 1.0)
        scores[nid] = 0.4 * cred + 0.3 * recency + 0.3 * corroboration
    total = sum(scores.values())
    if total > 0:
        scores = {k: v / total for k, v in scores.items()}
    return scores


def _avg_credibility(node) -> float:
    """Average credibility of a node's sources, normalized to [0,1]."""
    if not node.sources:
        return 0.2
    total = sum(
        rank_source(s if isinstance(s, dict) else {"url": str(s)})
        for s in node.sources
    )
    return (total / len(node.sources)) / 5.0


def _recency_score(node) -> float:
    """Score based on information recency (0.0 - 1.0)."""
    ts = node.metadata.get("retrieved_at") or node.metadata.get("date")
    if not ts:
        return 0.5
    try:
        if isinstance(ts, str):
            dt = datetime.fromisoformat(ts.replace("Z", "+00:00"))
        elif isinstance(ts, (int, float)):
            dt = datetime.fromtimestamp(ts)
        else:
            return 0.5
        age_days = (datetime.now(dt.tzinfo) - dt).days
        return max(0.0, min(1.0, 0.5 ** (age_days / 180.0)))
    except (ValueError, TypeError, OSError):
        return 0.5


async def _resolve_single(
    conflict: dict, probabilities: dict[str, float], mind_map, llm_provider,
) -> dict[str, Any]:
    """Ask the LLM to adjudicate a single conflict."""
    summaries = []
    for nid, prob in probabilities.items():
        node = mind_map.get_node(nid)
        summaries.append(
            f"Node {nid}: P={prob:.3f} | {node.content[:150] if node else 'Unknown'}"
        )
    user_msg = (
        f"Conflict: {conflict.get('description', 'No description')}\n"
        f"Severity: {conflict.get('severity', 'unknown')}\n\n"
        f"Nodes and transition probabilities:\n" + "\n".join(summaries)
    )
    try:
        response = await llm_provider.complete(
            messages=[{"role": "user", "content": user_msg}],
            model=llm_provider.available_models[0], temperature=0.1, max_tokens=512,
            json_mode=True, system_prompt=_RESOLVE_PROMPT,
        )
        raw = response["content"]
        result = json.loads(raw) if isinstance(raw, str) else raw
        return _normalize_resolution(result, conflict, probabilities)
    except (json.JSONDecodeError, KeyError, TypeError) as exc:
        logger.warning("LLM resolution failed: %s", exc)
        return _fallback_resolution(conflict, probabilities)


def _normalize_resolution(result: dict, conflict: dict, probs: dict) -> dict[str, Any]:
    """Ensure the resolution dict has all required keys."""
    node_ids = conflict.get("node_ids", [])
    winning = result.get("winning_node_id")
    if winning not in probs:
        winning = max(probs, key=probs.get) if probs else None
    rejected = result.get("rejected_node_ids") or [n for n in node_ids if n != winning]
    return {
        "winning_node": winning, "rejected_nodes": rejected,
        "reason": result.get("reason", "Resolved by probability analysis"),
        "confidence": float(result.get("confidence", 0.5)),
        "resolution": "resolved", "probabilities": probs,
    }


def _fallback_resolution(conflict: dict, probs: dict) -> dict[str, Any]:
    """When LLM fails, pick the node with highest probability."""
    nids = conflict.get("node_ids", [])
    if not probs:
        return {"winning_node": None, "rejected_nodes": nids,
                "reason": "No nodes available", "confidence": 0.0,
                "resolution": "unresolved", "probabilities": probs}
    winner = max(probs, key=probs.get)
    return {"winning_node": winner, "probabilities": probs,
            "rejected_nodes": [n for n in nids if n != winner],
            "reason": "Fallback: highest transition probability",
            "confidence": probs[winner], "resolution": "resolved_fallback"}
