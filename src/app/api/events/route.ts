import { auth } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { getEvents, createEvent, deleteEvent } from '@/lib/db';

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = Number((session.user as any).id);
  const events = getEvents(userId);
  return NextResponse.json({ events });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = Number((session.user as any).id);

  const data = await req.json();
  if (!data.title || !data.start_time) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const id = createEvent(userId, data);
  return NextResponse.json({ id });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = Number((session.user as any).id);

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  deleteEvent(Number(id), userId);
  return NextResponse.json({ ok: true });
}
