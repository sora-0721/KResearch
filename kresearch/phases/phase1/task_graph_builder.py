"""Build the initial TaskGraph from parsed intent and perspectives."""

from __future__ import annotations

import logging
from typing import Any

from kresearch.core.task_node import TaskNode, TaskType
from kresearch.core.task_graph import TaskGraph

logger = logging.getLogger(__name__)

# Sub-questions whose complexity hints at contestation or nuance.
_CONTESTED_KEYWORDS = {
    "debate", "controversy", "contested", "disagree",
    "critique", "versus", "vs", "compare", "conflict",
}


async def build_task_graph(
    query: str,
    intent: dict[str, Any],
    perspectives: list[dict[str, Any]],
) -> TaskGraph:
    """Create a :class:`TaskGraph` with SEARCH, DISCOURSE, and VERIFY tasks.

    The dependency structure is:

        SEARCH (per question) -->  DISCOURSE (for complex sub-questions)
              |                           |
              +--> VERIFY (per claim needing verification)

    Parameters
    ----------
    query:
        The original research query.
    intent:
        Parsed intent containing *sub_questions* and *complexity*.
    perspectives:
        List of perspective dicts, each with a *questions* list.

    Returns
    -------
    TaskGraph
        A fully wired task graph ready for execution.
    """
    graph = TaskGraph()

    complexity = intent.get("complexity", "moderate")
    is_complex = complexity in ("complex", "expert")
    sub_questions = intent.get("sub_questions", [])

    # Collect all SEARCH task IDs grouped by perspective for wiring
    search_ids_by_perspective: dict[str, list[str]] = {}
    discourse_ids: list[str] = []

    # ---- 1. SEARCH tasks (one per perspective question) ----
    for perspective in perspectives:
        p_name = perspective.get("name", "Unknown")
        p_search_ids: list[str] = []

        for question in perspective.get("questions", []):
            task = TaskNode(
                task_type=TaskType.SEARCH,
                query=question,
                priority=_priority_for(question, is_complex),
                perspective=p_name,
                metadata={"source_perspective": p_name},
            )
            graph.add_task(task)
            p_search_ids.append(task.id)

        search_ids_by_perspective[p_name] = p_search_ids

    # ---- 2. DISCOURSE tasks (for complex / contested sub-questions) ----
    for sq in sub_questions:
        if not _needs_discourse(sq, is_complex):
            continue

        # Depend on all SEARCH tasks whose query overlaps this sub-question
        deps = _find_related_searches(sq, graph)

        task = TaskNode(
            task_type=TaskType.DISCOURSE,
            query=sq,
            priority=2,
            dependencies=deps,
            metadata={"sub_question": sq},
        )
        graph.add_task(task)
        discourse_ids.append(task.id)

    # ---- 3. VERIFY tasks (one per DISCOURSE task) ----
    for d_id in discourse_ids:
        task = TaskNode(
            task_type=TaskType.VERIFY,
            query=f"Verify claims from discourse: {graph.get_task(d_id).query}",
            priority=3,
            dependencies=[d_id],
            metadata={"discourse_task": d_id},
        )
        graph.add_task(task)

    total = graph.get_progress()["total"]
    logger.info("Built task graph with %d tasks", total)
    return graph


# ------------------------------------------------------------------
# Internal helpers
# ------------------------------------------------------------------


def _priority_for(question: str, is_complex: bool) -> int:
    """Assign a priority (lower = more urgent) based on heuristics."""
    return 1 if is_complex else 0


def _needs_discourse(sub_question: str, is_complex: bool) -> bool:
    """Decide whether a sub-question warrants a DISCOURSE task."""
    if is_complex:
        return True
    lower = sub_question.lower()
    return any(kw in lower for kw in _CONTESTED_KEYWORDS)


def _find_related_searches(
    sub_question: str, graph: TaskGraph
) -> list[str]:
    """Return IDs of SEARCH tasks whose query overlaps *sub_question*."""
    sq_words = set(sub_question.lower().split())
    related: list[str] = []

    progress = graph.get_progress()  # ensures graph has nodes
    if progress["total"] == 0:
        return related

    for layer in graph.get_topological_layers():
        for task in layer:
            if task.task_type != TaskType.SEARCH:
                continue
            task_words = set(task.query.lower().split())
            overlap = sq_words & task_words
            if len(overlap) >= 2:
                related.append(task.id)

    return related
