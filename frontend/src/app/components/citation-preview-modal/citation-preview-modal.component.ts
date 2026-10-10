import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CitationItem, DocumentDetail, DocumentChunk } from '../../models/rag.models';
import { RagService } from '../../services/rag.service';

@Component({
  selector: 'app-citation-preview-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- Modal Backdrop -->
    <div 
      *ngIf="isOpen && citation" 
      class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-fade-in"
      (click)="onBackdropClick($event)">
      
      <!-- Modal Container -->
      <div 
        class="bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl shadow-blue-500/10 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden text-slate-100 ring-1 ring-white/10"
        (click)="$event.stopPropagation()">
        
        <!-- Modal Top Bar / Navigation -->
        <div class="px-5 py-4 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between gap-3 shrink-0">
          <!-- Citation Identity -->
          <div class="flex items-center gap-3 min-w-0">
            <span class="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 text-white font-extrabold flex items-center justify-center text-sm shadow-md shrink-0">
              [{{ citation.citation_id }}]
            </span>
            <div class="min-w-0">
              <div class="flex items-center gap-2">
                <h3 class="text-base font-bold text-white truncate max-w-md sm:max-w-lg" [title]="citation.document_name">
                  {{ citation.document_name }}
                </h3>
                <span [ngClass]="getFileTypeBadgeClass(citation.document_name)" class="px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider shrink-0">
                  {{ getFileType(citation.document_name) }}
                </span>
              </div>
              <p class="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                <span>Page {{ citation.page_number }}</span>
                <span>•</span>
                <span>Chunk #{{ citation.chunk_index }}</span>
                <span *ngIf="citation.is_cited_in_text" class="text-emerald-400 font-medium flex items-center gap-1">
                  • <svg class="w-3.5 h-3.5 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg> Grounded in Response
                </span>
              </p>
            </div>
          </div>

          <!-- Top Actions & Pagination -->
          <div class="flex items-center gap-2 shrink-0">
            <!-- Previous / Next Citation Buttons -->
            <div *ngIf="allCitations && allCitations.length > 1" class="hidden sm:flex items-center bg-slate-800/80 rounded-lg p-0.5 border border-slate-700">
              <button 
                type="button"
                (click)="navigatePrev()" 
                [disabled]="isFirstCitation"
                title="Previous Citation (Left Arrow)"
                class="p-1.5 rounded text-slate-300 hover:text-white hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-transparent transition-colors">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <span class="text-[11px] text-slate-400 px-2 font-mono">
                {{ currentIndex + 1 }} / {{ allCitations.length }}
              </span>
              <button 
                type="button"
                (click)="navigateNext()" 
                [disabled]="isLastCitation"
                title="Next Citation (Right Arrow)"
                class="p-1.5 rounded text-slate-300 hover:text-white hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-transparent transition-colors">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            <!-- Close Button -->
            <button 
              type="button"
              (click)="close()" 
              title="Close Preview (ESC)"
              class="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <!-- Metric Badges Strip -->
        <div class="px-5 py-2.5 bg-slate-950/60 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <div class="flex flex-wrap items-center gap-4">
            <!-- RRF Score -->
            <div class="flex items-center gap-1.5">
              <span class="text-slate-400 text-[11px]">RRF Score:</span>
              <span class="px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-400 font-mono font-bold border border-emerald-800/60">
                {{ citation.rrf_score }}
              </span>
            </div>
            <!-- Dense Vector Score -->
            <div class="flex items-center gap-1.5">
              <span class="text-slate-400 text-[11px]">Dense Cosine:</span>
              <span class="px-2 py-0.5 rounded bg-blue-950/80 text-blue-400 font-mono font-bold border border-blue-800/60">
                {{ citation.dense_score }}
              </span>
            </div>
            <!-- Sparse Full Text Score -->
            <div class="flex items-center gap-1.5">
              <span class="text-slate-400 text-[11px]">Sparse FTS:</span>
              <span class="px-2 py-0.5 rounded bg-purple-950/80 text-purple-400 font-mono font-bold border border-purple-800/60">
                {{ citation.sparse_score }}
              </span>
            </div>
          </div>

          <!-- Document stats if loaded -->
          <div *ngIf="documentDetails" class="text-[11px] text-slate-400 font-mono hidden sm:block">
            Total {{ documentDetails.total_chunks }} chunks • {{ (documentDetails.file_size / 1024).toFixed(1) }} KB
          </div>
        </div>

        <!-- View Tabs -->
        <div class="px-5 pt-3 pb-0 bg-slate-900 border-b border-slate-800 flex items-center gap-2 shrink-0 text-xs">
          <button 
            type="button"
            (click)="activeTab = 'excerpt'" 
            [ngClass]="activeTab === 'excerpt' ? 'text-blue-400 border-blue-500 font-semibold bg-slate-800/50' : 'text-slate-400 hover:text-slate-200 border-transparent'"
            class="px-3 py-2 border-b-2 rounded-t-lg transition-colors flex items-center gap-1.5">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Cited Excerpt
          </button>

          <button 
            type="button"
            (click)="activeTab = 'context'" 
            [ngClass]="activeTab === 'context' ? 'text-blue-400 border-blue-500 font-semibold bg-slate-800/50' : 'text-slate-400 hover:text-slate-200 border-transparent'"
            class="px-3 py-2 border-b-2 rounded-t-lg transition-colors flex items-center gap-1.5">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            Document Context
            <span *ngIf="documentDetails as doc" class="px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300 text-[10px]">
              {{ doc.chunks.length }}
            </span>
          </button>

          <button 
            type="button"
            (click)="activeTab = 'trace'" 
            [ngClass]="activeTab === 'trace' ? 'text-blue-400 border-blue-500 font-semibold bg-slate-800/50' : 'text-slate-400 hover:text-slate-200 border-transparent'"
            class="px-3 py-2 border-b-2 rounded-t-lg transition-colors flex items-center gap-1.5">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
            Vector & Trace Info
          </button>
        </div>

        <!-- Tab 1: Cited Excerpt Content -->
        <div *ngIf="activeTab === 'excerpt'" class="flex-1 overflow-y-auto p-5 space-y-4">
          <div class="bg-slate-950/80 border border-slate-800 rounded-xl p-4 relative group">
            <!-- Header with word count and copy button -->
            <div class="flex items-center justify-between pb-3 mb-3 border-b border-slate-800/80 text-xs text-slate-400">
              <div class="flex items-center gap-2">
                <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span class="font-medium text-slate-300">Exact Passage Grounding</span>
                <span>•</span>
                <span>{{ getWordCount(citation.full_content || citation.excerpt) }} words</span>
              </div>
              <button 
                type="button"
                (click)="copyExcerpt()" 
                class="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors flex items-center gap-1.5 text-xs font-medium">
                <svg *ngIf="!copied" class="w-3.5 h-3.5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <svg *ngIf="copied" class="w-3.5 h-3.5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
                <span>{{ copied ? 'Copied!' : 'Copy Excerpt' }}</span>
              </button>
            </div>

            <!-- Full Excerpt Text with Highlight Styling -->
            <div class="text-sm leading-relaxed text-slate-200 font-sans whitespace-pre-wrap selection:bg-blue-600/40 selection:text-white">
              {{ citation.full_content || citation.excerpt }}
            </div>
          </div>

          <!-- Grounding Verification Box -->
          <div class="bg-gradient-to-r from-blue-950/40 to-slate-900 border border-blue-900/50 rounded-xl p-3.5 flex items-start gap-3 text-xs">
            <div class="w-6 h-6 rounded-lg bg-blue-900/60 text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h4 class="font-semibold text-blue-300">Grounded Citation Verification</h4>
              <p class="text-slate-400 mt-0.5 leading-normal">
                This excerpt was retrieved by pgvector HNSW dense cosine search combined with lexical full-text search. The synthesis agent cited this passage with citation marker <code class="text-blue-300 font-mono bg-slate-900 px-1 py-0.5 rounded">[{{ citation.citation_id }}]</code>.
              </p>
            </div>
          </div>
        </div>

        <!-- Tab 2: Document Context (All Chunks) -->
        <div *ngIf="activeTab === 'context'" class="flex-1 overflow-y-auto p-5 space-y-3">
          <div *ngIf="isLoadingDocument" class="p-8 text-center text-slate-400 text-xs">
            <svg class="animate-spin w-5 h-5 text-blue-400 mx-auto mb-2" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Loading surrounding chunks for {{ citation.document_name }}...
          </div>

          <div *ngIf="!isLoadingDocument && documentDetails as details" class="space-y-3">
            <div class="text-xs text-slate-400 mb-2 flex items-center justify-between">
              <span>Showing all {{ details.chunks.length }} indexed chunks for this document:</span>
              <span class="text-[11px] text-emerald-400 font-medium">📍 Highlighted border denotes active cited chunk</span>
            </div>

            <div 
              *ngFor="let chunk of details.chunks"
              [id]="'doc-chunk-' + chunk.chunk_index"
              [ngClass]="chunk.chunk_index === citation.chunk_index ? 'border-blue-500 bg-blue-950/20 ring-1 ring-blue-500/50 shadow-md' : 'border-slate-800 bg-slate-950/50 opacity-80 hover:opacity-100'"
              class="border rounded-xl p-3.5 transition-all text-xs">
              
              <div class="flex items-center justify-between mb-2 pb-1.5 border-b border-slate-800/60">
                <div class="flex items-center gap-2">
                  <span class="font-mono text-slate-400 text-[11px]">Chunk #{{ chunk.chunk_index }}</span>
                  <span class="text-slate-600">•</span>
                  <span class="text-slate-400 text-[11px]">Page {{ chunk.page_number }}</span>
                  <span 
                    *ngIf="chunk.chunk_index === citation.chunk_index" 
                    class="px-2 py-0.5 rounded-full bg-blue-600 text-white font-bold text-[10px] ml-1 flex items-center gap-1">
                    <span>Cited in Answer</span>
                  </span>
                </div>
                <button 
                  (click)="copyText(chunk.content)" 
                  class="text-slate-500 hover:text-slate-300 text-[11px] transition-colors">
                  Copy
                </button>
              </div>

              <div class="text-slate-300 leading-relaxed font-sans whitespace-pre-wrap">
                {{ chunk.content }}
              </div>
            </div>
          </div>

          <div *ngIf="!isLoadingDocument && !documentDetails" class="p-6 text-center text-slate-400 text-xs">
            <p>Could not fetch full document context. Displaying primary cited chunk above.</p>
          </div>
        </div>

        <!-- Tab 3: Vector & Trace Info -->
        <div *ngIf="activeTab === 'trace'" class="flex-1 overflow-y-auto p-5 space-y-4 text-xs font-mono">
          <div class="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
            <h4 class="font-semibold text-white font-sans text-sm flex items-center gap-2">
              <span class="w-2 h-2 rounded-full bg-blue-400"></span>
              pgvector Vector Search Parameters
            </h4>
            
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-300">
              <div class="p-2.5 rounded bg-slate-900 border border-slate-800">
                <span class="text-slate-500 block text-[11px]">Embedding Model</span>
                <span class="font-bold text-white">Google AI Studio text-embedding / gemini-embedding</span>
              </div>
              <div class="p-2.5 rounded bg-slate-900 border border-slate-800">
                <span class="text-slate-500 block text-[11px]">Vector Dimensionality</span>
                <span class="font-bold text-emerald-400">768-dim (pgvector HNSW)</span>
              </div>
              <div class="p-2.5 rounded bg-slate-900 border border-slate-800">
                <span class="text-slate-500 block text-[11px]">Dense Distance Function</span>
                <span class="font-bold text-blue-400">Cosine Distance (&lt;=&gt;)</span>
              </div>
              <div class="p-2.5 rounded bg-slate-900 border border-slate-800">
                <span class="text-slate-500 block text-[11px]">Sparse Search Engine</span>
                <span class="font-bold text-purple-400">PostgreSQL tsvector / ts_rank_cd</span>
              </div>
            </div>

            <!-- Structured Metadata -->
            <div class="pt-2">
              <span class="text-slate-500 block text-[11px] mb-1 font-sans">Citation Coordinate JSON:</span>
              <pre class="bg-slate-900 p-3 rounded-lg border border-slate-800 text-slate-300 overflow-x-auto text-[11px] leading-tight">{{ citationJson }}</pre>
            </div>
          </div>
        </div>

        <!-- Modal Footer / Actions -->
        <div class="px-5 py-3 border-t border-slate-800 bg-slate-950/80 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div class="flex items-center gap-2">
            <button 
              type="button"
              (click)="copyCitationMarkdown()" 
              class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors text-xs flex items-center gap-1.5">
              <span>Copy Markdown Citation</span>
            </button>
            <button 
              type="button"
              (click)="askFollowup()" 
              class="px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 hover:text-blue-200 border border-blue-500/30 transition-colors text-xs flex items-center gap-1.5">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span>Ask Follow-up on this Source</span>
            </button>
          </div>

          <button 
            type="button"
            (click)="close()" 
            class="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors text-xs font-medium">
            Done
          </button>
        </div>

      </div>
    </div>
  `
})
export class CitationPreviewModalComponent implements OnChanges {
  @Input() citation: CitationItem | null = null;
  @Input() allCitations: CitationItem[] = [];
  @Input() isOpen = false;

  @Output() closeModal = new EventEmitter<void>();
  @Output() navigateCitation = new EventEmitter<number>();
  @Output() askQuestionOnSource = new EventEmitter<string>();

  activeTab: 'excerpt' | 'context' | 'trace' = 'excerpt';
  copied = false;
  documentDetails: DocumentDetail | null = null;
  isLoadingDocument = false;

  constructor(private ragService: RagService) {}

  @HostListener('document:keydown.escape')
  onEscape() {
    if (this.isOpen) {
      this.close();
    }
  }

  @HostListener('document:keydown.arrowleft')
  onArrowLeft() {
    if (this.isOpen && !this.isFirstCitation) {
      this.navigatePrev();
    }
  }

  @HostListener('document:keydown.arrowright')
  onArrowRight() {
    if (this.isOpen && !this.isLastCitation) {
      this.navigateNext();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['citation'] && this.citation) {
      this.copied = false;
      this.loadDocumentDetails();
    }
  }

  get currentIndex(): number {
    if (!this.citation || !this.allCitations?.length) return 0;
    return this.allCitations.findIndex(c => c.citation_id === this.citation?.citation_id);
  }

  get isFirstCitation(): boolean {
    return this.currentIndex <= 0;
  }

  get isLastCitation(): boolean {
    return this.currentIndex >= (this.allCitations?.length || 1) - 1;
  }

  get citationJson(): string {
    if (!this.citation) return '{}';
    return JSON.stringify({
      citation_id: this.citation.citation_id,
      document_id: this.citation.document_id,
      document_name: this.citation.document_name,
      page_number: this.citation.page_number,
      chunk_index: this.citation.chunk_index,
      rrf_score: this.citation.rrf_score,
      dense_score: this.citation.dense_score,
      sparse_score: this.citation.sparse_score,
      is_cited_in_text: this.citation.is_cited_in_text,
    }, null, 2);
  }

  loadDocumentDetails() {
    if (!this.citation?.document_id) {
      this.documentDetails = null;
      return;
    }
    this.isLoadingDocument = true;
    this.ragService.getDocument(this.citation.document_id).subscribe({
      next: (doc) => {
        this.documentDetails = doc;
        this.isLoadingDocument = false;
      },
      error: () => {
        this.documentDetails = null;
        this.isLoadingDocument = false;
      }
    });
  }

  navigatePrev() {
    if (!this.isFirstCitation) {
      const prev = this.allCitations[this.currentIndex - 1];
      if (prev) {
        this.navigateCitation.emit(prev.citation_id);
      }
    }
  }

  navigateNext() {
    if (!this.isLastCitation) {
      const next = this.allCitations[this.currentIndex + 1];
      if (next) {
        this.navigateCitation.emit(next.citation_id);
      }
    }
  }

  close() {
    this.closeModal.emit();
  }

  onBackdropClick(event: MouseEvent) {
    this.close();
  }

  copyExcerpt() {
    const text = this.citation?.full_content || this.citation?.excerpt || '';
    this.copyText(text);
    this.copied = true;
    setTimeout(() => this.copied = false, 2000);
  }

  copyCitationMarkdown() {
    if (!this.citation) return;
    const md = `[^${this.citation.citation_id}]: **${this.citation.document_name}** (Page ${this.citation.page_number}, Chunk #${this.citation.chunk_index})`;
    this.copyText(md);
  }

  copyText(text: string) {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(text);
    }
  }

  askFollowup() {
    if (!this.citation) return;
    const prompt = `Can you provide more detail on what "${this.citation.document_name}" (Page ${this.citation.page_number}) states regarding this topic?`;
    this.askQuestionOnSource.emit(prompt);
    this.close();
  }

  getFileType(filename: string): string {
    if (!filename) return 'DOC';
    const ext = filename.split('.').pop()?.toUpperCase();
    return ext || 'DOC';
  }

  getFileTypeBadgeClass(filename: string): string {
    const ext = filename?.toLowerCase().split('.').pop();
    if (ext === 'pdf') {
      return 'bg-red-950/80 text-red-400 border border-red-800/60';
    } else if (ext === 'md') {
      return 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60';
    }
    return 'bg-blue-950/80 text-blue-400 border border-blue-800/60';
  }

  getWordCount(text: string): number {
    if (!text) return 0;
    return text.trim().split(/\s+/).length;
  }
}
