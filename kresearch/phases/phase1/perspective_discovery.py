"""Discover diverse expert perspectives for a research query (STORM-style)."""

from __future__ import annotations

import json
import logging
from typing import Any

logger = logging.getLogger(__name__)

_PERSPECTIVE_SYSTEM_PROMPT = """\
You are an expert research-team assembler.  Given a research query and its \
structured intent, generate between 3 and 6 diverse expert perspectives \
that should be consulted to produce a comprehensive report.

Return a JSON array where each element has EXACTLY these keys:
- "name": a short label for the perspective (e.g. "Domain Expert")
- "role": one-sentence description of the expert's role
- "expertise": list of 2-4 areas of expertise relevant to the query
- "questions": list of 2-5 specific research questions this expert \
  would investigate

Ensure the perspectives span different viewpoints, methodologies, \
and disciplines. Return ONLY valid JSON. No markdown, no commentary."""


async def discover_perspectives(
    query: str,
    intent: dict[str, Any],
    llm_provider: Any,
    config: dict[str, Any],
) -> list[dict[str, Any]]:
    """Use an LLM to generate 3-6 expert perspectives for *query*.

    Parameters
    ----------
    query:
        The original research query.
    intent:
        Structured intent dict (topic, sub_questions, complexity, ...).
    llm_provider:
        An initialised :class:`LLMProvider` instance.
    config:
        Application configuration dict (used to pick the model).

    Returns
    -------
    list[dict]
        A list of perspective dicts, each containing *name*, *role*,
        *expertise*, and *questions*.
    """
    model = config.get("default_model", "gpt-4o")

    user_content = (
        f"Research query: {query}\n\n"
        f"Parsed intent:\n{json.dumps(intent, indent=2)}\n\n"
        "Generate 3-6 expert perspectives for this research topic."
    )

    response = await llm_provider.complete(
        messages=[{"role": "user", "content": user_content}],
        model=model,
        temperature=0.5,
        max_tokens=2048,
        json_mode=True,
        system_prompt=_PERSPECTIVE_SYSTEM_PROMPT,
    )

    raw = response["content"]
    perspectives = json.loads(raw) if isinstance(raw, str) else raw

    # The LLM may wrap the array inside an object key -- unwrap if needed.
    if isinstance(perspectives, dict):
        for key in ("perspectives", "experts", "data"):
            if key in perspectives and isinstance(perspectives[key], list):
                perspectives = perspectives[key]
                break
        else:
            perspectives = list(perspectives.values())[0]

    # Validate and normalise each perspective
    validated: list[dict[str, Any]] = []
    for p in perspectives:
        validated.append({
            "name": p.get("name", "Expert"),
            "role": p.get("role", ""),
            "expertise": p.get("expertise", []),
            "questions": p.get("questions", []),
        })

    if not validated:
        logger.warning("No perspectives returned; creating a default one.")
        validated.append({
            "name": "General Researcher",
            "role": "Broad-scope research analyst",
            "expertise": [intent.get("topic", query)],
            "questions": intent.get("sub_questions", [query])[:3],
        })

    logger.info("Discovered %d perspectives", len(validated))
    return validated
