import { NextResponse } from 'next/server';
import { updateChecklistItem, deleteChecklistItem } from '@/lib/db';

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id, 10);
    if (isNaN(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    const body = await req.json();
    const fields: { done?: number; ai_note?: string } = {};
    if (body.done !== undefined)    fields.done = body.done ? 1 : 0;
    if (body.ai_note !== undefined) fields.ai_note = body.ai_note;
    updateChecklistItem(id, fields);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: 'Error updating item' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id, 10);
    if (isNaN(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    deleteChecklistItem(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: 'Error deleting item' }, { status: 500 });
  }
}
