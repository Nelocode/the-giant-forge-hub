// ─────────────────────────────────────────────────────────────────────────────
// /api/sync/stream — Server-Sent Events (SSE) para receptores del equipo
// El equipo se conecta aquí y recibe actualizaciones del CEO en tiempo real
// Sincronización NATIVA — sin n8n, sin webhooks externos
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest } from 'next/server';
import type { SyncDocument, SyncEvent } from '@/components/executive-sync-engine/types';

// In-memory subscriber registry backed by globalThis so that
// /api/ese/publish can access the same set without circular imports
declare global {
  var _eseSubscribers: Set<ReadableStreamDefaultController> | undefined;
  var _eseLastDocument: SyncDocument | null;
}

if (!global._eseSubscribers)   global._eseSubscribers  = new Set();
if (!global._eseLastDocument)  global._eseLastDocument = null;

const subscribers = global._eseSubscribers;

export { subscribers };
export function setLastDocument(doc: SyncDocument) {
  global._eseLastDocument = doc;
}
export function getLastDocument(): SyncDocument | null {
  return global._eseLastDocument ?? null;
}

export async function GET(req: NextRequest) {
  // Keep-alive heartbeat — browsers close SSE after 30s inactivity
  let controller!: ReadableStreamDefaultController;
  let heartbeatTimer: ReturnType<typeof setInterval>;

  const stream = new ReadableStream({
    start(ctrl) {
      controller = ctrl;
      subscribers.add(ctrl);

      const lastDoc = getLastDocument();

      // Send connection acknowledgement
      const connEvent: SyncEvent = {
        type: 'connected',
        payload: lastDoc ?? {},
        timestamp: new Date().toISOString(),
      };
      ctrl.enqueue(`data: ${JSON.stringify(connEvent)}\n\n`);

      // If there's a cached document, push it immediately
      if (lastDoc) {
        const docEvent: SyncEvent = {
          type: 'document_update',
          payload: lastDoc,
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
