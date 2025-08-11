import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { safeFetch, ApiError, isVercelPreview, getApiBaseUrl } from '../utils/apiHelpers';
import { env } from '../env.client';

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
  topByStreaks: AllTimeStats[];
  topByGames: AllTimeStats[];
  totalPlayers: number;
  totalGames: number;
}

interface AllTimeLeaderboardResponse {
  success: boolean;
  data?: AllTimeLeaderboardData;
  error?: string;
  debug?: any;
}

interface AllTimeLeaderboardProps {
  open: boolean;
  onClose: () => void;
}

interface ThemeLBEntry { player_id: string; display_name: string | null; avg_similarity: number; attempts: number; }

export const ThemeLeaderboardPanel: React.FC = () => {
  const [entries, setEntries] = useState<ThemeLBEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'weekly'|'allTime'>('weekly');

  const load = async () => {
    try {
      setLoading(true); setError(null);
      const makeUrl = (base: string) => {
        if (mode === 'weekly') {
          const weekParam = new Date().toISOString().slice(0,10);
          return `${base}/api/leaderboard/theme?week_key=${encodeURIComponent(weekParam)}&min_attempts=1`;
        }
        return `${base}/api/leaderboard/theme?view=all_time&min_attempts=1`;
      };

      const primaryBase = getApiBaseUrl();
      const primaryUrl = makeUrl(primaryBase);
      try {
        const resp = await safeFetch<{ entries: ThemeLBEntry[] }>(primaryUrl);
        setEntries(resp.entries || []);
      } catch (e: any) {
        if (e instanceof ApiError && e.status === 404 && typeof window !== 'undefined') {
          // Fallback to current origin (frontend) if backend doesn't have the route on this branch
          const fallbackUrl = makeUrl(window.location.origin);
          const resp = await safeFetch<{ entries: ThemeLBEntry[] }>(fallbackUrl);
          setEntries(resp.entries || []);
        } else {
          throw e;
        }
      }
    } catch (e:any) {
      setError(e.message || 'Failed to load theme leaderboard');
    }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [mode]);

  return (
    <div style={{marginTop:'0.75rem'}}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
        <div style={{fontWeight:700}}>Theme Leaderboard ({mode === 'weekly' ? 'Weekly Avg %' : 'All-Time Avg %'})</div>
        <div>
          <button onClick={() => setMode('weekly')} disabled={mode==='weekly'} style={{marginRight:'0.5rem'}}>Weekly</button>
          <button onClick={() => setMode('allTime')} disabled={mode==='allTime'}>All-Time</button>
        </div>
      </div>
      {loading && <div style={{padding:'0.5rem 0'}}>Loading…</div>}
      {error && <div style={{color:'#dc2626', padding:'0.5rem 0'}}>Error: {error}</div>}
      {!loading && !error && (
        entries.length === 0 ? (
          <div style={{opacity:0.7}}>No entries.</div>
        ) : (
          <ol style={{margin:0, paddingLeft:'1rem'}}>
            {entries.map((e, i) => (
              <li key={e.player_id} style={{margin:'0.25rem 0'}}>
                <span style={{fontWeight:600}}>{i+1}. {e.display_name || 'Player'}</span>
                <span style={{marginLeft:'0.5rem'}}>— {e.avg_similarity.toFixed(2)}%</span>
                <span style={{marginLeft:'0.25rem', opacity:0.7}}>({e.attempts})</span>
              </li>
            ))}
          </ol>
        )
      )}
    </div>
  );
};

type LeaderboardTab = 'totalGames' | 'streaks';

export const AllTimeLeaderboard: React.FC<AllTimeLeaderboardProps> = ({ open, onClose }) => {
  const [data, setData] = useState<AllTimeLeaderboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<LeaderboardTab>('totalGames');
  const [showThemeLB, setShowThemeLB] = useState(false);

  useEffect(() => {
    if (open) {
      fetchAllTimeStats();
    }
  }, [open]);

  useEffect(() => {
    const handler = () => setShowThemeLB(true);
    window.addEventListener('show-theme-leaderboard' as any, handler);
    return () => window.removeEventListener('show-theme-leaderboard' as any, handler);
  }, []);

  const fetchAllTimeStats = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('[AllTimeLeaderboard] Environment check:', {
        baseUrl: getApiBaseUrl(),
        isPreview: isVercelPreview(),
        hostname: window.location.hostname
      });
      
      const tryFetch = async (base: string) => {
        const url = `${base}/api/leaderboard/all-time`;
        console.log('[AllTimeLeaderboard] Request URL:', url);
        return await safeFetch<AllTimeLeaderboardResponse>(url);
      };

      let result: AllTimeLeaderboardResponse | null = null;
      try {
        result = await tryFetch(getApiBaseUrl());
      } catch (e: any) {
        if (e instanceof ApiError && (e.status === 404 || e.message.includes('Failed to fetch'))) {
          // Fallback to current origin (useful in preview when backend domain is blocked)
          result = await tryFetch(window.location.origin);
        } else {
          throw e;
        }
      }
      
      if (result && result.success) {
        setData(result.data || null);
        console.log('[AllTimeLeaderboard] Data loaded successfully');
      } else {
        setError(result?.error || 'Failed to load all-time statistics');
        console.error('[AllTimeLeaderboard] API returned error:', result?.error);
      }
    } catch (err) {
      let errorMessage = 'Network error loading all-time stats';
      
      if (err instanceof ApiError) {
        console.error('[AllTimeLeaderboard] API Error details:', {
          message: err.message,
          status: err.status,
          url: err.url,
          responseText: err.responseText?.substring(0, 200)
        });
        
        if (err.status === 404) {
          errorMessage = isVercelPreview() 
            ? 'Leaderboard API not available in this preview deployment'
            : 'Leaderboard API endpoint not found';
        } else if (err.status === 500) {
          errorMessage = 'Server error loading leaderboard data';
        } else if (err.responseText?.includes('<!doctype')) {
          errorMessage = 'Server returned webpage instead of data - check API configuration';
        } else {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
      console.error('[AllTimeLeaderboard] Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'totalGames' as LeaderboardTab, label: '📊 All Time Rankings', description: 'Most games played' },
    { id: 'streaks' as LeaderboardTab, label: '🔥 Highest Streak', description: 'Longest win streaks' }
  ];

  const getCurrentData = (): AllTimeStats[] => {
    if (!data) return [];
    
    switch (activeTab) {
      case 'totalGames': return data.topByGames;
      case 'streaks': return data.topByStreaks;
      default: return [];
    }
  };

  const renderLeaderboardEntry = (player: AllTimeStats, rank: number) => {
    let primaryStat = '';
    let secondaryStats = [];

    switch (activeTab) {
      case 'totalGames':
        primaryStat = `${player.total_games}`;
        secondaryStats = [`${player.win_percentage}% win rate`, `Last: ${player.last_played}`];
        break;
      case 'streaks':
        primaryStat = `${player.highest_streak}`;
        secondaryStats = [`Current: ${player.current_streak}`, `Last: ${player.last_played}`];
        break;
      default:
        primaryStat = '0';
        secondaryStats = [];
    }

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
          
          {activeTab === 'totalGames' && (
            <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
              {player.win_percentage}% win rate • Last played: {formatDate(player.last_played)}
            </div>
          )}
          
          {activeTab === 'streaks' && (
            <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
              Current: {player.current_streak} • Last: {formatDate(player.last_played)}
            </div>
          )}
        </div>

        <div style={{ 
          minWidth: '4rem', 
          textAlign: 'right',
          fontWeight: 'bold',
          color: '#1f2937'
        }}>
          {activeTab === 'totalGames' && `${player.total_games}`}
          {activeTab === 'streaks' && `${player.highest_streak}`}
        </div>
      </div>
    );
  };

  if (!open) return null;

  return (
    createPortal(
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
          zIndex: 1000,
          padding: 'max(1rem, env(safe-area-inset-top)) max(1rem, env(safe-area-inset-right)) max(1rem, env(safe-area-inset-bottom)) max(1rem, env(safe-area-inset-left))',
          boxSizing: 'border-box'
        }}
        onClick={onClose}
      >
        <div
          style={{
            backgroundColor: '#fff',
            borderRadius: '0.75rem',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            width: '100%',
            maxWidth: 'min(28rem, 90vw)',
            maxHeight: 'min(80vh, calc(100vh - 2rem))',
            overflow: 'hidden',
            fontFamily: 'var(--font-primary)',
            boxSizing: 'border-box'
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
          {/* Always show Theme Leaderboard section under header (independent of tabs) */}
          <ThemeLeaderboardPanel />
        </div>
      </div>,
      document.body
    )
  );
}; 