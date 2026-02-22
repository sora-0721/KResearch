"""Handler for the /model slash command."""

from __future__ import annotations

import os

from rich.console import Console
from rich.table import Table

from kresearch.commands.registry import command
from kresearch.llm.factory import _ENV_KEY_MAP
from kresearch.llm.models import ALL_MODELS, DEFAULT_MODELS

console = Console()


@command("model", "Switch or list LLM providers and models")
async def handle_model(args: str, ctx: dict) -> None:
    """Handle ``/model [list | <provider> [model]]``."""
    parts = args.strip().split()

    if not parts or parts[0] == "list":
        _show_providers(ctx)
        return

    provider = parts[0].lower()
    model = parts[1] if len(parts) > 1 else None
    _switch_provider(provider, model, ctx)


# ------------------------------------------------------------------
# Sub-commands
# ------------------------------------------------------------------


def _show_providers(ctx: dict) -> None:
    """Print a Rich table of all LLM providers and their models."""
    table = Table(
        title="LLM Providers",
        show_header=True,
        header_style="bold cyan",
    )
    table.add_column("Provider", style="bold")
    table.add_column("Models")
    table.add_column("Default")
    table.add_column("Available", justify="center")

    config = ctx["config"]
    current_provider = config.llm.provider
    current_model = config.llm.model

    for provider, models in sorted(ALL_MODELS.items()):
        env_var = _ENV_KEY_MAP.get(provider)
        has_key = (
            env_var is None  # e.g. ollama needs no key
            or os.environ.get(env_var) is not None
        )
        avail = "[green]Yes[/green]" if has_key else "[red]No[/red]"
        default = DEFAULT_MODELS.get(provider, models[0] if models else "")

        model_strs: list[str] = []
        for m in models:
            if provider == current_provider and m == current_model:
                model_strs.append(f"[bold green]{m} (active)[/bold green]")
            else:
                model_strs.append(m)

        prov_label = provider
        if provider == current_provider:
            prov_label = f"[bold green]{provider} *[/bold green]"

        table.add_row(
            prov_label,
            "\n".join(model_strs),
            default,
            avail,
        )

    console.print(table)


def _switch_provider(provider: str, model: str | None, ctx: dict) -> None:
    """Switch the active LLM provider and (optionally) model."""
    if provider not in ALL_MODELS:
        available = ", ".join(sorted(ALL_MODELS.keys()))
        console.print(
            f"[red]Unknown provider:[/red] {provider}\n"
            f"Available: {available}"
        )
        return

    config = ctx["config"]
    config.llm.provider = provider

    if model is not None:
        if model not in ALL_MODELS[provider]:
            valid = ", ".join(ALL_MODELS[provider])
            console.print(
                f"[red]Unknown model:[/red] {model}\n"
                f"Valid models for {provider}: {valid}"
            )
            return
        config.llm.model = model
    else:
        config.llm.model = DEFAULT_MODELS.get(
            provider, ALL_MODELS[provider][0]
        )

    console.print(
        f"[green]Switched to[/green] {config.llm.provider} / "
        f"{config.llm.model}"
    )
