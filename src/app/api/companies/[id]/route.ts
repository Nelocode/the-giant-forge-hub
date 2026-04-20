import { NextResponse } from 'next/server';
import { deleteCompany } from '@/lib/db';

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id, 10);
    if (isNaN(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    deleteCompany(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: 'Error deleting company' }, { status: 500 });
  }
}
