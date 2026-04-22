// ─────────────────────────────────────────────────────────────────────────────
// Executive Sync Engine — Shared Types
// The Giant's Forge · Copper Giant · 2026
// ─────────────────────────────────────────────────────────────────────────────

export interface SyncDocument {
  id: string;
  title: string;
  content: string;        // Raw Markdown
  authorId: string;
  authorName: string;
  updatedAt: string;      // ISO timestamp
  version: number;
}

export interface SyncEvent {
  type: 'document_update' | 'connected' | 'heartbeat';
  payload: Partial<SyncDocument>;
  timestamp: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface ImportedFile {
  name: string;
  content: string;
  importedAt: string;
}
