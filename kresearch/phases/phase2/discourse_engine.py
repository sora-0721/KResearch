"""Discourse engine: simulates multi-turn expert debate."""

from __future__ import annotations

import json
import logging
from typing import Any

from kresearch.core.task_node import TaskNode

logger = logging.getLogger(__name__)
_MIN_TURNS = 3
_MAX_TURNS = 5

_EXPERT_SYSTEM = (
    "You are a domain expert. Argue your position clearly, cite "
    "evidence from the provided context, and defend your claims. "
    "Perspective: {perspective}"
)
_INTERROGATOR_SYSTEM = (
    "You are a rigorous interrogator. Challenge the expert's claims, "
    "identify hidden assumptions, ask for evidence, and expose "
    "logical weaknesses."
)


async def run_discourse(
    task: TaskNode, perspectives: list[dict], llm_provider: Any,
    context_docs: list[Any], event_bus: Any, num_turns: int = _MAX_TURNS,
) -> dict:
    """Simulate a multi-turn debate between an expert and interrogator.

    Returns dict with ``findings`` (list of claims) and ``transcript``.
    """
    num_turns = max(_MIN_TURNS, min(num_turns, _MAX_TURNS))
    task.mark_running()
    await event_bus.publish("discourse.start",
                            {"task_id": task.id, "query": task.query})

    perspective_label = _pick_perspective(task, perspectives)
    context_text = _build_context_snippet(context_docs)
    transcript: list[dict] = []
    expert_msgs = _seed_expert(task.query, context_text)
    interr_msgs = _seed_interrogator(task.query)

    try:
        for turn in range(num_turns):
            # Expert turn
            expert_reply = await llm_provider.complete(
                messages=expert_msgs,
                system_prompt=_EXPERT_SYSTEM.format(perspective=perspective_label),
                temperature=0.7, max_tokens=600,
            )
            expert_text = expert_reply["content"]
            expert_msgs.append({"role": "assistant", "content": expert_text})
            transcript.append({"turn": turn + 1, "role": "expert", "text": expert_text})
            # Feed expert reply to interrogator
            interr_msgs.append({"role": "user", "content": expert_text})
            # Interrogator turn
            interr_reply = await llm_provider.complete(
                messages=interr_msgs, system_prompt=_INTERROGATOR_SYSTEM,
                temperature=0.6, max_tokens=400,
            )
            interr_text = interr_reply["content"]
            interr_msgs.append({"role": "assistant", "content": interr_text})
            transcript.append({"turn": turn + 1, "role": "interrogator", "text": interr_text})
            expert_msgs.append({"role": "user", "content": interr_text})

        findings = await _synthesise(llm_provider, transcript, task.query)
        result = {"findings": findings, "transcript": transcript}
        task.mark_completed([result])
        await event_bus.publish("discourse.complete",
                                {"task_id": task.id, "findings_count": len(findings)})
        return result
    except Exception as exc:
        logger.error("Discourse task %s failed: %s", task.id, exc)
        task.mark_failed(str(exc))
        await event_bus.publish("discourse.error",
                                {"task_id": task.id, "error": str(exc)})
        return {"findings": [], "transcript": transcript}


def _pick_perspective(task: TaskNode, perspectives: list[dict]) -> str:
    if task.perspective:
        return task.perspective
    if perspectives:
        return perspectives[0].get("name", "general analyst")
    return "general analyst"


def _build_context_snippet(docs: list[Any], max_chars: int = 3000) -> str:
    parts: list[str] = []
    total = 0
    for doc in docs:
        snippet = doc.get("snippet", "") if isinstance(doc, dict) else str(doc)
        if total + len(snippet) > max_chars:
            break
        parts.append(snippet)
        total += len(snippet)
    return "\n---\n".join(parts) if parts else "(no prior context)"


def _seed_expert(query: str, context: str) -> list[dict]:
    return [{"role": "user", "content": (
        f"Research question: {query}\n\nContext from prior retrieval:\n"
        f"{context}\n\nPresent your initial argument."
    )}]


def _seed_interrogator(query: str) -> list[dict]:
    return [{"role": "user", "content": (
        f"A domain expert will present arguments about: {query}. "
        "Your job is to challenge their claims rigorously."
    )}]


async def _synthesise(llm_provider: Any, transcript: list[dict], query: str) -> list[dict]:
    condensed = "\n".join(
        f"[{t['role']} turn {t['turn']}]: {t['text'][:300]}" for t in transcript
    )
    messages = [{"role": "user", "content": (
        f"Below is a debate transcript about: {query}\n\n{condensed}\n\n"
        "Extract key findings as JSON: a list of objects with "
        "\"claim\" (string), \"confidence\" (float 0-1), and "
        "\"perspectives\" (list of strings)."
    )}]
    resp = await llm_provider.complete(
        messages=messages, temperature=0.3, max_tokens=800, json_mode=True,
    )
    try:
        parsed = json.loads(resp["content"])
        if isinstance(parsed, list):
            return parsed
        return parsed.get("findings", [])
    except (json.JSONDecodeError, TypeError):
        return [{"claim": resp["content"], "confidence": 0.5, "perspectives": []}]
