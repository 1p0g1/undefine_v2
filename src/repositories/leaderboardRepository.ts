import { createClient } from '@supabase/supabase-js';
import { env } from '../../src/env.server';
import { LeaderboardEntry } from '@/shared-types/src/game';
import { PostgrestResponse } from '@supabase/supabase-js';

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

interface LeaderboardQueryResult {
  id: string;
  player_id: string;
  word_id: string;
  rank: number;
  was_top_10: boolean;
  best_time: number;
  guesses_used: number;
  date: string;
  players: {
    display_name: string | null;
  } | null;
}

export class LeaderboardRepository {
  /**
   * Get leaderboard entries for a word
   */
  async getLeaderboard(wordId: string, limit: number = 10): Promise<LeaderboardEntry[]> {
    const { data, error } = await supabase
      .from('leaderboard_summary')
      .select(`
        id,
        player_id,
        word_id,
        rank,
        was_top_10,
        best_time,
        guesses_used,
        date,
        players (
          display_name
        )
      `)
      .eq('word_id', wordId)
      .order('best_time', { ascending: true })
      .order('guesses_used', { ascending: true })
      .limit(limit) as PostgrestResponse<LeaderboardQueryResult>;

    if (error) {
      console.error('[LeaderboardRepository] Failed to fetch leaderboard:', error);
      throw error;
    }

    return (data || []).map(entry => ({
      id: entry.id,
      player_id: entry.player_id,
      word_id: entry.word_id,
      player_name: entry.players?.display_name || `Player ${entry.player_id.slice(-4)}`,
      rank: entry.rank,
      guesses_used: entry.guesses_used,
      best_time: entry.best_time,
      date: entry.date,
      created_at: new Date().toISOString(), // Default since we don't store this anymore
      was_top_10: entry.was_top_10
    }));
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
   * No longer need updateLeaderboard method as it's handled by database triggers
   */
} 