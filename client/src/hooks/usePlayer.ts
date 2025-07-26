import { useState, useEffect, useCallback } from 'react';
import { getPlayerId } from '../utils/player';
import { fetchStreakStatus } from '../utils/apiHelpers';

interface PlayerStats {
  gamesPlayed: number;
  gamesWon: number;
  currentStreak: number;
  longestStreak: number;
  lastWinDate: string | null;
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
    console.log('[usePlayer] Starting fetchStats for playerId:', playerId);
    setIsLoading(true);
    setError(null);

    try {
      console.log('[usePlayer] Calling fetchStreakStatus...');
      
      // 🔧 FIX: Use the new fetchStreakStatus function
      const streakResponse = await fetchStreakStatus(playerId);
      console.log('[usePlayer] Streak API response received:', streakResponse);
      
      const newStats = {
        gamesPlayed: 0, // TODO: Add to API
        gamesWon: 0, // TODO: Add to API
        currentStreak: streakResponse.currentStreak,
        longestStreak: streakResponse.longestStreak,
        lastWinDate: streakResponse.lastWinDate,
        totalGuesses: 0, // TODO: Add to API
        averageGuessesPerGame: 0, // TODO: Add to API
        totalPlayTimeSeconds: 0 // TODO: Add to API
      };
      
      console.log('[usePlayer] Setting new stats:', newStats);
      setStats(newStats);
    } catch (err) {
      console.error('[usePlayer] Failed to fetch stats:', err);
      setError('Failed to load player stats');
      
      // Set default stats instead of leaving null
      setStats({
        gamesPlayed: 0,
        gamesWon: 0,
        currentStreak: 0,
        longestStreak: 0,
        lastWinDate: null,
        totalGuesses: 0,
        averageGuessesPerGame: 0,
        totalPlayTimeSeconds: 0
      });
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