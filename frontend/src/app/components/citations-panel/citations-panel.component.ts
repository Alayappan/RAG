import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CitationItem } from '../../models/rag.models';

@Component({
  selector: 'app-citations-panel',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col h-full">
      <div class="flex items-center justify-between mb-4">
        <div>
          <h3 class="text-base font-semibold text-white flex items-center gap-2">
            <svg class="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Evidence & Citations
          </h3>
          <p class="text-xs text-slate-400">Verifiable source excerpts with Hybrid Search scores</p>
        </div>
        <span class="px-2 py-0.5 text-xs font-semibold rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
          {{ citations.length }} Sources
        </span>
      </div>

      <div *ngIf="citations.length === 0" class="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-500 text-xs">
        <svg class="w-10 h-10 mb-2 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
        <p>No citations to display yet.</p>
        <p class="mt-1 text-slate-600">Submit a query to inspect grounded evidence and RRF hybrid rankings.</p>
      </div>

      <div class="flex-1 overflow-y-auto space-y-3 pr-1" *ngIf="citations.length > 0">
        <div *ngFor="let cit of citations" 
             [id]="'citation-' + cit.citation_id"
             [ngClass]="activeCitationId === cit.citation_id ? 'ring-2 ring-blue-500 bg-slate-800/80' : 'bg-slate-950 border-slate-800'"
             class="border rounded-xl p-3.5 transition-all text-xs">
          
          <!-- Citation Header -->
          <div class="flex items-center justify-between gap-2 mb-2">
            <div class="flex items-center gap-2">
              <span class="w-5 h-5 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-[10px]">
                {{ cit.citation_id }}
              </span>
              <span class="font-semibold text-slate-200 truncate max-w-[180px]" [title]="cit.document_name">
                {{ cit.document_name }}
              </span>
            </div>
            <span class="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-mono border border-slate-700">
              Page {{ cit.page_number }}
            </span>
          </div>

          <!-- Hybrid Search Ranking Metrics -->
          <div class="grid grid-cols-3 gap-1.5 mb-2.5 p-2 bg-slate-900 rounded-lg text-[10px] font-mono">
            <div>
              <span class="text-slate-500 block">RRF Rank:</span>
              <span class="text-emerald-400 font-bold">{{ cit.rrf_score }}</span>
            </div>
            <div>
              <span class="text-slate-500 block">Dense Cos:</span>
              <span class="text-blue-400 font-bold">{{ cit.dense_score }}</span>
            </div>
            <div>
              <span class="text-slate-500 block">Sparse FTS:</span>
              <span class="text-purple-400 font-bold">{{ cit.sparse_score }}</span>
            </div>
          </div>

          <!-- Document Text Excerpt -->
          <div class="p-2.5 rounded bg-slate-900/60 border border-slate-800 text-slate-300 leading-relaxed font-sans text-xs max-h-40 overflow-y-auto whitespace-pre-wrap">
            {{ cit.full_content || cit.excerpt }}
          </div>

          <div class="mt-2 flex items-center justify-between text-[11px] text-slate-500">
            <span>Chunk #{{ cit.chunk_index }}</span>
            <button (click)="copyText(cit.full_content || cit.excerpt)" class="hover:text-blue-400 flex items-center gap-1 transition-colors">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copy Excerpt
            </button>
          </div>
        </div>
      </div>
    </div>
  `
})
export class CitationsPanelComponent {
  @Input() citations: CitationItem[] = [];
  @Input() activeCitationId: number | null = null;

  copyText(text: string) {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(text);
    }
  }
}
