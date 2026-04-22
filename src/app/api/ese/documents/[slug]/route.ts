// GET    /api/ese/documents/[slug] — Obtiene un documento
// PUT    /api/ese/documents/[slug] — Actualiza (solo CEO)
// DELETE /api/ese/documents/[slug] — Elimina (solo CEO)

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getEseDocumentBySlug, updateEseDocument, deleteEseDocument } from '@/lib/db';

interface Params { params: { slug: string } }

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const doc = getEseDocumentBySlug(params.slug);
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const user = session.user as { role?: string };
  // Non-CEO can only see published docs
  if (user.role !== 'ceo' && !doc.published) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ document: doc });
}

export async function PUT(req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { role?: string } | undefined;

  if (!session || user?.role !== 'ceo') {
    return NextResponse.json({ error: 'Solo el CEO puede editar documentos.' }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });

  updateEseDocument(params.slug, {
    title:   body.title,
    content: body.content,
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { role?: string } | undefined;

  if (!session || user?.role !== 'ceo') {
    return NextResponse.json({ error: 'Solo el CEO puede eliminar documentos.' }, { status: 403 });
  }

  deleteEseDocument(params.slug);
  return NextResponse.json({ ok: true });
}
