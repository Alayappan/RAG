export interface DocumentItem {
  id: string;
  filename: string;
  file_type: string;
  file_size: number;
  total_pages: number;
  total_chunks: number;
  created_at: string;
}

export interface CitationItem {
  citation_id: number;
  document_id: string;
  document_name: string;
  page_number: number;
  chunk_index: number;
  excerpt: string;
  full_content?: string;
  dense_score: number;
  sparse_score: number;
  rrf_score: number;
  is_cited_in_text?: boolean;
}

export interface ChunkItem {
  id: string;
  document_id: string;
  document_name: string;
  chunk_index: number;
  page_number: number;
  content: string;
  dense_score: number;
  sparse_score: number;
  rrf_score: number;
  retrieval_types: string[];
}

export interface AgentStep {
  step_name: string;
  agent_target: string;
  description: string;
  status: 'completed' | 'failed' | 'pending';
  details?: Record<string, any>;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'agent';
  text: string;
  timestamp: Date;
  citations?: CitationItem[];
  steps?: AgentStep[];
  model_used?: string;
}

export interface ChatRequest {
  query: string;
  top_k: number;
  dense_weight: number;
  sparse_weight: number;
  document_id?: string | null;
}

export interface ChatResponse {
  query: string;
  answer: string;
  citations: CitationItem[];
  retrieved_chunks: ChunkItem[];
  steps: AgentStep[];
  model_used: string;
}

export interface SystemStatus {
  status: string;
  orchestrator: {
    healthy: boolean;
    version: string;
    google_ai_studio_configured: boolean;
    models: {
      embedding: string;
      synthesis: string;
    };
  };
  database: {
    connected: boolean;
    total_documents: number;
    total_chunks: number;
    error?: string;
  };
  retrieval_agent: {
    healthy: boolean;
    url: string;
    database_connected?: boolean;
    google_api_configured?: boolean;
    error?: string;
  };
  synthesis_agent: {
    healthy: boolean;
    url: string;
    google_ai_studio_configured?: boolean;
    model?: string;
    error?: string;
  };
}
