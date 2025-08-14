import React, { useState } from 'react';

interface FlameAnimationProps {
  streak: number;
  highestStreak?: number;
  lastWinDate?: string | null;
  size?: 'small' | 'medium' | 'large';
  position?: 'inline' | 'absolute';
}

export const FlameAnimation: React.FC<FlameAnimationProps> = ({ 
  streak, 
  highestStreak = 0,
  lastWinDate, 
  size = 'small',
  position = 'inline' 
}) => {
  // Hover state for streak tooltip
  const [showTooltip, setShowTooltip] = useState(false);
  
  // Determine if flames should be shown (same logic as StreakBadge and App.tsx)
  const shouldShowFlames = () => {
    // Must have a streak of at least 1
    if (streak === 0) return false;
    
    // Check if streak is active
    if (!lastWinDate) return false;
    
    const lastWin = new Date(lastWinDate);
    const today = new Date();
    const daysDiff = Math.floor((today.getTime() - lastWin.getTime()) / (1000 * 60 * 60 * 24));
    
    // Active if won within 3 days (matching StreakBadge logic)
    return daysDiff <= 3;
  };

  const showFlames = shouldShowFlames();
  
  // Hover handlers
  const handleMouseEnter = () => {
    setShowTooltip(true);
  };

  const handleMouseLeave = () => {
    setShowTooltip(false);
  };

  // Size configurations
  const getSizeConfig = () => {
    switch (size) {
      case 'large':
        return {
          width: '6.75rem',
          height: '6.75rem'
        };
      case 'medium':
        return {
          width: 'clamp(3rem, 8vw, 4rem)',
          height: 'clamp(3rem, 8vw, 4rem)'
        };
      case 'small':
      default:
        return {
          width: 'clamp(2rem, 5vw, 2.5rem)',
          height: 'clamp(2rem, 5vw, 2.5rem)'
        };
    }
  };

  const sizeConfig = getSizeConfig();

  // Don't render if no flames should be shown
  if (!showFlames) {
    return null;
  }

  // Tunable horizontal offset (as % of container width) to compensate for SVG visual center
  const flameXOffsetPercent = 46; // keep visual alignment
  const flameYOffsetPercent = -5; // tiny upward nudge for larger size

  const containerStyle = position === 'absolute' ? {
    position: 'absolute' as const,
    top: '50%',
    left: '50%',
    transform: `translate(calc(-50% + ${flameXOffsetPercent}%), calc(-50% + ${flameYOffsetPercent}%))`,
    ...sizeConfig,
    zIndex: 0,
    pointerEvents: 'auto' as const,
    overflow: 'visible' as const,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  } : {
    ...sizeConfig,
    position: 'relative' as const,
    display: 'inline-block',
    pointerEvents: 'auto' as const, // Enable hover
    overflow: 'visible' as const,
    cursor: 'pointer'
  };

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <div 
        className="flame-animation-container"
        style={containerStyle}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Custom cycle: 4→5→6→3→2→1→7→1→2→3→6→5→4 then loop */}
        {/* Revert to original ordered 1..7 sequential with fixed 2.1s period to stabilize */}
        <img className="flame-svg" src="/flame1.svg" alt="" style={{ position:'absolute', width:'100%', height:'100%', objectFit:'contain', opacity: 0, animation:'flame-sequence 2.1s infinite', animationDelay:'0s' }} />
        <img className="flame-svg" src="/flame2.svg" alt="" style={{ position:'absolute', width:'100%', height:'100%', objectFit:'contain', opacity: 0, animation:'flame-sequence 2.1s infinite', animationDelay:'0.3s' }} />
        <img className="flame-svg" src="/flame3.svg" alt="" style={{ position:'absolute', width:'100%', height:'100%', objectFit:'contain', opacity: 0, animation:'flame-sequence 2.1s infinite', animationDelay:'0.6s' }} />
        <img className="flame-svg" src="/flame4.svg" alt="" style={{ position:'absolute', width:'100%', height:'100%', objectFit:'contain', opacity: 0, animation:'flame-sequence 2.1s infinite', animationDelay:'0.9s' }} />
        <img className="flame-svg" src="/flame5.svg" alt="" style={{ position:'absolute', width:'100%', height:'100%', objectFit:'contain', opacity: 0, animation:'flame-sequence 2.1s infinite', animationDelay:'1.2s' }} />
        <img className="flame-svg" src="/flame6.svg" alt="" style={{ position:'absolute', width:'100%', height:'100%', objectFit:'contain', opacity: 0, animation:'flame-sequence 2.1s infinite', animationDelay:'1.5s' }} />
        <img className="flame-svg" src="/flame7.png" alt="" style={{ position:'absolute', width:'100%', height:'100%', objectFit:'contain', opacity: 0, animation:'flame-sequence 2.1s infinite', animationDelay:'1.8s' }} />
      </div>

      {/* 🔥 Fire-Styled Streak Tooltip */}
      {showTooltip && (
        <div style={{
          position: 'absolute',
          bottom: '120%', // Above the flame animation
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: '#dc2626', // Fire red background
          background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 50%, #f59e0b 100%)', // Fire gradient
          color: 'white',
          padding: '0.5rem 0.75rem',
          borderRadius: '0.5rem',
          fontSize: '0.875rem',
          fontWeight: '600',
          whiteSpace: 'nowrap',
          zIndex: 1000,
          boxShadow: '0 4px 6px rgba(220, 38, 38, 0.3), 0 0 20px rgba(239, 68, 68, 0.4)', // Fire glow
          border: '1px solid rgba(251, 146, 60, 0.5)',
          animation: 'fire-flicker 0.5s ease-in-out infinite alternate', // Fire flicker effect
          fontFamily: 'inherit'
        }}>
          Current Streak: {streak}, Best Streak: {highestStreak}
        </div>
      )}
      
      {/* Fire Flicker Animation */}
      <style>
        {`
          @keyframes fire-flicker {
            0% { 
              box-shadow: 0 4px 6px rgba(220, 38, 38, 0.3), 0 0 20px rgba(239, 68, 68, 0.4);
              transform: translateX(-50%) translateY(0) scale(1);
            }
            50% { 
              box-shadow: 0 4px 8px rgba(220, 38, 38, 0.4), 0 0 25px rgba(239, 68, 68, 0.5);
              transform: translateX(-50%) translateY(-2%) scale(1.02);
            }
            100% { 
              box-shadow: 0 4px 6px rgba(220, 38, 38, 0.3), 0 0 30px rgba(239, 68, 68, 0.6);
              transform: translateX(-50%) translateY(-1%) scale(1.01);
            }
          }
          .flame-svg { opacity: 0; }
        `}
      </style>
    </div>
  );
}; 