import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, tap } from 'rxjs';
import { DocumentItem, ChatRequest, ChatResponse, SystemStatus } from '../models/rag.models';

@Injectable({
  providedIn: 'root'
})
export class RagService {
  private apiUrl = '/api';

  private documentsSubject = new BehaviorSubject<DocumentItem[]>([]);
  documents$ = this.documentsSubject.asObservable();

  private systemStatusSubject = new BehaviorSubject<SystemStatus | null>(null);
  systemStatus$ = this.systemStatusSubject.asObservable();

  constructor(private http: HttpClient) {}

  getSystemStatus(): Observable<SystemStatus> {
    return this.http.get<SystemStatus>(`${this.apiUrl}/system/status`).pipe(
      tap(status => this.systemStatusSubject.next(status))
    );
  }

  fetchDocuments(): Observable<DocumentItem[]> {
    return this.http.get<DocumentItem[]>(`${this.apiUrl}/documents`).pipe(
      tap(docs => this.documentsSubject.next(docs))
    );
  }

  uploadDocument(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post(`${this.apiUrl}/documents/upload`, formData).pipe(
      tap(() => this.fetchDocuments().subscribe())
    );
  }

  seedSampleDocument(): Observable<any> {
    return this.http.post(`${this.apiUrl}/documents/sample`, {}).pipe(
      tap(() => this.fetchDocuments().subscribe())
    );
  }

  deleteDocument(docId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/documents/${docId}`).pipe(
      tap(() => this.fetchDocuments().subscribe())
    );
  }

  askQuestion(request: ChatRequest): Observable<ChatResponse> {
    return this.http.post<ChatResponse>(`${this.apiUrl}/chat`, request);
  }
}
