#!/usr/bin/env bash
set -e

echo "=========================================================="
echo "  NeuralGraph RAG System - Docker & Environment Setup"
echo "=========================================================="

# Check for .env file
if [ ! -f .env ]; then
    echo "Creating .env from .env.example..."
    cp .env.example .env
    echo "[!] Please edit .env and insert your GOOGLE_API_KEY from Google AI Studio."
fi

echo "Checking Docker..."
if ! command -v docker &> /dev/null; then
    echo "[-] Error: docker is not installed or not in PATH."
    exit 1
fi

echo "[+] Configuration verified."
echo "To build and start all containers:"
echo "    docker compose up --build"
echo ""
echo "Endpoints:"
echo "  - Frontend (Angular UI):     http://localhost:4200"
echo "  - Orchestrator (LangGraph):  http://localhost:8000/docs"
echo "  - Retrieval Agent:          http://localhost:8001/docs"
echo "  - Synthesis Agent:          http://localhost:8002/docs"
echo "  - PostgreSQL (pgvector):     localhost:5432"
echo "=========================================================="
