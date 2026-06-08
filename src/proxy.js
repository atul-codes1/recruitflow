import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

export async function proxy(request) {
  // We only want to protect /dashboard and its sub-paths
  if (request.nextUrl.pathname.startsWith('/dashboard')) {
    const token = request.cookies.get('auth_token')?.value;

    if (!token) {
      // No token found, redirect to login
      const loginUrl = new URL('/login', request.url);
      return NextResponse.redirect(loginUrl);
    }

    try {
      // Verify the JWT token mathematically
      const secret = new TextEncoder().encode(process.env.JWT_SECRET);
      await jwtVerify(token, secret);
      
      // Token is valid, allow access to dashboard
      return NextResponse.next();
    } catch (error) {
      // Token is invalid or expired, redirect to login
      const loginUrl = new URL('/login', request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  // All other routes (/, /api/apply) are public
  return NextResponse.next();
}

// Ensure the middleware only runs on specific paths to optimize edge execution
export const config = {
  matcher: ['/dashboard/:path*'],
};
