/**
 * DO NOT IMPORT THIS FILE IN FRONTEND CODE
 * This file includes secrets and only works with process.env
 */

import { z } from 'zod';

const serverEnvSchema = z.object({
  // Required variables
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string(),
  SUPABASE_ANON_KEY: z.string(),
  DB_PROVIDER: z.literal('supabase'),  // Must be 'supabase' in production
  NODE_ENV: z.enum(['development', 'production']).default('production'),  // Default to production
  
  // Optional variables with defaults
  PORT: z.string().transform(Number).default('3001'),
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),
});

// Parse environment variables
const parsedEnv = serverEnvSchema.safeParse({
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
  DB_PROVIDER: process.env.DB_PROVIDER,
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  FRONTEND_URL: process.env.FRONTEND_URL,
});

if (!parsedEnv.success) {
  console.error(
    '❌ Invalid environment variables:\n',
    Object.entries(parsedEnv.error.flatten().fieldErrors).map(([k, v]) => `${k}: ${v?.join(', ')}`).join('\n')
  );
  throw new Error('Invalid environment variables');
}

export const env = parsedEnv.data; 