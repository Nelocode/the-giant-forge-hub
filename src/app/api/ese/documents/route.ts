// GET  /api/ese/documents — Lista documentos (publicados para el equipo, todos para CEO)
// POST /api/ese/documents — Crea un nuevo documento (solo CEO)

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getEseDocuments, createEseDocument } from '@/lib/db';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = session.user as { role?: string };
  // CEO sees all (drafts + published); team sees only published
  const publishedOnly = user.role !== 'ceo';
  const docs = getEseDocuments(publishedOnly);
  return NextResponse.json({ documents: docs });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; role?: string } | undefined;

  if (!session || user?.role !== 'ceo') {
    return NextResponse.json({ error: 'Solo el CEO puede crear documentos.' }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body?.title?.trim()) {
    return NextResponse.json({ error: 'title is required' }, { status: 422 });
  }

  // Generate slug from title
  const slug = body.slug?.trim() ||
    body.title.trim()
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove accents
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .slice(0, 60);

  try {
    const id = createEseDocument({
      slug,
      title:    body.title.trim(),
      content:  body.content ?? '',
      authorId: user.id ? Number(user.id) : undefined,
    });
    return NextResponse.json({ id, slug }, { status: 201 });
  } catch (err: any) {
    if (err.message?.includes('UNIQUE')) {
      return NextResponse.json({ error: 'Ya existe un documento con ese slug.' }, { status: 409 });
    }
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
