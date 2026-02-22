"""KResearch application — async REPL and orchestrator."""

from __future__ import annotations

import asyncio
import sys

from kresearch.constants import APP_NAME, VERSION


def _print_banner() -> None:
    """Display the startup banner using Rich if available."""
    try:
        from rich.console import Console
        from rich.panel import Panel
        from rich.text import Text

        console = Console()
        title = Text(f"{APP_NAME} v{VERSION}", style="bold cyan")
        subtitle = Text(
            "Deep Research Agent — Omega Workflow", style="dim"
        )
        body = Text.assemble(
            title, "\n", subtitle, "\n\n",
            Text("Type a research query to begin, or /help for commands.",
                 style="green"),
        )
        console.print(Panel(body, border_style="bright_blue", padding=(1, 2)))
    except ImportError:
        print(f"\n  {APP_NAME} v{VERSION}")
        print("  Deep Research Agent — Omega Workflow")
        print("  Type a research query to begin, or /help for commands.\n")


async def _handle_command(line: str, ctx: dict) -> bool:
    """Route slash commands. Returns True if app should quit."""
    from kresearch.commands.registry import execute_command

    parts = line.strip().split(None, 1)
    cmd_name = parts[0][1:]  # strip leading /
    args = parts[1] if len(parts) > 1 else ""
    if cmd_name == "quit":
        return True
    await execute_command(cmd_name, args, ctx)
    return False


async def _run_research(query: str, ctx: dict) -> None:
    """Execute the full 5-phase Omega Workflow for a query."""
    from kresearch.phases.runner import PhaseRunner

    runner = PhaseRunner(ctx)
    await runner.run(query)


async def _async_main() -> None:
    """Main async REPL loop."""
    from kresearch.config import load_config
    from kresearch.core.event_bus import EventBus

    config = load_config()
    event_bus = EventBus()
    ctx: dict = {
        "config": config,
        "event_bus": event_bus,
        "session": None,
    }

    _print_banner()

    try:
        from rich.console import Console
        console = Console()
        prompt_str = "[bold green]kresearch>[/bold green] "
        use_rich = True
    except ImportError:
        console = None
        use_rich = False

    while True:
        try:
            if use_rich:
                console.print()
                line = console.input(prompt_str).strip()
            else:
                line = input("\nkresearch> ").strip()
        except (EOFError, KeyboardInterrupt):
            print("\nGoodbye!")
            break

        if not line:
            continue

        if line.startswith("/"):
            should_quit = await _handle_command(line, ctx)
            if should_quit:
                print("Goodbye!")
                break
        else:
            await _run_research(line, ctx)


def main() -> None:
    """Synchronous entry point — runs the async REPL."""
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(_async_main())
