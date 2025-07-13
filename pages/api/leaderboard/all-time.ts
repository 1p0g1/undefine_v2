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
  was_top_10: boolean;
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
    // Query leaderboard_summary without player join (since no FK relationship exists)
    const { data: rawData, error: leaderboardError } = await supabase
      .from('leaderboard_summary')
      .select(`
        player_id,
        rank,
        guesses_used,
        date,
        was_top_10
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

    // Get unique player IDs to fetch names separately
    const uniquePlayerIds = Array.from(new Set((rawData || [])
      .map(row => row.player_id)
      .filter(id => id && id !== 'null' && id !== 'undefined') // Filter out invalid IDs
    ));
    
    // Query players table separately
    const { data: playersData, error: playersError } = await supabase
      .from('players')
      .select('id, display_name')
      .in('id', uniquePlayerIds);

    if (playersError) {
      console.error('[All-Time API] Players query error:', playersError);
      // Continue without player names rather than failing
    }

    // Create player name lookup map
    const playerNameMap = (playersData || []).reduce((map, player) => {
      // Only store non-null display names
      if (player.display_name) {
        map[player.id] = player.display_name;
      }
      return map;
    }, {} as Record<string, string>);

    // Query player_streaks separately
    const { data: streakData, error: streakError } = await supabase
      .from('player_streaks')
      .select('player_id, highest_streak, current_streak');

    if (streakError) {
      console.error('[All-Time API] Streak query error:', streakError);
      // Continue without streak data rather than failing
    }

    // Create streak lookup map
    const streakMap = (streakData || []).reduce((map, streak) => {
      map[streak.player_id] = streak;
      return map;
    }, {} as Record<string, StreakRow>);

    // Calculate statistics from raw data
    const playerStats = await calculateAllTimeStatsFromSessions(streakMap, playerNameMap);
    
    // Sort into different leaderboard categories (simplified)
    const topByWinRate = [...playerStats]
      .filter(p => p.total_games >= 1) // Changed from 3 to 1 - any player with at least 1 win
      .sort((a, b) => b.win_percentage - a.win_percentage)
      .slice(0, 10);

    const topByConsistency = [...playerStats]
      .filter(p => p.total_wins >= 1) // Need at least one win to calculate average guesses
      .sort((a, b) => a.average_guesses - b.average_guesses) // Lower is better
      .slice(0, 10);

    const topByStreaks = [...playerStats]
      .filter(p => p.highest_streak > 0) // Must have at least one win streak
      .sort((a, b) => b.highest_streak - a.highest_streak)
      .slice(0, 10);

    const topByGames = [...playerStats]
      .filter(p => p.total_games >= 1) // Changed from no filter to at least 1 game
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

async function calculateAllTimeStatsFromSessions(streakMap: Record<string, StreakRow>, playerNameMap: Record<string, string>): Promise<AllTimeStats[]> {
  // Query game_sessions for ALL completed games (wins and losses)
  const { data: completedGames, error: gamesError } = await supabase
    .from('game_sessions')
    .select('player_id, is_won, guesses, start_time, end_time, word_id')
    .eq('is_complete', true); // Only completed games (both wins and losses)

  if (gamesError) {
    console.error('[calculateAllTimeStatsFromSessions] Error:', gamesError);
    return [];
  }

  // Group games by player
  const playerGroups = (completedGames || []).reduce((groups, game) => {
    const playerId = game.player_id;
    // Skip games with invalid player IDs
    if (!playerId || playerId === 'null' || playerId === 'undefined') {
      return groups;
    }
    
    if (!groups[playerId]) {
      groups[playerId] = { wins: [], losses: [], totalGames: 0 };
    }
    
    if (game.is_won) {
      groups[playerId].wins.push(game);
    } else {
      groups[playerId].losses.push(game);
    }
    groups[playerId].totalGames++;
    return groups;
  }, {} as Record<string, { wins: any[], losses: any[], totalGames: number }>);

  // Calculate stats for each player
  return Object.entries(playerGroups).map(([playerId, playerData]) => {
    const { wins, losses, totalGames } = playerData;
    const totalWins = wins.length;
    const winPercentage = totalGames > 0 ? (totalWins / totalGames) * 100 : 0;
    
    // Calculate average guesses for wins only
    const averageGuesses = totalWins > 0 
      ? wins.reduce((sum, game) => sum + (game.guesses ? game.guesses.length : 0), 0) / totalWins
      : 0;
    
    // Find most recent game
    const allGames = [...wins, ...losses];
    const lastPlayed = allGames.length > 0 
      ? allGames.sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime())[0].start_time.split('T')[0]
      : '';

    const playerName = playerNameMap[playerId] || `Player ${playerId.slice(-4)}`;
    
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

function calculateAllTimeStats(rawData: GameRow[], streakMap: Record<string, StreakRow>, playerNameMap: Record<string, string>): AllTimeStats[] {
  // 🚨 DEPRECATED: This function uses leaderboard_summary which only contains wins
  // The new calculateAllTimeStatsFromSessions function should be used instead for accurate win rates
  // Keeping this for backwards compatibility but it's no longer the primary method
  console.warn('[calculateAllTimeStats] Deprecated function called - should use session-based version for accurate win rates');
  
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
    // UPDATED WIN LOGIC: Any entry in leaderboard_summary = completed the word = WIN
    const wins = games; // All games are wins (since they completed the word to be ranked)
    const totalWins = wins.length;
    const winPercentage = totalGames > 0 ? (totalWins / totalGames) * 100 : 0;
    
    // Calculate average guesses for all games (since all are wins)
    const averageGuesses = totalWins > 0 
      ? wins.reduce((sum, g) => sum + (g.guesses_used || 0), 0) / totalWins
      : 0;
    
    const lastPlayed = games.sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    )[0]?.date || '';

    const playerName = playerNameMap[playerId] || `Player ${playerId.slice(-4)}`;
    
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