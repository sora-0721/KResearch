"""SwarmCoordinator: orchestrates decentralized swarm retrieval."""

from __future__ import annotations

import asyncio
import logging
from typing import Any

from kresearch.core.mind_map_node import ConfidenceLevel, MindMapNode, NodeType
from kresearch.core.task_node import TaskNode, TaskType
from kresearch.phases.base import Phase
from .discourse_engine import run_discourse
from .retrieval_agent import execute_search_task

logger = logging.getLogger(__name__)

_DEFAULT_SEARCH_CONCURRENCY = 5
_DEFAULT_LLM_CONCURRENCY = 3


class SwarmCoordinator(Phase):
    """Phase 2 -- process the task graph using concurrent swarm agents."""

    @property
    def phase_number(self) -> int:
        return 2

    @property
    def phase_name(self) -> str:
        return "Decentralized Swarm Retrieval"

    async def execute(self) -> None:
        """Walk the task graph layer-by-layer, executing tasks concurrently."""
        concurrency = getattr(self.config, "concurrency", None)
        per_limits = getattr(concurrency, "per_provider_limits", {}) if concurrency else {}
        self._search_sem = asyncio.Semaphore(
            per_limits.get("search", _DEFAULT_SEARCH_CONCURRENCY),
        )
        self._llm_sem = asyncio.Semaphore(
            per_limits.get("llm", _DEFAULT_LLM_CONCURRENCY),
        )
        layers = self.session.task_graph.get_topological_layers()
        for layer_idx, layer in enumerate(layers):
            logger.info(
                "Processing layer %d/%d (%d tasks)",
                layer_idx + 1, len(layers), len(layer),
            )
            await self._process_layer(layer)
            await self.event_bus.publish(
                "phase.progress",
                {"layer": layer_idx + 1,
                 "progress": self.session.task_graph.get_progress()},
            )

    async def _process_layer(self, tasks: list[TaskNode]) -> None:
        """Execute all tasks in a single dependency layer concurrently."""
        coros = [self._dispatch_task(t) for t in tasks]
        results = await asyncio.gather(*coros, return_exceptions=True)
        for task, result in zip(tasks, results):
            if isinstance(result, BaseException):
                logger.error("Task %s raised: %s", task.id, result)
                if task.status.value not in ("COMPLETED", "FAILED"):
                    task.mark_failed(str(result))

    async def _dispatch_task(self, task: TaskNode) -> Any:
        """Route a single task to the appropriate agent."""
        if task.task_type == TaskType.SEARCH:
            return await self._run_search(task)
        if task.task_type == TaskType.DISCOURSE:
            return await self._run_discourse(task)
        task.mark_completed([])
        return []

    async def _run_search(self, task: TaskNode) -> list[dict]:
        search_provider = await self._get_search()
        async with self._search_sem:
            results = await execute_search_task(
                task, search_provider, self.event_bus,
            )
        self.session.retrieved_documents.extend(results)
        self._update_mind_map_from_search(task, results)
        return results

    async def _run_discourse(self, task: TaskNode) -> dict:
        llm_provider = await self._get_llm()
        async with self._llm_sem:
            insights = await run_discourse(
                task, self.session.perspectives, llm_provider,
                self.session.retrieved_documents, self.event_bus,
                model=self.config.llm.model,
            )
        self._update_mind_map_from_discourse(task, insights)
        return insights

    def _update_mind_map_from_search(
        self, task: TaskNode, results: list[dict],
    ) -> None:
        for doc in results:
            node = MindMapNode(
                node_type=NodeType.EVIDENCE,
                content=doc.get("snippet", ""),
                confidence=ConfidenceLevel.UNVERIFIED,
                sources=[doc.get("url", "")],
                metadata={"title": doc.get("title", ""), "task": task.id},
            )
            self.session.mind_map.add_node(node)

    def _update_mind_map_from_discourse(
        self, task: TaskNode, insights: dict,
    ) -> None:
        for finding in insights.get("findings", []):
            conf = _confidence_from_score(finding.get("confidence", 0.5))
            node = MindMapNode(
                node_type=NodeType.CLAIM,
                content=finding.get("claim", ""),
                confidence=conf,
                perspectives=finding.get("perspectives", []),
                metadata={"task": task.id},
            )
            self.session.mind_map.add_node(node)


def _confidence_from_score(score: float) -> ConfidenceLevel:
    if score >= 0.8:
        return ConfidenceLevel.HIGH
    if score >= 0.5:
        return ConfidenceLevel.MEDIUM
    if score >= 0.3:
        return ConfidenceLevel.LOW
    return ConfidenceLevel.CONTESTED
