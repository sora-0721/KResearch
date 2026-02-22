"""Model constants for each LLM provider."""

OPENAI_MODELS: list[str] = [
    "gpt-4o",
    "gpt-4o-mini",
    "o3-mini",
]

ANTHROPIC_MODELS: list[str] = [
    "claude-sonnet-4-20250514",
    "claude-haiku-4-5-20251001",
]

GEMINI_MODELS: list[str] = [
    "gemini-2.0-flash",
    "gemini-2.5-pro",
]

GROK_MODELS: list[str] = [
    "grok-3",
    "grok-3-mini",
]

PERPLEXITY_MODELS: list[str] = [
    "sonar",
    "sonar-pro",
]

DEEPSEEK_MODELS: list[str] = [
    "deepseek-chat",
    "deepseek-reasoner",
]

OLLAMA_MODELS: list[str] = [
    "llama3",
    "mistral",
    "phi3",
    "gemma",
]

ALL_MODELS: dict[str, list[str]] = {
    "openai": OPENAI_MODELS,
    "anthropic": ANTHROPIC_MODELS,
    "gemini": GEMINI_MODELS,
    "grok": GROK_MODELS,
    "perplexity": PERPLEXITY_MODELS,
    "deepseek": DEEPSEEK_MODELS,
    "ollama": OLLAMA_MODELS,
}

DEFAULT_MODELS: dict[str, str] = {
    "openai": "gpt-4o",
    "anthropic": "claude-sonnet-4-20250514",
    "gemini": "gemini-2.0-flash",
    "grok": "grok-3",
    "perplexity": "sonar-pro",
    "deepseek": "deepseek-chat",
    "ollama": "llama3",
}
