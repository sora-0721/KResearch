"""Handler for the /rag slash command."""

from __future__ import annotations

from pathlib import Path

from rich.console import Console
from rich.panel import Panel
from rich.table import Table

from kresearch.commands.registry import command

console = Console()

_USAGE = (
    "[bold]Usage:[/bold]\n"
    "  /rag ingest <path>   Ingest file or directory into ChromaDB\n"
    "  /rag search <query>  Query the RAG store\n"
    "  /rag status          Show store statistics"
)


@command("rag", "Manage local RAG document store")
async def handle_rag(args: str, ctx: dict) -> None:
    """Handle ``/rag <ingest|search|status> [...]``."""
    parts = args.strip().split(maxsplit=1)

    if not parts:
        console.print(_USAGE)
        return

    sub = parts[0].lower()
    rest = parts[1].strip() if len(parts) > 1 else ""

    if sub == "ingest":
        await _ingest(rest, ctx)
    elif sub == "search":
        await _search(rest, ctx)
    elif sub == "status":
        _status(ctx)
    else:
        console.print(f"[red]Unknown sub-command:[/red] {sub}")
        console.print(_USAGE)


# ------------------------------------------------------------------
# Sub-commands
# ------------------------------------------------------------------


async def _ingest(path_str: str, ctx: dict) -> None:
    """Ingest a file or directory into the RAG store."""
    if not path_str:
        console.print("[red]Please specify a path to ingest.[/red]")
        return

    target = Path(path_str).expanduser().resolve()
    if not target.exists():
        console.print(f"[red]Path not found:[/red] {target}")
        return

    from kresearch.rag.ingester import ingest_directory, ingest_file
    from kresearch.rag.store import RAGStore

    config = ctx["config"]
    store = RAGStore(collection_name=config.rag.collection_name)

    if target.is_dir():
        count = await ingest_directory(target, store)
    else:
        count = await ingest_file(target, store)

    console.print(f"[green]Ingested {count} chunks[/green] from {target}")


async def _search(query: str, ctx: dict) -> None:
    """Query the RAG store and display results."""
    if not query:
        console.print("[red]Please provide a search query.[/red]")
        return

    from kresearch.rag.store import RAGStore

    config = ctx["config"]
    store = RAGStore(collection_name=config.rag.collection_name)

    results = store.query(query, n_results=config.rag.top_k)
    if not results:
        console.print("[yellow]No results found.[/yellow]")
        return

    table = Table(title="RAG Results", show_header=True)
    table.add_column("#", justify="right", style="dim", width=3)
    table.add_column("Source", style="cyan")
    table.add_column("Distance", justify="right")
    table.add_column("Content (preview)")

    for i, r in enumerate(results, 1):
        src = r.get("metadata", {}).get("source", "unknown")
        dist = f"{r.get('distance', 0):.4f}"
        preview = r.get("content", "")[:80] + "..."
        table.add_row(str(i), src, dist, preview)

    console.print(table)


def _status(ctx: dict) -> None:
    """Display RAG store statistics."""
    from kresearch.rag.store import CHROMADB_AVAILABLE, RAGStore

    if not CHROMADB_AVAILABLE:
        console.print(
            "[red]ChromaDB is not installed.[/red] "
            "Install with: pip install chromadb"
        )
        return

    config = ctx["config"]
    store = RAGStore(collection_name=config.rag.collection_name)
    count = store.count()

    console.print(Panel(
        f"Collection: {config.rag.collection_name}\n"
        f"Documents:  {count}\n"
        f"Chunk size: {config.rag.chunk_size}\n"
        f"Overlap:    {config.rag.chunk_overlap}\n"
        f"Top-K:      {config.rag.top_k}",
        title="RAG Store",
        border_style="cyan",
    ))
