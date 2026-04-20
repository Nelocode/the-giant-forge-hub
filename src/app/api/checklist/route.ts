import { NextResponse } from 'next/server';
import { getChecklistItems, createChecklistItem } from '@/lib/db';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const eventId = parseInt(searchParams.get('eventId') ?? '', 10);
    if (isNaN(eventId)) return NextResponse.json({ error: 'eventId required' }, { status: 400 });
    const items = getChecklistItems(eventId);
    return NextResponse.json({ items });
  } catch (e) {
    return NextResponse.json({ error: 'Error fetching checklist' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { eventId, task } = await req.json();
    if (!eventId || !task?.trim()) {
      return NextResponse.json({ error: 'eventId and task required' }, { status: 400 });
    }
    const id = createChecklistItem(eventId, task.trim());
    return NextResponse.json({ id });
  } catch (e) {
    return NextResponse.json({ error: 'Error creating checklist item' }, { status: 500 });
  }
}
