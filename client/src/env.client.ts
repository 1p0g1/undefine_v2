/**
 * Only import this from frontend code - do not use in Node.js or API routes
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
    return clientEnvSchema.parse(import.meta.env);
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