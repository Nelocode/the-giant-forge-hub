// POST /api/ese/publish — El CEO publica un documento a la Biblia del equipo
// 1. Marca el documento como published en la DB
// 2. Guarda una notificación persistente
// 3. Hace broadcast SSE a todos los suscriptores activos

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { publishEseDocument, createEseNotification } from '@/lib/db';

// Shared SSE subscriber registry (same as /api/sync/stream)
// We import it from the stream module's global registry
declare global {
  var _eseSubscribers: Set<ReadableStreamDefaultController> | undefined;
}

function getSubscribers(): Set<ReadableStreamDefaultController> {
  if (!global._eseSubscribers) {
    global._eseSubscribers = new Set();
  }
  return global._eseSubscribers;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { role?: string; name?: string } | undefined;

  if (!session || user?.role !== 'ceo') {
    return NextResponse.json({ error: 'Solo el CEO puede publicar documentos.' }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body?.slug) {
    return NextResponse.json({ error: 'slug is required' }, { status: 422 });
  }

  // 1. Publish in DB
  const doc = publishEseDocument(body.slug);
  if (!doc) {
    return NextResponse.json({ error: 'Documento no encontrado.' }, { status: 404 });
  }

  // 2. Save notification to DB
  const message = `Ian Harris publicó una actualización — v${doc.version}`;
  createEseNotification(doc.id, doc.title, message);

  // 3. Broadcast SSE to all active subscribers
  const event = JSON.stringify({
    type:      'doc_published',
    docId:     doc.id,
    slug:      doc.slug,
    title:     doc.title,
    version:   doc.version,
    message,
    author:    user.name ?? 'CEO',
    timestamp: new Date().toISOString(),
  });

  const subscribers = getSubscribers();
  const dead: ReadableStreamDefaultController[] = [];

  for (const ctrl of subscribers) {
    try {
      ctrl.enqueue(new TextEncoder().encode(`data: ${event}\n\n`));
    } catch {
      dead.push(ctrl);
    }
  }
  dead.forEach(c => subscribers.delete(c));

  return NextResponse.json({
    ok:      true,
    slug:    doc.slug,
    title:   doc.title,
    version: doc.version,
    notified: subscribers.size,
  });
}
