import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AgentStep } from '../../models/rag.models';

@Component({
  selector: 'app-workflow-trace',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg">
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
          <svg class="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          LangGraph Orchestration Pipeline
        </h3>
        <span class="text-[11px] text-slate-400">Multi-Container Execution</span>
      </div>

      <div *ngIf="steps.length === 0" class="text-xs text-slate-500 py-3 text-center">
        Ask a question to see the multi-agent orchestration execution trace.
      </div>

      <div class="space-y-2 relative" *ngIf="steps.length > 0">
        <!-- Connecting vertical line -->
        <div class="absolute left-3 top-3 bottom-3 w-0.5 bg-slate-800"></div>

        <div *ngFor="let step of steps; let i = index" class="relative pl-7 group">
          <!-- Step indicator dot -->
          <div class="absolute left-1.5 top-1.5 w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center transition-all"
               [ngClass]="step.status === 'completed' ? 'border-emerald-500 bg-emerald-950 text-emerald-400' : 'border-rose-500 bg-rose-950 text-rose-400'">
            <div class="w-1.5 h-1.5 rounded-full" [ngClass]="step.status === 'completed' ? 'bg-emerald-400' : 'bg-rose-400'"></div>
          </div>

          <div class="bg-slate-950 border border-slate-800 rounded-lg p-2.5 hover:border-slate-700 transition-colors">
            <div class="flex items-center justify-between">
              <span class="text-xs font-semibold text-slate-200">{{ step.step_name }}</span>
              <span class="text-[10px] px-1.5 py-0.5 rounded font-mono font-medium"
                    [ngClass]="step.agent_target.includes('Retrieval') ? 'bg-blue-950 text-blue-300 border border-blue-800' :
                               step.agent_target.includes('Synthesis') ? 'bg-purple-950 text-purple-300 border border-purple-800' :
                               'bg-slate-800 text-slate-300 border border-slate-700'">
                {{ step.agent_target }}
              </span>
            </div>
            <p class="text-xs text-slate-400 mt-1">{{ step.description }}</p>

            <!-- Metadata accordion or details if present -->
            <div *ngIf="step.details && (step.details | json) !== '{}'" class="mt-2 pt-2 border-t border-slate-800/80 text-[11px] text-slate-400 font-mono">
              <div *ngIf="step.details['chunks_count'] !== undefined">
                Retrieved Chunks: <span class="text-blue-400 font-bold">{{ step.details['chunks_count'] }}</span>
              </div>
              <div *ngIf="step.details['model_used']">
                Model: <span class="text-purple-400 font-bold">{{ step.details['model_used'] }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class WorkflowTraceComponent {
  @Input() steps: AgentStep[] = [];
}
