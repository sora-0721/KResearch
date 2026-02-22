"""Handler for the /config slash command."""

from __future__ import annotations

from rich.console import Console
from rich.tree import Tree

from kresearch.commands.registry import command

console = Console()


@command("config", "View or set configuration")
async def handle_config(args: str, ctx: dict) -> None:
    """Handle ``/config [<key> <value>]``."""
    parts = args.strip().split(maxsplit=1)

    if not parts:
        _show_config(ctx)
        return

    if len(parts) < 2:
        console.print("[red]Usage:[/red] /config <key> <value>")
        console.print("Example: /config eval.min_score 8.0")
        return

    _set_config(parts[0], parts[1], ctx)


# ------------------------------------------------------------------
# Sub-commands
# ------------------------------------------------------------------


def _show_config(ctx: dict) -> None:
    """Render the current configuration as a Rich tree."""
    config = ctx["config"]
    data = config.model_dump()

    tree = Tree("[bold cyan]Configuration[/bold cyan]")
    _build_tree(tree, data)
    console.print(tree)


def _build_tree(node: Tree, data: dict, prefix: str = "") -> None:
    """Recursively build a Rich tree from a nested dict."""
    for key, value in sorted(data.items()):
        full_key = f"{prefix}.{key}" if prefix else key
        if isinstance(value, dict):
            branch = node.add(f"[bold]{key}[/bold]")
            _build_tree(branch, value, full_key)
        else:
            display = _format_value(value)
            node.add(f"[dim]{key}[/dim] = {display}")


def _format_value(value: object) -> str:
    """Format a config value for display."""
    if isinstance(value, bool):
        return "[green]true[/green]" if value else "[red]false[/red]"
    if value is None:
        return "[dim]null[/dim]"
    return str(value)


def _set_config(key: str, raw_value: str, ctx: dict) -> None:
    """Set a nested configuration value using dot-notation."""
    config = ctx["config"]
    parts = key.split(".")

    # Navigate to the parent object
    obj = config
    for part in parts[:-1]:
        if not hasattr(obj, part):
            console.print(f"[red]Unknown config section:[/red] {part}")
            return
        obj = getattr(obj, part)

    field_name = parts[-1]
    if not hasattr(obj, field_name):
        console.print(f"[red]Unknown config key:[/red] {key}")
        return

    current = getattr(obj, field_name)
    try:
        coerced = _coerce_value(raw_value, current)
    except (ValueError, TypeError) as exc:
        console.print(f"[red]Invalid value:[/red] {exc}")
        return

    setattr(obj, field_name, coerced)
    console.print(f"[green]Set[/green] {key} = {coerced}")


def _coerce_value(raw: str, reference: object) -> object:
    """Coerce a raw string value to match the type of *reference*."""
    if isinstance(reference, bool):
        if raw.lower() in ("true", "1", "yes"):
            return True
        if raw.lower() in ("false", "0", "no"):
            return False
        raise ValueError(f"Expected bool, got '{raw}'")
    if isinstance(reference, int):
        return int(raw)
    if isinstance(reference, float):
        return float(raw)
    return raw
