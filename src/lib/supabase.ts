import { createClient } from '@supabase/supabase-js';
import { env } from '../env.server';

// Create Supabase client with service role key for admin-level operations
export const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY); 