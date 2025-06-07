import React, { useState, useEffect } from 'react';

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

interface AllTimeData {
  topByWinRate: AllTimeStats[];
  topBySpeed: AllTimeStats[];
  topByConsistency: AllTimeStats[];
  topByGames: AllTimeStats[];
  totalPlayers: number;
  totalGames: number;
}

interface AllTimeLeaderboardProps {
  open: boolean;
  onClose: () => void;
}

type LeaderboardCategory = 'winRate' | 'speed' | 'consistency' | 'games';

export const AllTimeLeaderboard: React.FC<AllTimeLeaderboardProps> = ({ 
  open, 
  onClose 
}) => {
  const [data, setData] = useState<AllTimeData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<LeaderboardCategory>('winRate');

  useEffect(() => {
    if (open && !data) {
      fetchAllTimeData();
    }
  }, [open, data]);

  const fetchAllTimeData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/leaderboard/all-time');
      const result = await response.json();
      
      if (result.success) {
        setData(result.data);
      } else {
        setError(result.error || 'Failed to load all-time stats');
      }
    } catch (err) {
      setError('Network error loading all-time stats');
      console.error('All-time leaderboard error:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getCategoryData = (category: LeaderboardCategory): AllTimeStats[] => {
    if (!data) return [];
    
    switch (category) {
      case 'winRate': return data.topByWinRate;
      case 'speed': return data.topBySpeed;
      case 'consistency': return data.topByConsistency;
      case 'games': return data.topByGames;
      default: return [];
    }
  };

  const getCategoryTitle = (category: LeaderboardCategory): string => {
    switch (category) {
      case 'winRate': return 'Highest Win Rate';
      case 'speed': return 'Fastest Players';
      case 'consistency': return 'Most Consistent';
      case 'games': return 'Most Active';
      default: return '';
    }
  };

  const getCategoryDescription = (category: LeaderboardCategory): string => {
    switch (category) {
      case 'winRate': return 'Players with the highest percentage of first-place finishes (min 3 games)';
      case 'speed': return 'Players with the fastest average completion time (min 3 games)';
      case 'consistency': return 'Players with the lowest average guesses needed (min 5 games)';
      case 'games': return 'Players with the most games played';
      default: return '';
    }
  };

  if (!open) return null;

  return (
    <div 
      className="modal-overlay" 
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '1rem'
      }}
    >
      <div 
        className="modal-content" 
        onClick={e => e.stopPropagation()}
        style={{
          backgroundColor: 'var(--color-bg)',
          borderRadius: '1rem',
          padding: '2rem',
          width: '100%',
          maxWidth: '600px',
          maxHeight: '80vh',
          overflow: 'auto',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)',
          color: 'var(--color-primary)',
          fontFamily: 'var(--font-primary)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ 
            fontSize: '1.5rem', 
            fontWeight: 'bold', 
            margin: 0,
            color: 'var(--color-primary)'
          }}>
            🏆 All-Time Leaderboards
          </h2>
          <button 
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.5rem',
              cursor: 'pointer',
              color: 'var(--color-primary)',
              padding: '0.5rem'
            }}
          >
            ✕
          </button>
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <div>Loading all-time statistics...</div>
          </div>
        )}

        {error && (
          <div style={{ 
            textAlign: 'center', 
            padding: '2rem', 
            color: 'var(--color-danger)',
            backgroundColor: '#fee2e2',
            borderRadius: '0.5rem',
            marginBottom: '1rem'
          }}>
            {error}
          </div>
        )}

        {data && (
          <>
            {/* Summary Stats */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', 
              gap: '1rem',
              marginBottom: '2rem',
              padding: '1rem',
              backgroundColor: 'rgba(26, 35, 126, 0.05)',
              borderRadius: '0.5rem'
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--color-primary)' }}>
                  {data.totalPlayers}
                </div>
                <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Total Players</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--color-primary)' }}>
                  {data.totalGames}
                </div>
                <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Total Games</div>
              </div>
            </div>

            {/* Category Tabs */}
            <div style={{ 
              display: 'flex', 
              gap: '0.5rem',
              marginBottom: '1rem',
              flexWrap: 'wrap'
            }}>
              {(['winRate', 'speed', 'consistency', 'games'] as LeaderboardCategory[]).map(category => (
                <button
                  key={category}
                  onClick={() => setActiveCategory(category)}
                  style={{
                    padding: '0.5rem 1rem',
                    border: 'none',
                    borderRadius: '0.5rem',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    fontFamily: 'var(--font-primary)',
                    backgroundColor: activeCategory === category 
                      ? 'var(--color-primary)' 
                      : 'rgba(26, 35, 126, 0.1)',
                    color: activeCategory === category 
                      ? 'white' 
                      : 'var(--color-primary)',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {getCategoryTitle(category)}
                </button>
              ))}
            </div>

            {/* Category Description */}
            <div style={{ 
              fontSize: '0.875rem',
              color: '#6b7280',
              marginBottom: '1rem',
              fontStyle: 'italic'
            }}>
              {getCategoryDescription(activeCategory)}
            </div>

            {/* Leaderboard Table */}
            <div style={{ overflow: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--color-primary)' }}>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 'bold' }}>Rank</th>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 'bold' }}>Player</th>
                    <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 'bold' }}>Games</th>
                    {activeCategory === 'winRate' && (
                      <>
                        <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 'bold' }}>Wins</th>
                        <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 'bold' }}>Win %</th>
                      </>
                    )}
                    {activeCategory === 'speed' && (
                      <>
                        <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 'bold' }}>Avg Time</th>
                        <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 'bold' }}>Best Time</th>
                      </>
                    )}
                    {activeCategory === 'consistency' && (
                      <>
                        <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 'bold' }}>Avg Guesses</th>
                        <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 'bold' }}>Top 10s</th>
                      </>
                    )}
                    {activeCategory === 'games' && (
                      <>
                        <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 'bold' }}>Wins</th>
                        <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 'bold' }}>Last Played</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {getCategoryData(activeCategory).map((player, index) => (
                    <tr 
                      key={player.player_id}
                      style={{ 
                        borderBottom: '1px solid #e5e7eb',
                        backgroundColor: index % 2 === 0 ? 'transparent' : 'rgba(26, 35, 126, 0.02)'
                      }}
                    >
                      <td style={{ padding: '0.75rem', fontWeight: 'bold' }}>#{index + 1}</td>
                      <td style={{ padding: '0.75rem' }}>{player.player_name}</td>
                      <td style={{ padding: '0.75rem', textAlign: 'center' }}>{player.total_games}</td>
                      {activeCategory === 'winRate' && (
                        <>
                          <td style={{ padding: '0.75rem', textAlign: 'center' }}>{player.total_wins}</td>
                          <td style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 'bold' }}>
                            {player.win_percentage.toFixed(1)}%
                          </td>
                        </>
                      )}
                      {activeCategory === 'speed' && (
                        <>
                          <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                            {formatTime(Math.round(player.average_time))}
                          </td>
                          <td style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 'bold' }}>
                            {formatTime(player.best_time_ever)}
                          </td>
                        </>
                      )}
                      {activeCategory === 'consistency' && (
                        <>
                          <td style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 'bold' }}>
                            {player.average_guesses.toFixed(1)}
                          </td>
                          <td style={{ padding: '0.75rem', textAlign: 'center' }}>{player.total_top_10_finishes}</td>
                        </>
                      )}
                      {activeCategory === 'games' && (
                        <>
                          <td style={{ padding: '0.75rem', textAlign: 'center' }}>{player.total_wins}</td>
                          <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                            {new Date(player.last_played).toLocaleDateString()}
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}; 