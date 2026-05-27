import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const sessionToken = request.cookies.get('ronda_staff_session');
  const { pathname } = request.nextUrl;
  const protectedPaths = ['/dashboard', '/clients', '/library', '/incidents', '/employees', '/logs'];

  if (pathname === '/login') {
    return NextResponse.next();
  }

  if (!sessionToken && protectedPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`))) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next|static|favicon|public).*)'],
};
