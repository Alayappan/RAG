import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    POSTGRES_HOST: str = os.getenv("POSTGRES_HOST", "postgres")
    POSTGRES_PORT: int = int(os.getenv("POSTGRES_PORT", "5432"))
    POSTGRES_USER: str = os.getenv("POSTGRES_USER", "raguser")
    POSTGRES_PASSWORD: str = os.getenv("POSTGRES_PASSWORD", "ragpassword")
    POSTGRES_DB: str = os.getenv("POSTGRES_DB", "ragdb")
    
    GOOGLE_API_KEY: str = os.getenv("GOOGLE_API_KEY", "")
    EMBEDDING_MODEL: str = os.getenv("EMBEDDING_MODEL", "models/text-embedding-004")
    
    DEFAULT_TOP_K: int = int(os.getenv("DEFAULT_TOP_K", "5"))
    DEFAULT_DENSE_WEIGHT: float = float(os.getenv("DEFAULT_DENSE_WEIGHT", "0.6"))
    DEFAULT_SPARSE_WEIGHT: float = float(os.getenv("DEFAULT_SPARSE_WEIGHT", "0.4"))
    RRF_K: int = int(os.getenv("RRF_K", "60"))

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
