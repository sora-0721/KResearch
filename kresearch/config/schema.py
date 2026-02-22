"""Pydantic models for KResearch configuration."""

from __future__ import annotations

from pathlib import Path
from typing import Dict, Optional

from pydantic import BaseModel, Field


class LLMConfig(BaseModel):
    """Configuration for the language model provider."""

    provider: str = Field(default="openai", description="LLM provider name")
    model: str = Field(default="gpt-4o", description="Model identifier")
    temperature: float = Field(
        default=0.2, ge=0.0, le=2.0, description="Sampling temperature"
    )
    max_tokens: int = Field(
        default=4096, gt=0, description="Maximum tokens in response"
    )
    api_base: Optional[str] = Field(
        default=None, description="Custom API base URL"
    )


class SearchConfig(BaseModel):
    """Configuration for web search providers."""

    provider: str = Field(default="tavily", description="Search provider name")
    max_results: int = Field(
        default=10, gt=0, description="Max results per query"
    )
    timeout: int = Field(
        default=30, gt=0, description="Request timeout in seconds"
    )


class RAGConfig(BaseModel):
    """Configuration for retrieval-augmented generation."""

    collection_name: str = Field(
        default="kresearch", description="Vector store collection name"
    )
    chunk_size: int = Field(
        default=1000, gt=0, description="Document chunk size in characters"
    )
    chunk_overlap: int = Field(
        default=200, ge=0, description="Overlap between chunks"
    )
    top_k: int = Field(
        default=5, gt=0, description="Number of chunks to retrieve"
    )


class SandboxConfig(BaseModel):
    """Configuration for code execution sandbox."""

    prefer_docker: bool = Field(
        default=True, description="Prefer Docker-based sandbox"
    )
    timeout: int = Field(
        default=60, gt=0, description="Execution timeout in seconds"
    )
    max_retries: int = Field(
        default=3, ge=0, description="Max retries on failure"
    )


class TelegramConfig(BaseModel):
    """Configuration for Telegram notifications."""

    bot_token: Optional[str] = Field(
        default=None, description="Telegram bot token"
    )
    chat_id: Optional[str] = Field(
        default=None, description="Telegram chat ID"
    )
    enabled: bool = Field(
        default=False, description="Enable Telegram notifications"
    )


class ConcurrencyConfig(BaseModel):
    """Configuration for concurrency limits."""

    global_limit: int = Field(
        default=15, gt=0, description="Global concurrency limit"
    )
    per_provider_limits: Dict[str, int] = Field(
        default_factory=dict,
        description="Per-provider concurrency limits",
    )


class EvalConfig(BaseModel):
    """Configuration for evaluation thresholds."""

    min_score: float = Field(
        default=7.0, ge=0.0, le=10.0, description="Minimum acceptable score"
    )
    max_iterations: int = Field(
        default=5, gt=0, description="Max refinement iterations"
    )


class AppConfig(BaseModel):
    """Top-level application configuration."""

    llm: LLMConfig = Field(default_factory=LLMConfig)
    search: SearchConfig = Field(default_factory=SearchConfig)
    rag: RAGConfig = Field(default_factory=RAGConfig)
    sandbox: SandboxConfig = Field(default_factory=SandboxConfig)
    telegram: TelegramConfig = Field(default_factory=TelegramConfig)
    concurrency: ConcurrencyConfig = Field(
        default_factory=ConcurrencyConfig
    )
    eval: EvalConfig = Field(default_factory=EvalConfig)
    output_dir: Path = Field(
        default=Path("output"), description="Directory for output artifacts"
    )
