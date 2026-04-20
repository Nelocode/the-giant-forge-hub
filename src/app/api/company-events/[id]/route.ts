import { NextResponse } from 'next/server';
import { updateCompanyEvent, deleteCompanyEvent } from '@/lib/db';

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id, 10);
    if (isNaN(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    const body = await req.json();
    const fields: { title?: string; event_date?: string } = {};
    if (body.title)      fields.title = body.title;
    if (body.eventDate)  fields.event_date = body.eventDate;
    updateCompanyEvent(id, fields);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: 'Error updating event' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id, 10);
    if (isNaN(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    deleteCompanyEvent(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: 'Error deleting event' }, { status: 500 });
  }
}
