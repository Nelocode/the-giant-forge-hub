// ─────────────────────────────────────────────────────────────────────────────
// Executive Sync Engine — Barrel Export
// Registra el módulo en el tool registry de The Giant's Forge Hub
//
// Uso en bento-grid.tsx:
//   import { ExecutiveSyncCard } from '@/components/executive-sync-engine';
//   CARD_MAP['executive-sync'] = <ExecutiveSyncCard session={session} />;
// ─────────────────────────────────────────────────────────────────────────────

export { ExecutiveSyncCard } from './ExecutiveSyncCard';
export { ExecutiveSyncLayout } from './ExecutiveSyncLayout';
export { DocumentPanel } from './DocumentPanel';
export { ChatPanel } from './ChatPanel';
export { MarkdownImporter } from './MarkdownImporter';
export { useSyncEmitter } from './hooks/useSyncEmitter';
export { useSyncReceiver } from './hooks/useSyncReceiver';
export type { SyncDocument, SyncEvent, ChatMessage, ImportedFile } from './types';
