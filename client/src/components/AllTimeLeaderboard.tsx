import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

// Import API base URL configuration
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://undefine-v2-back.vercel.app';

interface AllTimeStats {
  player_id: string;
  player_name: string;
  win_percentage: number;
  average_guesses: number;
  highest_streak: number;
  current_streak: number;
  total_games: number;
  total_wins: number;
  last_played: string;
}

interface AllTimeLeaderboardData {
  topByWinRate: AllTimeStats[];
  topByConsistency: AllTimeStats[];
  topByStreaks: AllTimeStats[];
  topByGames: AllTimeStats[];
  totalPlayers: number;
  totalGames: number;
}

interface AllTimeLeaderboardProps {
  open: boolean;
  onClose: () => void;
}

type LeaderboardTab = 'winRate' | 'consistency' | 'streaks' | 'activity';

export const AllTimeLeaderboard: React.FC<AllTimeLeaderboardProps> = ({ open, onClose }) => {
  const [data, setData] = useState<AllTimeLeaderboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<LeaderboardTab>('winRate');

  useEffect(() => {
    if (open) {
      fetchAllTimeStats();
    }
  }, [open]);

  const fetchAllTimeStats = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${BASE_URL}/api/leaderboard/all-time`);
      const result = await response.json();
      
      if (result.success) {
        setData(result.data);
      } else {
        setError(result.error || 'Failed to load all-time statistics');
      }
    } catch (err) {
      setError('Network error loading all-time stats');
      console.error('[AllTimeLeaderboard] Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'winRate' as LeaderboardTab, label: '🥇 Win Rate', description: 'Highest win percentage' },
    { id: 'consistency' as LeaderboardTab, label: '🎯 Consistency', description: 'Fewest average guesses' },
    { id: 'streaks' as LeaderboardTab, label: '🔥 Streaks', description: 'Longest win streaks' },
    { id: 'activity' as LeaderboardTab, label: '📊 Activity', description: 'Most games played' }
  ];

  const getCurrentData = (): AllTimeStats[] => {
    if (!data) return [];
    
    switch (activeTab) {
      case 'winRate': return data.topByWinRate;
      case 'consistency': return data.topByConsistency;
      case 'streaks': return data.topByStreaks;
      case 'activity': return data.topByGames;
      default: return [];
    }
  };

  const renderLeaderboardEntry = (player: AllTimeStats, rank: number) => {
    const formatDate = (dateStr: string) => {
      if (!dateStr) return 'Never';
      return new Date(dateStr).toLocaleDateString();
    };

    return (
      <div
        key={player.player_id}
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '0.75rem',
          borderBottom: '1px solid #e5e7eb',
          backgroundColor: rank <= 3 ? 'rgba(255, 215, 0, 0.1)' : 'transparent'
        }}
      >
        <div style={{ 
          minWidth: '2rem', 
          fontWeight: 'bold',
          color: rank <= 3 ? '#d97706' : '#6b7280'
        }}>
          #{rank}
        </div>
        
        <div style={{ flex: 1, marginLeft: '0.75rem' }}>
          <div style={{ fontWeight: '600', color: '#1f2937' }}>
            {player.player_name}
          </div>
          
          {activeTab === 'winRate' && (
            <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
              {player.win_percentage}% ({player.total_wins}/{player.total_games}) • Current: {player.current_streak}
            </div>
          )}
          
          {activeTab === 'consistency' && (
            <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
              {player.average_guesses} avg guesses • {player.total_wins} wins • {player.win_percentage}%
            </div>
          )}
          
          {activeTab === 'streaks' && (
            <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
              Current: {player.current_streak} • Last win: {formatDate(player.last_played)}
            </div>
          )}
          
          {activeTab === 'activity' && (
            <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
              {player.win_percentage}% win rate • Last played: {formatDate(player.last_played)}
            </div>
          )}
        </div>

        <div style={{ 
          minWidth: '4rem', 
          textAlign: 'right',
          fontWeight: 'bold',
          color: '#1f2937'
        }}>
          {activeTab === 'winRate' && `${player.win_percentage}%`}
          {activeTab === 'consistency' && `${player.average_guesses}`}
          {activeTab === 'streaks' && `${player.highest_streak}`}
          {activeTab === 'activity' && `${player.total_games}`}
        </div>
      </div>
    );
  };

  if (!open) return null;

  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#fff',
          borderRadius: '0.75rem',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
          width: '90vw',
          maxWidth: '28rem',
          maxHeight: '80vh',
          overflow: 'hidden',
          fontFamily: 'var(--font-primary)'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ 
          padding: '1.5rem 1.5rem 1rem 1.5rem',
          borderBottom: '1px solid #e5e7eb'
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            marginBottom: '1rem'
          }}>
            <h2 style={{ 
              margin: 0, 
              fontSize: '1.5rem', 
              fontWeight: 'bold',
              color: '#1f2937'
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
                color: '#9ca3af',
                padding: '0.25rem'
              }}
            >
              ×
            </button>
          </div>

          {data && (
            <div style={{ 
              fontSize: '0.875rem', 
              color: '#6b7280',
              textAlign: 'center'
            }}>
              {data.totalPlayers} players • {data.totalGames} total games
            </div>
          )}
        </div>

        {/* Tab Navigation */}
        <div style={{ 
          display: 'flex',
          borderBottom: '1px solid #e5e7eb',
          backgroundColor: '#f9fafb'
        }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1,
                padding: '0.75rem 0.25rem',
                border: 'none',
                backgroundColor: activeTab === tab.id ? '#fff' : 'transparent',
                color: activeTab === tab.id ? '#1f2937' : '#6b7280',
                fontSize: '0.75rem',
                fontWeight: activeTab === tab.id ? '600' : '400',
                cursor: 'pointer',
                borderBottom: activeTab === tab.id ? '2px solid #3b82f6' : '2px solid transparent',
                transition: 'all 0.2s ease'
              }}
              title={tab.description}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ 
          maxHeight: '24rem', 
          overflowY: 'auto'
        }}>
          {loading && (
            <div style={{ 
              padding: '2rem', 
              textAlign: 'center', 
              color: '#6b7280'
            }}>
              Loading all-time statistics...
            </div>
          )}

          {error && (
            <div style={{ 
              padding: '2rem', 
              textAlign: 'center', 
              color: '#dc2626'
            }}>
              {error}
            </div>
          )}

          {!loading && !error && (
            <div>
              {getCurrentData().map((player, index) => 
                renderLeaderboardEntry(player, index + 1)
              )}
              
              {getCurrentData().length === 0 && (
                <div style={{ 
                  padding: '2rem', 
                  textAlign: 'center', 
                  color: '#6b7280'
                }}>
                  No data available for this category
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}; 