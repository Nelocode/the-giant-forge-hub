'use client';

// ─────────────────────────────────────────────────────────────────────────────
// useSyncEmitter — Hook para el CEO (emisor de cambios en tiempo real)
// Propaga cambios del documento vía POST a /api/sync/broadcast
// Los receptores (equipo) se actualizan vía SSE desde /api/sync/stream
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useRef, useState } from 'react';
import type { SyncDocument } from '../types';

interface EmitterState {
  isBroadcasting: boolean;
  lastBroadcast: string | null; // ISO timestamp
  error: string | null;
}

export function useSyncEmitter(authorId: string, authorName: string) {
  const [state, setState] = useState<EmitterState>({
    isBroadcasting: false,
    lastBroadcast: null,
    error: null,
  });

  // Debounce timer ref so rapid edits don't flood the endpoint
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const versionRef = useRef(1);

  const broadcast = useCallback(
    (document: Pick<SyncDocument, 'id' | 'title' | 'content'>, immediate = false) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);

      const doSend = async () => {
        setState(s => ({ ...s, isBroadcasting: true, error: null }));
        versionRef.current += 1;

        const payload: SyncDocument = {
          ...document,
          authorId,
          authorName,
          updatedAt: new Date().toISOString(),
          version: versionRef.current,
        };

        try {
          const res = await fetch('/api/sync/broadcast', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

          if (!res.ok) throw new Error(`HTTP ${res.status}`);

          setState(s => ({
            ...s,
            isBroadcasting: false,
            lastBroadcast: new Date().toISOString(),
          }));
        } catch (err) {
          setState(s => ({
            ...s,
            isBroadcasting: false,
            error: err instanceof Error ? err.message : 'Broadcast failed',
          }));
        }
      };

      if (immediate) {
        doSend();
      } else {
        // Debounce 800ms — enough for fast typists
        debounceRef.current = setTimeout(doSend, 800);
      }
    },
    [authorId, authorName],
  );

  return { ...state, broadcast };
}
