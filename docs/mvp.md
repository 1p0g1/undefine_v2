⚠️ REQUIRED READING FOR ALL PROMPTS - DO NOT MODIFY THIS SECTION ⚠️

📌 Project Overview – Un-Define MVP CREED
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