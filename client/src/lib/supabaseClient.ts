/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js'
import { env } from '../env.client'

// Create Supabase client with validated environment variables
export const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY) 