import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const allowedOrigins = ['https://undefine-v2-front.vercel.app'];
  const origin = request.headers.get('origin') || '';
  const isAllowed = allowedOrigins.includes(origin) || origin.endsWith('.vercel.app');

  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    const response = new NextResponse(null, { status: 204 });
    
    if (isAllowed) {
      response.headers.set('Access-Control-Allow-Origin', origin);
      response.headers.set('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Player-ID');
      response.headers.set('Access-Control-Allow-Credentials', 'true');
      response.headers.set('Access-Control-Max-Age', '86400');
    }
    
    return response;
  }

  // Handle actual requests
  const response = NextResponse.next();
  
  if (isAllowed) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
  }

  return response;
}

// Only run middleware on API routes
export const config = {
  matcher: '/api/:path*',
}; 