import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RagService } from './services/rag.service';
import { DocumentItem, CitationItem, AgentStep, ChatMessage, SystemStatus } from './models/rag.models';
import { HeaderComponent } from './components/header/header.component';
import { DocumentUploadComponent } from './components/document-upload/document-upload.component';
import { CitationsPanelComponent } from './components/citations-panel/citations-panel.component';
import { WorkflowTraceComponent } from './components/workflow-trace/workflow-trace.component';
import { CitationPreviewModalComponent } from './components/citation-preview-modal/citation-preview-modal.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    HeaderComponent,
    DocumentUploadComponent,
    CitationsPanelComponent,
    WorkflowTraceComponent,
    CitationPreviewModalComponent
  ],
  template: `
    <div class="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      <!-- Top Navigation & System Health Bar -->
      <app-header [status]="systemStatus" (refresh)="loadSystemStatus()"></app-header>

      <!-- Main Layout -->
      <main class="flex-1 max-w-[1700px] w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-hidden">
        
        <!-- Left Column: Document Management & Knowledge Base (3 cols) -->
        <section class="lg:col-span-3 flex flex-col gap-4">
          <app-document-upload
            [documents]="documents"
            [isUploading]="isUploading"
            (fileUploaded)="onFileUpload($event)"
            (seedSample)="onSeedSample()"
            (deleteDoc)="onDeleteDoc($event)">
          </app-document-upload>

          <!-- Search Configuration Widget -->
          <div class="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg text-xs space-y-4">
            <h3 class="font-semibold text-slate-200 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <svg class="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
              Hybrid Retrieval Tuning
            </h3>

            <!-- Search Mode Presets -->
            <div>
              <label class="block text-slate-400 mb-1.5 font-medium">Search Strategy</label>
              <div class="grid grid-cols-3 gap-1.5">
                <button type="button" (click)="setPreset(0.8, 0.2)"
                        [ngClass]="denseWeight >= 0.7 ? 'bg-blue-600 text-white font-semibold' : 'bg-slate-800 text-slate-400'"
                        class="py-1 px-2 rounded text-[11px] transition-colors text-center">
                  Semantic
                </button>
                <button type="button" (click)="setPreset(0.6, 0.4)"
                        [ngClass]="denseWeight === 0.6 ? 'bg-blue-600 text-white font-semibold' : 'bg-slate-800 text-slate-400'"
                        class="py-1 px-2 rounded text-[11px] transition-colors text-center">
                  Hybrid
                </button>
                <button type="button" (click)="setPreset(0.2, 0.8)"
                        [ngClass]="sparseWeight >= 0.7 ? 'bg-blue-600 text-white font-semibold' : 'bg-slate-800 text-slate-400'"
                        class="py-1 px-2 rounded text-[11px] transition-colors text-center">
                  Exact FTS
                </button>
              </div>
            </div>

            <!-- Top-K Slider -->
            <div>
              <div class="flex justify-between text-slate-400 mb-1">
                <span>Top-K Results:</span>
                <span class="text-white font-mono font-bold">{{ topK }}</span>
              </div>
              <input type="range" min="1" max="15" [(ngModel)]="topK" class="w-full accent-blue-500 cursor-pointer">
            </div>

            <!-- Dense Weight Slider -->
            <div>
              <div class="flex justify-between text-slate-400 mb-1">
                <span>Dense Weight (Vector):</span>
                <span class="text-blue-400 font-mono font-bold">{{ denseWeight.toFixed(2) }}</span>
              </div>
              <input type="range" min="0" max="1" step="0.05" [(ngModel)]="denseWeight" (ngModelChange)="sparseWeight = 1 - denseWeight" class="w-full accent-blue-500 cursor-pointer">
            </div>

            <!-- Sparse Weight Slider -->
            <div>
              <div class="flex justify-between text-slate-400 mb-1">
                <span>Sparse Weight (BM25 / FTS):</span>
                <span class="text-purple-400 font-mono font-bold">{{ sparseWeight.toFixed(2) }}</span>
              </div>
              <input type="range" min="0" max="1" step="0.05" [(ngModel)]="sparseWeight" (ngModelChange)="denseWeight = 1 - sparseWeight" class="w-full accent-purple-500 cursor-pointer">
            </div>
          </div>
        </section>

        <!-- Center Column: Multi-Agent Chat & Orchestrator (6 cols) -->
        <section class="lg:col-span-6 flex flex-col bg-slate-900 border border-slate-800 rounded-xl shadow-lg overflow-hidden h-[calc(100vh-120px)]">
          <!-- Chat Header -->
          <div class="p-4 border-b border-slate-800 bg-slate-900/80 backdrop-blur flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
              <h2 class="text-sm font-semibold text-white">Central Orchestrator Agent Gateway</h2>
            </div>
            <span class="text-xs text-slate-400">Model: Google AI Studio Gemini</span>
          </div>

          <!-- Messages Feed -->
          <div class="flex-1 overflow-y-auto p-4 space-y-4">
            <!-- Welcome Banner if empty -->
            <div *ngIf="messages.length === 0" class="p-6 text-center text-slate-400 my-auto space-y-4">
              <div class="w-14 h-14 mx-auto rounded-2xl bg-blue-950 border border-blue-800 flex items-center justify-center text-blue-400">
                <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <div>
                <h3 class="text-base font-bold text-white">Ask your Knowledge Base</h3>
                <p class="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                  Every query is coordinated by the central Orchestrator via LangGraph, retrieved with pgvector Hybrid Search, and grounded with citations.
                </p>
              </div>

              <!-- Quick prompt suggestions -->
              <div class="flex flex-wrap justify-center gap-2 pt-2">
                <button *ngFor="let prompt of samplePrompts" (click)="askPrompt(prompt)"
                        class="px-3 py-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 border border-slate-700 transition-colors">
                  "{{ prompt }}"
                </button>
              </div>
            </div>

            <!-- Message bubbles -->
            <div *ngFor="let msg of messages" class="space-y-2">
              <!-- User Message -->
              <div *ngIf="msg.sender === 'user'" class="flex justify-end">
                <div class="max-w-[85%] bg-blue-600 text-white rounded-2xl rounded-tr-sm px-4 py-3 text-sm shadow-md">
                  {{ msg.text }}
                </div>
              </div>

              <!-- Agent Message -->
              <div *ngIf="msg.sender === 'agent'" class="flex gap-3">
                <div class="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-600 to-blue-600 flex items-center justify-center text-white shrink-0 shadow-md">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div class="max-w-[90%] space-y-2">
                  <div class="bg-slate-950 border border-slate-800 rounded-2xl rounded-tl-sm px-4 py-3.5 text-sm text-slate-200 leading-relaxed shadow-sm">
                    <!-- Formatted text with parsed citations -->
                    <div [innerHTML]="renderAnswer(msg.text)" (click)="handleCitationClick($event, msg.citations)"></div>
                  </div>

                  <!-- Inline Quick Source Pills -->
                  <div *ngIf="msg.citations && msg.citations.length > 0" class="flex flex-wrap items-center gap-1.5 pt-1">
                    <span class="text-[11px] text-slate-500 font-medium mr-1 flex items-center gap-1">
                      <svg class="w-3.5 h-3.5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Sources:
                    </span>
                    <button *ngFor="let c of msg.citations" (click)="openCitationModal(c, msg.citations)"
                            title="Click to preview source [{{ c.citation_id }}]"
                            class="px-2 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 text-[11px] text-blue-400 hover:text-white border border-slate-700 hover:border-blue-500/50 transition-all flex items-center gap-1 shadow-sm">
                      <span class="font-bold">[{{ c.citation_id }}]</span>
                      <span class="truncate max-w-[130px]">{{ c.document_name }}</span>
                      <span class="text-slate-400 font-mono text-[10px]">p.{{ c.page_number }}</span>
                      <svg class="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Loading Indicator -->
            <div *ngIf="isLoading" class="flex gap-3 items-center text-slate-400 text-xs">
              <div class="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center">
                <svg class="animate-spin w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
              <span class="animate-pulse">Orchestrator running LangGraph pipeline across agent containers...</span>
            </div>
          </div>

          <!-- Query Input Form -->
          <div class="p-4 border-t border-slate-800 bg-slate-950">
            <form (ngSubmit)="sendQuery()" class="flex items-center gap-2">
              <input 
                type="text" 
                [(ngModel)]="queryInput" 
                name="query"
                [disabled]="isLoading"
                placeholder="Ask about your uploaded documents (e.g. 'What is hybrid search and RRF?')..."
                class="flex-1 bg-slate-900 border border-slate-700 focus:border-blue-500 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition-all">
              
              <button 
                type="submit" 
                [disabled]="!queryInput.trim() || isLoading"
                class="px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-medium text-sm transition-all shadow-md flex items-center gap-1.5 shrink-0">
                <span>Ask</span>
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
            </form>
          </div>
        </section>

        <!-- Right Column: Citations & Pipeline Visualizer (3 cols) -->
        <section class="lg:col-span-3 flex flex-col gap-4 h-[calc(100vh-120px)]">
          <!-- LangGraph Pipeline Status -->
          <app-workflow-trace [steps]="latestSteps"></app-workflow-trace>

          <!-- Evidence & Citations Detail Drawer -->
          <div class="flex-1 min-h-0">
            <app-citations-panel 
              [citations]="latestCitations"
              [activeCitationId]="activeCitationId"
              (previewCitation)="openCitationModal($event, latestCitations)">
            </app-citations-panel>
          </div>
        </section>

      </main>

      <!-- Interactive Citation Source Preview Modal -->
      <app-citation-preview-modal
        [isOpen]="isCitationModalOpen"
        [citation]="selectedCitation"
        [allCitations]="activeMessageCitations.length > 0 ? activeMessageCitations : latestCitations"
        (closeModal)="closeCitationModal()"
        (navigateCitation)="onNavigateCitation($event)"
        (askQuestionOnSource)="onAskQuestionOnSource($event)">
      </app-citation-preview-modal>
    </div>
  `
})
export class AppComponent implements OnInit {
  systemStatus: SystemStatus | null = null;
  documents: DocumentItem[] = [];
  messages: ChatMessage[] = [];
  queryInput = '';
  isLoading = false;
  isUploading = false;

  // Hyperparameters
  topK = 5;
  denseWeight = 0.6;
  sparseWeight = 0.4;

  // Active Citations & Pipeline
  latestCitations: CitationItem[] = [];
  latestSteps: AgentStep[] = [];
  activeCitationId: number | null = null;

  // Citation Modal & Source Preview State
  isCitationModalOpen = false;
  selectedCitation: CitationItem | null = null;
  activeMessageCitations: CitationItem[] = [];

  samplePrompts = [
    'What is a Knowledge Graph?',
    'How does Hybrid Search and RRF work?',
    'Why use separate containers for each agent?',
    'How does Google AI Studio mitigate hallucinations?'
  ];

  constructor(private ragService: RagService) {}

  ngOnInit() {
    this.loadSystemStatus();
    this.loadDocuments();
    // Refresh status periodically
    setInterval(() => this.loadSystemStatus(), 15000);
  }

  loadSystemStatus() {
    this.ragService.getSystemStatus().subscribe({
      next: status => this.systemStatus = status,
      error: err => console.error('Status fetch error:', err)
    });
  }

  loadDocuments() {
    this.ragService.fetchDocuments().subscribe({
      next: docs => this.documents = docs,
      error: err => console.error('Documents fetch error:', err)
    });
  }

  setPreset(dense: number, sparse: number) {
    this.denseWeight = dense;
    this.sparseWeight = sparse;
  }

  onFileUpload(file: File) {
    this.isUploading = true;
    this.ragService.uploadDocument(file).subscribe({
      next: () => {
        this.isUploading = false;
        this.loadDocuments();
        this.loadSystemStatus();
      },
      error: err => {
        this.isUploading = false;
        alert('Upload failed: ' + (err.error?.detail || err.message));
      }
    });
  }

  onSeedSample() {
    this.isUploading = true;
    this.ragService.seedSampleDocument().subscribe({
      next: () => {
        this.isUploading = false;
        this.loadDocuments();
        this.loadSystemStatus();
      },
      error: err => {
        this.isUploading = false;
        alert('Failed to load sample document: ' + (err.error?.detail || err.message));
      }
    });
  }

  onDeleteDoc(docId: string) {
    if (confirm('Are you sure you want to delete this document and all its vector chunks?')) {
      this.ragService.deleteDocument(docId).subscribe({
        next: () => {
          this.loadDocuments();
          this.loadSystemStatus();
        },
        error: err => alert('Delete failed: ' + (err.error?.detail || err.message))
      });
    }
  }

  askPrompt(text: string) {
    this.queryInput = text;
    this.sendQuery();
  }

  sendQuery() {
    const q = this.queryInput.trim();
    if (!q || this.isLoading) return;

    // Add user message
    this.messages.push({
      id: Date.now().toString(),
      sender: 'user',
      text: q,
      timestamp: new Date()
    });

    this.queryInput = '';
    this.isLoading = true;

    this.ragService.askQuestion({
      query: q,
      top_k: this.topK,
      dense_weight: this.denseWeight,
      sparse_weight: this.sparseWeight
    }).subscribe({
      next: resp => {
        this.isLoading = false;
        this.latestCitations = resp.citations || [];
        this.latestSteps = resp.steps || [];

        this.messages.push({
          id: (Date.now() + 1).toString(),
          sender: 'agent',
          text: resp.answer,
          timestamp: new Date(),
          citations: resp.citations,
          steps: resp.steps,
          model_used: resp.model_used
        });
      },
      error: err => {
        this.isLoading = false;
        this.messages.push({
          id: (Date.now() + 1).toString(),
          sender: 'agent',
          text: 'Error coordinating request: ' + (err.error?.detail || err.message),
          timestamp: new Date()
        });
      }
    });
  }

  renderAnswer(text: string): string {
    if (!text) return '';
    // Format citations [^1] or [^2] into clickable badges with preview icon
    let formatted = text.replace(/\[\^(\d+)\]/g, (match, id) => {
      return `<button class="citation-badge" data-citation-id="${id}" title="Click to preview source [${id}]"><span>[${id}]</span><svg class="citation-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg></button>`;
    });

    // Simple markdown format for bold and linebreaks
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
    formatted = formatted.replace(/`([^`]+)`/g, '<code class="bg-slate-800 px-1 py-0.5 rounded text-blue-300 font-mono text-xs">$1</code>');
    formatted = formatted.replace(/\n\n/g, '<br><br>');
    formatted = formatted.replace(/\n/g, '<br>');
    return formatted;
  }

  handleCitationClick(event: MouseEvent, msgCitations?: CitationItem[]) {
    const target = (event.target as HTMLElement).closest('.citation-badge') as HTMLElement;
    if (target) {
      const citIdStr = target.getAttribute('data-citation-id');
      if (citIdStr) {
        const citId = parseInt(citIdStr, 10);
        const pool = msgCitations && msgCitations.length > 0 ? msgCitations : this.latestCitations;
        const found = pool.find(c => c.citation_id === citId);
        if (found) {
          this.openCitationModal(found, pool);
        } else {
          this.selectCitation(citId);
        }
      }
    }
  }

  selectCitation(citId: number) {
    this.activeCitationId = citId;
    setTimeout(() => {
      const el = document.getElementById('citation-' + citId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 50);

    const found = this.latestCitations.find(c => c.citation_id === citId);
    if (found) {
      this.openCitationModal(found, this.latestCitations);
    }
  }

  openCitationModal(cit: CitationItem, contextCitations?: CitationItem[]) {
    this.selectedCitation = cit;
    this.activeCitationId = cit.citation_id;
    this.activeMessageCitations = contextCitations && contextCitations.length > 0 ? contextCitations : this.latestCitations;
    this.isCitationModalOpen = true;
  }

  closeCitationModal() {
    this.isCitationModalOpen = false;
    this.selectedCitation = null;
  }

  onNavigateCitation(citId: number) {
    const pool = this.activeMessageCitations.length > 0 ? this.activeMessageCitations : this.latestCitations;
    const next = pool.find(c => c.citation_id === citId);
    if (next) {
      this.selectedCitation = next;
      this.activeCitationId = next.citation_id;
    }
  }

  onAskQuestionOnSource(prompt: string) {
    this.queryInput = prompt;
    this.sendQuery();
  }
}
