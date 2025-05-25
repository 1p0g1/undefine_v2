import { useState, useEffect, useCallback } from 'react';
import { getPlayerId } from '../utils/player';
import { apiClient } from '../api/client';

interface PlayerStats {
  gamesPlayed: number;
  gamesWon: number;
  currentStreak: number;
  longestStreak: number;
  totalGuesses: number;
  averageGuessesPerGame: number;
  totalPlayTimeSeconds: number;
}

interface UsePlayerReturn {
  playerId: string | undefined;
  stats: PlayerStats | null;
  isLoading: boolean;
  error: string | null;
  refreshStats: () => Promise<void>;
}

export function usePlayer(): UsePlayerReturn {
  const [playerId, setPlayerId] = useState<string | undefined>();
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize player ID
  useEffect(() => {
    const id = getPlayerId();
    setPlayerId(id);
  }, []);

  // Fetch player stats
  const fetchStats = useCallback(async () => {
    if (!playerId) return;
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiClient.getPlayerStats(playerId);
      setStats({
        gamesPlayed: response.games_played,
        gamesWon: response.games_won,
        currentStreak: response.current_streak,
        longestStreak: response.longest_streak,
        totalGuesses: response.total_guesses,
        averageGuessesPerGame: response.average_guesses_per_game,
        totalPlayTimeSeconds: response.total_play_time_seconds
      });
    } catch (err) {
      console.error('[usePlayer] Failed to fetch stats:', err);
      setError('Failed to load player stats');
    } finally {
      setIsLoading(false);
    }
  }, [playerId]);

  // Fetch stats on mount and when player ID changes
  useEffect(() => {
    if (playerId) {
      fetchStats();
    }
  }, [playerId, fetchStats]);

  return {
    playerId,
    stats,
    isLoading,
    error,
    refreshStats: fetchStats
  };
} 