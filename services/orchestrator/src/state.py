from typing import TypedDict, List, Dict, Any, Optional

class AgentStep(TypedDict, total=False):
    step_name: str
    agent_target: str
    description: str
    status: str
    details: Dict[str, Any]

class AgentState(TypedDict, total=False):
    # Inputs
    query: str
    top_k: int
    dense_weight: float
    sparse_weight: float
    document_id: Optional[str]

    # Pipeline progression
    query_intent: str
    retrieved_chunks: List[Dict[str, Any]]
    evaluation_passed: bool
    evaluation_notes: str
    synthesized_answer: str
    citations: List[Dict[str, Any]]
    model_used: str

    # Execution trace for frontend visualization
    steps: List[AgentStep]
    error: Optional[str]
