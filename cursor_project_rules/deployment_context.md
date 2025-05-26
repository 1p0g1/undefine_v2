# Un-Define v2 Deployment Context

## 🌐 Production Architecture

This project is deployed as TWO SEPARATE Vercel projects:

1. Frontend (Vite)
   - Deployed at: `undefine-v2-front.vercel.app`
   - Environment Variables:
     * VITE_API_BASE_URL
     * VITE_SUPABASE_ANON_KEY
     * VITE_SUPABASE_URL

2. Backend (Next.js API)
   - Deployed at: `undefine-v2-back.vercel.app`
   - Environment Variables:
     * JWT_SECRET
     * SUPABASE_URL
     * SUPABASE_ANON_KEY
     * DB_PROVIDER
     * SUPABASE_SERVICE_ROLE_KEY

## ⚠️ Critical Rules

1. ALWAYS check this deployment context first
2. NEVER assume local development environment
3. ALWAYS treat these as separate Vercel deployments
4. NEVER mix frontend/backend environment variables
5. ALWAYS use production URLs in configuration
6. NEVER suggest development-only solutions

## 📝 Documentation Requirements

1. All documentation must reflect this two-project structure
2. Environment variables must be documented separately for each project
3. Configuration files must be appropriate for their respective projects
4. Build and deployment instructions must be project-specific
5. API documentation must use production URLs 