import React, { useState } from 'react';
import { getUnDiamondColor } from '../utils/themeMessages';

interface UnPrefixProps {
  scaled?: boolean; // For use in GameSummaryModal with transform scale
  onClick?: () => void;
  gameComplete?: boolean; // NEW: To detect when game is finished
  showCallToAction?: boolean; // NEW: Control whether to show '?' call-to-action
  // Theme guess color-coding props
  themeGuessData?: {
    hasGuessedToday: boolean;
    isCorrectGuess: boolean;
    confidencePercentage: number | null;
  };
}

export const UnPrefix: React.FC<UnPrefixProps> = ({ 
  scaled = false, 
  onClick, 
  gameComplete = false, // NEW: Default to false
  showCallToAction = true, // NEW: Default to true for backwards compatibility
  themeGuessData 
}) => {
  // NEW: Hover state for tooltip
  const [showTooltip, setShowTooltip] = useState(false);
  
  // Make UN diamond slightly larger than DEFINE boxes but more mobile-friendly
  const baseSize = scaled ? 'clamp(2.6rem, 7vw, 3.0rem)' : 'clamp(2.8rem, 7.5vw, 3.2rem)';
  
  // Always show 'Un·' text (removed '?' call-to-action)
  const displayText = 'Un·';
  
  // Standard styling for 'Un·'
  const textStyling = {
    fontStyle: 'italic' as const,
    fontSize: scaled ? 'clamp(1.1rem, 3.2vw, 1.4rem)' : 'clamp(1.2rem, 3.5vw, 1.5rem)',
    fontWeight: 800
  };
  
  // Determine if diamond should pulsate (game complete + theme not guessed)
  const shouldPulsate = showCallToAction && gameComplete && (!themeGuessData?.hasGuessedToday);
  
  // Determine diamond color based on theme guess results
  const getDiamondColors = () => {
    // Purple styling for call-to-action (game complete + theme not guessed)
    if (shouldPulsate) {
      return {
        backgroundColor: '#e0e7ff', // Light purple background
        borderColor: '#8b5cf6', // Purple border
        textColor: '#8b5cf6', // Purple text (not white, keep 'Un·' visible)
        glowColor: '#8b5cf6' // Purple glow
      };
    }
    
    // Theme-based coloring for 'Un·' (existing logic)
    if (!themeGuessData?.hasGuessedToday) {
      // Default neutral state
      return {
        backgroundColor: '#f8fafc',
        borderColor: '#64748b', 
        textColor: '#1e293b',
        glowColor: '#64748b'
      };
    }

    const { isCorrectGuess, confidencePercentage } = themeGuessData;
    
    // FIXED LOGIC: Check confidence first, THEN isCorrectGuess for override
    // This ensures 100% always shows diamond blue with glisten effects
    
    // 💎 DIAMOND BLUE for perfect 100% match - with glisten effects!
    if (confidencePercentage === 100) {
      return {
        backgroundColor: '#dbeafe', // Light diamond blue background
        borderColor: '#3b82f6', // Bright blue border
        textColor: '#1e40af', // Deep blue text
        glowColor: '#60a5fa', // Bright blue glow
        isDiamond: true // Special flag for extra effects
      };
    }
    
    // 🟢 GREEN for correct answers OR high confidence (85%+)
    if (isCorrectGuess || (confidencePercentage !== null && confidencePercentage >= 85)) {
      return {
        backgroundColor: '#f0fdf4', // Light green background (solid)
        borderColor: '#22c55e',
        textColor: '#15803d',
        glowColor: '#22c55e'
      };
    }
    
    // 🟠 ORANGE for medium confidence (70-84%)
    if (confidencePercentage !== null && confidencePercentage >= 70) {
      return {
        backgroundColor: '#fff7ed', // Light orange background (solid)
        borderColor: '#f97316',
        textColor: '#ea580c',
        glowColor: '#f97316'
      };
    }
    
    // 🔴 RED for low confidence/incorrect
    return {
      backgroundColor: '#fef2f2', // Light red background (solid)
      borderColor: '#ef4444',
      textColor: '#dc2626',
      glowColor: '#ef4444'
    };
  };

  const colors = getDiamondColors();
  const isPerfectMatch = (colors as any).isDiamond === true;
  
  const containerStyle = {
    width: baseSize,
    height: baseSize,
    borderRadius: '0.5rem',
    backgroundColor: colors.backgroundColor,
    border: `3px solid ${colors.borderColor}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'var(--font-primary)',
    fontStyle: 'italic',
    fontWeight: 800,
    color: colors.textColor,
    fontSize: scaled ? 'clamp(1.1rem, 3.2vw, 1.4rem)' : 'clamp(1.2rem, 3.5vw, 1.5rem)',
    position: 'relative' as const,
    flexShrink: 0,
    aspectRatio: '1 / 1' as const,
    // Transform to diamond shape - base 45 degrees only
    transform: scaled 
      ? `rotate(45deg) scale(0.9)` 
      : `rotate(45deg)`,
    // Enhanced diamond effects for perfect matches
    boxShadow: isPerfectMatch 
      ? `0 0 20px ${colors.glowColor}66, 0 0 40px ${colors.glowColor}33, 0 4px 12px ${colors.borderColor}40, inset 0 0 10px ${colors.glowColor}20`
      : `0 4px 12px ${colors.borderColor}26, 0 0 0 1px ${colors.borderColor}1A`,
    transition: 'all 0.3s ease-in-out', // Slightly longer for rotation animation
    // Add glisten animation for perfect matches, pulsate for call-to-action
    animation: isPerfectMatch 
      ? 'diamondGlisten 2s ease-in-out infinite' 
      : shouldPulsate ? 'pulsate 2s ease-in-out infinite' : 'none',
    // Add pointer cursor when clickable
    cursor: onClick ? 'pointer' : 'default',
    boxSizing: 'border-box' as const
  };

  const handleClick = () => {
    if (onClick) {
      onClick();
    }
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    setShowTooltip(true); // Show tooltip on hover
    if (onClick) {
      // Hover effects with scale only (no rotation change)
      e.currentTarget.style.transform = scaled 
        ? `rotate(45deg) scale(0.93)` 
        : `rotate(45deg) scale(1.03)`;
      
      // Enhanced hover effects for diamond state
      if (isPerfectMatch) {
        e.currentTarget.style.boxShadow = `0 0 35px ${colors.glowColor}80, 0 0 70px ${colors.glowColor}50, 0 6px 20px ${colors.borderColor}60, inset 0 0 20px ${colors.glowColor}30`;
        e.currentTarget.style.filter = 'brightness(1.3)';
      } else {
        e.currentTarget.style.boxShadow = `0 4px 12px ${colors.borderColor}33, 0 0 0 2px ${colors.borderColor}1F`;
      }
    }
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    setShowTooltip(false); // Hide tooltip on leave
    if (onClick) {
      // Reset to base transform (no rotation change)
      e.currentTarget.style.transform = scaled 
        ? `rotate(45deg) scale(0.9)` 
        : `rotate(45deg)`;
      
      // Reset to base shadow (diamond animation will continue)
      if (isPerfectMatch) {
        e.currentTarget.style.boxShadow = `0 0 20px ${colors.glowColor}66, 0 0 40px ${colors.glowColor}33, 0 4px 12px ${colors.borderColor}40, inset 0 0 10px ${colors.glowColor}20`;
        e.currentTarget.style.filter = 'brightness(1)';
      } else {
        e.currentTarget.style.boxShadow = `0 4px 12px ${colors.borderColor}26, 0 0 0 1px ${colors.borderColor}1A`;
      }
    }
  };

  return (
    <>
      {/* CSS keyframes for animations */}
      <style>
        {`
          @keyframes pulsate {
            0%, 100% {
              opacity: 1;
              box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3), 0 0 0 2px rgba(139, 92, 246, 0.2);
            }
            50% {
              opacity: 0.7;
              box-shadow: 0 12px 32px rgba(139, 92, 246, 0.6), 0 0 0 4px rgba(139, 92, 246, 0.5);
            }
          }
          
          @keyframes diamondGlisten {
            0%, 100% {
              box-shadow: 0 0 20px rgba(59, 130, 246, 0.4), 
                          0 0 40px rgba(59, 130, 246, 0.2), 
                          0 4px 12px rgba(59, 130, 246, 0.25),
                          inset 0 0 10px rgba(96, 165, 250, 0.15);
              filter: brightness(1);
            }
            25% {
              box-shadow: 0 0 30px rgba(59, 130, 246, 0.6), 
                          0 0 60px rgba(59, 130, 246, 0.3), 
                          0 6px 20px rgba(59, 130, 246, 0.4),
                          inset 0 0 20px rgba(96, 165, 250, 0.3),
                          inset -5px -5px 15px rgba(255, 255, 255, 0.4);
              filter: brightness(1.15);
            }
            50% {
              box-shadow: 0 0 40px rgba(59, 130, 246, 0.7), 
                          0 0 80px rgba(59, 130, 246, 0.4), 
                          0 8px 24px rgba(59, 130, 246, 0.5),
                          inset 0 0 25px rgba(96, 165, 250, 0.4),
                          inset -8px -8px 20px rgba(255, 255, 255, 0.5),
                          inset 8px 8px 20px rgba(59, 130, 246, 0.2);
              filter: brightness(1.25);
            }
            75% {
              box-shadow: 0 0 30px rgba(59, 130, 246, 0.6), 
                          0 0 60px rgba(59, 130, 246, 0.3), 
                          0 6px 20px rgba(59, 130, 246, 0.4),
                          inset 0 0 20px rgba(96, 165, 250, 0.3),
                          inset 5px 5px 15px rgba(255, 255, 255, 0.4);
              filter: brightness(1.15);
            }
          }
        `}
      </style>
      
      <div style={{ position: 'relative', display: 'inline-block' }}>
        <div 
          style={containerStyle}
          onClick={handleClick}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
        {/* 🎯 NEW: Dynamic text with appropriate styling */}
        <span style={{ 
          position: 'relative', 
          zIndex: 2,
          // Counter-rotate to keep text upright: base -45deg only
          transform: `rotate(-45deg) translateX(-0.04em)`,
          marginLeft: '0.08em', // Reduced margin for mobile
          lineHeight: '0.9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          ...textStyling // Apply dynamic text styling here
        }}>
          {displayText}
        </span>
      </div>

      {/* 🎯 NEW: Tooltip for 'Theme of the week' */}
      {showTooltip && onClick && (
        <div style={{
          position: 'absolute',
          top: '-3rem',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: '#1a237e',
          color: 'white',
          padding: '0.5rem 0.75rem',
          borderRadius: '0.5rem',
          fontSize: '0.875rem',
          fontWeight: '600',
          whiteSpace: 'nowrap',
          zIndex: 1000,
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
        }}>
          Theme of the week
        </div>
      )}
    </div>
    </>
  );
}; 