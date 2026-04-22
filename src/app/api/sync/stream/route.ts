// ─────────────────────────────────────────────────────────────────────────────
// /api/sync/stream — Server-Sent Events (SSE) para receptores del equipo
// El equipo se conecta aquí y recibe actualizaciones del CEO en tiempo real
// Sincronización NATIVA — sin n8n, sin webhooks externos
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest } from 'next/server';
import type { SyncDocument, SyncEvent } from '@/components/executive-sync-engine/types';

// In-memory subscriber registry
// In production with multiple instances, replace with Redis pub/sub
const subscribers = new Set<ReadableStreamDefaultController>();

// Singleton document state (last broadcast)
let lastDocument: SyncDocument | null = null;

// Export the subscriber set so /api/sync/broadcast can push to it
export { subscribers, lastDocument };
export function setLastDocument(doc: SyncDocument) {
  lastDocument = doc;
}

export async function GET(req: NextRequest) {
  // Keep-alive heartbeat — browsers close SSE after 30s inactivity
  let controller!: ReadableStreamDefaultController;
  let heartbeatTimer: ReturnType<typeof setInterval>;

  const stream = new ReadableStream({
    start(ctrl) {
      controller = ctrl;
      subscribers.add(ctrl);

      // Send connection acknowledgement
      const connEvent: SyncEvent = {
        type: 'connected',
        payload: lastDocument ?? {},
        timestamp: new Date().toISOString(),
      };
      ctrl.enqueue(`data: ${JSON.stringify(connEvent)}\n\n`);

      // If there's a cached document, push it immediately
      if (lastDocument) {
        const docEvent: SyncEvent = {
          type: 'document_update',
          payload: lastDocument,
          timestamp: new Date().toISOString(),
        };
        ctrl.enqueue(`data: ${JSON.stringify(docEvent)}\n\n`);
      }

      // Heartbeat every 15s to prevent proxy timeouts
      heartbeatTimer = setInterval(() => {
        try {
          const ping: SyncEvent = {
            type: 'heartbeat',
            payload: {},
            timestamp: new Date().toISOString(),
          };
          ctrl.enqueue(`data: ${JSON.stringify(ping)}\n\n`);
        } catch {
          // Controller was closed; clean up
          clearInterval(heartbeatTimer);
          subscribers.delete(ctrl);
        }
      }, 15_000);
    },

    cancel() {
      clearInterval(heartbeatTimer);
      subscribers.delete(controller);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type':  'text/event-stream',
      'Cache-Control': 'no-cache, no-store, no-transform',
      'Connection':    'keep-alive',
      'X-Accel-Buffering': 'no', // Disable Nginx buffering (EasyPanel)
    },
  });
}
