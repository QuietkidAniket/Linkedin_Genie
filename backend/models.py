from pydantic import BaseModel
from typing import List, Dict, Any, Optional

class QueryRequest(BaseModel):
    q: str

class GraphResponse(BaseModel):
    graph: Dict[str, Any]
    metrics: Dict[str, Any]

class QueryResponse(BaseModel):
    filter: Dict[str, Any]
    explain: str
    graph: Dict[str, Any]

class UploadResponse(BaseModel):
    status: str
    nodes: int
    edges: int
    graph_id: str

class NodeResponse(BaseModel):
    node: Dict[str, Any]
    connections: List[Dict[str, Any]]

class MetricsResponse(BaseModel):
    metrics: Dict[str, Any]