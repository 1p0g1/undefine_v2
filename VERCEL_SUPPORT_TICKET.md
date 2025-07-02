# Vercel Support Ticket: API Routes Returning HTML Instead of Executing

## Issue Summary
All API routes in my Next.js application are returning the main React application HTML instead of executing as serverless functions. This affects all `/api/*` endpoints.

## Project Details
- **Project Name**: undefine-v2-front
- **Domain**: https://undefine-v2-front.vercel.app
- **Framework**: Next.js 14.2.29
- **GitHub Repository**: https://github.com/1p0g1/undefine_v2
- **Branch**: main

## Problem Description
When making requests to any API endpoint (e.g., `/api/theme-status`, `/api/test`, `/api/debug-env`), the server returns:
- **HTTP Status**: 200 OK
- **Content-Type**: text/html (expected: application/json)
- **Response Body**: Complete React application HTML instead of API response

### Expected Behavior
API endpoints should execute as serverless functions and return JSON responses.

### Actual Behavior
All API routes return the main application HTML page, suggesting they're being treated as static routes rather than serverless functions.

## Technical Evidence

### 1. Build Logs Show APIs Compiling Successfully
```
Route (pages)                              Size     First Load JS
├ ƒ /api/theme-guess                       0 B            79.8 kB
├ ƒ /api/theme-stats                       0 B            79.8 kB
├ ƒ /api/theme-status                      0 B            79.8 kB
```
The `ƒ` symbol indicates serverless functions are being built correctly.

### 2. API Endpoints Exist and Compile
- All API files are present in `/pages/api/` directory
- TypeScript compilation passes without errors
- Build process completes successfully

### 3. Test Results
```bash
# All these return HTML instead of JSON:
curl "https://undefine-v2-front.vercel.app/api/test"
curl "https://undefine-v2-front.vercel.app/api/theme-status"
curl "https://undefine-v2-front.vercel.app/api/debug-env"
```

## Configuration Details

### Current vercel.json
```json
{
  "buildCommand": "npm run build",
  "framework": "nextjs",
  "crons": [
    {
      "path": "/api/cron/finalize-daily-leaderboards",
      "schedule": "0 0 * * *"
    }
  ]
}
```

### Project Structure
```
pages/
  api/
    theme-status.ts
    theme-guess.ts
    theme-stats.ts
    test.ts
    [20+ other API endpoints]
  index.ts
  detect.tsx
```

### Environment Variables
All required environment variables are properly set:
- SUPABASE_URL ✅
- SUPABASE_SERVICE_ROLE_KEY ✅
- SUPABASE_ANON_KEY ✅
- DB_PROVIDER=supabase ✅

## Troubleshooting Attempted

### 1. Vercel Configuration
- ✅ Framework preset set to "Next.js"
- ✅ Build command: `npm run build`
- ✅ Output directory: (empty/default)
- ✅ Root directory: (empty/default)

### 2. Code Changes
- ✅ Fixed import paths in API files (relative instead of absolute)
- ✅ Verified TypeScript compilation passes
- ✅ Confirmed API files follow Next.js conventions

### 3. Deployment
- ✅ Multiple fresh deployments triggered
- ✅ Cache-busting attempts with query parameters
- ✅ Removed and re-added environment variables

### 4. vercel.json Modifications
- ✅ Removed `outputDirectory` setting (was `.next`)
- ✅ Confirmed framework is set to "nextjs"

## Sample API File
Here's a typical API file that should work but returns HTML:

```typescript
// pages/api/test.ts
import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  return res.status(200).json({ 
    message: 'API is working',
    timestamp: new Date().toISOString()
  });
}
```

## Impact
This issue is blocking the deployment of critical features that depend on API functionality, specifically a "Theme of the Week" feature that requires database connectivity through serverless functions.

## Request
Please investigate why Vercel is serving the static React application for all `/api/*` routes instead of executing them as serverless functions, despite the build logs showing they compile correctly.

## Additional Information
- This is a production application with active users
- The issue appeared recently and affects all API routes
- Local development works correctly
- Build process completes without errors
- No changes were made to the core Next.js configuration

Thank you for your assistance in resolving this critical deployment issue. 