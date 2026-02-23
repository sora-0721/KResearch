"""Data classes for LLM messaging."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Optional


@dataclass
class Message:
    """A single message in a conversation."""

    role: str  # "system", "user", "assistant"
    content: str
    metadata: dict = field(default_factory=dict)

    def to_dict(self) -> dict:
        return {
            "role": self.role,
            "content": self.content,
            "metadata": self.metadata,
        }

    @classmethod
    def from_dict(cls, data: dict) -> Message:
        return cls(
            role=data["role"],
            content=data["content"],
            metadata=data.get("metadata", {}),
        )


@dataclass
class LLMRequest:
    """A request to an LLM provider."""

    messages: list[Message]
    model: str = "gpt-4o"
    temperature: float = 0.7
    max_tokens: int = 4096
    json_mode: bool = False
    system_prompt: Optional[str] = None

    def to_dict(self) -> dict:
        result: dict[str, Any] = {
            "messages": [m.to_dict() for m in self.messages],
            "model": self.model,
            "temperature": self.temperature,
            "max_tokens": self.max_tokens,
            "json_mode": self.json_mode,
        }
        if self.system_prompt is not None:
            result["system_prompt"] = self.system_prompt
        return result


@dataclass
class LLMResponse:
    """A response from an LLM provider."""

    content: str
    model: str
    usage: dict = field(default_factory=dict)
    raw: Any = None

    def to_dict(self) -> dict:
        return {
            "content": self.content,
            "model": self.model,
            "usage": self.usage,
        }

    @classmethod
    def from_dict(cls, data: dict) -> LLMResponse:
        return cls(
            content=data["content"],
            model=data["model"],
            usage=data.get("usage", {}),
        )
