import { NextResponse, type NextRequest } from 'next/server';


export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Public endpoints that must never require a session:
  const PUBLIC_API = ['/api/auth/login', '/api/auth/register', '/api/auth/forgot', '/api/auth/reset', '/api/auth/me', '/api/auth/logout', '/api/auth/email-exists', '/api/auth/username-check', '/api/order-status', '/api/cron/run-jobs'];
  const isPublicApi = PUBLIC_API.some((p) => pathname === p || pathname.startsWith(p + '/'));

  const needsAuth = !isPublicApi && (pathname.startsWith('/dashboard') || pathname.startsWith('/admin') || pathname.startsWith('/api/'));
  if (needsAuth && !req.cookies.get('tn_session')) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'auth_required' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login?next=' + encodeURIComponent(pathname), req.url));
  }

  const res = NextResponse.next();
  res.headers.set('X-Frame-Options', 'DENY');
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      // Next dev + prod runtime styles
      "style-src 'self' 'unsafe-inline'",
      // Next.js hydration requires inline/eval scripts
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      // Allow public CoinGecko rates API for the payment page
      "connect-src 'self' https://api.coingecko.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; ')
  );
  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
