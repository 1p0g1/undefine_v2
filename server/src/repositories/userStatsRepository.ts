import { supabase } from '../config/SupabaseClient.js';
import { UserStatsEntry } from '../types/database.js';

export async function getUserStats(player_id: string): Promise<UserStatsEntry | null> {
  if (!supabase) throw new Error('Supabase client not initialized');
  const { data, error } = await supabase
    .from('user_stats')
    .select('*')
    .eq('player_id', player_id)
    .single();
  if (error && error.code !== 'PGRST116')
    throw new Error(`Failed to fetch user stats: ${error.message}`);
  return data || null;
}

export async function updateUserStats(
  player_id: string,
  updates: Partial<UserStatsEntry>
): Promise<UserStatsEntry> {
  if (!supabase) throw new Error('Supabase client not initialized');
  const { data, error } = await supabase
    .from('user_stats')
    .update(updates)
    .eq('player_id', player_id)
    .select()
    .single();
  if (error) throw new Error(`Failed to update user stats: ${error.message}`);
  return data;
}

export async function ensurePlayerStatsExists(playerId: string) {
  if (!supabase) throw new Error('Supabase client not initialized');
  return supabase.from('user_stats').upsert([{ player_id: playerId }], { onConflict: 'player_id' });
}
