import logging
from typing import List, Dict, Any
from fastapi import APIRouter, UploadFile, File, HTTPException
from ..db import db_pool
from ..document_processor import document_processor

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/documents", tags=["Documents"])

@router.get("", response_model=List[Dict[str, Any]])
async def list_documents():
    """Lists all ingested documents in the knowledge base."""
    if not db_pool.pool:
        raise HTTPException(status_code=500, detail="Database connection pool unavailable")
    
    async with db_pool.pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT id, filename, file_type, file_size, total_pages, total_chunks, created_at
            FROM documents
            ORDER BY created_at DESC
            """
        )
        return [
            {
                "id": row["id"],
                "filename": row["filename"],
                "file_type": row["file_type"],
                "file_size": row["file_size"],
                "total_pages": row["total_pages"],
                "total_chunks": row["total_chunks"],
                "created_at": row["created_at"].isoformat() if row["created_at"] else None
            }
            for row in rows
        ]

@router.post("/upload")
async def upload_document(file: UploadFile = File(...)):
    """Uploads a PDF or text document, chunks it, generates embeddings, and stores it in pgvector."""
    filename = file.filename or "uploaded_document"
    content_type = file.content_type or ""

    if not (filename.lower().endswith((".pdf", ".txt", ".md")) or "pdf" in content_type or "text" in content_type):
        raise HTTPException(
            status_code=400,
            detail="Unsupported file format. Please upload a PDF (.pdf), Text (.txt), or Markdown (.md) document."
        )

    try:
        file_bytes = await file.read()
        if len(file_bytes) == 0:
            raise HTTPException(status_code=400, detail="Uploaded file is empty.")

        result = await document_processor.process_and_store_document(
            filename=filename,
            file_bytes=file_bytes,
            content_type=content_type
        )
        return {"status": "success", "message": f"Successfully ingested '{filename}'", "document": result}
    except Exception as e:
        logger.error(f"Error processing uploaded document '{filename}': {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to process document: {str(e)}")

@router.delete("/{document_id}")
async def delete_document(document_id: str):
    """Deletes a document and all its associated vector chunks from PostgreSQL."""
    if not db_pool.pool:
        raise HTTPException(status_code=500, detail="Database connection pool unavailable")

    async with db_pool.pool.acquire() as conn:
        deleted = await conn.execute("DELETE FROM documents WHERE id = $1", document_id)
        if deleted == "DELETE 0":
            raise HTTPException(status_code=404, detail="Document not found")
    
    return {"status": "success", "message": f"Document {document_id} deleted"}

@router.post("/sample")
async def seed_sample_document():
    """Seeds a rich multi-page knowledge document for immediate RAG testing."""
    sample_content = (
        "=== Chapter 1: Introduction to Knowledge Graphs and Hybrid Search ===\n\n"
        "A Knowledge Graph represents a network of real-world entities—objects, events, situations, or abstract concepts—"
        "and illustrates the relationship between them. This information is usually stored in a graph database and visualized as a graph structure.\n\n"
        "In modern Retrieval-Augmented Generation (RAG) architectures, relying solely on dense vector search has distinct limitations. "
        "Dense search using cosine similarity excels at semantic meaning and conceptual matching, but often fails on exact keyword matches, "
        "acronyms, model codes, and rare terminology. Conversely, sparse search (such as BM25 or PostgreSQL Full-Text Search) excels at lexical precision.\n\n"
        "Hybrid search bridges this gap by combining dense embeddings with sparse lexical search using Reciprocal Rank Fusion (RRF). "
        "The RRF algorithm assigns scores based on the rank of items in individual search lists, calculated as: RRF(d) = sum(w / (k + rank)). "
        "A standard smoothing constant k=60 ensures that high-ranking results from either list contribute significantly while mitigating outlier ranks.\n\n"
        "=== Chapter 2: Multi-Agent Orchestration with LangGraph and Google AI Studio ===\n\n"
        "Multi-agent architectures decompose complex AI pipelines into specialized, containerized microservices. In an enterprise system, "
        "having dedicated containers for Retrieval and Synthesis provides clear separation of concerns, independent horizontal scaling, and robust fault isolation.\n\n"
        "All client interactions flow through an Orchestrator service. The Orchestrator leverages LangGraph—a library for building stateful, multi-actor "
        "applications with LLMs. LangGraph coordinates cyclical workflows, state propagation, decision branching, and human-in-the-loop validation.\n\n"
        "For agent reasoning and generation, Google AI Studio provides high-performance Gemini models, such as Gemini 1.5 Flash and Gemini 2.0. "
        "Gemini models boast million-token context windows, multimodal capabilities, and grounded citation generation. "
        "When combined with Google text-embedding-004, which produces 768-dimensional dense vectors, the system delivers sub-second hybrid retrieval with rigorous citations.\n\n"
        "=== Chapter 3: Grounded Citations and Hallucination Mitigation ===\n\n"
        "A critical challenge in enterprise LLM deployment is hallucination. Grounded RAG architectures mitigate this by enforcing strict constraints on the synthesis agent. "
        "Every factual claim generated by the Gemini model must be accompanied by an explicit in-text citation marker linking back to the exact source document, page number, "
        "and chunk identifier stored in PostgreSQL pgvector. Users can click on citations to inspect the original evidence, verifying truthfulness."
    )

    result = await document_processor.process_and_store_document(
        filename="Knowledge_Graphs_and_MultiAgent_RAG_Guide.txt",
        file_bytes=sample_content.encode("utf-8"),
        content_type="text/plain"
    )
    return {"status": "success", "message": "Sample knowledge document ingested successfully", "document": result}
