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
    topByTop10Finishes: AllTimeStats[];
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
    const uniquePlayerIds = Array.from(new Set((rawData || []).map(row => row.player_id)));
    
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
      map[player.id] = player.display_name;
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
    const playerStats = calculateAllTimeStats(rawData || [], streakMap, playerNameMap);
    
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

    // Calculate top 10 finishes from raw data
    const topByTop10Finishes = calculateTop10Finishes(rawData || [], playerNameMap);

    const totalPlayers = playerStats.length;
    const totalGames = playerStats.reduce((sum, p) => sum + p.total_games, 0);

    return res.status(200).json({
      success: true,
      data: {
        topByWinRate,
        topByConsistency,
        topByStreaks,
        topByGames,
        topByTop10Finishes,
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

function calculateAllTimeStats(rawData: GameRow[], streakMap: Record<string, StreakRow>, playerNameMap: Record<string, string>): AllTimeStats[] {
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

function calculateTop10Finishes(rawData: GameRow[], playerNameMap: Record<string, string>): AllTimeStats[] {
  const playerGroups = rawData.reduce((groups, row) => {
    const playerId = row.player_id;
    if (!groups[playerId]) {
      groups[playerId] = [];
    }
    groups[playerId].push(row);
    return groups;
  }, {} as Record<string, GameRow[]>);

  return Object.entries(playerGroups)
    .map(([playerId, games]) => {
      const totalGames = games.length;
      // UPDATED WIN LOGIC: All entries are wins (completed the word)
      const wins = games;
      const totalWins = wins.length;
      const winPercentage = totalGames > 0 ? (totalWins / totalGames) * 100 : 0;
      
      // Count top 10 finishes
      const top10Finishes = games.filter(g => g.was_top_10 === true).length;
      
      // Calculate average guesses for all games (since all are wins)
      const averageGuesses = totalWins > 0 
        ? wins.reduce((sum, g) => sum + (g.guesses_used || 0), 0) / totalWins
        : 0;
      
      const lastPlayed = games.sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      )[0]?.date || '';

      const playerName = playerNameMap[playerId] || `Player ${playerId.slice(-4)}`;

      return {
        player_id: playerId,
        player_name: playerName,
        win_percentage: Math.round(winPercentage * 100) / 100,
        average_guesses: Math.round(averageGuesses * 100) / 100,
        highest_streak: 0, // Not needed for this category
        current_streak: 0, // Not needed for this category
        total_games: totalGames,
        total_wins: totalWins,
        last_played: lastPlayed,
        top_10_finishes: top10Finishes // Add this field for display
      };
    })
    .filter(p => p.top_10_finishes > 0) // Only show players with at least one top 10 finish
    .sort((a, b) => (b as any).top_10_finishes - (a as any).top_10_finishes) // Sort by most top 10 finishes
    .slice(0, 10);
}

export default withCors(handler); 