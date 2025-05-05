import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../utils/logger.js';

// Get the directory path for the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from root .env (up two levels from config dir)
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const dbProvider = process.env.DB_PROVIDER;

// Log configuration status (without exposing secrets)
logger.info('Supabase Configuration Status:', {
  hasUrl: !!supabaseUrl,
  hasKey: !!supabaseAnonKey,
  dbProvider,
  nodeEnv: process.env.NODE_ENV,
});

// Validate configuration
if (!supabaseUrl || !supabaseAnonKey) {
  logger.error('Missing Supabase environment variables');
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Missing Supabase environment variables');
  }
  logger.warn('Using mock Supabase client in development mode');
}

// Only create client if we're using Supabase provider
export const supabase =
  dbProvider === 'supabase' && supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;
