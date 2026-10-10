import httpx
import logging
from typing import List, Dict, Any, Optional
from ..config import settings

logger = logging.getLogger(__name__)

class RetrievalClient:
    def __init__(self):
        self.base_url = settings.RETRIEVAL_AGENT_URL

    async def retrieve(
        self,
        query: str,
        top_k: int = 5,
        dense_weight: float = 0.6,
        sparse_weight: float = 0.4,
        document_id: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Calls the Retrieval Agent container to perform Hybrid Search (Dense + Sparse RRF).
        """
        payload = {
            "query": query,
            "top_k": top_k,
            "dense_weight": dense_weight,
            "sparse_weight": sparse_weight,
            "document_id": document_id
        }
        url = f"{self.base_url}/retrieve"
        logger.info(f"Orchestrator dispatching to Retrieval Agent at {url}")

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(url, json=payload)
            response.raise_for_status()
            data = response.json()
            return data.get("results", [])

retrieval_client = RetrievalClient()
