import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auth } from '@/auth';

export async function middleware(request: NextRequest) {
  const session = await auth();
  const isAuthPage = request.nextUrl.pathname.startsWith('/auth');
  const isApiAuthRoute = request.nextUrl.pathname.startsWith('/api/auth');
  const isPublicRoute = request.nextUrl.pathname === '/' || isAuthPage || isApiAuthRoute;

  // If user is not authenticated and trying to access protected route
  if (!session && !isPublicRoute) {
    const signInUrl = new URL('/auth/signin', request.url);
    signInUrl.searchParams.set('callbackUrl', request.nextUrl.pathname);
    return NextResponse.redirect(signInUrl);
  }

  // If user is authenticated and trying to access auth pages
  if (session && isAuthPage) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all routes except static files and _next
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};
