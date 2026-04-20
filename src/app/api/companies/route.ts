import { NextResponse } from 'next/server';
import { getCompanies, createCompany } from '@/lib/db';

export async function GET() {
  try {
    const companies = getCompanies();
    return NextResponse.json({ companies });
  } catch (e) {
    return NextResponse.json({ error: 'Error fetching companies' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { name, color } = await req.json();
    if (!name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 });
    const id = createCompany(name.trim(), color ?? '#d4772c');
    return NextResponse.json({ id });
  } catch (e) {
    return NextResponse.json({ error: 'Error creating company' }, { status: 500 });
  }
}
