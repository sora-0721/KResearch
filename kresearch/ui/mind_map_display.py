"""Mind map visualization using Rich Tree."""

from __future__ import annotations

from typing import TYPE_CHECKING

from rich.text import Text
from rich.tree import Tree

from .console import get_console

if TYPE_CHECKING:
    from kresearch.core.mind_map import EpistemicMindMap
    from kresearch.core.mind_map_node import MindMapNode

# Confidence level to colour mapping.
_CONFIDENCE_COLORS: dict[str, str] = {
    "VERIFIED": "green",
    "HIGH": "green",
    "MEDIUM": "yellow",
    "LOW": "red",
    "CONTESTED": "bold red",
    "UNVERIFIED": "dim",
}


def _node_label(node: MindMapNode) -> Text:
    """Build a styled label for a single mind map node."""
    color = _CONFIDENCE_COLORS.get(node.confidence.value, "dim")
    label = Text()
    label.append(f"[{node.node_type.value}] ", style="bold")
    label.append(node.content[:80], style=color)
    if len(node.content) > 80:
        label.append("...", style="dim")
    label.append(f"  ({node.confidence.value})", style=color)
    return label


def _add_children(
    tree: Tree,
    mind_map: EpistemicMindMap,
    node_id: str,
    visited: set[str],
) -> None:
    """Recursively add child nodes to a Rich Tree."""
    if node_id in visited:
        return
    visited.add(node_id)
    children = mind_map.get_children(node_id)
    for child in children:
        branch = tree.add(_node_label(child))
        _add_children(branch, mind_map, child.id, visited)


def display_mind_map(mind_map: EpistemicMindMap) -> None:
    """Render the epistemic mind map as a Rich Tree in the console."""
    console = get_console()
    stats = mind_map.get_statistics()

    node_count = stats.get("total_nodes", 0)
    edge_count = stats.get("total_edges", 0)
    by_confidence = stats.get("by_confidence", {})

    # Header
    console.print()
    console.rule("[highlight]Epistemic Mind Map[/highlight]")
    console.print(
        f"  [info]Nodes:[/info] {node_count}  "
        f"[info]Edges:[/info] {edge_count}"
    )

    # Confidence distribution
    if by_confidence:
        parts: list[str] = []
        for level, count in by_confidence.items():
            color = _CONFIDENCE_COLORS.get(level, "dim")
            parts.append(f"[{color}]{level}: {count}[/{color}]")
        console.print("  " + "  ".join(parts))

    # Tree rendering
    if node_count == 0:
        console.print("  [info]Mind map is empty.[/info]")
        console.print()
        return

    # Find root nodes (nodes with no parent).
    all_nodes = list(mind_map._nodes.values())
    roots = [n for n in all_nodes if n.parent is None]
    if not roots:
        roots = all_nodes[:1]

    tree = Tree("[highlight]Mind Map[/highlight]")
    visited: set[str] = set()
    for root in roots:
        branch = tree.add(_node_label(root))
        _add_children(branch, mind_map, root.id, visited)

    # Add orphan nodes not reached during traversal.
    for node in all_nodes:
        if node.id not in visited:
            tree.add(_node_label(node))

    console.print(tree)
    console.print()
