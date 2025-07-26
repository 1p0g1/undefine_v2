import React, { useState } from 'react';
import { StreakCalendarModal } from './StreakCalendarModal';

interface StreakBadgeProps {
  streak: number;
  highestStreak?: number;
  lastWinDate?: string | null;
  playerId?: string; // Add playerId for calendar modal
}

export const StreakBadge: React.FC<StreakBadgeProps> = ({ 
  streak, 
  highestStreak, 
  lastWinDate,
  playerId = 'default-player' // fallback value
}) => {
  const [showCalendar, setShowCalendar] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  // Calculate if streak is active (won today or yesterday) - STRICT consecutive system
  const isActiveStreak = () => {
    if (!lastWinDate || streak === 0) return false;
    
    const lastWin = new Date(lastWinDate);
    const today = new Date();
    const daysDiff = Math.floor((today.getTime() - lastWin.getTime()) / (1000 * 60 * 60 * 24));
    
    return daysDiff <= 1; // Active only if won today or yesterday (strict consecutive)
  };

  const activeStreak = isActiveStreak();
  const displayStreak = activeStreak ? streak : 0;
  
  // Updated color system with glow effects like Un diamond
  const getStreakColors = (s: number, isActive: boolean) => {
    if (s === 0) {
      return { 
        backgroundColor: '#f8f9ff',
        borderColor: '#6b7280',
        textColor: '#6b7280',
        glowColor: '#6b7280'
      };
    }
    
    // Use purple glow for active streaks (instead of red)
    if (isActive) {
      if (s >= 20) {
        return {
          backgroundColor: '#faf5ff', // Light purple background
          borderColor: '#8b5cf6',
          textColor: '#8b5cf6',
          glowColor: '#8b5cf6'
        };
      }
      if (s >= 10) {
        return {
          backgroundColor: '#fef7e6', // Light gold background
          borderColor: '#f59e0b',
          textColor: '#f59e0b',
          glowColor: '#f59e0b'
        };
      }
      if (s >= 3) {
        return {
          backgroundColor: '#faf5ff', // Light purple background
          borderColor: '#a855f7',
          textColor: '#a855f7',
          glowColor: '#a855f7'
        };
      }
      // Starting active streak - softer purple
      return {
        backgroundColor: '#faf5ff',
        borderColor: '#c084fc',
        textColor: '#c084fc',
        glowColor: '#c084fc'
      };
    }
    
    // Inactive/dormant - muted colors
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
    if (s >= 1) return '🟣'; // Purple circle for active streaks
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
            : `Active winning streak: ${displayStreak} games${highestStreak ? `, personal best: ${highestStreak}` : ''}`
        }
        style={{
          backgroundColor: colors.backgroundColor,
          border: `3px solid ${colors.borderColor}`,
          borderRadius: '2rem',
          padding: 'clamp(0.35rem, 1.2vw, 0.5rem) clamp(0.65rem, 2.5vw, 1rem)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'Libre Baskerville, Georgia, Times, serif',
          fontSize: 'clamp(0.8rem, 2.3vw, 1rem)',
          fontWeight: 700,
          color: colors.textColor,
          textShadow: '0 1px 3px rgba(0,0,0,0.2)',
          // Updated glow effect like Un diamond
          boxShadow: `0 4px 12px ${colors.glowColor}26, 0 0 0 1px ${colors.glowColor}1A`,
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: '0.02em',
          minWidth: 'clamp(4rem, 10vw, 5rem)',
          textAlign: 'center',
          gap: '0.15rem',
          position: 'relative',
          overflow: 'hidden',
          cursor: 'pointer', // Changed to pointer for clickability
          userSelect: 'none',
          transition: 'all 0.2s ease-in-out', // Smooth transitions like Un diamond
          // Subtle pulse for active streaks
          animation: isMilestone ? 'subtle-pulse 2s ease-in-out infinite' : undefined,
          // Hover effect
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
            color: 'rgba(107, 114, 128, 0.9)',
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
              color: `${colors.textColor}CC`, // Add transparency to the text color
              letterSpacing: '0.01em',
              lineHeight: '1'
            }}>
              Best: {highestStreak}
            </div>
          )
        )}

        {/* Tooltip */}
        {showTooltip && (
          <div style={{
            position: 'absolute',
            bottom: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: '#1f2937',
            color: 'white',
            padding: '0.5rem 0.75rem',
            borderRadius: '0.5rem',
            fontSize: '0.8rem',
            whiteSpace: 'nowrap',
            marginBottom: '0.5rem',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
            zIndex: 10
          }}>
            Your current streak
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
      />
    </>
  );
}; 