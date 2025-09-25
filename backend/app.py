from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import json
import uuid
from typing import Optional, List, Dict, Any
import logging

from graph_builder import GraphBuilder
from llm import LLMQueryParser
from models import QueryRequest, GraphResponse, QueryResponse, UploadResponse, NodeResponse, MetricsResponse
from storage import InMemoryStorage

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="LinkedIn Genie API", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global storage
storage = InMemoryStorage()
graph_builder = GraphBuilder()
llm_parser = LLMQueryParser()

@app.post("/upload", response_model=UploadResponse)
async def upload_csv(
    file: UploadFile = File(...),
    mapping: Optional[str] = None,
    settings: Optional[str] = None
):
    """Upload and process CSV file"""
    try:
        # Read CSV content
        content = await file.read()
        csv_content = content.decode('utf-8')
        
        # Parse mapping and settings
        column_mapping = json.loads(mapping) if mapping else {}
        inference_settings = json.loads(settings) if settings else {}
        
        # Process CSV and build graph
        graph_id = str(uuid.uuid4())
        nodes, edges, metrics = graph_builder.process_csv(
            csv_content, 
            column_mapping, 
            inference_settings
        )
        
        # Store in memory
        storage.store_graph(graph_id, nodes, edges, metrics)
        
        logger.info(f"Graph built successfully: {len(nodes)} nodes, {len(edges)} edges")
        
        return UploadResponse(
            status="ok",
            nodes=len(nodes),
            edges=len(edges),
            graph_id=graph_id
        )
        
    except Exception as e:
        logger.error(f"Error processing upload: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/graph", response_model=GraphResponse)
async def get_graph(limit: int = 1000):
    """Get the current graph data"""
    try:
        graph_data = storage.get_current_graph()
        if not graph_data:
            raise HTTPException(status_code=404, detail="No graph data found")
        
        nodes, edges, metrics = graph_data
        
        # Limit nodes if requested
        if limit and len(nodes) > limit:
            nodes = nodes[:limit]
            # Filter edges to only include those between remaining nodes
            node_ids = {node['data']['id'] for node in nodes}
            edges = [edge for edge in edges if 
                    edge['data']['source'] in node_ids and 
                    edge['data']['target'] in node_ids]
        
        return GraphResponse(
            graph={
                "nodes": nodes,
                "edges": edges
            },
            metrics=metrics
        )
        
    except Exception as e:
        logger.error(f"Error getting graph: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/query", response_model=QueryResponse)
async def query_graph(request: QueryRequest):
    """Process natural language query"""
    try:
        graph_data = storage.get_current_graph()
        if not graph_data:
            raise HTTPException(status_code=404, detail="No graph data found")
        
        nodes, edges, metrics = graph_data
        
        # Parse query using LLM
        filter_json, explanation = llm_parser.parse_query(request.q)
        
        # Apply filters
        filtered_nodes, filtered_edges = graph_builder.apply_filters(
            nodes, edges, filter_json
        )
        
        return QueryResponse(
            filter=filter_json,
            explain=explanation,
            graph={
                "nodes": filtered_nodes,
                "edges": filtered_edges
            }
        )
        
    except Exception as e:
        logger.error(f"Error processing query: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/node/{node_id}", response_model=NodeResponse)
async def get_node(node_id: str):
    """Get detailed information about a specific node"""
    try:
        graph_data = storage.get_current_graph()
        if not graph_data:
            raise HTTPException(status_code=404, detail="No graph data found")
        
        nodes, edges, _ = graph_data
        
        # Find the node
        node = next((n for n in nodes if n['data']['id'] == node_id), None)
        if not node:
            raise HTTPException(status_code=404, detail="Node not found")
        
        # Find connected nodes
        connected_edges = [e for e in edges if 
                          e['data']['source'] == node_id or 
                          e['data']['target'] == node_id]
        
        return NodeResponse(
            node=node['data'],
            connections=connected_edges
        )
        
    except Exception as e:
        logger.error(f"Error getting node: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/metrics", response_model=MetricsResponse)
async def get_metrics():
    """Get network metrics"""
    try:
        graph_data = storage.get_current_graph()
        if not graph_data:
            raise HTTPException(status_code=404, detail="No graph data found")
        
        _, _, metrics = graph_data
        return MetricsResponse(metrics=metrics)
        
    except Exception as e:
        logger.error(f"Error getting metrics: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "LinkedIn Genie API"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)