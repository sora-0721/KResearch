"""Provider registry for dynamically registering and retrieving search providers."""

from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from .base import SearchProvider

_registry: dict[str, type[SearchProvider]] = {}


def register(name: str, provider_class: type[SearchProvider] | None = None):
    """
    Register a provider class under the given name.

    Can be used as a plain function call::

        register("tavily", TavilyProvider)

    Or as a decorator::

        @register("tavily")
        class TavilyProvider(SearchProvider): ...
    """
    if provider_class is not None:
        _registry[name.lower()] = provider_class
        return provider_class

    # Decorator form
    def _decorator(cls: type[SearchProvider]) -> type[SearchProvider]:
        _registry[name.lower()] = cls
        return cls

    return _decorator


def get_provider_class(name: str) -> type[SearchProvider]:
    """Look up a registered provider class by name."""
    key = name.lower()
    if key not in _registry:
        available = ", ".join(sorted(_registry.keys()))
        raise KeyError(
            f"Unknown search provider '{name}'. Available: {available}"
        )
    return _registry[key]


def list_providers() -> list[str]:
    """Return the names of all registered search providers."""
    return sorted(_registry.keys())


def list_free_providers() -> list[str]:
    """Return names of registered providers that are free to use."""
    free: list[str] = []
    for name, cls in sorted(_registry.items()):
        # Instantiate temporarily to check the is_free property
        try:
            instance = cls.__new__(cls)
            if hasattr(instance, "is_free") and instance.is_free:
                free.append(name)
        except Exception:
            continue
    return free
