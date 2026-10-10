import io
import uuid
import json
import logging
import hashlib
import numpy as np
from typing import List, Dict, Any, Tuple
from pypdf import PdfReader
from .db import db_pool
from .config import settings

logger = logging.getLogger(__name__)

class DocumentProcessor:
    def __init__(self):
        self._embedder = None
        self._initialized = False

    def _init_embedder(self):
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
                logger.info("Initialized GoogleGenerativeAIEmbeddings in DocumentProcessor")
            except Exception as e:
                logger.warning(f"Could not initialize GoogleGenerativeAIEmbeddings: {e}")
                self._embedder = None
        else:
            self._embedder = None
        self._initialized = True

    def _generate_fallback_embedding(self, text: str, dim: int = 768) -> List[float]:
        hasher = hashlib.sha256(text.encode("utf-8")).digest()
        rng = np.random.default_rng(seed=int.from_bytes(hasher[:4], "big"))
        vec = rng.standard_normal(dim)
        vec = vec / np.linalg.norm(vec)
        return vec.tolist()

    async def get_embedding(self, text: str) -> List[float]:
        self._init_embedder()
        if self._embedder:
            try:
                import asyncio
                loop = asyncio.get_event_loop()
                return await loop.run_in_executor(None, self._embedder.embed_query, text)
            except Exception as e:
                logger.error(f"Google embedding error in DocumentProcessor: {e}")
                return self._generate_fallback_embedding(text)
        return self._generate_fallback_embedding(text)

    def extract_text_from_pdf(self, file_bytes: bytes) -> List[Tuple[int, str]]:
        """Extracts text page by page from PDF. Returns list of (page_num, text)."""
        reader = PdfReader(io.BytesIO(file_bytes))
        pages_content = []
        for idx, page in enumerate(reader.pages, start=1):
            text = page.extract_text() or ""
            text = text.strip()
            if text:
                pages_content.append((idx, text))
        return pages_content

    def extract_text_from_txt(self, file_bytes: bytes) -> List[Tuple[int, str]]:
        """Extracts plain text. Returns list with single page (1, text)."""
        text = file_bytes.decode("utf-8", errors="replace").strip()
        return [(1, text)]

    def chunk_text(self, text: str, page_number: int, chunk_size: int = 800, overlap: int = 150) -> List[Dict[str, Any]]:
        """
        Splits text into overlapping chunks respecting paragraph and sentence boundaries.
        """
        chunks = []
        if not text:
            return chunks

        paragraphs = text.split("\n\n")
        current_chunk = ""

        for para in paragraphs:
            para = para.strip()
            if not para:
                continue
            
            if len(current_chunk) + len(para) <= chunk_size:
                current_chunk += ("\n\n" + para if current_chunk else para)
            else:
                if current_chunk:
                    chunks.append(current_chunk)
                    # preserve overlap
                    overlap_text = current_chunk[-overlap:] if len(current_chunk) > overlap else current_chunk
                    current_chunk = overlap_text + "\n\n" + para
                else:
                    # Paragraph is longer than chunk_size, split by sentences or chunks
                    start = 0
                    while start < len(para):
                        end = min(start + chunk_size, len(para))
                        chunks.append(para[start:end])
                        start += (chunk_size - overlap)
                    current_chunk = ""

        if current_chunk:
            chunks.append(current_chunk)

        result = []
        for idx, c_text in enumerate(chunks):
            result.append({
                "page_number": page_number,
                "content": c_text.strip(),
            })
        return result

    async def process_and_store_document(
        self,
        filename: str,
        file_bytes: bytes,
        content_type: str
    ) -> Dict[str, Any]:
        """
        Full pipeline: Parse file -> Chunk text -> Embed chunks -> Store in PostgreSQL.
        """
        doc_id = str(uuid.uuid4())
        file_size = len(file_bytes)

        # 1. Parse text by page
        if filename.lower().endswith(".pdf") or "pdf" in content_type.lower():
            pages = self.extract_text_from_pdf(file_bytes)
            file_type = "pdf"
        else:
            pages = self.extract_text_from_txt(file_bytes)
            file_type = "text"

        total_pages = len(pages) if pages else 1

        # 2. Chunk text
        all_chunks = []
        for page_num, page_text in pages:
            page_chunks = self.chunk_text(page_text, page_number=page_num)
            all_chunks.extend(page_chunks)

        if not all_chunks:
            raise ValueError("No readable text could be extracted from the document.")

        total_chunks = len(all_chunks)
        logger.info(f"Processing document '{filename}' ({total_pages} pages, {total_chunks} chunks)")

        # 3. Store document metadata and chunks into PostgreSQL
        async with db_pool.pool.acquire() as conn:
            async with conn.transaction():
                # Insert document record
                await conn.execute(
                    """
                    INSERT INTO documents (id, filename, file_type, file_size, total_pages, total_chunks)
                    VALUES ($1, $2, $3, $4, $5, $6)
                    """,
                    doc_id, filename, file_type, file_size, total_pages, total_chunks
                )

                # Embed & insert each chunk
                for idx, chunk in enumerate(all_chunks):
                    chunk_id = str(uuid.uuid4())
                    content = chunk["content"]
                    page_num = chunk["page_number"]

                    # Compute vector embedding via Google AI Studio
                    embedding = await self.get_embedding(content)
                    embedding_str = "[" + ",".join(f"{x:.6f}" for x in embedding) + "]"
                    meta_json = json.dumps({"source": filename, "page": page_num, "chunk_index": idx})

                    await conn.execute(
                        """
                        INSERT INTO document_chunks 
                            (id, document_id, document_name, chunk_index, page_number, content, embedding, metadata)
                        VALUES 
                            ($1, $2, $3, $4, $5, $6, $7::vector, $8::jsonb)
                        """,
                        chunk_id, doc_id, filename, idx, page_num, content, embedding_str, meta_json
                    )

        logger.info(f"Successfully ingested and indexed '{filename}' with {total_chunks} chunks.")
        return {
            "document_id": doc_id,
            "filename": filename,
            "file_type": file_type,
            "file_size": file_size,
            "total_pages": total_pages,
            "total_chunks": total_chunks,
        }

document_processor = DocumentProcessor()
