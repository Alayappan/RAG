import logging
import hashlib
import numpy as np
from typing import List
from .config import settings

logger = logging.getLogger(__name__)

class EmbeddingService:
    def __init__(self):
        self._embedder = None
        self._initialized = False

    def _init_client(self):
        if self._initialized:
            return
        
        api_key = settings.GOOGLE_API_KEY
        if api_key and api_key != "your_gemini_api_key_here":
            try:
                from langchain_google_genai import GoogleGenerativeAIEmbeddings
                self._embedder = GoogleGenerativeAIEmbeddings(
                    model=settings.EMBEDDING_MODEL,
                    google_api_key=api_key,
                )
                logger.info(f"Initialized Google AI Studio Embeddings with model: {settings.EMBEDDING_MODEL}")
            except Exception as e:
                logger.warning(f"Could not initialize GoogleGenerativeAIEmbeddings: {e}. Falling back to fallback embedder.")
                self._embedder = None
        else:
            logger.warning("GOOGLE_API_KEY not configured or is placeholder. Using mock 768-dim embedding.")
            self._embedder = None
            
        self._initialized = True

    def _generate_fallback_embedding(self, text: str, dim: int = 768) -> List[float]:
        """Deterministic pseudo-embedding for testing when API key is missing."""
        hasher = hashlib.sha256(text.encode("utf-8")).digest()
        rng = np.random.default_rng(seed=int.from_bytes(hasher[:4], "big"))
        vec = rng.standard_normal(dim)
        vec = vec / np.linalg.norm(vec)
        return vec.tolist()

    async def get_embedding(self, text: str) -> List[float]:
        self._init_client()
        if self._embedder:
            try:
                # langchain-google-genai synchronous embed_query run in thread pool
                import asyncio
                loop = asyncio.get_event_loop()
                return await loop.run_in_executor(None, self._embedder.embed_query, text)
            except Exception as e:
                logger.error(f"Google AI Studio embedding error: {e}. Using deterministic fallback.")
                return self._generate_fallback_embedding(text)
        return self._generate_fallback_embedding(text)

embedding_service = EmbeddingService()
