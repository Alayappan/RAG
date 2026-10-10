import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SystemStatus } from '../../models/rag.models';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  template: `
    <header class="bg-slate-900 border-b border-slate-800 px-6 py-4 flex flex-wrap items-center justify-between gap-4 shadow-lg">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center shadow-md">
          <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <div>
          <div class="flex items-center gap-2">
            <h1 class="text-xl font-bold tracking-tight text-white">NeuralGraph RAG</h1>
            <span class="px-2 py-0.5 text-xs font-semibold rounded bg-blue-950 text-blue-400 border border-blue-800">Multi-Agent</span>
          </div>
          <p class="text-xs text-slate-400">Google AI Studio • LangGraph • pgvector Hybrid Search (Dense + BM25)</p>
        </div>
      </div>

      <!-- Live Microservices Status Grid -->
      <div class="flex flex-wrap items-center gap-2 text-xs">
        <!-- Orchestrator Status -->
        <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700">
          <span class="w-2 h-2 rounded-full" [ngClass]="status?.orchestrator?.healthy ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'"></span>
          <span class="font-medium text-slate-300">Orchestrator</span>
        </div>

        <!-- PostgreSQL pgvector Status -->
        <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700">
          <span class="w-2 h-2 rounded-full" [ngClass]="status?.database?.connected ? 'bg-emerald-400' : 'bg-rose-500'"></span>
          <span class="font-medium text-slate-300">pgvector</span>
          <span class="text-slate-400" *ngIf="status?.database?.connected">({{ status?.database?.total_chunks || 0 }} chunks)</span>
        </div>

        <!-- Retrieval Agent Container Status -->
        <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700">
          <span class="w-2 h-2 rounded-full" [ngClass]="status?.retrieval_agent?.healthy ? 'bg-emerald-400' : 'bg-rose-500'"></span>
          <span class="font-medium text-slate-300">Retrieval Agent</span>
        </div>

        <!-- Synthesis Agent Container Status -->
        <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700">
          <span class="w-2 h-2 rounded-full" [ngClass]="status?.synthesis_agent?.healthy ? 'bg-emerald-400' : 'bg-rose-500'"></span>
          <span class="font-medium text-slate-300">Synthesis Agent</span>
        </div>

        <!-- Google AI Studio Status -->
        <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
             [ngClass]="status?.orchestrator?.google_ai_studio_configured ? 'bg-indigo-950 border border-indigo-700 text-indigo-300' : 'bg-amber-950 border border-amber-800 text-amber-300'">
          <span class="w-2 h-2 rounded-full" [ngClass]="status?.orchestrator?.google_ai_studio_configured ? 'bg-indigo-400' : 'bg-amber-400'"></span>
          <span>{{ status?.orchestrator?.google_ai_studio_configured ? 'Google AI Studio Active' : 'API Key Setup Needed' }}</span>
        </div>

        <button (click)="refresh.emit()" title="Refresh System Health"
                class="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>
    </header>
  `,
  styles: [`
    :host { display: block; }
  `]
})
export class HeaderComponent {
  @Input() status: SystemStatus | null = null;
  @Output() refresh = new EventEmitter<void>();
}
