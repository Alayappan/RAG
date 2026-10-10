import asyncpg
import logging
from typing import Optional
from .config import settings

logger = logging.getLogger(__name__)

class DatabasePool:
    def __init__(self):
        self.pool: Optional[asyncpg.Pool] = None

    async def connect(self):
        try:
            self.pool = await asyncpg.create_pool(
                host=settings.POSTGRES_HOST,
                port=settings.POSTGRES_PORT,
                user=settings.POSTGRES_USER,
                password=settings.POSTGRES_PASSWORD,
                database=settings.POSTGRES_DB,
                min_size=2,
                max_size=10,
            )
            logger.info("Orchestrator connected to PostgreSQL database pool.")
        except Exception as e:
            logger.error(f"Orchestrator failed to connect to PostgreSQL: {e}")
            raise

    async def disconnect(self):
        if self.pool:
            await self.pool.close()
            logger.info("Orchestrator PostgreSQL database pool closed.")

db_pool = DatabasePool()
