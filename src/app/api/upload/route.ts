import { auth } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { updateUser } from '@/lib/db';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = Number((session.user as any).id);

  const formData = await req.formData();
  const file = formData.get('avatar') as File | null;
  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 });

  // Validate
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (!allowed.includes(file.type)) {
    return NextResponse.json({ error: 'Solo se permiten imágenes (jpg, png, webp)' }, { status: 400 });
  }
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: 'Imagen demasiado grande (máx 5MB)' }, { status: 400 });
  }

  const ext = file.name.split('.').pop() ?? 'jpg';
  const filename = `avatar-${userId}-${Date.now()}.${ext}`;
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads');

  await mkdir(uploadsDir, { recursive: true });
  const bytes = await file.arrayBuffer();
  await writeFile(path.join(uploadsDir, filename), Buffer.from(bytes));

  const avatarUrl = `/uploads/${filename}`;
  updateUser(userId, { avatar: avatarUrl });

  return NextResponse.json({ url: avatarUrl });
}
