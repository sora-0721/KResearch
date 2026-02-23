"""Verify factual claims by cross-referencing search results."""

from __future__ import annotations

import json
import logging
from typing import Any

logger = logging.getLogger(__name__)

_ASSESS_PROMPT = """\
You are a fact-verification analyst. Given a claim and a set of search \
results, determine whether the evidence supports or refutes the claim.

Claim: {claim}

Search results:
{results}

Return a JSON object with EXACTLY these keys:
- "verdict": one of "supported", "refuted", "inconclusive"
- "confidence": float between 0.0 and 1.0
- "supporting": list of brief descriptions of supporting evidence
- "contradicting": list of brief descriptions of contradicting evidence
- "reasoning": brief explanation of your assessment

Return ONLY valid JSON. No markdown fences."""


async def verify_with_data(
    claim: dict,
    search_provider: Any,
    llm_provider: Any,
) -> dict:
    """Verify a factual claim via web search and LLM assessment.

    Searches for corroborating and contradicting evidence, then uses
    the LLM to assess the overall verdict.

    Returns a dict with keys:
        verified, confidence, supporting, contradicting
    """
    claim_text = claim.get("claim", "")

    # Step 1: Search for supporting evidence
    support_query = f"evidence for: {claim_text}"
    support_results = await search_provider.search(
        support_query, max_results=5,
    )

    # Step 2: Search for contradicting evidence
    contra_query = f"evidence against: {claim_text}"
    contra_results = await search_provider.search(
        contra_query, max_results=5,
    )

    all_results = support_results + contra_results
    if not all_results:
        logger.warning("No search results found for claim: %s", claim_text)
        return {
            "verified": False,
            "confidence": 0.2,
            "supporting": [],
            "contradicting": ["No search results found"],
        }

    # Step 3: Format results for LLM assessment
    results_text = _format_results(all_results)

    # Step 4: LLM assessment
    prompt = _ASSESS_PROMPT.format(claim=claim_text, results=results_text)
    response = await llm_provider.complete(
        messages=[{"role": "user", "content": prompt}],
        model=llm_provider.available_models[0],
        temperature=0.1,
        max_tokens=1024,
        json_mode=True,
    )

    raw = response["content"]
    try:
        assessment = json.loads(raw) if isinstance(raw, str) else raw
    except json.JSONDecodeError:
        logger.error("LLM returned invalid JSON for data verification.")
        return {
            "verified": False,
            "confidence": 0.1,
            "supporting": [],
            "contradicting": ["Failed to parse LLM assessment"],
        }

    verdict = assessment.get("verdict", "inconclusive")
    return {
        "verified": verdict == "supported",
        "confidence": float(assessment.get("confidence", 0.3)),
        "supporting": assessment.get("supporting", []),
        "contradicting": assessment.get("contradicting", []),
    }


def _format_results(results: list[dict], max_items: int = 8) -> str:
    """Format search results into a compact text block for the LLM."""
    lines: list[str] = []
    for i, r in enumerate(results[:max_items], 1):
        title = r.get("title", "Untitled")
        snippet = r.get("snippet", "")
        url = r.get("url", "")
        lines.append(f"{i}. [{title}]({url})\n   {snippet}")
    return "\n\n".join(lines)
