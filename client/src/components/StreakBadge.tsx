import React, { useState } from 'react';
import { StreakCalendarModal } from './StreakCalendarModal';

interface StreakBadgeProps {
  streak: number;
  highestStreak?: number;
  lastWinDate?: string | null;
  playerId?: string; // Add playerId for calendar modal
  onSelectArchiveDate?: (date: string) => void; // NEW: Callback for archive play
}

export const StreakBadge: React.FC<StreakBadgeProps> = ({ 
  streak, 
  highestStreak, 
  lastWinDate,
  playerId = 'default-player', // fallback value
  onSelectArchiveDate // NEW: Archive play callback
}) => {
  const [showCalendar, setShowCalendar] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  // 🔧 TEMPORARY DEBUG: Log all props to see what we're getting
  console.log('[StreakBadge] Props received:', {
    streak,
    highestStreak,
    lastWinDate,
    playerId
  });

  // Calculate if streak is active (won today or yesterday) - STRICT consecutive system
  const isActiveStreak = () => {
    if (!lastWinDate || streak === 0) return false;
    
    const lastWin = new Date(lastWinDate);
    const today = new Date();
    const daysDiff = Math.floor((today.getTime() - lastWin.getTime()) / (1000 * 60 * 60 * 24));
    
    console.log('[StreakBadge] Streak analysis:', {
      lastWinDate,
      daysDiff,
      streak,
      wouldBeActive: daysDiff <= 1
    });
    
    return daysDiff <= 1; // Active only if won today or yesterday (strict consecutive)
  };

  const activeStreak = isActiveStreak();
  
  // 🚨 CRITICAL FIX: Always show database streak value, don't hide based on UI rules
  // The database triggers handle the strict consecutive logic correctly
  const displayStreak = streak; // Show actual database value
  
  console.log('[StreakBadge] Display decision:', {
    activeStreak,
    databaseStreak: streak,
    displayStreak,
    reasoning: 'Showing database value directly'
  });
  
  // Updated color system with firey glow effects
  const getStreakColors = (s: number, isActive: boolean) => {
    if (s === 0) {
      return { 
        backgroundColor: '#f8f9ff',
        borderColor: '#6b7280',
        textColor: '#6b7280',
        glowColor: '#6b7280'
      };
    }
    
    // Use firey red-orange/yellow glow for active streaks (distinct from fuzzy orange #d97706)
    if (isActive) {
      if (s >= 20) {
        return {
          backgroundColor: '#fef7ec', // Light orange background
          borderColor: '#dc2626', // Deep red for diamond-level streaks
          textColor: '#dc2626',
          glowColor: '#dc2626'
        };
      }
      if (s >= 10) {
        return {
          backgroundColor: '#fef7e6', // Light gold background (keep this one)
          borderColor: '#f59e0b', // Amber/gold (keep this one)
          textColor: '#f59e0b',
          glowColor: '#f59e0b'
        };
      }
      if (s >= 3) {
        return {
          backgroundColor: '#fef2f2', // Light red background
          borderColor: '#ef4444', // Red-orange for solid streaks
          textColor: '#ef4444',
          glowColor: '#ef4444'
        };
      }
      // Starting active streak - softer red-orange
      return {
        backgroundColor: '#fff7ed',
        borderColor: '#fb923c', // Soft orange (distinct from fuzzy #d97706)
        textColor: '#fb923c',
        glowColor: '#fb923c'
      };
    }
    
    // Inactive/dormant - muted colors but still show the number
    return {
      backgroundColor: '#f8f9ff',
      borderColor: '#9ca3af',
      textColor: '#9ca3af',
      glowColor: '#9ca3af'
    };
  };

  // Emoji for streaks
  const getStreakEmoji = (s: number) => {
    if (s === 0) return '💤'; // Sleeping/inactive
    if (s >= 20) return '💎'; // Diamond
    if (s >= 10) return '⭐'; // Gold star  
    if (s >= 6) return '🔥'; // Fire
    if (s >= 3) return '⚡'; // Lightning
    if (s >= 1) return '🔥'; // Fire for all active streaks
    return '💤'; // Sleeping fallback
  };

  const colors = getStreakColors(displayStreak, activeStreak);
  const emoji = getStreakEmoji(displayStreak);

  // Special milestone display for 10+ (only for active streaks)
  const isMilestone = displayStreak >= 10 && activeStreak;
  
  return (
    <>
      <div 
        className="streak-badge"
        onClick={() => setShowCalendar(true)}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        aria-label={
          displayStreak === 0 
            ? "No active streak - start building!" 
            : `Current streak: ${displayStreak} games${highestStreak ? `, personal best: ${highestStreak}` : ''}`
        }
        style={{
          backgroundColor: colors.backgroundColor,
          border: `2px solid ${colors.borderColor}`,  // Match TimerBadge border
          borderRadius: '2rem',
          padding: 'clamp(0.4rem, 1.5vw, 0.6rem) clamp(0.75rem, 3vw, 1.2rem)',  // Match TimerBadge padding
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'Libre Baskerville, Georgia, Times, serif',
          fontSize: 'clamp(0.85rem, 2.5vw, 1.1rem)',  // Match TimerBadge font
          fontWeight: 600,  // Match TimerBadge
          color: colors.textColor,
          // Match TimerBadge shadow style
          boxShadow: '0 3px 12px rgba(26, 35, 126, 0.2)',
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: '0.02em',
          minWidth: 'clamp(4.5rem, 12vw, 5.5rem)',  // Match TimerBadge minWidth
          textAlign: 'center',
          gap: '0.1rem',
          position: 'relative',
          overflow: 'hidden',
          cursor: 'pointer',
          userSelect: 'none',
          transition: 'all 0.2s ease-in-out',
          animation: isMilestone ? 'subtle-pulse 2s ease-in-out infinite' : undefined,
          transform: showTooltip ? 'scale(1.05)' : 'scale(1)',
          opacity: displayStreak === 0 ? 0.8 : 1
        }}
      >
        {/* Background sparkle effect for high streaks */}
        {displayStreak >= 15 && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'linear-gradient(45deg, transparent 48%, rgba(255,255,255,0.1) 49%, rgba(255,255,255,0.1) 51%, transparent 52%)',
              animation: 'sparkle 3s linear infinite',
              pointerEvents: 'none'
            }}
          />
        )}
        
        {/* Main streak display - just zzz emoji for 0 streak */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.3rem',
          fontSize: '1em'
        }}>
          {displayStreak === 0 ? (
            <span style={{ fontSize: '1.1em' }}>💤</span>
          ) : (
            <>
              <span style={{ fontSize: '1.1em' }}>
                {emoji}
              </span>
              <span style={{ 
                fontWeight: 800,
                letterSpacing: '0.02em'
              }}>
                {displayStreak}
              </span>
            </>
          )}
        </div>

        {/* Highest streak display - only for non-zero streaks */}
        {displayStreak > 0 && highestStreak && highestStreak > displayStreak && (
          <div style={{
            fontSize: 'clamp(0.65rem, 1.8vw, 0.75rem)',
            fontWeight: 500,
            color: `${colors.textColor}CC`,
            letterSpacing: '0.01em',
            lineHeight: '1'
          }}>
            Best: {highestStreak}
          </div>
        )}

        {/* Tooltip - clean, nearly transparent style */}
        {showTooltip && (
          <div style={{
            position: 'absolute',
            bottom: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: 'rgba(26, 35, 126, 0.9)',
            backdropFilter: 'blur(4px)',
            color: 'white',
            padding: '0.4rem 0.75rem',
            borderRadius: '0.375rem',
            fontSize: '0.75rem',
            fontWeight: 500,
            fontFamily: 'var(--font-primary)',
            whiteSpace: 'nowrap',
            marginBottom: '0.5rem',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
            zIndex: 10,
            letterSpacing: '0.01em'
          }}>
            Streak Counter
          </div>
        )}

        <style>{`
          @keyframes subtle-pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
          }
          
          @keyframes sparkle {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
          }
        `}</style>
      </div>

      {/* Calendar Modal */}
      <StreakCalendarModal
        open={showCalendar}
        onClose={() => setShowCalendar(false)}
        playerId={playerId}
        onSelectArchiveDate={onSelectArchiveDate}
      />
    </>
  );
}; 