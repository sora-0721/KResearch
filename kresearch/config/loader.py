"""Configuration loading: defaults -> YAML -> environment variables."""

from __future__ import annotations

import copy
import os
from pathlib import Path
from typing import Any, Optional

from kresearch.config.defaults import DEFAULT_CONFIG
from kresearch.config.schema import AppConfig

# Mapping from provider/service name to expected environment variable.
_API_KEY_MAP: dict[str, str] = {
    "openai": "OPENAI_API_KEY",
    "anthropic": "ANTHROPIC_API_KEY",
    "google": "GOOGLE_API_KEY",
    "tavily": "TAVILY_API_KEY",
    "serper": "SERPER_API_KEY",
    "bing": "BING_API_KEY",
    "telegram": "TELEGRAM_BOT_TOKEN",
}

_ENV_PREFIX = "KRESEARCH_"

# Flat mapping: ENV_VAR -> (section, key) in config dict.
_ENV_OVERRIDES: dict[str, tuple[str, str]] = {
    f"{_ENV_PREFIX}LLM_PROVIDER": ("llm", "provider"),
    f"{_ENV_PREFIX}LLM_MODEL": ("llm", "model"),
    f"{_ENV_PREFIX}LLM_TEMPERATURE": ("llm", "temperature"),
    f"{_ENV_PREFIX}LLM_MAX_TOKENS": ("llm", "max_tokens"),
    f"{_ENV_PREFIX}LLM_API_BASE": ("llm", "api_base"),
    f"{_ENV_PREFIX}SEARCH_PROVIDER": ("search", "provider"),
    f"{_ENV_PREFIX}SEARCH_MAX_RESULTS": ("search", "max_results"),
    f"{_ENV_PREFIX}SEARCH_TIMEOUT": ("search", "timeout"),
    f"{_ENV_PREFIX}RAG_COLLECTION": ("rag", "collection_name"),
    f"{_ENV_PREFIX}RAG_CHUNK_SIZE": ("rag", "chunk_size"),
    f"{_ENV_PREFIX}RAG_CHUNK_OVERLAP": ("rag", "chunk_overlap"),
    f"{_ENV_PREFIX}RAG_TOP_K": ("rag", "top_k"),
    f"{_ENV_PREFIX}SANDBOX_DOCKER": ("sandbox", "prefer_docker"),
    f"{_ENV_PREFIX}SANDBOX_TIMEOUT": ("sandbox", "timeout"),
    f"{_ENV_PREFIX}SANDBOX_RETRIES": ("sandbox", "max_retries"),
    f"{_ENV_PREFIX}TELEGRAM_TOKEN": ("telegram", "bot_token"),
    f"{_ENV_PREFIX}TELEGRAM_CHAT_ID": ("telegram", "chat_id"),
    f"{_ENV_PREFIX}TELEGRAM_ENABLED": ("telegram", "enabled"),
    f"{_ENV_PREFIX}CONCURRENCY_LIMIT": ("concurrency", "global_limit"),
    f"{_ENV_PREFIX}EVAL_MIN_SCORE": ("eval", "min_score"),
    f"{_ENV_PREFIX}EVAL_MAX_ITERATIONS": ("eval", "max_iterations"),
    f"{_ENV_PREFIX}OUTPUT_DIR": ("output_dir", ""),
}


def load_env() -> None:
    """Load environment variables from .env file if present."""
    try:
        from dotenv import load_dotenv

        load_dotenv()
    except ImportError:  # pragma: no cover
        pass


def load_yaml(path: Optional[Path] = None) -> dict[str, Any]:
    """Load a YAML config file and return it as a dict.

    Falls back to ``~/.kresearch/config.yaml`` when *path* is ``None``.
    Returns an empty dict if the file does not exist.
    """
    if path is None:
        path = Path.home() / ".kresearch" / "config.yaml"
    path = Path(path)
    if not path.is_file():
        return {}
    try:
        import yaml

        with open(path) as fh:
            data = yaml.safe_load(fh)
        return data if isinstance(data, dict) else {}
    except ImportError:  # pragma: no cover
        return {}


def _deep_merge(base: dict, override: dict) -> dict:
    """Recursively merge *override* into *base* (mutates *base*)."""
    for key, value in override.items():
        if key in base and isinstance(base[key], dict) and isinstance(value, dict):
            _deep_merge(base[key], value)
        else:
            base[key] = value
    return base


def _cast(value: str, current: Any) -> Any:
    """Cast a string env value to match the type of *current*."""
    if isinstance(current, bool):
        return value.lower() in ("1", "true", "yes")
    if isinstance(current, int):
        return int(value)
    if isinstance(current, float):
        return float(value)
    return value


def _apply_env(config: dict) -> dict:
    """Override config values from environment variables."""
    for env_var, (section, key) in _ENV_OVERRIDES.items():
        value = os.environ.get(env_var)
        if value is None:
            continue
        if key == "":
            # Top-level key (e.g. output_dir)
            config[section] = value
        else:
            current = config.get(section, {}).get(key)
            config.setdefault(section, {})[key] = _cast(value, current)
    return config


def load_config(yaml_path: Optional[Path] = None) -> AppConfig:
    """Build an ``AppConfig`` by merging defaults -> YAML -> env vars."""
    load_env()
    config = copy.deepcopy(DEFAULT_CONFIG)
    yaml_overrides = load_yaml(yaml_path)
    _deep_merge(config, yaml_overrides)
    _apply_env(config)
    return AppConfig(**config)


def get_api_key(provider_name: str) -> Optional[str]:
    """Return the API key for *provider_name* from environment variables."""
    env_var = _API_KEY_MAP.get(provider_name.lower())
    if env_var is None:
        return None
    return os.environ.get(env_var)
