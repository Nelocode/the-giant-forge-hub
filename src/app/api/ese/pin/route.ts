// POST /api/ese/pin — Toggle pin on a document (CEO only)
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { toggleEseDocumentPin } from '@/lib/db';

export async function POST(req: NextRequest) {
  const session = await auth();
  const user = session?.user as { role?: string } | undefined;
  if (!session || user?.role !== 'ceo') {
    return NextResponse.json({ error: 'Solo el CEO puede fijar documentos.' }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body?.slug) return NextResponse.json({ error: 'slug required' }, { status: 422 });

  const pinned = toggleEseDocumentPin(body.slug);
  return NextResponse.json({ ok: true, pinned });
}
