"""TaskGraph: a DAG of research tasks with dependency tracking."""

from __future__ import annotations

from collections import deque
from typing import Optional

from .task_node import TaskNode, TaskStatus


class TaskGraph:
    """Directed acyclic graph of TaskNodes."""

    def __init__(self) -> None:
        self._nodes: dict[str, TaskNode] = {}
        self._adjacency: dict[str, list[str]] = {}  # task_id -> dependents

    # --- Mutation ---

    def add_task(self, node: TaskNode) -> None:
        """Add a task node to the graph."""
        self._nodes[node.id] = node
        self._adjacency.setdefault(node.id, [])
        for dep_id in node.dependencies:
            self._adjacency.setdefault(dep_id, [])
            if node.id not in self._adjacency[dep_id]:
                self._adjacency[dep_id].append(node.id)

    def add_dependency(self, task_id: str, depends_on_id: str) -> None:
        """Declare that task_id depends on depends_on_id."""
        task = self._nodes.get(task_id)
        if task is None:
            raise KeyError(f"Task {task_id} not found.")
        if depends_on_id not in self._nodes:
            raise KeyError(f"Dependency {depends_on_id} not found.")
        if depends_on_id not in task.dependencies:
            task.dependencies.append(depends_on_id)
        self._adjacency.setdefault(depends_on_id, [])
        if task_id not in self._adjacency[depends_on_id]:
            self._adjacency[depends_on_id].append(task_id)

    def add_dynamic_task(self, node: TaskNode) -> None:
        """Add a task at runtime (alias for add_task)."""
        self.add_task(node)

    # --- Queries ---

    def get_task(self, task_id: str) -> Optional[TaskNode]:
        return self._nodes.get(task_id)

    def get_ready_tasks(self) -> list[TaskNode]:
        """Return PENDING tasks whose dependencies are all COMPLETED."""
        completed_ids = {
            tid
            for tid, t in self._nodes.items()
            if t.status == TaskStatus.COMPLETED
        }
        return [
            t
            for t in self._nodes.values()
            if t.status == TaskStatus.PENDING and t.is_ready(completed_ids)
        ]

    def get_progress(self) -> dict:
        """Return counts of tasks by status."""
        total = len(self._nodes)
        completed = sum(
            1 for t in self._nodes.values()
            if t.status == TaskStatus.COMPLETED
        )
        failed = sum(
            1 for t in self._nodes.values()
            if t.status == TaskStatus.FAILED
        )
        running = sum(
            1 for t in self._nodes.values()
            if t.status == TaskStatus.RUNNING
        )
        return {
            "total": total,
            "completed": completed,
            "failed": failed,
            "running": running,
            "pending": total - completed - failed - running,
        }

    def get_topological_layers(self) -> list[list[TaskNode]]:
        """Return tasks grouped into dependency layers (Kahn's algo)."""
        in_degree: dict[str, int] = {tid: 0 for tid in self._nodes}
        for t in self._nodes.values():
            for dep in t.dependencies:
                if dep in self._nodes:
                    in_degree[t.id] = in_degree.get(t.id, 0) + 1

        queue = deque(
            tid for tid, deg in in_degree.items() if deg == 0
        )
        layers: list[list[TaskNode]] = []
        while queue:
            layer_ids = list(queue)
            queue.clear()
            layers.append([self._nodes[tid] for tid in layer_ids])
            for tid in layer_ids:
                for dep_tid in self._adjacency.get(tid, []):
                    in_degree[dep_tid] -= 1
                    if in_degree[dep_tid] == 0:
                        queue.append(dep_tid)
        return layers

    # --- Serialisation ---

    def to_dict(self) -> dict:
        return {
            "nodes": {tid: t.to_dict() for tid, t in self._nodes.items()},
            "adjacency": {k: list(v) for k, v in self._adjacency.items()},
        }

    @classmethod
    def from_dict(cls, data: dict) -> TaskGraph:
        tg = cls()
        for tid, tdata in data.get("nodes", {}).items():
            tg._nodes[tid] = TaskNode.from_dict(tdata)
        tg._adjacency = {
            k: list(v) for k, v in data.get("adjacency", {}).items()
        }
        return tg
