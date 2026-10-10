import re
import logging
from typing import List, Dict, Any, Tuple
from .llm import llm_service
from .config import settings

logger = logging.getLogger(__name__)

GROUNDED_SYNTHESIS_PROMPT = """You are an expert AI Research and Synthesis Agent.
Your job is to answer the user's question accurately and objectively using ONLY the provided reference documents.

REFERENCE DOCUMENTS:
{formatted_sources}

USER QUESTION:
{query}

STRICT INSTRUCTIONS:
1. Grounding: Rely ONLY on the information provided in the reference documents above. Do NOT assume, extrapolate, or invent facts not present in the sources.
2. In-text Citations: Whenever you cite or use a specific fact, figure, statement, or concept from a reference source, append an inline citation mark in the form `[^n]` immediately after the sentence or clause (e.g. `[^1]`, `[^2]`).
3. Synthesis Quality: Provide a well-structured, clear, and comprehensive answer. Use bullet points or headers if appropriate.
4. Insufficient Information: If the reference documents do not contain enough information to fully answer the question, answer what you can using the sources and clearly state what information is missing.
"""

def format_sources_for_prompt(chunks: List[Dict[str, Any]]) -> str:
    formatted = []
    for idx, chunk in enumerate(chunks, start=1):
        doc = chunk.get("document_name", "Unknown Document")
        page = chunk.get("page_number", 1)
        content = chunk.get("content", "").strip()
        formatted.append(f"--- [Source {idx}] Document: {doc} | Page: {page} ---\n{content}\n")
    return "\n".join(formatted)

def normalize_content_to_string(content: Any) -> str:
    """
    Normalizes LLM output content into a plain string.
    LangChain AIMessage.content can be a string, a list of strings,
    or a list of content part dicts (e.g. [{'type': 'text', 'text': '...'}]).
    """
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts = []
        for item in content:
            if isinstance(item, str):
                parts.append(item)
            elif isinstance(item, dict):
                if item.get("type") == "text" and "text" in item:
                    parts.append(item["text"])
                elif "text" in item and item.get("type") != "thought":
                    parts.append(item["text"])
                elif "content" in item:
                    parts.append(str(item["content"]))
            elif hasattr(item, "text"):
                parts.append(str(getattr(item, "text")))
            else:
                parts.append(str(item))
        if parts:
            return "".join(parts) if any("\n" in p for p in parts) else "\n\n".join(parts)
        if content:
            return "".join(str(item) for item in content)
        return ""
    return str(content) if content is not None else ""

def extract_citations(answer: Any, chunks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Parses inline citation markers [^1], [^2], etc. from the LLM output
    and builds structured citation metadata.
    """
    if not isinstance(answer, str):
        answer = normalize_content_to_string(answer)

    cited_indices = set(re.findall(r'\[\^(\d+)\]', answer))
    citations = []

    # Map all chunks into structured citations, flagging which ones were explicitly cited
    for idx, chunk in enumerate(chunks, start=1):
        idx_str = str(idx)
        is_cited = idx_str in cited_indices
        citations.append({
            "citation_id": idx,
            "document_id": chunk.get("document_id"),
            "document_name": chunk.get("document_name"),
            "page_number": chunk.get("page_number", 1),
            "chunk_index": chunk.get("chunk_index", 0),
            "excerpt": chunk.get("content", "")[:300] + "...",
            "full_content": chunk.get("content", ""),
            "dense_score": chunk.get("dense_score", 0.0),
            "sparse_score": chunk.get("sparse_score", 0.0),
            "rrf_score": chunk.get("rrf_score", 0.0),
            "is_cited_in_text": is_cited,
        })

    return citations

async def synthesize_grounded_answer(query: str, chunks: List[Dict[str, Any]]) -> Tuple[str, List[Dict[str, Any]]]:
    """
    Synthesizes a response using Google AI Studio Gemini LLM grounded on chunks.
    Returns (answer_markdown, citations_list).
    """
    if not chunks:
        return (
            "No relevant document chunks were found in the knowledge base to answer your question. "
            "Please upload relevant documents first or try rephrasing your search query.",
            []
        )

    formatted_sources = format_sources_for_prompt(chunks)
    prompt = GROUNDED_SYNTHESIS_PROMPT.format(
        formatted_sources=formatted_sources,
        query=query
    )

    llm = llm_service.get_llm()
    if llm:
        try:
            import asyncio
            from langchain_core.messages import HumanMessage, SystemMessage
            
            loop = asyncio.get_event_loop()
            messages = [HumanMessage(content=prompt)]
            response = await loop.run_in_executor(None, llm.invoke, messages)
            raw_content = response.content if hasattr(response, "content") else str(response)
            answer_text = normalize_content_to_string(raw_content)
        except Exception as e:
            logger.error(f"Google AI Studio Gemini invocation error: {e}", exc_info=True)
            answer_text = (
                f"**Error calling Google AI Studio Gemini**: `{e}`\n\n"
                f"Retrieved {len(chunks)} relevant document chunks below from hybrid search."
            )
    else:
        # Fallback simulator when GOOGLE_API_KEY is not configured
        lines = [
            f"*(Note: Running in simulated synthesis mode. Set `GOOGLE_API_KEY` for live Google AI Studio Gemini reasoning.)*\n",
            f"Based on the **{len(chunks)} hybrid search sources retrieved** for query *\"{query}\"*, here is the synthesized summary:\n"
        ]
        for idx, chunk in enumerate(chunks[:3], start=1):
            doc = chunk.get("document_name", "Document")
            page = chunk.get("page_number", 1)
            content_snippet = chunk.get("content", "").replace("\n", " ").strip()[:180]
            lines.append(f"- **Key Point {idx}**: {content_snippet}... [^{idx}] *(from {doc}, Page {page})*")
        answer_text = "\n".join(lines)

    citations = extract_citations(answer_text, chunks)
    return answer_text, citations
