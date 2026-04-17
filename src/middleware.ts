// Edge-compatible middleware — uses only JWT token (no DB calls)
// The DB-backed auth validation happens in the NextAuth route handler, not here.
import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Always allow public paths
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/logo.webp') ||
    pathname.startsWith('/uploads')
  ) {
    return NextResponse.next();
  }

  // Check JWT token (edge-compatible — no DB)
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET ?? 'forge-secret-dev-change-in-prod',
  });

  if (!token) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|logo.webp|uploads).*)'],
};
