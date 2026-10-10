import httpx
import logging
from typing import List, Dict, Any, Tuple
from ..config import settings

logger = logging.getLogger(__name__)

class SynthesisClient:
    def __init__(self):
        self.base_url = settings.SYNTHESIS_AGENT_URL

    async def synthesize(
        self,
        query: str,
        chunks: List[Dict[str, Any]]
    ) -> Tuple[str, List[Dict[str, Any]], str]:
        """
        Calls the Synthesis Agent container to perform grounded LLM generation and citation extraction.
        Returns (answer, citations, model_used).
        """
        payload = {
            "query": query,
            "chunks": chunks
        }
        url = f"{self.base_url}/synthesize"
        logger.info(f"Orchestrator dispatching to Synthesis Agent at {url}")

        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(url, json=payload)
            response.raise_for_status()
            data = response.json()
            return (
                data.get("answer", ""),
                data.get("citations", []),
                data.get("model_used", "gemini")
            )

synthesis_client = SynthesisClient()
