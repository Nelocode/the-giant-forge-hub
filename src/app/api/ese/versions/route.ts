// GET /api/ese/versions?slug= — Devuelve el historial de versiones de un documento
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getEseDocumentVersions } from '@/lib/db';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const slug = req.nextUrl.searchParams.get('slug');
  if (!slug) return NextResponse.json({ error: 'slug required' }, { status: 422 });

  const versions = getEseDocumentVersions(slug);
  return NextResponse.json({ versions });
}
