"""Evaluation loop: scores draft quality across multiple dimensions."""

from __future__ import annotations

import json
import logging
from typing import Any

logger = logging.getLogger(__name__)

_EVALUATOR_SYSTEM_PROMPT = """\
You are a rigorous research-report evaluator. Given a draft report and the \
original research query, score the draft on five dimensions using a 1-10 \
scale (10 = excellent):

1. **accuracy**: Are claims factually correct and well-supported?
2. **completeness**: Does the report cover all key aspects of the query?
3. **coherence**: Is the report logically structured and easy to follow?
4. **citations**: Are sources properly referenced and traceable?
5. **balance**: Does the report present multiple perspectives fairly?

Return a JSON object with EXACTLY these keys:
- "scores": {"accuracy": <int>, "completeness": <int>, "coherence": <int>, \
"citations": <int>, "balance": <int>}
- "feedback": a string with 2-4 specific, actionable improvement suggestions

Return ONLY valid JSON. No markdown fences."""


async def evaluate_draft(
    draft: str,
    query: str,
    llm_provider: Any,
) -> dict[str, Any]:
    """Score a draft report on five quality dimensions.

    Returns dict with: scores (dict of 5 ints), avg_score (float),
    feedback (str).
    """
    user_msg = (
        f"Original research query:\n{query}\n\n"
        f"Draft report to evaluate:\n{draft}"
    )

    response = await llm_provider.complete(
        messages=[{"role": "user", "content": user_msg}],
        model=getattr(llm_provider, "_default_model", "gpt-4o"),
        temperature=0.2,
        max_tokens=1024,
        json_mode=True,
        system_prompt=_EVALUATOR_SYSTEM_PROMPT,
    )

    raw = response["content"]
    result = json.loads(raw) if isinstance(raw, str) else raw

    # Normalise and validate scores
    scores = result.get("scores", {})
    dimensions = ["accuracy", "completeness", "coherence", "citations", "balance"]
    for dim in dimensions:
        val = scores.get(dim, 5)
        scores[dim] = max(1, min(10, int(val)))

    avg_score = sum(scores.values()) / len(scores) if scores else 0.0
    feedback = result.get("feedback", "No feedback provided.")

    logger.info(
        "Evaluation scores: %s (avg=%.1f)",
        scores,
        avg_score,
    )

    return {
        "scores": scores,
        "avg_score": round(avg_score, 2),
        "feedback": feedback,
    }
