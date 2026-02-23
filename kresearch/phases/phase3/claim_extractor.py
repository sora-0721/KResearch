"""Extract verifiable claims from the epistemic mind map."""

from __future__ import annotations

import json
import logging
from typing import Any

from kresearch.core.mind_map import EpistemicMindMap
from kresearch.core.mind_map_node import ConfidenceLevel

logger = logging.getLogger(__name__)

_EXTRACTION_PROMPT = """\
You are a claim-verification analyst. Given a list of research claims, \
identify which ones are concretely verifiable and classify each.

For each verifiable claim, return a JSON array of objects with keys:
- "node_id": the original node ID (string)
- "claim": the exact claim text
- "claim_type": one of "numerical", "computational", "statistical", "factual"
- "verification_approach": a brief description of how to verify it

Classify as:
- "numerical": specific numbers, dates, quantities, measurements
- "computational": calculations, formulas, algorithms that can be executed
- "statistical": percentages, trends, comparisons, distributions
- "factual": named entities, events, relationships checkable via search

Return ONLY a valid JSON array. No markdown fences."""


async def extract_claims(
    mind_map: EpistemicMindMap,
    llm_provider: Any,
) -> list[dict]:
    """Scan the mind map for unverified/low-confidence claims.

    Uses the LLM to identify which claims are concretely verifiable
    and to classify them by type.

    Returns a list of dicts, each with keys:
        node_id, claim, claim_type, verification_approach
    """
    # Gather candidate nodes: UNVERIFIED or LOW confidence
    candidates = mind_map.get_unverified_claims()
    low_nodes = mind_map.get_by_confidence(ConfidenceLevel.LOW)
    candidates.extend(n for n in low_nodes if n not in candidates)

    if not candidates:
        logger.info("No unverified or low-confidence claims found.")
        return []

    # Build a compact representation for the LLM
    claims_text = "\n".join(
        f"[{node.id}] {node.content}" for node in candidates
    )

    logger.info(
        "Extracting verifiable claims from %d candidate nodes.",
        len(candidates),
    )

    response = await llm_provider.complete(
        messages=[{"role": "user", "content": claims_text}],
        model=llm_provider.available_models[0],
        temperature=0.1,
        max_tokens=2048,
        json_mode=True,
        system_prompt=_EXTRACTION_PROMPT,
    )

    raw = response["content"]
    try:
        extracted = json.loads(raw) if isinstance(raw, str) else raw
    except json.JSONDecodeError:
        logger.error("LLM returned invalid JSON for claim extraction.")
        return []

    if not isinstance(extracted, list):
        extracted = [extracted] if isinstance(extracted, dict) else []

    # Validate and filter
    valid_types = {"numerical", "computational", "statistical", "factual"}
    valid_node_ids = {n.id for n in candidates}
    results: list[dict] = []

    for item in extracted:
        if not isinstance(item, dict):
            continue
        if item.get("node_id") not in valid_node_ids:
            continue
        if item.get("claim_type") not in valid_types:
            continue
        results.append({
            "node_id": item["node_id"],
            "claim": item.get("claim", ""),
            "claim_type": item["claim_type"],
            "verification_approach": item.get(
                "verification_approach", ""
            ),
        })

    logger.info("Extracted %d verifiable claims.", len(results))
    return results
