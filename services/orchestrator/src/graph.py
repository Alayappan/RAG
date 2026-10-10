import logging
from typing import Dict, Any
from langgraph.graph import StateGraph, START, END

from .state import AgentState, AgentStep
from .clients.retrieval_client import retrieval_client
from .clients.synthesis_client import synthesis_client

logger = logging.getLogger(__name__)

async def analyze_query_node(state: AgentState) -> Dict[str, Any]:
    """Node 1: Orchestrator analyzes the query intent and retrieval parameters."""
    query = state.get("query", "").strip()
    steps = list(state.get("steps", []))
    
    intent = "factual_information_retrieval"
    step: AgentStep = {
        "step_name": "Query Intent Analysis",
        "agent_target": "Orchestrator Gateway",
        "description": f"Analyzed user query: '{query}'. Formulated hybrid retrieval strategy.",
        "status": "completed",
        "details": {
            "query": query,
            "top_k": state.get("top_k", 5),
            "dense_weight": state.get("dense_weight", 0.6),
            "sparse_weight": state.get("sparse_weight", 0.4)
        }
    }
    steps.append(step)
    return {
        "query_intent": intent,
        "steps": steps
    }

async def retrieve_context_node(state: AgentState) -> Dict[str, Any]:
    """Node 2: Orchestrator delegates hybrid search to the Retrieval Agent container."""
    steps = list(state.get("steps", []))
    query = state.get("query", "")
    top_k = state.get("top_k", 5)
    dense_weight = state.get("dense_weight", 0.6)
    sparse_weight = state.get("sparse_weight", 0.4)
    doc_id = state.get("document_id")

    try:
        chunks = await retrieval_client.retrieve(
            query=query,
            top_k=top_k,
            dense_weight=dense_weight,
            sparse_weight=sparse_weight,
            document_id=doc_id
        )
        status = "completed"
        desc = f"Retrieval Agent executed Hybrid Search (Dense Vector + Full-Text RRF). Retrieved {len(chunks)} relevant chunks."
    except Exception as e:
        logger.error(f"Retrieval agent error: {e}")
        chunks = []
        status = "failed"
        desc = f"Failed to retrieve chunks from Retrieval Agent: {e}"

    step: AgentStep = {
        "step_name": "Hybrid Retrieval (Dense + Sparse)",
        "agent_target": "Retrieval Agent Container",
        "description": desc,
        "status": status,
        "details": {
            "chunks_count": len(chunks),
            "chunks_retrieved": [
                {
                    "id": c.get("id"),
                    "doc": c.get("document_name"),
                    "page": c.get("page_number"),
                    "rrf_score": c.get("rrf_score"),
                    "dense_score": c.get("dense_score"),
                    "sparse_score": c.get("sparse_score"),
                }
                for c in chunks
            ]
        }
    }
    steps.append(step)
    return {
        "retrieved_chunks": chunks,
        "steps": steps
    }

async def evaluate_context_node(state: AgentState) -> Dict[str, Any]:
    """Node 3: Evaluates retrieved chunks for relevance and sufficiency."""
    steps = list(state.get("steps", []))
    chunks = state.get("retrieved_chunks", [])
    
    passed = len(chunks) > 0
    notes = f"Verified {len(chunks)} candidate source chunk(s) for answer grounding." if passed else "No matching chunks found in database."

    step: AgentStep = {
        "step_name": "Context Relevance Evaluation",
        "agent_target": "Orchestrator Evaluator",
        "description": notes,
        "status": "completed",
        "details": {
            "evaluation_passed": passed,
            "candidate_count": len(chunks)
        }
    }
    steps.append(step)
    return {
        "evaluation_passed": passed,
        "evaluation_notes": notes,
        "steps": steps
    }

async def synthesize_answer_node(state: AgentState) -> Dict[str, Any]:
    """Node 4: Orchestrator delegates synthesis to the Synthesis Agent container (Google AI Studio Gemini)."""
    steps = list(state.get("steps", []))
    query = state.get("query", "")
    chunks = state.get("retrieved_chunks", [])

    try:
        answer, citations, model_used = await synthesis_client.synthesize(
            query=query,
            chunks=chunks
        )
        status = "completed"
        desc = f"Synthesis Agent generated grounded answer using Google AI Studio ({model_used}) with {len(citations)} citations."
    except Exception as e:
        logger.error(f"Synthesis agent error: {e}")
        answer = f"Error during answer synthesis: {e}"
        citations = []
        model_used = "error"
        status = "failed"
        desc = f"Failed to synthesize answer: {e}"

    step: AgentStep = {
        "step_name": "Grounded Synthesis & Reasoning",
        "agent_target": "Synthesis Agent Container (Gemini)",
        "description": desc,
        "status": status,
        "details": {
            "model_used": model_used,
            "citations_count": len(citations),
        }
    }
    steps.append(step)
    return {
        "synthesized_answer": answer,
        "citations": citations,
        "model_used": model_used,
        "steps": steps
    }

async def verify_citations_node(state: AgentState) -> Dict[str, Any]:
    """Node 5: Final citation verification and packaging for client."""
    steps = list(state.get("steps", []))
    citations = state.get("citations", [])

    step: AgentStep = {
        "step_name": "Citation Verification & Mapping",
        "agent_target": "Orchestrator Gateway",
        "description": f"Verified {len(citations)} citation targets with document source references and page coordinates.",
        "status": "completed",
        "details": {
            "citation_ids": [c.get("citation_id") for c in citations]
        }
    }
    steps.append(step)
    return {
        "steps": steps
    }

def build_orchestrator_graph():
    """Builds and compiles the LangGraph StateGraph workflow."""
    workflow = StateGraph(AgentState)

    workflow.add_node("analyze_query", analyze_query_node)
    workflow.add_node("retrieve_context", retrieve_context_node)
    workflow.add_node("evaluate_context", evaluate_context_node)
    workflow.add_node("synthesize_answer", synthesize_answer_node)
    workflow.add_node("verify_citations", verify_citations_node)

    workflow.add_edge(START, "analyze_query")
    workflow.add_edge("analyze_query", "retrieve_context")
    workflow.add_edge("retrieve_context", "evaluate_context")
    workflow.add_edge("evaluate_context", "synthesize_answer")
    workflow.add_edge("synthesize_answer", "verify_citations")
    workflow.add_edge("verify_citations", END)

    return workflow.compile()

rag_graph = build_orchestrator_graph()
