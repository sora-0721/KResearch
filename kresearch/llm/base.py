"""Abstract base class for LLM providers."""

from abc import ABC, abstractmethod
from typing import AsyncIterator


class LLMProvider(ABC):
    """Abstract base class that all LLM providers must implement."""

    def __init__(self, api_key: str | None = None, **kwargs):
        self._api_key = api_key

    @property
    @abstractmethod
    def name(self) -> str:
        """Return the provider name."""
        ...

    @property
    @abstractmethod
    def available_models(self) -> list[str]:
        """Return the list of models this provider supports."""
        ...

    @abstractmethod
    async def complete(
        self,
        messages: list[dict],
        model: str,
        temperature: float = 0.7,
        max_tokens: int = 4096,
        json_mode: bool = False,
        system_prompt: str | None = None,
    ) -> dict:
        """
        Generate a completion from the model.

        Returns a dict with keys:
            - content (str): The generated text.
            - model (str): The model that was used.
            - usage (dict): Token usage with keys input_tokens, output_tokens.
        """
        ...

    @abstractmethod
    async def stream(
        self,
        messages: list[dict],
        model: str,
        temperature: float = 0.7,
        max_tokens: int = 4096,
        system_prompt: str | None = None,
    ) -> AsyncIterator[str]:
        """Stream completion tokens as an async iterator of strings."""
        ...

    def is_available(self) -> bool:
        """Check whether this provider is usable (SDK installed, key present, etc.)."""
        return self._api_key is not None

    def supports_json_mode(self) -> bool:
        """Whether the provider supports structured JSON output mode."""
        return False

    def supports_grounding(self) -> bool:
        """Whether the provider supports grounding / search augmentation."""
        return False
