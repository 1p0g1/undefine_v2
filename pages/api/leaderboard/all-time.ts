import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../src/lib/supabase';

interface AllTimeStats {
  player_id: string;
  player_name: string;
  total_games: number;
  total_wins: number;
  win_percentage: number;
  average_time: number;
  average_guesses: number;
  best_time_ever: number;
  total_top_10_finishes: number;
  first_place_finishes: number;
  last_played: string;
}

interface GameRow {
  player_id: string;
  rank: number;
  best_time: number;
  guesses_used: number;
  date: string;
  players?: {
    display_name: string;
  };
}

interface AllTimeLeaderboardResponse {
  success: boolean;
  data?: {
    topByWinRate: AllTimeStats[];
    topBySpeed: AllTimeStats[];
    topByConsistency: AllTimeStats[];
    topByGames: AllTimeStats[];
    totalPlayers: number;
    totalGames: number;
  };
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<AllTimeLeaderboardResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    // Query to calculate all-time statistics from leaderboard_summary
    const { data: allTimeData, error } = await supabase.rpc('get_all_time_stats');
    
    if (error) {
      console.error('[All-Time API] Database error:', error);
      return res.status(500).json({ success: false, error: 'Database error' });
    }

    // If RPC doesn't exist yet, fall back to direct query
    if (!allTimeData) {
      const { data: rawData, error: directError } = await supabase
        .from('leaderboard_summary')
        .select(`
          player_id,
          rank,
          best_time,
          guesses_used,
          date,
          players!inner(display_name)
        `)
        .order('date', { ascending: false });

      if (directError) {
        console.error('[All-Time API] Direct query error:', directError);
        return res.status(500).json({ success: false, error: 'Database query failed' });
      }

      // Calculate statistics from raw data
      const playerStats = calculateAllTimeStats((rawData as unknown as GameRow[]) || []);
      
      // Sort into different leaderboard categories
      const topByWinRate = [...playerStats]
        .filter(p => p.total_games >= 3) // Minimum games for meaningful win rate
        .sort((a, b) => b.win_percentage - a.win_percentage)
        .slice(0, 10);

      const topBySpeed = [...playerStats]
        .filter(p => p.total_games >= 3)
        .sort((a, b) => a.average_time - b.average_time)
        .slice(0, 10);

      const topByConsistency = [...playerStats]
        .filter(p => p.total_games >= 5)
        .sort((a, b) => a.average_guesses - b.average_guesses)
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
          topBySpeed,
          topByConsistency,
          topByGames,
          totalPlayers,
          totalGames
        }
      });
    }

    return res.status(200).json({ success: true, data: allTimeData });

  } catch (error) {
    console.error('[All-Time API] Unexpected error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
}

function calculateAllTimeStats(rawData: GameRow[]): AllTimeStats[] {
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
    const totalWins = games.filter(g => g.rank === 1).length;
    const winPercentage = totalGames > 0 ? (totalWins / totalGames) * 100 : 0;
    
    const averageTime = games.reduce((sum, g) => sum + (g.best_time || 0), 0) / totalGames;
    const averageGuesses = games.reduce((sum, g) => sum + (g.guesses_used || 0), 0) / totalGames;
    const bestTimeEver = Math.min(...games.map(g => g.best_time || Infinity));
    
    const totalTop10 = games.filter(g => g.rank <= 10).length;
    const firstPlaces = totalWins;
    
    const lastPlayed = games.sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    )[0]?.date || '';

    const playerName = games[0]?.players?.display_name || `Player ${playerId.slice(-4)}`;

    return {
      player_id: playerId,
      player_name: playerName,
      total_games: totalGames,
      total_wins: totalWins,
      win_percentage: Math.round(winPercentage * 100) / 100,
      average_time: Math.round(averageTime * 100) / 100,
      average_guesses: Math.round(averageGuesses * 100) / 100,
      best_time_ever: bestTimeEver === Infinity ? 0 : bestTimeEver,
      total_top_10_finishes: totalTop10,
      first_place_finishes: firstPlaces,
      last_played: lastPlayed
    };
  });
} 