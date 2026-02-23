"""Data classes for sources and evidence."""

from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional


@dataclass
class Source:
    """A retrieved source with provenance metadata."""

    url: str
    title: str
    snippet: str
    provider: str
    retrieved_at: datetime = field(default_factory=datetime.utcnow)
    credibility_tier: int = 3  # 1 (highest) to 5 (lowest)

    def __post_init__(self) -> None:
        if not 1 <= self.credibility_tier <= 5:
            raise ValueError(
                f"credibility_tier must be 1-5, got {self.credibility_tier}"
            )

    def to_dict(self) -> dict:
        return {
            "url": self.url,
            "title": self.title,
            "snippet": self.snippet,
            "provider": self.provider,
            "retrieved_at": self.retrieved_at.isoformat(),
            "credibility_tier": self.credibility_tier,
        }

    @classmethod
    def from_dict(cls, data: dict) -> Source:
        data = dict(data)
        if isinstance(data.get("retrieved_at"), str):
            data["retrieved_at"] = datetime.fromisoformat(data["retrieved_at"])
        return cls(**data)


@dataclass
class Evidence:
    """A piece of evidence linked to one or more sources."""

    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    content: str = ""
    sources: list[Source] = field(default_factory=list)
    evidence_type: str = "factual"  # factual, statistical, anecdotal, expert
    confidence: float = 0.5
    verified: bool = False

    def __post_init__(self) -> None:
        if not 0.0 <= self.confidence <= 1.0:
            raise ValueError(
                f"confidence must be 0.0-1.0, got {self.confidence}"
            )

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "content": self.content,
            "sources": [s.to_dict() for s in self.sources],
            "evidence_type": self.evidence_type,
            "confidence": self.confidence,
            "verified": self.verified,
        }

    @classmethod
    def from_dict(cls, data: dict) -> Evidence:
        data = dict(data)
        data["sources"] = [
            Source.from_dict(s) for s in data.get("sources", [])
        ]
        return cls(**data)
