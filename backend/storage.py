from typing import Dict, List, Tuple, Optional, Any
import logging

logger = logging.getLogger(__name__)

class InMemoryStorage:
    """Simple in-memory storage for graph data"""
    
    def __init__(self):
        self.graphs: Dict[str, Tuple[List[Dict], List[Dict], Dict]] = {}
        self.current_graph_id: Optional[str] = None
    
    def store_graph(self, graph_id: str, nodes: List[Dict], edges: List[Dict], metrics: Dict):
        """Store graph data in memory"""
        self.graphs[graph_id] = (nodes, edges, metrics)
        self.current_graph_id = graph_id
        logger.info(f"Stored graph {graph_id} with {len(nodes)} nodes and {len(edges)} edges")
    
    def get_graph(self, graph_id: str) -> Optional[Tuple[List[Dict], List[Dict], Dict]]:
        """Get specific graph by ID"""
        return self.graphs.get(graph_id)
    
    def get_current_graph(self) -> Optional[Tuple[List[Dict], List[Dict], Dict]]:
        """Get the current active graph"""
        if self.current_graph_id:
            return self.graphs.get(self.current_graph_id)
        return None
    
    def list_graphs(self) -> List[str]:
        """List all stored graph IDs"""
        return list(self.graphs.keys())
    
    def delete_graph(self, graph_id: str) -> bool:
        """Delete a graph"""
        if graph_id in self.graphs:
            del self.graphs[graph_id]
            if self.current_graph_id == graph_id:
                self.current_graph_id = None
            return True
        return False
    
    def clear_all(self):
        """Clear all stored data"""
        self.graphs.clear()
        self.current_graph_id = None
        logger.info("Cleared all stored graphs")