"""MindMapNode dataclass for the epistemic mind map."""

from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from enum import Enum
from typing import Optional


class NodeType(str, Enum):
    CLAIM = "CLAIM"
    CONCEPT = "CONCEPT"
    QUESTION = "QUESTION"
    EVIDENCE = "EVIDENCE"
    PERSPECTIVE = "PERSPECTIVE"


class ConfidenceLevel(str, Enum):
    VERIFIED = "VERIFIED"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"
    CONTESTED = "CONTESTED"
    UNVERIFIED = "UNVERIFIED"


@dataclass
class MindMapNode:
    """A single node in the epistemic mind map."""

    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    node_type: NodeType = NodeType.CONCEPT
    content: str = ""
    confidence: ConfidenceLevel = ConfidenceLevel.UNVERIFIED
    sources: list[str] = field(default_factory=list)
    evidence_ids: list[str] = field(default_factory=list)
    perspectives: list[str] = field(default_factory=list)
    children: list[str] = field(default_factory=list)
    parent: Optional[str] = None
    metadata: dict = field(default_factory=dict)

    def update_confidence(self, level: ConfidenceLevel) -> None:
        """Update the confidence level of this node."""
        if isinstance(level, str):
            level = ConfidenceLevel(level)
        self.confidence = level

    def add_evidence(self, evidence_id: str) -> None:
        """Link an evidence ID to this node."""
        if evidence_id not in self.evidence_ids:
            self.evidence_ids.append(evidence_id)

    def add_source(self, source_ref: str) -> None:
        """Add a source reference to this node."""
        if source_ref not in self.sources:
            self.sources.append(source_ref)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "node_type": self.node_type.value,
            "content": self.content,
            "confidence": self.confidence.value,
            "sources": list(self.sources),
            "evidence_ids": list(self.evidence_ids),
            "perspectives": list(self.perspectives),
            "children": list(self.children),
            "parent": self.parent,
            "metadata": dict(self.metadata),
        }

    @classmethod
    def from_dict(cls, data: dict) -> MindMapNode:
        data = dict(data)
        data["node_type"] = NodeType(data.get("node_type", "CONCEPT"))
        data["confidence"] = ConfidenceLevel(
            data.get("confidence", "UNVERIFIED")
        )
        return cls(**data)
