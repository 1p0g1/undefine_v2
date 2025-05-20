import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Allowed origins for CORS
const allowedOrigins = [
  'https://undefine-v2-front.vercel.app', // Production frontend
  'http://localhost:3000',
  'http://localhost:5173', // Vite default port
];

/**
 * Check if the origin matches our allowed patterns
 * This includes both production and preview deployments
 */
function isAllowedOrigin(origin: string): boolean {
  const allowedPatterns = [
    // Production domains
    'https://undefine-v2-front.vercel.app',
    // Preview deployments
    /^https:\/\/undefine-v2-front-[a-z0-9]+-paddys-projects-82cb6057\.vercel\.app$/,
    // Local development
    'http://localhost:3000',
    'http://localhost:5173',
  ];

  return allowedPatterns.some(pattern => {
    if (pattern instanceof RegExp) {
      return pattern.test(origin);
    }
    return pattern === origin;
  });
}

// This function can be marked `async` if using `await` inside
export function middleware(request: NextRequest) {
  // Get the origin from the request headers
  const origin = request.headers.get('origin') || '';
  
  // Check if the origin is allowed
  const isAllowedOrigin = allowedOrigins.includes(origin);

  // Get the response
  const response = NextResponse.next();

  // Add the CORS headers
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  response.headers.set(
    'Access-Control-Allow-Origin',
    isAllowedOrigin ? origin : allowedOrigins[0]
  );
  response.headers.set(
    'Access-Control-Allow-Methods',
    'GET, POST, PUT, DELETE, OPTIONS'
  );
  response.headers.set(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, player-id'
  );

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