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
          width: '5.5rem', // Slightly larger than 3.5rem diamond to envelop
          height: '5.5rem' 
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

  const containerStyle = position === 'absolute' ? {
    position: 'absolute' as const,
    top: '50%', // Keep vertical center
    left: '105%', // Systematic adjustment: halfway between 90% (too left) and 120% (too right)
    transform: 'translate(-50%, -50%)', // Center around diamond
    ...sizeConfig,
    zIndex: 0, // Behind diamond but visible  
    pointerEvents: 'auto' as const, // Enable hover
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
        {/* Sequential 7-Flame Cycle */}
        <img 
          src="/flame1.svg"
          alt=""
          className="flame-svg flame-1"
          style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            animation: 'flame-sequence 2.1s infinite',
            animationDelay: '0s'
          }}
        />
        
        <img 
          src="/flame2.svg"
          alt=""
          className="flame-svg flame-2"
          style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            animation: 'flame-sequence 2.1s infinite',
            animationDelay: '0.3s'
          }}
        />
        
        <img 
          src="/flame3.svg"
          alt=""  
          className="flame-svg flame-3"
          style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            animation: 'flame-sequence 2.1s infinite',
            animationDelay: '0.6s'
          }}
        />
        
        <img 
          src="/flame4.svg"
          alt=""
          className="flame-svg flame-4"
          style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            animation: 'flame-sequence 2.1s infinite',
            animationDelay: '0.9s'
          }}
        />
        
        <img 
          src="/flame5.svg"
          alt=""
          className="flame-svg flame-5"
          style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            animation: 'flame-sequence 2.1s infinite',
            animationDelay: '1.2s'
          }}
        />
        
        <img 
          src="/flame6.svg"
          alt=""
          className="flame-svg flame-6"
          style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            animation: 'flame-sequence 2.1s infinite',
            animationDelay: '1.5s'
          }}
        />
        
        <img 
          src="/flame7.png"
          alt=""
          className="flame-svg flame-7"
          style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            animation: 'flame-sequence 2.1s infinite',
            animationDelay: '1.8s'
          }}
        />
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
              transform: translateX(-50%) scale(1);
            }
            50% { 
              box-shadow: 0 4px 8px rgba(220, 38, 38, 0.4), 0 0 25px rgba(239, 68, 68, 0.5);
              transform: translateX(-50%) scale(1.02);
            }
            100% { 
              box-shadow: 0 4px 6px rgba(220, 38, 38, 0.3), 0 0 30px rgba(239, 68, 68, 0.6);
              transform: translateX(-50%) scale(1.01);
            }
          }
        `}
      </style>
    </div>
  );
}; 