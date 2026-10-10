import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DocumentItem } from '../../models/rag.models';

@Component({
  selector: 'app-document-upload',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col h-full">
      <div class="flex items-center justify-between mb-4">
        <div>
          <h2 class="text-base font-semibold text-white flex items-center gap-2">
            <svg class="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Knowledge Base Documents
          </h2>
          <p class="text-xs text-slate-400">PDF, TXT, or MD parsed and embedded into pgvector</p>
        </div>
        <button (click)="seedSample.emit()" [disabled]="isUploading"
                class="px-3 py-1.5 text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          Load Sample Book
        </button>
      </div>

      <!-- Drag & Drop / File Selector Area -->
      <div 
        (dragover)="onDragOver($event)" 
        (dragleave)="onDragLeave($event)" 
        (drop)="onDrop($event)"
        class="border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer mb-4"
        [ngClass]="isDragging ? 'border-blue-500 bg-blue-950/20' : 'border-slate-700 bg-slate-950 hover:border-slate-600'"
        (click)="fileInput.click()">
        
        <input #fileInput type="file" accept=".pdf,.txt,.md" class="hidden" (change)="onFileSelected($event)">
        
        <div class="flex flex-col items-center justify-center gap-2">
          <div class="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-blue-400">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <p class="text-sm font-medium text-slate-200">
            Click to upload or drag & drop document
          </p>
          <p class="text-xs text-slate-500">
            PDF or Text document (converted to 768-dim embeddings via Google AI Studio)
          </p>
        </div>
      </div>

      <!-- Upload In-Progress Banner -->
      <div *ngIf="isUploading" class="mb-4 p-3 rounded-lg bg-blue-950/50 border border-blue-800 text-xs text-blue-300 flex items-center gap-2">
        <svg class="animate-spin w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Extracting text, chunking, and embedding into pgvector...
      </div>

      <!-- Uploaded Documents List -->
      <div class="flex-1 overflow-y-auto space-y-2 pr-1">
        <div *ngIf="documents.length === 0 && !isUploading" class="text-center py-8 text-slate-500 text-xs">
          No documents uploaded yet. Upload a PDF or click "Load Sample Book".
        </div>

        <div *ngFor="let doc of documents" class="p-3 bg-slate-950 rounded-lg border border-slate-800 hover:border-slate-700 transition-all flex items-center justify-between gap-3 group">
          <div class="flex items-center gap-3 overflow-hidden">
            <div class="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                 [ngClass]="doc.file_type === 'pdf' ? 'bg-rose-950 text-rose-400 border border-rose-800' : 'bg-blue-950 text-blue-400 border border-blue-800'">
              {{ doc.file_type.toUpperCase() }}
            </div>
            <div class="overflow-hidden">
              <h4 class="text-xs font-semibold text-slate-200 truncate" [title]="doc.filename">{{ doc.filename }}</h4>
              <div class="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400">
                <span>{{ doc.total_pages }} page(s)</span>
                <span>•</span>
                <span>{{ doc.total_chunks }} chunks</span>
                <span>•</span>
                <span>{{ formatBytes(doc.file_size) }}</span>
              </div>
            </div>
          </div>

          <button (click)="deleteDoc.emit(doc.id)" title="Delete document and vector chunks"
                  class="p-1.5 rounded text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors shrink-0 opacity-0 group-hover:opacity-100">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  `
})
export class DocumentUploadComponent {
  @Input() documents: DocumentItem[] = [];
  @Input() isUploading = false;
  @Output() fileUploaded = new EventEmitter<File>();
  @Output() seedSample = new EventEmitter<void>();
  @Output() deleteDoc = new EventEmitter<string>();

  isDragging = false;

  onDragOver(event: DragEvent) {
    event.preventDefault();
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    this.isDragging = false;
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.isDragging = false;
    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      this.fileUploaded.emit(event.dataTransfer.files[0]);
    }
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.fileUploaded.emit(input.files[0]);
      input.value = '';
    }
  }

  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }
}
