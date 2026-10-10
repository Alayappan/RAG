import logging
from contextlib import asynccontextmanager
from typing import Optional, List, Dict, Any
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from .config import settings
from .db import db_pool
from .hybrid_search import hybrid_search

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("retrieval-agent")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting Retrieval Agent microservice...")
    await db_pool.connect()
    yield
    logger.info("Shutting down Retrieval Agent microservice...")
    await db_pool.disconnect()

app = FastAPI(
    title="Retrieval Agent Microservice",
    description="Agent microservice performing Google AI Studio embeddings and PostgreSQL pgvector hybrid search",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class RetrieveRequest(BaseModel):
    query: str = Field(..., description="User search query")
    top_k: int = Field(default=5, ge=1, le=25, description="Number of chunks to retrieve")
    dense_weight: float = Field(default=0.6, ge=0.0, le=1.0, description="Weight for dense vector similarity")
    sparse_weight: float = Field(default=0.4, ge=0.0, le=1.0, description="Weight for sparse full-text search")
    document_id: Optional[str] = Field(default=None, description="Filter retrieval to specific document")

class RetrieveResponse(BaseModel):
    query: str
    top_k: int
    dense_weight: float
    sparse_weight: float
    count: int
    results: List[Dict[str, Any]]

@app.get("/health")
async def health_check():
    db_ok = False
    if db_pool.pool:
        try:
            async with db_pool.pool.acquire() as conn:
                val = await conn.fetchval("SELECT 1")
                db_ok = (val == 1)
        except Exception:
            db_ok = False
    return {
        "status": "healthy" if db_ok else "degraded",
        "service": "retrieval-agent",
        "database_connected": db_ok,
        "google_api_configured": bool(settings.GOOGLE_API_KEY and settings.GOOGLE_API_KEY != "your_gemini_api_key_here")
    }

@app.post("/retrieve", response_model=RetrieveResponse)
async def retrieve_chunks(request: RetrieveRequest):
    try:
        results = await hybrid_search(
            query=request.query,
            top_k=request.top_k,
            dense_weight=request.dense_weight,
            sparse_weight=request.sparse_weight,
            document_id=request.document_id
        )
        return RetrieveResponse(
            query=request.query,
            top_k=request.top_k,
            dense_weight=request.dense_weight,
            sparse_weight=request.sparse_weight,
            count=len(results),
            results=results
        )
    except Exception as e:
        logger.error(f"Error executing hybrid search: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
