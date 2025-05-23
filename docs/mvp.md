⚠️ REQUIRED READING FOR ALL PROMPTS - DO NOT MODIFY THIS SECTION ⚠️

📌 Project Overview – Un-Define MVP CREED

🚨 PRODUCTION FOCUS
This project is FOCUSED ON PRODUCTION DEPLOYMENT. Local development is NOT a priority.
- All code changes should target production URLs and configurations
- Do not waste time on development environment setup
- Use production Supabase instance only
- Frontend always connects to production backend at undefine-v2-back.vercel.app
- All testing should be done in production environment

Architecture:
This is a monorepo project comprising two independently deployed applications on Vercel:

Frontend: Vite + React
- Deployed at undefine-v2-front.vercel.app
- Uses Vite-style environment variables prefixed with VITE_
- Communicates with backend via VITE_API_BASE_URL

Backend: Next.js (API routes only)
- Deployed at undefine-v2-back.vercel.app
- Provides the /api/word and other serverless API routes
- Interfaces with Supabase using SUPABASE_SERVICE_ROLE_KEY

Environment Configuration:

Frontend (Vite):
- VITE_API_BASE_URL: Backend endpoint
- VITE_SUPABASE_URL: Supabase project URL
- VITE_SUPABASE_ANON_KEY: Supabase client key for public access

Backend (Next.js):
- SUPABASE_URL: Supabase project URL
- SUPABASE_ANON_KEY: Public access key (if needed)
- SUPABASE_SERVICE_ROLE_KEY: Secure access key for admin-level operations
- JWT_SECRET: Used for signing/verifying auth tokens
- DB_PROVIDER: Should be set to "supabase" only — "mock" is deprecated and unused

Important Context:
- Frontend uses Vite's import.meta.env access pattern for environment variables and must not use process.env.
- Backend uses Node-style process.env access and validates config via Zod schemas.
- All API interactions are secured via appropriate Supabase keys.
- The frontend will eventually need to support POST requests (e.g., for submitting guesses).

⚠️ END OF REQUIRED READING ⚠️

---

# MVP Development Plan

## Current Temporary Solutions

### Player ID Handling
- **Current Implementation**: Hardcoded player_id for initial API testing
- **Why**: To quickly verify API route functionality without implementing full player authentication/session management
- **Technical Debt**: This is a temporary solution to unblock API testing
- **Future Implementation**:
  1. Implement proper session management
  2. Generate unique player_ids on first visit
  3. Store in localStorage (Wordle-style persistence)
  4. Add proper validation middleware

### Environment Variable Handling
- **Current Status**: NEXT_PUBLIC_API_BASE_URL configuration standardized
- **Production URL**: https://undefine-v2-back.vercel.app
- **Development URL**: http://localhost:3001
- **Implementation**:
  1. Production uses stable Vercel project URL
  2. Development uses local server
  3. No preview deployment URLs used
  4. Environment variables properly configured in Vercel dashboard

## MVP Testing Priorities
1. Verify API routes are working
2. Test basic game mechanics
3. Ensure word fetching/guessing flow works
4. Validate basic scoring system

## Post-MVP Authentication Plan
1. Implement proper player tracking
2. Add session validation middleware
3. Secure all API routes with proper player context
4. Add rate limiting and abuse prevention
5. Implement proper error handling for missing/invalid player_ids 

## Environment Configuration

### Split Environment Setup

The project now uses a split environment configuration to properly handle both frontend (Vite) and backend (Next.js) environments:

#### Frontend Environment (`client/src/env.client.ts`)
```typescript
// Only for frontend code - uses import.meta.env
const clientEnvSchema = z.object({
  VITE_API_BASE_URL: z.string().url(),
  VITE_SUPABASE_URL: z.string().url(),
  VITE_SUPABASE_ANON_KEY: z.string(),
  // Vite's built-in env vars
  MODE: z.enum(['development', 'production']),
  DEV: z.boolean(),
  PROD: z.boolean(),
  SSR: z.boolean(),
});
```

#### Backend Environment (`src/env.server.ts`)
```typescript
// Only for backend code - uses process.env
const serverEnvSchema = z.object({
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string(),
  SUPABASE_ANON_KEY: z.string(),
  JWT_SECRET: z.string(),
  DB_PROVIDER: z.enum(['supabase', 'mock']),
  NODE_ENV: z.enum(['development', 'production', 'test']),
  PORT: z.string().transform(Number),
});
```

### Usage Guidelines

1. Frontend Code (Vite)
   - Always import from `env.client.ts`
   - Use `env.VITE_*` for environment variables
   - Never use `process.env`
   - All variables must be prefixed with `VITE_`

2. Backend Code (Next.js)
   - Always import from `env.server.ts`
   - Use `env.*` for environment variables
   - Never use `import.meta.env`
   - Keep secrets in backend only

3. Environment Files
   - Frontend: `.env.client.local` with `VITE_` prefixed vars
   - Backend: `.env.local` with server-side vars
   - Never commit `.env` files

### Type Safety

Both configurations use Zod for runtime validation and TypeScript types:

```typescript
// Frontend
import { env } from '../env.client';
const apiUrl = env.VITE_API_BASE_URL;

// Backend
import { env } from '../env.server';
const supabaseUrl = env.SUPABASE_URL;
```

### Vercel Deployment

1. Frontend Project (`undefine-v2-front`)
   - Set `VITE_API_BASE_URL`, `VITE_SUPABASE_URL`, etc.
   - All variables must have `VITE_` prefix
   - Used in Vite's build process

2. Backend Project (`undefine-v2-back`)
   - Set `SUPABASE_URL`, `JWT_SECRET`, etc.
   - Contains sensitive credentials
   - Used in Next.js API routes 

## Environment Stability & Refactor Status

### ✅ Import Reference Verification
- All environment imports now use proper paths
- No references to deprecated `env.ts`
- Frontend code only imports from `env.client.ts`
- Backend code only imports from `env.server.ts`
- No mixed usage of `process.env` and `import.meta.env`

### ✅ API Route Environment Usage
All API routes now properly use server environment:

```typescript
// ✅ Correct server-side environment usage
import { env } from '../../src/env.server';
const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
```

### ✅ Frontend Environment Usage
All frontend code now properly uses Vite environment:

```typescript
// ✅ Correct client-side environment usage
import { env } from '../env.client';
const apiUrl = env.VITE_API_BASE_URL;
```

### ✅ Build Configuration
- Vite config uses `loadEnv` for proper environment loading
- Next.js config uses only server-side variables
- No cross-contamination between frontend/backend env

### 🔒 Environment Variable Isolation
1. Frontend (Vite) Variables
   - All prefixed with `VITE_`
   - Validated via `clientEnvSchema`
   - Only accessible in client code
   - Example: `VITE_API_BASE_URL`

2. Backend (Next.js) Variables
   - No `VITE_` prefix
   - Validated via `serverEnvSchema`
   - Only accessible in API routes
   - Example: `SUPABASE_SERVICE_ROLE_KEY`

### 🛡️ Type Safety Improvements
- Zod validation for all environment variables
- TypeScript types generated from schemas
- Runtime validation on startup
- Clear error messages for missing/invalid variables

### 📝 Code Organization
1. API Routes
   - All routes use `env.server.ts`
   - No direct `process.env` access
   - Proper error handling for env validation
   - Consistent Supabase client initialization

2. Frontend Components
   - All use `env.client.ts`
   - No direct `import.meta.env` access
   - Proper error handling for env validation
   - Consistent API base URL usage

### 🔄 Refactor Confirmations
1. Import References
   ```bash
   git grep '/word' | grep -v 'pages/api/word'
   ```
   - Confirms no broken imports
   - Verifies proper route usage
   - No ghost file references

2. API Route Stability
   - Word route uses consistent response shape
   - Environment variables properly isolated
   - No cross-boundary imports
   - Clear serverless context

### 🚫 Known Restrictions
1. Frontend Code
   - Cannot import from `env.server.ts`
   - Cannot access non-VITE_ variables
   - Must use client environment schema

2. Backend Code
   - Cannot import from `env.client.ts`
   - Cannot expose sensitive variables
   - Must use server environment schema

### 🔜 Future Improvements
1. Static Analysis
   - Add ESLint rules for env imports
   - Prevent cross-boundary imports
   - Validate environment prefix usage

2. Build Validation
   - Add environment schema checks
   - Verify no sensitive leaks
   - Ensure proper isolation

3. Documentation
   - Add environment setup guide
   - Document variable requirements
   - Provide troubleshooting steps 

## Word API Refactor

### Shared Types Implementation
The project now uses shared types between frontend and backend for word-related functionality:

```typescript
// shared-types/src/word.ts
export interface WordRow {
  id: string;
  word: string;
  definition: string;
  // ... other word properties
}

export interface WordResponseShape {
  id: string;
  word: string;
  definition: string;
  // ... response shape properties
}

export interface WordResponse {
  word: WordResponseShape;
  gameId: string;
  isFallback: boolean;
}
```

### Word Mapper Utility
Extracted word response mapping to a reusable utility:

```typescript
// server/src/utils/wordMapper.ts
export function mapWordRowToResponse(word: WordRow): WordResponseShape {
  return {
    id: word.id,
    word: word.word,
    // ... mapped properties
  };
}
```

### API Route Improvements
The `/api/word` endpoint now has:

1. Runtime Safety
   ```typescript
   if (typeof window !== 'undefined') {
     throw new Error('[api/word] This file should only be used server-side.');
   }
   ```

2. Type-Safe Response Handling
   ```typescript
   export default async function handler(
     req: NextApiRequest,
     res: ApiResponse<WordResponse>
   )
   ```

3. Clean Response Construction
   ```typescript
   return res.status(200).json({
     word: mapWordRowToResponse(todayWord),
     gameId: 'temp-session-' + new Date().getTime(),
     isFallback: false
   });
   ```

### Benefits of the Refactor

1. Type Safety
   - Shared types between frontend and backend
   - Runtime validation for server-side code
   - Type-safe API responses

2. Code Organization
   - Separated concerns (types, mapping, API logic)
   - Single source of truth for word shapes
   - Reusable mapping utility

3. Maintainability
   - Easier to modify word response shape
   - Centralized type definitions
   - Clear separation of concerns

4. Developer Experience
   - Better TypeScript inference
   - Clearer error messages
   - Consistent type usage

### Future Improvements

1. Error Handling
   - Add proper error response types
   - Standardize error shapes
   - Improve error details typing

2. Validation
   - Add runtime validation for word shapes
   - Validate database responses
   - Add request validation

3. Testing
   - Add unit tests for mapper
   - Add API route tests
   - Add type tests 

## Frontend-Backend Connection Issues

### CORS Configuration Steps

1. Backend (Next.js API Routes):
   ```typescript
   // In all API route handlers
   res.setHeader('Access-Control-Allow-Origin', process.env.FRONTEND_URL || '*');
   res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
   res.setHeader('Access-Control-Allow-Headers', 'Content-Type, player-id');
   res.setHeader('Access-Control-Allow-Credentials', 'true');
   ```

2. Environment Variables:
   ```bash
   # Backend (.env)
   FRONTEND_URL=https://undefine-v2-front.vercel.app

   # Frontend (.env)
   VITE_API_BASE_URL=https://undefine-v2-back.vercel.app
   ```

3. Vercel Configuration:
   - Add CORS configuration to `vercel.json`:
   ```json
   {
     "headers": [
       {
         "source": "/api/(.*)",
         "headers": [
           { "key": "Access-Control-Allow-Origin", "value": "${FRONTEND_URL}" },
           { "key": "Access-Control-Allow-Methods", "value": "GET, POST, OPTIONS" },
           { "key": "Access-Control-Allow-Headers", "value": "Content-Type, player-id" },
           { "key": "Access-Control-Allow-Credentials", "value": "true" }
         ]
       }
     ]
   }
   ```

### Development Setup

1. Local Development:
   ```bash
   # Terminal 1 - Backend
   cd undefine_v2
   npm run dev:backend  # Runs on http://localhost:3001

   # Terminal 2 - Frontend
   cd undefine_v2/client
   npm run dev  # Runs on http://localhost:5173
   ```

2. Environment Configuration:
   ```bash
   # Local development (.env.development)
   FRONTEND_URL=http://localhost:5173
   VITE_API_BASE_URL=http://localhost:3001
   ```

### Data Flow Verification

1. Backend Health Check:
   - Access `http://localhost:3001/api/word` directly
   - Should return valid word data without CORS errors
   - Verify all required fields are present

2. Frontend Integration:
   - Open browser dev tools (Network tab)
   - Load frontend application
   - Verify successful API calls to `/api/word`
   - Check response contains complete word data

3. Error Handling:
   - Backend logs should show incoming requests
   - Frontend should gracefully handle API errors
   - CORS errors should be resolved
   - Network tab should show 200 status codes

### Troubleshooting Guide

1. CORS Issues:
   - Verify CORS headers in Network tab
   - Check environment variables are set correctly
   - Ensure backend is running and accessible
   - Clear browser cache and hard reload

2. Data Issues:
   - Check backend logs for database connection
   - Verify Supabase connection and queries
   - Ensure word data is properly seeded
   - Validate API response format

3. Environment Issues:
   - Confirm all required env vars are set
   - Check for typos in URLs
   - Verify correct ports are being used
   - Ensure both services are running 

## Frontend Error Analysis

### 1. Deprecated API Warning
```
content.js:1 Deprecated API for given entry type.
```
**Analysis**: 
- Location: content.js, line 1
- Type: Deprecation warning
- Possible Cause: Using an outdated API method in content scripts
- Impact: Non-critical warning, functionality may still work
- Solution: Identify the deprecated API call and update to current version

### 2. Player ID Generation Sequence
```
index-ChKEtz_O.js:40 Fetching word…
index-ChKEtz_O.js:40 [getPlayerId] Generating new player ID
index-ChKEtz_O.js:40 [getPlayerId] New player ID stored successfully
```
**Analysis**:
- Location: index-ChKEtz_O.js, line 40
- Type: Info logging
- Flow: Correct sequence of events (fetch → generate ID → store ID)
- Note: Working as expected, not an error

### 3. MetaMask Connection
```
inpage.js:1 MetaMask: Connected to chain with ID "0x1".
```
**Analysis**:
- Location: inpage.js, line 1
- Type: Info message
- Context: MetaMask wallet connection to Ethereum mainnet
- Impact: Unrelated to our app's core functionality
- Action: Consider removing MetaMask integration if not needed

### 4. Updated CORS Error Analysis (Critical)
```
Access to fetch at 'https://undefine-v2-back.vercel.app/api/word' from origin 'https://undefine-v2-front-m4v4bogyd-paddys-projects-82cb6057.vercel.app' has been blocked by CORS policy: Response to preflight request doesn't pass access control check: The value of the 'Access-Control-Allow-Origin' header in the response must not be the wildcard '*' when the request's credentials mode is 'include'.
```
**Analysis**:
- Location: Browser security policy
- Type: CORS policy violation with credentials
- Origin: undefine-v2-front-m4v4bogyd-paddys-projects-82cb6057.vercel.app (preview deployment)
- Target: https://undefine-v2-back.vercel.app/api/word
- Root Cause: Mismatch between credentials mode and CORS headers
- Specific Issue: Using wildcard '*' with credentials mode 'include'
- Impact: Blocks all API communication

**Error Chain**:
1. Frontend makes credentialed fetch request
2. CORS preflight fails due to '*' origin with credentials
3. Resource loading fails (net::ERR_FAILED)
4. Game initialization fails (TypeError: Failed to fetch)

### 5. Resource Loading Failure
```
undefine-v2-back.vercel.app/api/word:1 Failed to load resource: net::ERR_FAILED
```
**Analysis**:
- Location: Network request
- Type: Resource loading error
- Endpoint: /api/word
- Root Cause: Consequence of CORS failure
- Impact: Cannot fetch word data

### 6. Fetch Error Chain
```
index-ChKEtz_O.js:40 Fetch Error: Object
index-ChKEtz_O.js:40 Failed to start new game: TypeError: Failed to fetch
```
**Analysis**:
- Location: index-ChKEtz_O.js, line 40
- Type: Runtime error
- Error Chain: CORS → Failed fetch → Game initialization failure
- Impact: Complete failure of core game functionality

## Revised Solution Priority

1. **CORS Configuration with Credentials (Immediate)**
   - Option A: Remove credentials mode from fetch:
   ```typescript
   fetch(url, { 
     credentials: 'omit' // Or remove credentials option entirely
   });
   ```
   
   - Option B: Use specific origin instead of wildcard:
   ```typescript
   // In API routes
   const origin = req.headers.origin || 'https://undefine-v2-front.vercel.app';
   res.setHeader('Access-Control-Allow-Origin', origin);
   res.setHeader('Access-Control-Allow-Credentials', 'true');
   ```

2. **Frontend Fetch Configuration (High)**
   - Review all fetch calls
   - Standardize credentials handling
   - Add proper error handling

3. **Environment-Aware CORS (Medium)**
   - Handle development URLs
   - Handle preview deployments
   - Handle production URLs

### Implementation Plan

1. **Immediate Fix**:
   Since we don't need credentials for our public word game, we should:
   - Remove credentials mode from frontend fetch calls
   - Keep the simple CORS configuration with '*'
   - This is simpler than managing specific origins

2. **Frontend Changes**:
   ```typescript
   // Update fetch configuration
   const response = await fetch(url, {
     method: 'GET',
     headers: {
       'Content-Type': 'application/json'
     }
     // No credentials option
   });
   ```

3. **Error Handling**:
   ```typescript
   try {
     const response = await fetch(url);
     if (!response.ok) {
       throw new Error(`HTTP error! status: ${response.status}`);
     }
     const data = await response.json();
     return data;
   } catch (error) {
     console.error('API Error:', error);
     // Show user-friendly error message
     throw error;
   }
   ```

4. **Monitoring**:
   - Add error tracking for CORS issues
   - Log failed requests
   - Monitor preview deployments

## Implementation Steps

1. Backend API Routes:
   ```typescript
   // In all API routes
   res.setHeader('Access-Control-Allow-Origin', '*');
   res.setHeader('Access-Control-Allow-Methods', '*');
   res.setHeader('Access-Control-Allow-Headers', '*');
   ```

2. Frontend Error Handling:
   ```typescript
   try {
     const response = await fetch(url);
     if (!response.ok) {
       throw new Error(`HTTP error! status: ${response.status}`);
     }
     const data = await response.json();
     return data;
   } catch (error) {
     console.error('API Error:', error);
     // Show user-friendly error message
     throw error;
   }
   ```

3. Development Environment:
   - Add proper logging levels
   - Implement error tracking
   - Add monitoring for API health

4. Documentation:
   - Update API documentation
   - Document error codes
   - Add troubleshooting guide 