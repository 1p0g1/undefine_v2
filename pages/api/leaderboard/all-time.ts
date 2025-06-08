import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../src/lib/supabase';
import { withCors } from '../../../lib/withCors';

interface AllTimeStats {
  player_id: string;
  player_name: string;
  win_percentage: number;      // (wins / total_games) * 100
  average_guesses: number;     // Average guesses for wins only
  highest_streak: number;      // From player_streaks table
  current_streak: number;      // Current active streak
  total_games: number;         // Total games played
  total_wins: number;          // Count where rank = 1
  last_played: string;         // Most recent game date
}

interface GameRow {
  player_id: string;
  rank: number;
  guesses_used: number;
  date: string;
  players?: {
    display_name: string;
  };
}

interface StreakRow {
  player_id: string;
  highest_streak: number;
  current_streak: number;
}

interface AllTimeLeaderboardResponse {
  success: boolean;
  data?: {
    topByWinRate: AllTimeStats[];
    topByConsistency: AllTimeStats[];
    topByStreaks: AllTimeStats[];
    topByGames: AllTimeStats[];
    totalPlayers: number;
    totalGames: number;
  };
  error?: string;
  debug?: any;
}

async function handler(
  req: NextApiRequest,
  res: NextApiResponse<AllTimeLeaderboardResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    // Query leaderboard_summary with player names (separate from streaks)
    const { data: rawData, error: leaderboardError } = await supabase
      .from('leaderboard_summary')
      .select(`
        player_id,
        rank,
        guesses_used,
        date,
        players!inner(display_name)
      `)
      .order('date', { ascending: false });

    if (leaderboardError) {
      console.error('[All-Time API] Leaderboard query error:', leaderboardError);
      return res.status(500).json({ 
        success: false, 
        error: 'Leaderboard query failed',
        debug: leaderboardError
      });
    }

    // Query player_streaks separately
    const { data: streakData, error: streakError } = await supabase
      .from('player_streaks')
      .select('player_id, highest_streak, current_streak');

    if (streakError) {
      console.error('[All-Time API] Streak query error:', streakError);
      return res.status(500).json({ 
        success: false, 
        error: 'Streak query failed',
        debug: streakError
      });
    }

    // Create streak lookup map
    const streakMap = (streakData || []).reduce((map, streak) => {
      map[streak.player_id] = streak;
      return map;
    }, {} as Record<string, StreakRow>);

    // Calculate statistics from raw data
    const playerStats = calculateAllTimeStats((rawData as unknown as GameRow[]) || [], streakMap);
    
    // Sort into different leaderboard categories (simplified)
    const topByWinRate = [...playerStats]
      .filter(p => p.total_games >= 3) // Minimum games for meaningful win rate
      .sort((a, b) => b.win_percentage - a.win_percentage)
      .slice(0, 10);

    const topByConsistency = [...playerStats]
      .filter(p => p.total_wins >= 3) // Need wins to calculate average guesses
      .sort((a, b) => a.average_guesses - b.average_guesses) // Lower is better
      .slice(0, 10);

    const topByStreaks = [...playerStats]
      .filter(p => p.highest_streak > 0) // Must have at least one win streak
      .sort((a, b) => b.highest_streak - a.highest_streak)
      .slice(0, 10);

    const topByGames = [...playerStats]
      .sort((a, b) => b.total_games - a.total_games)
      .slice(0, 10);

    const totalPlayers = playerStats.length;
    const totalGames = playerStats.reduce((sum, p) => sum + p.total_games, 0);

    return res.status(200).json({
      success: true,
      data: {
        topByWinRate,
        topByConsistency,
        topByStreaks,
        topByGames,
        totalPlayers,
        totalGames
      }
    });

  } catch (error) {
    console.error('[All-Time API] Unexpected error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error',
      debug: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

function calculateAllTimeStats(rawData: GameRow[], streakMap: Record<string, StreakRow>): AllTimeStats[] {
  const playerGroups = rawData.reduce((groups, row) => {
    const playerId = row.player_id;
    if (!groups[playerId]) {
      groups[playerId] = [];
    }
    groups[playerId].push(row);
    return groups;
  }, {} as Record<string, GameRow[]>);

  return Object.entries(playerGroups).map(([playerId, games]) => {
    const totalGames = games.length;
    const wins = games.filter(g => g.rank === 1);
    const totalWins = wins.length;
    const winPercentage = totalGames > 0 ? (totalWins / totalGames) * 100 : 0;
    
    // Calculate average guesses for wins only (more meaningful than all games)
    const averageGuesses = totalWins > 0 
      ? wins.reduce((sum, g) => sum + (g.guesses_used || 0), 0) / totalWins
      : 0;
    
    const lastPlayed = games.sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    )[0]?.date || '';

    const playerName = games[0]?.players?.display_name || `Player ${playerId.slice(-4)}`;
    
    // Get streak data from lookup map
    const streakData = streakMap[playerId];
    const highestStreak = streakData?.highest_streak || 0;
    const currentStreak = streakData?.current_streak || 0;

    return {
      player_id: playerId,
      player_name: playerName,
      win_percentage: Math.round(winPercentage * 100) / 100,
      average_guesses: Math.round(averageGuesses * 100) / 100,
      highest_streak: highestStreak,
      current_streak: currentStreak,
      total_games: totalGames,
      total_wins: totalWins,
      last_played: lastPlayed
    };
  });
}

export default withCors(handler); 