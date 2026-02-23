"""Input validation helpers for KResearch."""

from __future__ import annotations

import re
from pathlib import Path

# Known providers and a sample of their model-name patterns.
_MODEL_PATTERNS: dict[str, re.Pattern] = {
    "openai": re.compile(r"^(gpt-|o[1-9]|chatgpt-|davinci|babbage|text-)"),
    "anthropic": re.compile(r"^claude-"),
    "google": re.compile(r"^(gemini-|models/)"),
    "deepseek": re.compile(r"^deepseek-"),
}

# Very minimal URL pattern (scheme + host).
_URL_RE = re.compile(
    r"^https?://"
    r"[a-zA-Z0-9]([a-zA-Z0-9\-]*[a-zA-Z0-9])?"
    r"(\.[a-zA-Z0-9]([a-zA-Z0-9\-]*[a-zA-Z0-9])?)*"
    r"(:\d+)?"
    r"(/\S*)?$"
)

MIN_QUERY_LENGTH = 3
MAX_QUERY_LENGTH = 2000


def validate_query(query: str) -> str:
    """Strip and validate a search query.

    Returns the cleaned query string.

    Raises
    ------
    ValueError
        If the query is too short or too long after stripping.
    """
    cleaned = query.strip()
    if len(cleaned) < MIN_QUERY_LENGTH:
        raise ValueError(
            f"Query must be at least {MIN_QUERY_LENGTH} characters "
            f"(got {len(cleaned)})."
        )
    if len(cleaned) > MAX_QUERY_LENGTH:
        raise ValueError(
            f"Query must be at most {MAX_QUERY_LENGTH} characters "
            f"(got {len(cleaned)})."
        )
    return cleaned


def validate_api_key(key: str) -> bool:
    """Check that *key* looks like a plausible API key.

    Returns ``True`` when the key is non-empty, at least 10 characters,
    and contains only printable ASCII without spaces.
    """
    if not key or not key.strip():
        return False
    if len(key) < 10:
        return False
    if not re.match(r"^[\x21-\x7E]+$", key):
        return False
    return True


def validate_url(url: str) -> bool:
    """Return ``True`` if *url* has a valid HTTP(S) structure."""
    return bool(_URL_RE.match(url.strip()))


def validate_file_path(path: str | Path) -> Path | None:
    """Resolve *path* and return it if the parent directory exists.

    Returns ``None`` when the path is clearly invalid (empty string,
    non-existent parent directory, etc.).
    """
    try:
        p = Path(path).expanduser().resolve()
    except (TypeError, ValueError, OSError):
        return None

    if not p.parts:
        return None

    # The file itself need not exist, but its parent must.
    if p.parent.is_dir():
        return p
    return None


def validate_model_name(provider: str, model: str) -> bool:
    """Check whether *model* matches expected naming for *provider*.

    Returns ``True`` for recognised providers when the model name
    matches the known pattern, or unconditionally for unknown providers
    (to avoid blocking new models).
    """
    provider_lower = provider.strip().lower()
    model_stripped = model.strip()

    if not model_stripped:
        return False

    pattern = _MODEL_PATTERNS.get(provider_lower)
    if pattern is None:
        # Unknown provider -- accept any non-empty model name.
        return True

    return bool(pattern.match(model_stripped))
