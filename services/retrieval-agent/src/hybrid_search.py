import json
import logging
from typing import List, Dict, Any, Optional
from .db import db_pool
from .embeddings import embedding_service
from .config import settings

logger = logging.getLogger(__name__)

async def hybrid_search(
    query: str,
    top_k: int = 5,
    dense_weight: float = 0.6,
    sparse_weight: float = 0.4,
    rrf_k: int = 60,
    document_id: Optional[str] = None
) -> List[Dict[str, Any]]:
    """
    Executes hybrid search combining:
    1. Dense vector similarity search (pgvector cosine similarity)
    2. Sparse full-text search (PostgreSQL tsvector / ts_rank_cd)
    3. Reciprocal Rank Fusion (RRF) with configurable weights
    """
    if not db_pool.pool:
        raise RuntimeError("Database connection pool is not initialized.")

    # 1. Generate query embedding
    query_vector = await embedding_service.get_embedding(query)
    query_vector_str = "[" + ",".join(f"{x:.6f}" for x in query_vector) + "]"

    candidate_k = max(top_k * 4, 20)

    async with db_pool.pool.acquire() as conn:
        # 2. Dense search query
        dense_query = """
            SELECT 
                id, document_id, document_name, chunk_index, page_number, 
                content, metadata,
                (1 - (embedding <=> $1::vector)) AS dense_score
            FROM document_chunks
            WHERE embedding IS NOT NULL
        """
        dense_params = [query_vector_str, candidate_k]
        if document_id:
            dense_query += " AND document_id = $3"
            dense_params.insert(2, document_id)
            dense_query += f" ORDER BY embedding <=> $1::vector ASC LIMIT ${len(dense_params)}"
        else:
            dense_query += " ORDER BY embedding <=> $1::vector ASC LIMIT $2"

        dense_rows = await conn.fetch(dense_query, *dense_params)

        # 3. Sparse search query (Postgres Full-Text Search)
        # Using plainto_tsquery for natural language token matching
        sparse_query = """
            SELECT 
                id, document_id, document_name, chunk_index, page_number, 
                content, metadata,
                ts_rank_cd(tsv, plainto_tsquery('english', $1)) AS sparse_score
            FROM document_chunks
            WHERE tsv @@ plainto_tsquery('english', $1)
        """
        sparse_params = [query, candidate_k]
        if document_id:
            sparse_query += " AND document_id = $3"
            sparse_params.insert(2, document_id)
            sparse_query += f" ORDER BY sparse_score DESC LIMIT ${len(sparse_params)}"
        else:
            sparse_query += " ORDER BY sparse_score DESC LIMIT $2"

        sparse_rows = await conn.fetch(sparse_query, *sparse_params)

    # 4. Build rank mappings for RRF
    dense_ranks = {}
    dense_scores = {}
    for rank, row in enumerate(dense_rows, start=1):
        chunk_id = row["id"]
        dense_ranks[chunk_id] = rank
        dense_scores[chunk_id] = float(row["dense_score"])

    sparse_ranks = {}
    sparse_scores = {}
    for rank, row in enumerate(sparse_rows, start=1):
        chunk_id = row["id"]
        sparse_ranks[chunk_id] = rank
        sparse_scores[chunk_id] = float(row["sparse_score"])

    # Collect all unique candidate chunks
    chunk_data: Dict[str, Dict[str, Any]] = {}
    for row in list(dense_rows) + list(sparse_rows):
        cid = row["id"]
        if cid not in chunk_data:
            meta = row["metadata"]
            if isinstance(meta, str):
                try:
                    meta = json.loads(meta)
                except Exception:
                    meta = {}
            chunk_data[cid] = {
                "id": cid,
                "document_id": row["document_id"],
                "document_name": row["document_name"],
                "chunk_index": row["chunk_index"],
                "page_number": row["page_number"],
                "content": row["content"],
                "metadata": meta,
            }

    # 5. Compute Reciprocal Rank Fusion (RRF) Score
    # Formula: Score = dense_weight / (k + dense_rank) + sparse_weight / (k + sparse_rank)
    scored_results = []
    for cid, data in chunk_data.items():
        d_rank = dense_ranks.get(cid)
        s_rank = sparse_ranks.get(cid)

        d_component = (dense_weight / (rrf_k + d_rank)) if d_rank is not None else 0.0
        s_component = (sparse_weight / (rrf_k + s_rank)) if s_rank is not None else 0.0
        rrf_score = d_component + s_component

        scored_results.append({
            **data,
            "rrf_score": round(rrf_score, 6),
            "dense_score": round(dense_scores.get(cid, 0.0), 4),
            "dense_rank": d_rank,
            "sparse_score": round(sparse_scores.get(cid, 0.0), 4),
            "sparse_rank": s_rank,
            "retrieval_types": [
                *(["dense"] if d_rank is not None else []),
                *(["sparse"] if s_rank is not None else [])
            ]
        })

    # Sort descending by RRF score
    scored_results.sort(key=lambda x: x["rrf_score"], reverse=True)
    return scored_results[:top_k]
