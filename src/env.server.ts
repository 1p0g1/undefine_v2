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
  JWT_SECRET: z.string(),
  DB_PROVIDER: z.literal('supabase'),  // Must be 'supabase' in production
  
  // Optional variables with defaults
  NODE_ENV: z.literal('production'),  // Must be 'production'
  PORT: z.string().transform(Number).default('3001'),
});

// Parse environment variables
const parsedEnv = serverEnvSchema.safeParse({
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
  JWT_SECRET: process.env.JWT_SECRET,
  DB_PROVIDER: process.env.DB_PROVIDER,
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
});

if (!parsedEnv.success) {
  console.error(
    '❌ Invalid environment variables:\n',
    Object.entries(parsedEnv.error.flatten().fieldErrors).map(([k, v]) => `${k}: ${v?.join(', ')}`).join('\n')
  );
  throw new Error('Invalid environment variables');
}

export const env = parsedEnv.data; 