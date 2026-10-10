import logging
from contextlib import asynccontextmanager
from typing import List, Dict, Any
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from .config import settings
from .synthesizer import synthesize_grounded_answer

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("synthesis-agent")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting Synthesis Agent microservice...")
    yield
    logger.info("Shutting down Synthesis Agent microservice...")

app = FastAPI(
    title="Synthesis Agent Microservice",
    description="Agent microservice performing grounded reasoning and citation mapping with Google AI Studio Gemini",
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

class SynthesizeRequest(BaseModel):
    query: str = Field(..., description="User question")
    chunks: List[Dict[str, Any]] = Field(default_factory=list, description="Retrieved document chunks from hybrid search")

class SynthesizeResponse(BaseModel):
    answer: str
    citations: List[Dict[str, Any]]
    model_used: str

@app.get("/health")
async def health_check():
    configured = bool(settings.GOOGLE_API_KEY and settings.GOOGLE_API_KEY != "your_gemini_api_key_here")
    return {
        "status": "healthy",
        "service": "synthesis-agent",
        "google_ai_studio_configured": configured,
        "model": settings.GEMINI_MODEL
    }

@app.post("/synthesize", response_model=SynthesizeResponse)
async def synthesize_answer(request: SynthesizeRequest):
    try:
        answer, citations = await synthesize_grounded_answer(request.query, request.chunks)
        return SynthesizeResponse(
            answer=answer,
            citations=citations,
            model_used=settings.GEMINI_MODEL if settings.GOOGLE_API_KEY else "simulation_fallback"
        )
    except Exception as e:
        logger.error(f"Error synthesizing answer: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
