import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Production frontend URL
const FRONTEND_URL = 'https://undefine-v2-front.vercel.app';

export function middleware(request: NextRequest) {
  // Get the origin from the request headers
  const origin = request.headers.get('origin') || '';
  console.log('[middleware] Incoming request from origin:', origin);
  
  // Check if the origin matches our frontend
  const isAllowed = origin === FRONTEND_URL;
  console.log('[middleware] Is origin allowed:', isAllowed);

  // Get the response
  const response = NextResponse.next();

  // Add the CORS headers
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  response.headers.set('Access-Control-Allow-Origin', FRONTEND_URL);
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, player-id');

  // Handle OPTIONS request
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 200,
      headers: response.headers,
    });
  }

  return response;
}

// Configure to match API routes only
export const config = {
  matcher: '/api/:path*',
}; 