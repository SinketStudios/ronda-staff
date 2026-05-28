import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const sessionToken = request.cookies.get('ronda_staff_session');
  const { pathname } = request.nextUrl;
  const protectedPaths = ['/dashboard', '/clients', '/library', '/incidents', '/employees', '/logs'];
  const authPaths = ['/login', '/recovery', '/password', '/setup'];

  if (!sessionToken && protectedPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`))) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const response = NextResponse.next();

  if (
    protectedPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`)) ||
    authPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`))
  ) {
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next|static|favicon|public).*)'],
};
