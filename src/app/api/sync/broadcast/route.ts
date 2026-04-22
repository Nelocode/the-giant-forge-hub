// ─────────────────────────────────────────────────────────────────────────────
// /api/sync/broadcast — CEO emite un documento actualizado
// Propaga a todos los subscribers SSE activos
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import type { SyncDocument, SyncEvent } from '@/components/executive-sync-engine/types';

// We use dynamic import to share the singleton Set across requests in dev
// (In production Next.js, module-level state is shared within the same process)
let _subscribers: Set<ReadableStreamDefaultController> | null = null;
let _setLastDocument: ((doc: SyncDocument) => void) | null = null;

async function getStreamModule() {
  if (!_subscribers || !_setLastDocument) {
    const mod = await import('../stream/route');
    _subscribers = mod.subscribers as Set<ReadableStreamDefaultController>;
    _setLastDocument = mod.setLastDocument;
  }
  return { subscribers: _subscribers, setLastDocument: _setLastDocument! };
}

export async function POST(req: NextRequest) {
  let body: SyncDocument;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  // Validate required fields
  if (!body.id || !body.content) {
    return NextResponse.json({ error: 'Missing id or content' }, { status: 422 });
  }

  const document: SyncDocument = {
    ...body,
    updatedAt: new Date().toISOString(),
  };

  const { subscribers, setLastDocument } = await getStreamModule();

  // Persist latest state for new subscribers
  setLastDocument(document);

  // Broadcast to all connected clients
  const event: SyncEvent = {
    type: 'document_update',
    payload: document,
    timestamp: document.updatedAt,
  };
  const message = `data: ${JSON.stringify(event)}\n\n`;

  const dead: ReadableStreamDefaultController[] = [];
  subscribers.forEach(ctrl => {
    try {
      ctrl.enqueue(message);
    } catch {
      dead.push(ctrl);
    }
  });

  // Clean up stale connections
  dead.forEach(ctrl => subscribers.delete(ctrl));

  return NextResponse.json({
    ok: true,
    broadcast: subscribers.size,
    version: document.version,
    updatedAt: document.updatedAt,
  });
}
