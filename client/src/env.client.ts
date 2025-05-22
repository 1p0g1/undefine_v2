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
  VITE_API_BASE_URL: z.string().url('Invalid API base URL'),
  VITE_SUPABASE_URL: z.string().url('Invalid Supabase URL'),
  VITE_SUPABASE_ANON_KEY: z.string().min(1, 'Supabase anon key is required'),

  // Optional variables with defaults
  MODE: z.enum(['development', 'production']).default('development'),
  DEV: z.boolean().default(true),
  PROD: z.boolean().default(false),
  SSR: z.boolean().default(false),
});

export type ClientEnv = z.infer<typeof clientEnvSchema>;

/**
 * Get validated client environment variables
 * @throws {Error} if validation fails
 */
export function getClientEnv(): ClientEnv {
  try {
    const env = clientEnvSchema.parse(import.meta.env);
    
    // Development-time warnings
    if (env.DEV) {
      if (!env.VITE_API_BASE_URL) {
        console.warn('⚠️ VITE_API_BASE_URL is not set. Please check your Vercel deployment or .env configuration.');
      }
      if (env.VITE_API_BASE_URL === 'http://localhost:3001') {
        console.info('ℹ️ Using development API URL: http://localhost:3001');
      }
    }
    
    return env;
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      const issues = error.issues.map((issue: z.ZodIssue) => `${issue.path.join('.')}: ${issue.message}`).join('\n');
      throw new Error(`Invalid client environment variables:\n${issues}`);
    }
    throw error;
  }
}

// Export validated env object for convenience
export const env = getClientEnv(); 