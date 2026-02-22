"""Provider registry for dynamically registering and retrieving LLM providers."""

from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from .base import LLMProvider

_registry: dict[str, type[LLMProvider]] = {}


def register(name: str, provider_class: type[LLMProvider] | None = None):
    """
    Register a provider class under the given name.

    Can be used as a plain function call::

        register("openai", OpenAIProvider)

    Or as a decorator::

        @register("openai")
        class OpenAIProvider(LLMProvider): ...
    """
    if provider_class is not None:
        _registry[name.lower()] = provider_class
        return provider_class

    # Decorator form
    def _decorator(cls: type[LLMProvider]) -> type[LLMProvider]:
        _registry[name.lower()] = cls
        return cls

    return _decorator


def get_provider_class(name: str) -> type[LLMProvider]:
    """Look up a registered provider class by name."""
    key = name.lower()
    if key not in _registry:
        available = ", ".join(sorted(_registry.keys()))
        raise KeyError(
            f"Unknown LLM provider '{name}'. Available: {available}"
        )
    return _registry[key]


def list_providers() -> list[str]:
    """Return the names of all registered providers."""
    return sorted(_registry.keys())
