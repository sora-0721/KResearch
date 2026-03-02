"""Handler for the /model slash command."""

from __future__ import annotations

import os

from rich.console import Console
from rich.table import Table

from kresearch.commands.registry import command
from kresearch.llm.factory import _ENV_KEY_MAP
from kresearch.llm.models import ALL_MODELS, DEFAULT_MODELS, fetch_available_models

console = Console()


@command("model", "Switch or list LLM providers and models")
async def handle_model(args: str, ctx: dict) -> None:
    """Handle ``/model [list | <provider> [model]]``."""
    parts = args.strip().split()

    if not parts or parts[0] == "list":
        await _show_providers(ctx)
        return

    provider = parts[0].lower()

    if provider not in ALL_MODELS:
        # Maybe the user passed a model name directly — find its provider
        for prov, models in ALL_MODELS.items():
            if provider in models:
                await _switch_provider(prov, provider, ctx)
                return
        # Try prefix-based inference (gemini-*, gpt-*, claude-*, grok-*, etc.)
        _PREFIX_MAP = {
            "gemini-": "gemini", "gpt-": "openai", "o3-": "openai",
            "o4-": "openai", "claude-": "anthropic", "grok-": "grok",
            "sonar": "perplexity", "deepseek-": "deepseek",
            "deep-research": "gemini",
        }
        for prefix, prov in _PREFIX_MAP.items():
            if provider.startswith(prefix):
                await _switch_provider(prov, provider, ctx)
                return
        available = ", ".join(sorted(ALL_MODELS.keys()))
        console.print(
            f"[red]Unknown provider or model:[/red] {provider}\n"
            f"Available providers: {available}\n"
            f"Usage: /model <provider> [model]  (e.g. /model gemini gemini-2.5-flash)"
        )
        return

    model = parts[1] if len(parts) > 1 else None
    await _switch_provider(provider, model, ctx)


async def _show_providers(ctx: dict) -> None:
    """Print a Rich table of all LLM providers and their models."""
    table = Table(title="LLM Providers", show_header=True, header_style="bold cyan")
    table.add_column("Provider", style="bold")
    table.add_column("Models")
    table.add_column("Default")
    table.add_column("Available", justify="center")

    config = ctx["config"]
    current_provider = config.llm.provider
    current_model = config.llm.model

    for provider, suggested in sorted(ALL_MODELS.items()):
        env_var = _ENV_KEY_MAP.get(provider)
        api_key = (os.environ.get(env_var, "") or "").strip() if env_var else None
        has_key = env_var is None or bool(api_key)

        # Try live fetch, fall back to suggested list
        live = await fetch_available_models(provider, api_key) if has_key else None
        models = live if live else suggested

        avail = "[green]Yes[/green]" if has_key else "[red]No[/red]"
        default = DEFAULT_MODELS.get(provider, models[0] if models else "")

        model_strs: list[str] = []
        for m in models:
            if provider == current_provider and m == current_model:
                model_strs.append(f"[bold green]{m} (active)[/bold green]")
            else:
                model_strs.append(m)

        prov_label = f"[bold green]{provider} *[/bold green]" if provider == current_provider else provider

        display_models = "\n".join(model_strs[:15])
        if len(model_strs) > 15:
            display_models += f"\n[dim]... +{len(model_strs) - 15} more[/dim]"

        table.add_row(prov_label, display_models, default, avail)

    console.print(table)


async def _switch_provider(provider: str, model: str | None, ctx: dict) -> None:
    """Switch the active LLM provider and (optionally) model."""
    config = ctx["config"]
    config.llm.provider = provider

    if model is not None:
        # Accept any model name -- just warn if not in known list
        known = ALL_MODELS.get(provider, [])
        if model not in known:
            console.print(
                f"[yellow]Note:[/yellow] '{model}' is not in the suggested "
                f"list for {provider}. It will be passed directly to the API."
            )
        config.llm.model = model
    else:
        config.llm.model = DEFAULT_MODELS.get(
            provider, ALL_MODELS[provider][0]
        )

    console.print(
        f"[green]Switched to[/green] {config.llm.provider} / {config.llm.model}"
    )
