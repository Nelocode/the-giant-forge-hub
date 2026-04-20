import { NextResponse } from 'next/server';
import { getCompanyEvents, createCompanyEvent } from '@/lib/db';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const companyId = parseInt(searchParams.get('companyId') ?? '', 10);
    if (isNaN(companyId)) return NextResponse.json({ error: 'companyId required' }, { status: 400 });
    const events = getCompanyEvents(companyId);
    return NextResponse.json({ events });
  } catch (e) {
    return NextResponse.json({ error: 'Error fetching events' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { companyId, title, eventDate } = await req.json();
    if (!companyId || !title?.trim() || !eventDate) {
      return NextResponse.json({ error: 'companyId, title and eventDate required' }, { status: 400 });
    }
    const id = createCompanyEvent(companyId, title.trim(), eventDate);
    return NextResponse.json({ id });
  } catch (e) {
    return NextResponse.json({ error: 'Error creating event' }, { status: 500 });
  }
}
