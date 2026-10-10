import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    POSTGRES_HOST: str = os.getenv("POSTGRES_HOST", "postgres")
    POSTGRES_PORT: int = int(os.getenv("POSTGRES_PORT", "5432"))
    POSTGRES_USER: str = os.getenv("POSTGRES_USER", "raguser")
    POSTGRES_PASSWORD: str = os.getenv("POSTGRES_PASSWORD", "ragpassword")
    POSTGRES_DB: str = os.getenv("POSTGRES_DB", "ragdb")
    
    GOOGLE_API_KEY: str = os.getenv("GOOGLE_API_KEY", "")
    EMBEDDING_MODEL: str = os.getenv("EMBEDDING_MODEL", "gemini-embedding-2")
    EMBEDDING_DIMENSION: int = int(os.getenv("EMBEDDING_DIMENSION", "768"))
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")
    
    RETRIEVAL_AGENT_URL: str = os.getenv("RETRIEVAL_AGENT_URL", "http://retrieval-agent:8001")
    SYNTHESIS_AGENT_URL: str = os.getenv("SYNTHESIS_AGENT_URL", "http://synthesis-agent:8002")
    
    DEFAULT_TOP_K: int = int(os.getenv("DEFAULT_TOP_K", "5"))
    DEFAULT_DENSE_WEIGHT: float = float(os.getenv("DEFAULT_DENSE_WEIGHT", "0.6"))
    DEFAULT_SPARSE_WEIGHT: float = float(os.getenv("DEFAULT_SPARSE_WEIGHT", "0.4"))

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
