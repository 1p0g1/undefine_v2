import { createClient } from '@supabase/supabase-js';
import { env } from '../../src/env.server';
import { LeaderboardEntry } from '@/shared-types/src/game';

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

export class LeaderboardRepository {
  /**
   * Get leaderboard entries for a word
   */
  async getLeaderboard(wordId: string, limit: number = 10): Promise<LeaderboardEntry[]> {
    const { data, error } = await supabase
      .from('leaderboard_summary')
      .select('*')
      .eq('word_id', wordId)
      .order('best_time', { ascending: true })
      .order('guesses_used', { ascending: true })
      .limit(limit);

    if (error) {
      console.error('[LeaderboardRepository] Failed to fetch leaderboard:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Get a player's rank for a word
   */
  async getPlayerRank(wordId: string, playerId: string): Promise<number | null> {
    const { data, error } = await supabase
      .from('leaderboard_summary')
      .select('rank')
      .eq('word_id', wordId)
      .eq('player_id', playerId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') { // Not found
        return null;
      }
      console.error('[LeaderboardRepository] Failed to fetch player rank:', error);
      throw error;
    }

    return data?.rank || null;
  }

  /**
   * Update leaderboard entry
   */
  async updateLeaderboard(entry: Omit<LeaderboardEntry, 'id' | 'created_at'>): Promise<void> {
    const { error } = await supabase
      .from('leaderboard_summary')
      .upsert([entry], {
        onConflict: 'player_id,word_id',
        ignoreDuplicates: false
      });

    if (error) {
      console.error('[LeaderboardRepository] Failed to update leaderboard:', error);
      throw error;
    }
  }
} 