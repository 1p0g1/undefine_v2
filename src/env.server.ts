/**
 * DO NOT IMPORT THIS FILE IN FRONTEND CODE
 * This file includes secrets and only works with process.env
 */

import { z } from 'zod';

const serverEnvSchema = z.object({
  // Required variables
  SUPABASE_URL: z.string().url('Invalid Supabase URL'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'Supabase service role key is required'),
  SUPABASE_ANON_KEY: z.string().min(1, 'Supabase anon key is required'),
  JWT_SECRET: z.string().min(1, 'JWT secret is required'),
  DB_PROVIDER: z.literal('supabase').describe('Must be "supabase"'),
  
  // Optional variables with defaults
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default('3001'),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

/**
 * Get validated server environment variables
 * @throws {Error} if validation fails
 */
export function getServerEnv(): ServerEnv {
  try {
    return serverEnvSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join('\n');
      throw new Error(`Invalid server environment variables:\n${issues}`);
    }
    throw error;
  }
}

// Export validated env object for convenience
export const env = getServerEnv(); 