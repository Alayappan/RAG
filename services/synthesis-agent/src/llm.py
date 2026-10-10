import logging
from typing import Optional
from .config import settings

logger = logging.getLogger(__name__)

class LLMService:
    def __init__(self):
        self._llm = None
        self._initialized = False

    def get_llm(self):
        if self._initialized:
            return self._llm
        
        api_key = settings.GOOGLE_API_KEY
        if api_key and api_key != "your_gemini_api_key_here":
            try:
                from langchain_google_genai import ChatGoogleGenerativeAI
                self._llm = ChatGoogleGenerativeAI(
                    model=settings.GEMINI_MODEL,
                    google_api_key=api_key,
                    temperature=settings.TEMPERATURE,
                    max_output_tokens=settings.MAX_OUTPUT_TOKENS,
                )
                logger.info(f"Initialized Google AI Studio Gemini LLM ({settings.GEMINI_MODEL})")
            except Exception as e:
                logger.warning(f"Could not initialize ChatGoogleGenerativeAI: {e}")
                self._llm = None
        else:
            logger.warning("GOOGLE_API_KEY is not configured. Synthesis Agent will run in simulated mode.")
            self._llm = None

        self._initialized = True
        return self._llm

llm_service = LLMService()
