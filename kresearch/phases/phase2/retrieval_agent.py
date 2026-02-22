"""Retrieval agent: executes search tasks against a search provider."""

from __future__ import annotations

import logging
from typing import Any

from kresearch.core.task_node import TaskNode

logger = logging.getLogger(__name__)


async def execute_search_task(
    task: TaskNode,
    search_provider: Any,
    event_bus: Any,
    max_results: int = 10,
) -> list[dict]:
    """Run a single SEARCH task and return normalised results.

    Parameters
    ----------
    task:
        The TaskNode to execute.  Its ``query`` field is used as the
        search string.
    search_provider:
        An object with an ``async search(query, max_results)`` method.
    event_bus:
        EventBus for publishing progress events.
    max_results:
        Maximum number of results to request from the provider.

    Returns
    -------
    list[dict]
        Each dict has keys: title, url, snippet, source.
    """
    task.mark_running()
    await event_bus.publish(
        "retrieval.start",
        {"task_id": task.id, "query": task.query},
    )

    try:
        raw_results = await search_provider.search(
            task.query, max_results=max_results,
        )
        results = _normalise_results(raw_results)
        task.mark_completed(results)
        await event_bus.publish(
            "retrieval.result",
            {
                "task_id": task.id,
                "query": task.query,
                "count": len(results),
            },
        )
        logger.info(
            "Search task %s returned %d results for '%s'",
            task.id,
            len(results),
            task.query,
        )
        return results

    except Exception as exc:
        logger.error(
            "Search task %s failed: %s", task.id, exc, exc_info=True,
        )
        task.mark_failed(str(exc))
        await event_bus.publish(
            "retrieval.error",
            {"task_id": task.id, "error": str(exc)},
        )
        return []


def _normalise_results(raw: list[dict]) -> list[dict]:
    """Ensure every result dict has the expected keys."""
    normalised: list[dict] = []
    for item in raw:
        normalised.append(
            {
                "title": item.get("title", ""),
                "url": item.get("url", ""),
                "snippet": item.get("snippet", ""),
                "source": item.get("source", "web"),
            }
        )
    return normalised
