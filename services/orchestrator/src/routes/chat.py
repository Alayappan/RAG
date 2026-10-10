import logging
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from ..graph import rag_graph

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/chat", tags=["Chat & Agents"])

class ChatRequest(BaseModel):
    query: str = Field(..., description="User question or query")
    top_k: int = Field(default=5, ge=1, le=20, description="Number of chunks to retrieve")
    dense_weight: float = Field(default=0.6, ge=0.0, le=1.0, description="Weight for dense vector search")
    sparse_weight: float = Field(default=0.4, ge=0.0, le=1.0, description="Weight for sparse full-text search")
    document_id: Optional[str] = Field(default=None, description="Optional document filter")

class ChatResponse(BaseModel):
    query: str
    answer: str
    citations: List[Dict[str, Any]]
    retrieved_chunks: List[Dict[str, Any]]
    steps: List[Dict[str, Any]]
    model_used: str

@router.post("", response_model=ChatResponse)
async def chat_with_orchestrator(request: ChatRequest):
    """
    Submits user query to the central Orchestrator.
    The Orchestrator coordinates the Retrieval Agent and Synthesis Agent via LangGraph.
    """
    initial_state = {
        "query": request.query,
        "top_k": request.top_k,
        "dense_weight": request.dense_weight,
        "sparse_weight": request.sparse_weight,
        "document_id": request.document_id,
        "steps": [],
        "retrieved_chunks": [],
        "citations": [],
        "synthesized_answer": "",
        "model_used": "",
    }

    try:
        final_state = await rag_graph.ainvoke(initial_state)
        return ChatResponse(
            query=request.query,
            answer=final_state.get("synthesized_answer", "No answer generated."),
            citations=final_state.get("citations", []),
            retrieved_chunks=final_state.get("retrieved_chunks", []),
            steps=final_state.get("steps", []),
            model_used=final_state.get("model_used", "gemini")
        )
    except Exception as e:
        logger.error(f"Error in LangGraph orchestrator execution: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Orchestrator graph execution failed: {str(e)}")
