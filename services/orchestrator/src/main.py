import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .db import db_pool
from .routes.documents import router as documents_router
from .routes.chat import router as chat_router
from .routes.system import router as system_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("orchestrator")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting Central LangGraph Orchestrator...")
    await db_pool.connect()
    yield
    logger.info("Shutting down Central LangGraph Orchestrator...")
    await db_pool.disconnect()

app = FastAPI(
    title="Central Multi-Agent RAG Orchestrator",
    description="Orchestrator coordinating containerized agents (Retrieval & Synthesis) via LangGraph",
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

# Register routes
app.include_router(documents_router)
app.include_router(chat_router)
app.include_router(system_router)

@app.get("/health")
async def health():
    return {"status": "healthy", "service": "orchestrator"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("src.main:app", host="0.0.0.0", port=8000, reload=True)
