import React from 'react';

interface StreakBadgeProps {
  streak: number;
  highestStreak?: number;
  lastWinDate?: string | null; // Update to match API response type
}

export const StreakBadge: React.FC<StreakBadgeProps> = ({ streak, highestStreak, lastWinDate }) => {
  // Calculate streak status - active, dormant, or none
  const getStreakStatus = () => {
    if (streak === 0) return 'none';
    if (!lastWinDate) return 'none';
    
    const lastWin = new Date(lastWinDate);
    const today = new Date();
    const daysDiff = Math.floor((today.getTime() - lastWin.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDiff <= 3) return 'active';    // Recent play - show as fully active
    if (daysDiff <= 7) return 'dormant';   // Within tolerance - show as dormant
    return 'none';                         // Too old - streak likely broken in database
  };

  const streakStatus = getStreakStatus();
  const displayStreak = streakStatus === 'none' ? 0 : streak;
  
  // ALWAYS show badge to encourage streak building
  // Don't return null - always visible for engagement

  // Color progression based on streak length and status
  const getStreakColor = (s: number, status: string) => {
    if (s === 0) return { bg: 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)', border: '#374151', shadow: 'rgba(55, 65, 81, 0.3)' }; // Gray for no streak
    
    // Base colors for active streaks
    let baseColors;
    if (s >= 20) baseColors = { bg: 'linear-gradient(135deg, #8b5cf6 0%, #a855f7 50%, #ec4899 100%)', border: '#8b5cf6', shadow: 'rgba(139, 92, 246, 0.4)' }; // Purple/Pink (Diamond)
    else if (s >= 10) baseColors = { bg: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)', border: '#d97706', shadow: 'rgba(217, 119, 6, 0.4)' }; // Gold
    else if (s >= 6) baseColors = { bg: 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)', border: '#a16207', shadow: 'rgba(161, 98, 7, 0.3)' }; // Yellow
    else if (s >= 3) baseColors = { bg: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)', border: '#c2410c', shadow: 'rgba(194, 65, 12, 0.3)' }; // Orange
    else if (s >= 1) baseColors = { bg: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', border: '#b91c1c', shadow: 'rgba(185, 28, 28, 0.3)' }; // Red
    else baseColors = { bg: 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)', border: '#374151', shadow: 'rgba(55, 65, 81, 0.3)' }; // Gray fallback
    
    // Adjust for dormant state (muted colors)
    if (status === 'dormant') {
      return {
        bg: baseColors.bg.replace(/0%/g, '0%, rgba(0,0,0,0.2) 20%'), // Add overlay for muted effect
        border: baseColors.border + '80', // Add transparency
        shadow: baseColors.shadow.replace(/0\.\d+/g, '0.2') // Reduce shadow intensity
      };
    }
    
    return baseColors;
  };

  // Emoji for streaks with status awareness
  const getStreakEmoji = (s: number, status: string) => {
    if (s === 0) return '💤'; // Sleeping/inactive
    if (status === 'dormant') return '⏸️'; // Paused/dormant
    if (s >= 20) return '💎'; // Diamond
    if (s >= 10) return '⭐'; // Gold star  
    if (s >= 6) return '🟡'; // Yellow
    if (s >= 3) return '🟠'; // Orange
    if (s >= 1) return '🔥'; // Fire
    return '💤'; // Sleeping fallback
  };

  // Message for different streak states
  const getStreakMessage = (s: number, status: string) => {
    if (s === 0) return "Start your streak!";
    if (status === 'dormant') {
      if (s >= 15) return `${s}-game streak waiting!`;
      if (s >= 10) return "Streak on pause!";
      if (s >= 5) return "Come back soon!";
      return "Keep it alive!";
    }
    if (s >= 20) return "LEGEND!";
    if (s >= 15) return "AMAZING!";
    if (s >= 10) return "ON FIRE!";
    if (s >= 5) return "Great streak!";
    if (s >= 3) return "Building up!";
    if (s === 1) return "First win!";
    return "Keep going!";
  };

  const colors = getStreakColor(displayStreak, streakStatus);
  const emoji = getStreakEmoji(displayStreak, streakStatus);
  const message = getStreakMessage(displayStreak, streakStatus);

  // Special milestone display for 10+ (only for active streaks)
  const isMilestone = displayStreak >= 10 && streakStatus === 'active';
  
  return (
    <div 
      className="streak-badge"
      aria-label={
        streakStatus === 'none' 
          ? "No active streak - start building!" 
          : streakStatus === 'dormant'
          ? `Dormant winning streak: ${displayStreak} games (play soon to keep it alive)${highestStreak ? `, personal best: ${highestStreak}` : ''}`
          : `Active winning streak: ${displayStreak} games${highestStreak ? `, personal best: ${highestStreak}` : ''}`
      }
      title={
        streakStatus === 'none' 
          ? "Win games to start your streak!" 
          : streakStatus === 'dormant'
          ? `${displayStreak}-game streak waiting! Play within 7 days of last win to maintain it.${highestStreak && displayStreak < highestStreak ? ` (Personal best: ${highestStreak})` : ''}`
          : `${displayStreak}-game active winning streak!${highestStreak && displayStreak < highestStreak ? ` (Personal best: ${highestStreak})` : ''}`
      }
      style={{
        background: colors.bg,
        border: `2px solid ${colors.border}`,
        borderRadius: '2rem',
        padding: 'clamp(0.35rem, 1.2vw, 0.5rem) clamp(0.65rem, 2.5vw, 1rem)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'Libre Baskerville, Georgia, Times, serif',
        fontSize: 'clamp(0.8rem, 2.3vw, 1rem)',
        fontWeight: 700,
        color: 'white',
        textShadow: '0 1px 3px rgba(0,0,0,0.4)',
        boxShadow: `0 3px 12px ${colors.shadow}, 0 1px 3px rgba(0,0,0,0.2)`,
        fontVariantNumeric: 'tabular-nums',
        letterSpacing: '0.02em',
        minWidth: 'clamp(4rem, 10vw, 5rem)',
        textAlign: 'center',
        gap: '0.15rem',
        position: 'relative',
        overflow: 'hidden',
        cursor: 'default',
        userSelect: 'none',
        // Subtle pulse for active streaks
        animation: isMilestone ? 'subtle-pulse 2s ease-in-out infinite' : undefined,
        // Opacity based on streak status
        opacity: streakStatus === 'none' ? 0.8 : streakStatus === 'dormant' ? 0.9 : 1
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
      
      {/* Main streak display */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '0.3rem',
        fontSize: '1em'
      }}>
        <span style={{ fontSize: '1.1em' }}>
          {emoji}
        </span>
        <span style={{ 
          fontWeight: 800,
          letterSpacing: '0.02em'
        }}>
          {displayStreak}
        </span>
      </div>

      {/* Highest streak display (smaller text) OR motivational message for 0 streak */}
      {displayStreak === 0 ? (
        <div style={{
          fontSize: 'clamp(0.6rem, 1.6vw, 0.7rem)',
          fontWeight: 500,
          color: 'rgba(255, 255, 255, 0.9)',
          textShadow: '0 1px 2px rgba(0,0,0,0.3)',
          letterSpacing: '0.01em',
          lineHeight: '1'
        }}>
          Start now!
        </div>
      ) : (
        highestStreak && highestStreak > displayStreak && (
          <div style={{
            fontSize: 'clamp(0.65rem, 1.8vw, 0.75rem)',
            fontWeight: 500,
            color: 'rgba(255, 255, 255, 0.8)',
            textShadow: '0 1px 2px rgba(0,0,0,0.3)',
            letterSpacing: '0.01em',
            lineHeight: '1'
          }}>
            Best: {highestStreak}
          </div>
        )
      )}

      {/* Active streak indicator dot (only for active streaks) */}
      {streakStatus === 'active' && (
        <div style={{
          position: 'absolute',
          top: '0.3rem',
          right: '0.3rem',
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          background: '#22c55e',
          boxShadow: '0 0 4px rgba(34, 197, 94, 0.8)',
          animation: 'active-pulse 1.5s ease-in-out infinite'
        }} />
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
        
        @keyframes active-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.3); }
        }
      `}</style>
    </div>
  );
}; 