/**
 * Only import this from frontend code - do not use in Node.js or API routes
 * 
 * IMPORTANT: Never use process.env in client code!
 * Always use import.meta.env.VITE_* for environment variables in the Vite frontend.
 * Example:
 *   ❌ process.env.API_URL
 *   ✅ import.meta.env.VITE_API_BASE_URL
 */

import { z } from 'zod';

// Add Vite's import.meta.env type support
/// <reference types="vite/client" />

const clientEnvSchema = z.object({
  // Required variables
  VITE_API_BASE_URL: z.string().default(''),  // Empty string for relative URLs
  VITE_SUPABASE_URL: z.string().url(),
  VITE_SUPABASE_ANON_KEY: z.string(),

  // Optional variables with defaults
  MODE: z.enum(['development', 'production']).default('production'),
  DEV: z.boolean().default(false),
  PROD: z.boolean().default(true),
  SSR: z.boolean().default(false),
});

// Parse environment variables
const parsedEnv = clientEnvSchema.safeParse({
  VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
  VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
  VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
  MODE: import.meta.env.MODE,
  DEV: import.meta.env.DEV,
  PROD: import.meta.env.PROD,
  SSR: import.meta.env.SSR,
});

if (!parsedEnv.success) {
  console.error(
    '❌ Invalid environment variables:\n',
    Object.entries(parsedEnv.error.flatten().fieldErrors).map(([k, v]) => `${k}: ${v?.join(', ')}`).join('\n')
  );
  throw new Error('Invalid environment variables');
}

export const env = parsedEnv.data; 