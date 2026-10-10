import httpx
import logging
from typing import Dict, Any
from fastapi import APIRouter
from ..db import db_pool
from ..config import settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/system", tags=["System Status"])

@router.get("/status")
async def get_system_status() -> Dict[str, Any]:
    """
    Checks health and connectivity of all system components:
    - Central Orchestrator
    - PostgreSQL Vector Database
    - Retrieval Agent microservice
    - Synthesis Agent microservice
    - Google AI Studio API status
    """
    # 1. Check PostgreSQL
    db_status = {"connected": False, "total_documents": 0, "total_chunks": 0}
    if db_pool.pool:
        try:
            async with db_pool.pool.acquire() as conn:
                doc_count = await conn.fetchval("SELECT COUNT(*) FROM documents")
                chunk_count = await conn.fetchval("SELECT COUNT(*) FROM document_chunks")
                db_status = {
                    "connected": True,
                    "total_documents": doc_count,
                    "total_chunks": chunk_count
                }
        except Exception as e:
            db_status["error"] = str(e)

    # 2. Check Retrieval Agent container
    retrieval_agent_status = {"healthy": False, "url": settings.RETRIEVAL_AGENT_URL}
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            res = await client.get(f"{settings.RETRIEVAL_AGENT_URL}/health")
            if res.status_code == 200:
                retrieval_agent_status = res.json()
                retrieval_agent_status["healthy"] = True
    except Exception as e:
        retrieval_agent_status["error"] = str(e)

    # 3. Check Synthesis Agent container
    synthesis_agent_status = {"healthy": False, "url": settings.SYNTHESIS_AGENT_URL}
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            res = await client.get(f"{settings.SYNTHESIS_AGENT_URL}/health")
            if res.status_code == 200:
                synthesis_agent_status = res.json()
                synthesis_agent_status["healthy"] = True
    except Exception as e:
        synthesis_agent_status["error"] = str(e)

    google_api_configured = bool(settings.GOOGLE_API_KEY and settings.GOOGLE_API_KEY != "your_gemini_api_key_here")

    return {
        "status": "online",
        "orchestrator": {
            "healthy": True,
            "version": "1.0.0",
            "google_ai_studio_configured": google_api_configured,
            "models": {
                "embedding": settings.EMBEDDING_MODEL,
                "synthesis": settings.GEMINI_MODEL
            }
        },
        "database": db_status,
        "retrieval_agent": retrieval_agent_status,
        "synthesis_agent": synthesis_agent_status
    }
