"""EpistemicMindMap: a graph of epistemic nodes and relations."""

from __future__ import annotations

from typing import Optional

from .mind_map_node import ConfidenceLevel, MindMapNode, NodeType


class EpistemicMindMap:
    """Directed graph of claims, evidence, and perspectives."""

    def __init__(self) -> None:
        self._nodes: dict[str, MindMapNode] = {}
        self._edges: list[tuple[str, str, str]] = []  # (from, to, relation)

    # --- Node operations ---

    def add_node(self, node: MindMapNode) -> None:
        self._nodes[node.id] = node

    def get_node(self, node_id: str) -> Optional[MindMapNode]:
        return self._nodes.get(node_id)

    def get_children(self, node_id: str) -> list[MindMapNode]:
        node = self._nodes.get(node_id)
        if node is None:
            return []
        return [
            self._nodes[cid]
            for cid in node.children
            if cid in self._nodes
        ]

    # --- Edge operations ---

    def add_edge(self, from_id: str, to_id: str, relation: str) -> None:
        if from_id not in self._nodes or to_id not in self._nodes:
            raise KeyError("Both nodes must exist before adding an edge.")
        self._edges.append((from_id, to_id, relation))
        from_node = self._nodes[from_id]
        if to_id not in from_node.children:
            from_node.children.append(to_id)
        to_node = self._nodes[to_id]
        if to_node.parent is None:
            to_node.parent = from_id

    # --- Query helpers ---

    def get_contested_nodes(self) -> list[MindMapNode]:
        return [
            n for n in self._nodes.values()
            if n.confidence == ConfidenceLevel.CONTESTED
        ]

    def get_unverified_claims(self) -> list[MindMapNode]:
        return [
            n for n in self._nodes.values()
            if n.node_type == NodeType.CLAIM
            and n.confidence == ConfidenceLevel.UNVERIFIED
        ]

    def get_by_confidence(self, level: ConfidenceLevel) -> list[MindMapNode]:
        if isinstance(level, str):
            level = ConfidenceLevel(level)
        return [
            n for n in self._nodes.values() if n.confidence == level
        ]

    # --- Merge ---

    def merge_node(
        self, existing_id: str, new_node: MindMapNode
    ) -> MindMapNode:
        existing = self._nodes.get(existing_id)
        if existing is None:
            raise KeyError(f"Node {existing_id} not found.")
        for src in new_node.sources:
            existing.add_source(src)
        for eid in new_node.evidence_ids:
            existing.add_evidence(eid)
        for p in new_node.perspectives:
            if p not in existing.perspectives:
                existing.perspectives.append(p)
        existing.metadata.update(new_node.metadata)
        return existing

    # --- Statistics ---

    def get_statistics(self) -> dict:
        by_type = {}
        for n in self._nodes.values():
            key = n.node_type.value
            by_type[key] = by_type.get(key, 0) + 1
        by_conf = {}
        for n in self._nodes.values():
            key = n.confidence.value
            by_conf[key] = by_conf.get(key, 0) + 1
        return {
            "total_nodes": len(self._nodes),
            "total_edges": len(self._edges),
            "by_type": by_type,
            "by_confidence": by_conf,
        }

    # --- Serialisation ---

    def to_dict(self) -> dict:
        return {
            "nodes": {nid: n.to_dict() for nid, n in self._nodes.items()},
            "edges": [
                {"from": f, "to": t, "relation": r}
                for f, t, r in self._edges
            ],
        }

    @classmethod
    def from_dict(cls, data: dict) -> EpistemicMindMap:
        mm = cls()
        for nid, ndata in data.get("nodes", {}).items():
            mm._nodes[nid] = MindMapNode.from_dict(ndata)
        for edge in data.get("edges", []):
            mm._edges.append(
                (edge["from"], edge["to"], edge["relation"])
            )
        return mm
