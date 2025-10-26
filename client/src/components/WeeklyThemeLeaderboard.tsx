import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { safeFetch, ApiError, getApiBaseUrl } from '../utils/apiHelpers';
import { getPlayerId } from '../utils/player';

interface WeeklyThemeLeaderboardEntry {
  rank: number;
  playerId: string;
  displayName: string;
  dayNumber: number;
  dayName: string;
  timeGuessed: string;
  createdAt: string;
  isCurrentPlayer?: boolean;
}

interface WeeklyThemeLeaderboardData {
  currentTheme: string | null;
  themeName: string | null;
  leaderboard: WeeklyThemeLeaderboardEntry[];
  playerRank?: WeeklyThemeLeaderboardEntry;
  totalPlayers: number;
}

interface WeeklyThemeLeaderboardProps {
  open: boolean;
  onClose: () => void;
}

export const WeeklyThemeLeaderboard: React.FC<WeeklyThemeLeaderboardProps> = ({ open, onClose }) => {
  const [data, setData] = useState<WeeklyThemeLeaderboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const playerId = getPlayerId();

  useEffect(() => {
    if (open) {
      fetchWeeklyThemeLeaderboard();
    }
  }, [open]);

  const fetchWeeklyThemeLeaderboard = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const baseUrl = getApiBaseUrl();
      const url = `${baseUrl}/api/leaderboard/theme-weekly?player_id=${playerId}`;
      
      console.log('[WeeklyThemeLeaderboard] Fetching from:', url);
      
      const result = await safeFetch<WeeklyThemeLeaderboardData>(url);
      
      setData(result);
      console.log('[WeeklyThemeLeaderboard] Data loaded:', result);
    } catch (err) {
      let errorMessage = 'Network error loading weekly theme leaderboard';
      
      if (err instanceof ApiError) {
        console.error('[WeeklyThemeLeaderboard] API Error:', {
          message: err.message,
          status: err.status,
          url: err.url
        });
        
        if (err.status === 404) {
          errorMessage = 'Theme leaderboard not available';
        } else if (err.status === 500) {
          errorMessage = 'Server error loading theme leaderboard';
        } else {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
      console.error('[WeeklyThemeLeaderboard] Error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  const displayEntries = data?.leaderboard || [];
  const playerRankEntry = data?.playerRank;
  const showPlayerRank = playerRankEntry && playerRankEntry.rank > 20;

  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        zIndex: 60,
        padding: 'max(1rem, env(safe-area-inset-top)) max(1rem, env(safe-area-inset-right)) max(1rem, env(safe-area-inset-bottom)) max(1rem, env(safe-area-inset-left))',
      }}
      onClick={onClose}
    >
      <div
        style={{
          fontFamily: 'var(--font-primary)',
          backgroundColor: 'white',
          borderRadius: '0.75rem',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
          padding: 'clamp(1rem, 4vw, 2rem)',
          width: '100%',
          maxWidth: 'min(32rem, 90vw)',
          maxHeight: 'min(85vh, calc(100vh - 2rem))',
          display: 'flex',
          flexDirection: 'column',
          color: 'var(--color-primary, #1a237e)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
          <div
            style={{
              fontWeight: 700,
              fontSize: 'clamp(1.25rem, 4vw, 1.5rem)',
              color: 'var(--color-primary, #1a237e)',
              marginBottom: '0.5rem',
            }}
          >
            🎭 This Week's Theme Leaders
          </div>
          {data?.themeName && (
            <div
              style={{
                fontSize: '0.875rem',
                color: '#6b7280',
                fontStyle: 'italic',
              }}
            >
              Theme: <strong>{data.themeName}</strong>
            </div>
          )}
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '0.75rem',
            right: '0.75rem',
            background: 'none',
            border: 'none',
            fontSize: '1.5rem',
            cursor: 'pointer',
            color: '#9ca3af',
            lineHeight: 1,
            padding: '0.25rem',
          }}
          aria-label="Close"
        >
          ×
        </button>

        {/* Loading State */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
            Loading theme leaderboard...
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div
            style={{
              textAlign: 'center',
              padding: '2rem',
              color: '#ef4444',
              backgroundColor: '#fee2e2',
              borderRadius: '0.5rem',
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Error</div>
            <div style={{ fontSize: '0.875rem' }}>{error}</div>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && data && displayEntries.length === 0 && (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎭</div>
            <div style={{ fontWeight: 600, marginBottom: '0.5rem', fontSize: '1.125rem' }}>
              No one has guessed this week's theme yet!
            </div>
            <div style={{ fontSize: '0.875rem' }}>
              Be the first to unlock the theme and claim the top spot!
            </div>
          </div>
        )}

        {/* Leaderboard Table */}
        {!loading && !error && displayEntries.length > 0 && (
          <div style={{ flex: 1, overflowY: 'auto', marginBottom: '1rem' }}>
            {/* Table Header */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '3rem 1fr 5rem 4rem',
                gap: '0.5rem',
                padding: '0.75rem 0.5rem',
                borderBottom: '2px solid #e5e7eb',
                fontWeight: 600,
                fontSize: '0.75rem',
                textTransform: 'uppercase',
                color: '#6b7280',
                position: 'sticky',
                top: 0,
                backgroundColor: 'white',
                zIndex: 1,
              }}
            >
              <div style={{ textAlign: 'center' }}>Rank</div>
              <div>Player</div>
              <div style={{ textAlign: 'center' }}>Day</div>
              <div style={{ textAlign: 'center' }}>Time</div>
            </div>

            {/* Table Rows */}
            <div>
              {displayEntries.map((entry) => (
                <div
                  key={entry.playerId}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '3rem 1fr 5rem 4rem',
                    gap: '0.5rem',
                    padding: '0.75rem 0.5rem',
                    borderBottom: '1px solid #f3f4f6',
                    backgroundColor: entry.isCurrentPlayer ? '#f0f9ff' : 'transparent',
                    fontWeight: entry.isCurrentPlayer ? 600 : 400,
                    fontSize: '0.875rem',
                    alignItems: 'center',
                    transition: 'background-color 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    if (!entry.isCurrentPlayer) {
                      e.currentTarget.style.backgroundColor = '#f9fafb';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!entry.isCurrentPlayer) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  {/* Rank */}
                  <div style={{ textAlign: 'center', fontWeight: 600 }}>
                    {entry.rank === 1 && <span style={{ fontSize: '1.25rem' }}>🥇</span>}
                    {entry.rank === 2 && <span style={{ fontSize: '1.25rem' }}>🥈</span>}
                    {entry.rank === 3 && <span style={{ fontSize: '1.25rem' }}>🥉</span>}
                    {entry.rank > 3 && <span>{entry.rank}</span>}
                  </div>

                  {/* Player Name */}
                  <div
                    style={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {entry.displayName}
                    {entry.isCurrentPlayer && (
                      <span style={{ marginLeft: '0.25rem', color: '#3b82f6' }}> (You)</span>
                    )}
                  </div>

                  {/* Day Name */}
                  <div
                    style={{
                      textAlign: 'center',
                      fontSize: '0.75rem',
                      color: '#6b7280',
                    }}
                  >
                    {entry.dayName.substring(0, 3)}
                  </div>

                  {/* Time Guessed */}
                  <div
                    style={{
                      textAlign: 'center',
                      fontFamily: 'monospace',
                      fontSize: '0.875rem',
                    }}
                  >
                    {entry.timeGuessed}
                  </div>
                </div>
              ))}
            </div>

            {/* Player's Rank (if outside top 20) */}
            {showPlayerRank && playerRankEntry && (
              <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '2px solid #e5e7eb' }}>
                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.5rem', textAlign: 'center' }}>
                  Your Rank
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '3rem 1fr 5rem 4rem',
                    gap: '0.5rem',
                    padding: '0.75rem 0.5rem',
                    backgroundColor: '#f0f9ff',
                    borderRadius: '0.5rem',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    alignItems: 'center',
                  }}
                >
                  <div style={{ textAlign: 'center' }}>{playerRankEntry.rank}</div>
                  <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {playerRankEntry.displayName}
                  </div>
                  <div style={{ textAlign: 'center', fontSize: '0.75rem', color: '#6b7280' }}>
                    {playerRankEntry.dayName.substring(0, 3)}
                  </div>
                  <div style={{ textAlign: 'center', fontFamily: 'monospace' }}>
                    {playerRankEntry.timeGuessed}
                  </div>
                </div>
              </div>
            )}

            {/* Total Players Count */}
            {data && data.totalPlayers > 0 && (
              <div
                style={{
                  textAlign: 'center',
                  fontSize: '0.75rem',
                  color: '#6b7280',
                  marginTop: '1rem',
                  paddingTop: '1rem',
                  borderTop: '1px solid #f3f4f6',
                }}
              >
                {data.totalPlayers} {data.totalPlayers === 1 ? 'player has' : 'players have'} guessed this week's theme
              </div>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

