import { auth } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { getUsers, createUser, updateUser, deleteUser, updatePassword } from '@/lib/db';

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if ((session.user as any).role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const users = getUsers();
  return NextResponse.json({ users });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if ((session.user as any).role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { name, email, password, role } = await req.json();
  if (!name || !email || !password) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

  try {
    const id = createUser(name, email, password, role ?? 'user');
    return NextResponse.json({ id });
  } catch (e: any) {
    if (e.message?.includes('UNIQUE')) return NextResponse.json({ error: 'Email ya registrado' }, { status: 409 });
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const currentUser = session.user as any;

  const { id, newPassword, ...fields } = await req.json();
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  // Password change — admin only
  if (newPassword !== undefined) {
    if (currentUser.role !== 'admin')
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    if (newPassword.length < 6)
      return NextResponse.json({ error: 'La contraseña debe tener al menos 6 caracteres' }, { status: 400 });
    updatePassword(Number(id), newPassword);
    return NextResponse.json({ ok: true });
  }

  // Non-admins can only update their own avatar/name
  if (currentUser.role !== 'admin' && String(id) !== String(currentUser.id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  updateUser(Number(id), fields);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if ((session.user as any).role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  deleteUser(Number(id));
  return NextResponse.json({ ok: true });
}
