import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { safeFetch, ApiError, getApiBaseUrl } from '../utils/apiHelpers';
import { getPlayerId } from '../utils/player';

interface AllTimeThemeLeaderboardEntry {
  rank: number;
  playerId: string;
  displayName: string;
  themesUnlocked: number;
  avgDayGuessed: number;
  avgDayName: string;
  totalCorrect: number;
  totalAttempts: number;
  successRate: number;
  isCurrentPlayer?: boolean;
}

interface AllTimeThemeLeaderboardData {
  leaderboard: AllTimeThemeLeaderboardEntry[];
  playerRank?: AllTimeThemeLeaderboardEntry;
  totalPlayers: number;
}

interface AllTimeThemeLeaderboardProps {
  open: boolean;
  onClose: () => void;
}

export const AllTimeThemeLeaderboard: React.FC<AllTimeThemeLeaderboardProps> = ({ open, onClose }) => {
  const [data, setData] = useState<AllTimeThemeLeaderboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const playerId = getPlayerId();

  useEffect(() => {
    if (open) {
      fetchAllTimeThemeLeaderboard();
    }
  }, [open]);

  const fetchAllTimeThemeLeaderboard = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const baseUrl = getApiBaseUrl();
      const url = `${baseUrl}/api/leaderboard/theme-alltime?player_id=${playerId}`;
      
      console.log('[AllTimeThemeLeaderboard] Fetching from:', url);
      
      const result = await safeFetch<AllTimeThemeLeaderboardData>(url);
      
      setData(result);
      console.log('[AllTimeThemeLeaderboard] Data loaded:', result);
    } catch (err) {
      let errorMessage = 'Network error loading all-time theme stats';
      
      if (err instanceof ApiError) {
        console.error('[AllTimeThemeLeaderboard] API Error:', {
          message: err.message,
          status: err.status,
          url: err.url
        });
        
        if (err.status === 404) {
          errorMessage = 'All-time theme leaderboard not available';
        } else if (err.status === 500) {
          errorMessage = 'Server error loading theme stats';
        } else {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
      console.error('[AllTimeThemeLeaderboard] Error:', err);
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
          maxWidth: 'min(36rem, 90vw)',
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
            🏆 All-Time Theme Champions
          </div>
          <div
            style={{
              fontSize: '0.75rem',
              color: '#6b7280',
              fontStyle: 'italic',
            }}
          >
            Ranked by themes unlocked, then average guess day
          </div>
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
            Loading theme champions...
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
              No theme champions yet!
            </div>
            <div style={{ fontSize: '0.875rem' }}>
              Be the first to unlock a theme and claim your place in history!
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
                gridTemplateColumns: '3rem 1fr 5rem 5rem',
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
              <div style={{ textAlign: 'center' }}>Themes</div>
              <div style={{ textAlign: 'center' }}>Avg Day</div>
            </div>

            {/* Table Rows */}
            <div>
              {displayEntries.map((entry) => (
                <div
                  key={entry.playerId}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '3rem 1fr 5rem 5rem',
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
                  title={`${entry.displayName}: ${entry.themesUnlocked} themes, ${entry.successRate}% success rate`}
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

                  {/* Themes Unlocked */}
                  <div
                    style={{
                      textAlign: 'center',
                      fontWeight: 600,
                      color: 'var(--color-primary)',
                    }}
                  >
                    {entry.themesUnlocked}
                  </div>

                  {/* Average Day */}
                  <div
                    style={{
                      textAlign: 'center',
                      fontSize: '0.75rem',
                      color: '#6b7280',
                    }}
                    title={`Average guess day: ${entry.avgDayName} (${entry.avgDayGuessed})`}
                  >
                    {entry.avgDayName.substring(0, 3)}
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
                    gridTemplateColumns: '3rem 1fr 5rem 5rem',
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
                  <div style={{ textAlign: 'center', color: 'var(--color-primary)' }}>
                    {playerRankEntry.themesUnlocked}
                  </div>
                  <div style={{ textAlign: 'center', fontSize: '0.75rem', color: '#6b7280' }}>
                    {playerRankEntry.avgDayName.substring(0, 3)}
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
                {data.totalPlayers} {data.totalPlayers === 1 ? 'champion' : 'champions'} have unlocked themes
              </div>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

