"""TaskNode dataclass for the research task graph."""

from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Optional


class TaskType(str, Enum):
    SEARCH = "SEARCH"
    DISCOURSE = "DISCOURSE"
    VERIFY = "VERIFY"


class TaskStatus(str, Enum):
    PENDING = "PENDING"
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


@dataclass
class TaskNode:
    """A single task in the research task graph."""

    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    task_type: TaskType = TaskType.SEARCH
    query: str = ""
    priority: int = 0
    status: TaskStatus = TaskStatus.PENDING
    dependencies: list[str] = field(default_factory=list)
    results: list[Any] = field(default_factory=list)
    metadata: dict = field(default_factory=dict)
    perspective: Optional[str] = None

    def is_ready(self, completed_ids: set[str] | list[str]) -> bool:
        """Return True if all dependencies are in completed_ids."""
        completed = set(completed_ids)
        return all(dep in completed for dep in self.dependencies)

    def mark_running(self) -> None:
        """Transition this task to RUNNING status."""
        self.status = TaskStatus.RUNNING

    def mark_completed(self, results: list[Any]) -> None:
        """Transition to COMPLETED and store results."""
        self.status = TaskStatus.COMPLETED
        self.results = results

    def mark_failed(self, error: str) -> None:
        """Transition to FAILED and store error in metadata."""
        self.status = TaskStatus.FAILED
        self.metadata["error"] = error

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "task_type": self.task_type.value,
            "query": self.query,
            "priority": self.priority,
            "status": self.status.value,
            "dependencies": list(self.dependencies),
            "results": list(self.results),
            "metadata": dict(self.metadata),
            "perspective": self.perspective,
        }

    @classmethod
    def from_dict(cls, data: dict) -> TaskNode:
        data = dict(data)
        data["task_type"] = TaskType(data.get("task_type", "SEARCH"))
        data["status"] = TaskStatus(data.get("status", "PENDING"))
        return cls(**data)
