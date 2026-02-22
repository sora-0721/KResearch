"""Default configuration values for KResearch."""

from __future__ import annotations

DEFAULT_PER_PROVIDER_LIMITS: dict[str, int] = {
    "tavily": 5,
    "duckduckgo": 10,
    "serper": 5,
    "bing": 5,
    "google": 5,
}

DEFAULT_CONFIG: dict = {
    "llm": {
        "provider": "openai",
        "model": "gpt-4o",
        "temperature": 0.2,
        "max_tokens": 4096,
        "api_base": None,
    },
    "search": {
        "provider": "tavily",
        "max_results": 10,
        "timeout": 30,
    },
    "rag": {
        "collection_name": "kresearch",
        "chunk_size": 1000,
        "chunk_overlap": 200,
        "top_k": 5,
    },
    "sandbox": {
        "prefer_docker": True,
        "timeout": 60,
        "max_retries": 3,
    },
    "telegram": {
        "bot_token": None,
        "chat_id": None,
        "enabled": False,
    },
    "concurrency": {
        "global_limit": 15,
        "per_provider_limits": dict(DEFAULT_PER_PROVIDER_LIMITS),
    },
    "eval": {
        "min_score": 7.0,
        "max_iterations": 5,
    },
    "output_dir": "output",
}
