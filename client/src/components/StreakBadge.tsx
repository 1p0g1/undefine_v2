import React, { useState } from 'react';
import { StreakCalendarModal } from './StreakCalendarModal';

interface StreakBadgeProps {
  streak: number;
  highestStreak?: number;
  lastWinDate?: string | null;
  playerId?: string;
  onSelectArchiveDate?: (date: string) => void;
}

export const StreakBadge: React.FC<StreakBadgeProps> = ({ 
  streak, 
  highestStreak, 
  lastWinDate,
  playerId = 'default-player',
  onSelectArchiveDate
}) => {
  const [showCalendar, setShowCalendar] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  // Calculate if streak is active (won today or yesterday)
  const isActiveStreak = () => {
    if (!lastWinDate || streak === 0) return false;
    
    const lastWin = new Date(lastWinDate);
    const today = new Date();
    const daysDiff = Math.floor((today.getTime() - lastWin.getTime()) / (1000 * 60 * 60 * 24));
    
    return daysDiff <= 1;
  };

  const activeStreak = isActiveStreak();
  const displayStreak = streak;

  // Fire intensity based on streak level
  const getFireIntensity = (s: number, isActive: boolean) => {
    if (!isActive || s === 0) return 'none';
    if (s >= 20) return 'inferno';   // 🔥🔥🔥 Maximum flames
    if (s >= 10) return 'blazing';   // 🔥🔥 Strong flames
    if (s >= 5) return 'burning';    // 🔥 Medium flames
    if (s >= 3) return 'warming';    // Subtle glow
    return 'ember';                  // Very subtle
  };

  const fireIntensity = getFireIntensity(displayStreak, activeStreak);
  
  // Get fire colors based on intensity
  const getFireColors = () => {
    switch (fireIntensity) {
      case 'inferno':
        return { primary: '#dc2626', secondary: '#f97316', glow: 'rgba(220, 38, 38, 0.6)' };
      case 'blazing':
        return { primary: '#f59e0b', secondary: '#fbbf24', glow: 'rgba(245, 158, 11, 0.5)' };
      case 'burning':
        return { primary: '#f97316', secondary: '#fb923c', glow: 'rgba(249, 115, 22, 0.4)' };
      case 'warming':
        return { primary: '#fb923c', secondary: '#fdba74', glow: 'rgba(251, 146, 60, 0.3)' };
      case 'ember':
        return { primary: '#fdba74', secondary: '#fed7aa', glow: 'rgba(253, 186, 116, 0.2)' };
      default:
        return { primary: '#1a237e', secondary: '#1a237e', glow: 'transparent' };
    }
  };

  const fireColors = getFireColors();
  const hasFireEffect = fireIntensity !== 'none';
  
  return (
    <>
      <style>{`
        @keyframes flicker {
          0%, 100% { 
            opacity: 1;
            transform: scale(1) translateY(0);
          }
          25% { 
            opacity: 0.9;
            transform: scale(1.02) translateY(-1px);
          }
          50% { 
            opacity: 1;
            transform: scale(0.98) translateY(0);
          }
          75% { 
            opacity: 0.95;
            transform: scale(1.01) translateY(-0.5px);
          }
        }
        
        @keyframes pulse-glow {
          0%, 100% { 
            box-shadow: 0 0 8px var(--glow-color), 0 3px 12px rgba(26, 35, 126, 0.2);
          }
          50% { 
            box-shadow: 0 0 16px var(--glow-color), 0 0 24px var(--glow-color), 0 3px 12px rgba(26, 35, 126, 0.2);
          }
        }
        
        @keyframes flame-dance {
          0%, 100% { 
            text-shadow: 0 0 4px var(--flame-primary), 0 0 8px var(--flame-secondary);
          }
          33% { 
            text-shadow: 0 -2px 6px var(--flame-primary), 0 -4px 12px var(--flame-secondary);
          }
          66% { 
            text-shadow: 0 -1px 5px var(--flame-primary), 0 -2px 10px var(--flame-secondary);
          }
        }
      `}</style>
      
      <div 
        className="streak-badge"
        onClick={() => setShowCalendar(true)}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        aria-label={
          displayStreak === 0 
            ? "No active streak" 
            : `Streak: ${displayStreak}${highestStreak && highestStreak > displayStreak ? ` (best: ${highestStreak})` : ''}`
        }
        style={{
          // Match TimerBadge exactly
          background: '#faf7f2',
          border: '2px solid #1a237e',
          borderRadius: '2rem',
          padding: '0 clamp(0.75rem, 3vw, 1.2rem)',
          height: 'clamp(2.6rem, 8vw, 3.1rem)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'Libre Baskerville, Georgia, Times, serif',
          fontSize: 'clamp(0.85rem, 2.5vw, 1.1rem)',
          fontWeight: 600,
          color: hasFireEffect ? fireColors.primary : '#1a237e',
          boxShadow: hasFireEffect 
            ? `0 0 12px ${fireColors.glow}, 0 3px 12px rgba(26, 35, 126, 0.2)`
            : '0 3px 12px rgba(26, 35, 126, 0.2)',
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: '0.02em',
          minWidth: 'clamp(4.5rem, 12vw, 5.5rem)',
          textAlign: 'center',
          position: 'relative',
          cursor: 'pointer',
          userSelect: 'none',
          transition: 'all 0.3s ease-in-out',
          lineHeight: 1,
          boxSizing: 'border-box',
          // CSS custom properties for animations
          '--glow-color': fireColors.glow,
          '--flame-primary': fireColors.primary,
          '--flame-secondary': fireColors.secondary,
          animation: hasFireEffect ? 'pulse-glow 2s ease-in-out infinite' : undefined
        } as React.CSSProperties}
      >
        {/* Main streak display */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.25rem',
          animation: hasFireEffect ? 'flicker 1.5s ease-in-out infinite' : undefined
        }}>
          {displayStreak === 0 ? (
            <span style={{ 
              fontSize: '1.1em',
              opacity: 0.6
            }}>
              💤
            </span>
          ) : (
            <>
              <span style={{ 
                fontSize: '1.1em',
                animation: hasFireEffect ? 'flame-dance 0.8s ease-in-out infinite' : undefined,
                filter: hasFireEffect ? 'drop-shadow(0 0 2px rgba(0,0,0,0.3))' : undefined
              }}>
                🔥
              </span>
              <span style={{ 
                fontWeight: 700,
                letterSpacing: '0.02em',
                color: hasFireEffect ? fireColors.primary : '#1a237e',
                textShadow: hasFireEffect 
                  ? `0 0 4px ${fireColors.secondary}` 
                  : undefined
              }}>
                {displayStreak}
              </span>
            </>
          )}
        </div>

        {/* Tooltip */}
        {showTooltip && (
          <div style={{
            position: 'absolute',
            bottom: 'calc(100% + 0.35rem)',
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
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
            zIndex: 1000,
            letterSpacing: '0.01em',
            pointerEvents: 'none'
          }}>
            {displayStreak === 0 
              ? 'Start your streak!' 
              : `${displayStreak} day streak${highestStreak && highestStreak > displayStreak ? ` • Best: ${highestStreak}` : ''}`
            }
          </div>
        )}
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
