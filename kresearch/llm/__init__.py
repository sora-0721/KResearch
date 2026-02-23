"""LLM provider module -- unified interface for multiple LLM backends."""

from .base import LLMProvider
from .factory import create_provider, get_llm_provider
from .models import ALL_MODELS, DEFAULT_MODELS, fetch_available_models
from .registry import get_provider_class, list_providers, register

# Import each provider module so that they self-register via register().
from . import openai_provider as _openai  # noqa: F401
from . import anthropic_provider as _anthropic  # noqa: F401
from . import gemini_provider as _gemini  # noqa: F401
from . import grok_provider as _grok  # noqa: F401
from . import perplexity_provider as _perplexity  # noqa: F401
from . import deepseek_provider as _deepseek  # noqa: F401
from . import ollama_provider as _ollama  # noqa: F401

# Re-export the factory function under the legacy alias.
LLMFactory = create_provider

__all__ = [
    "LLMProvider",
    "LLMFactory",
    "create_provider",
    "get_llm_provider",
    "get_provider_class",
    "list_providers",
    "register",
    "ALL_MODELS",
    "DEFAULT_MODELS",
    "fetch_available_models",
]
