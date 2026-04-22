'use client';

// ─────────────────────────────────────────────────────────────────────────────
// useSyncReceiver — Hook para el equipo (receptor SSE del documento en vivo)
// Se conecta a /api/sync/stream y escucha eventos de actualización del CEO
// Reconexión automática con backoff exponencial
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react';
import type { SyncDocument, SyncEvent } from '../types';

interface ReceiverState {
  document: SyncDocument | null;
  isConnected: boolean;
  lastEvent: string | null; // ISO timestamp
  error: string | null;
}

export function useSyncReceiver() {
  const [state, setState] = useState<ReceiverState>({
    document: null,
    isConnected: false,
    lastEvent: null,
    error: null,
  });

  const esRef = useRef<EventSource | null>(null);
  const retryCountRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;

    function connect() {
      if (cancelled) return;

      // Close any existing connection
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }

      const es = new EventSource('/api/sync/stream');
      esRef.current = es;

      es.onopen = () => {
        if (cancelled) return;
        retryCountRef.current = 0;
        setState(s => ({ ...s, isConnected: true, error: null }));
      };

      es.onmessage = (e: MessageEvent) => {
        if (cancelled) return;
        try {
          const event: SyncEvent = JSON.parse(e.data);
          if (event.type === 'document_update' && event.payload) {
            setState(s => ({
              ...s,
              document: { ...s.document, ...(event.payload as SyncDocument) },
              lastEvent: event.timestamp,
            }));
          }
        } catch {
          // Silently ignore malformed events (heartbeat text, etc.)
        }
      };

      es.onerror = () => {
        if (cancelled) return;
        es.close();
        esRef.current = null;
        setState(s => ({ ...s, isConnected: false }));

        // Exponential backoff: 1s → 2s → 4s → 8s → max 30s
        const delay = Math.min(1000 * Math.pow(2, retryCountRef.current), 30000);
        retryCountRef.current += 1;
        retryTimerRef.current = setTimeout(connect, delay);
      };
    }

    connect();

    return () => {
      cancelled = true;
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }
    };
  }, []);

  return state;
}
