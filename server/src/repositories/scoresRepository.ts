import { supabase } from '../config/SupabaseClient.js';
import { v4 as generateUUID } from 'uuid';
import { ScoreEntry } from '../types/database.js';

export async function insertScore(score: Omit<ScoreEntry, 'id'>): Promise<ScoreEntry> {
  if (!supabase) throw new Error('Supabase client not initialized');
  const newScore = {
    id: generateUUID(),
    ...score,
  };
  const { data, error } = await supabase.from('scores').insert(newScore).select().single();
  if (error) throw new Error(`Failed to insert score: ${error.message}`);
  return data;
}
