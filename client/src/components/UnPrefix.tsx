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
  // NEW: Rotation state for animation (additional rotation beyond base 45deg)
  const [additionalRotation, setAdditionalRotation] = useState(0);
  
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
    
    if (isCorrectGuess && confidencePercentage !== null && confidencePercentage >= 85) {
      // Green for correct/high confidence - SOLID background
      return {
        backgroundColor: '#f0fdf4', // Light green background (solid)
        borderColor: '#22c55e',
        textColor: '#15803d',
        glowColor: '#22c55e'
      };
    } else if (confidencePercentage !== null && confidencePercentage >= 70) {
      // Orange for medium confidence - SOLID background  
      return {
        backgroundColor: '#fff7ed', // Light orange background (solid)
        borderColor: '#f97316',
        textColor: '#ea580c',
        glowColor: '#f97316'
      };
    } else {
      // Red for low confidence/incorrect - SOLID background
      return {
        backgroundColor: '#fef2f2', // Light red background (solid)
        borderColor: '#ef4444',
        textColor: '#dc2626',
        glowColor: '#ef4444'
      };
    }
  };

  const colors = getDiamondColors();
  
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
    // Transform to diamond shape - base 45 degrees + additional rotation
    transform: scaled 
      ? `rotate(${45 + additionalRotation}deg) scale(0.9)` 
      : `rotate(${45 + additionalRotation}deg)`,
    boxShadow: `0 4px 12px ${colors.borderColor}26, 0 0 0 1px ${colors.borderColor}1A`,
    transition: 'all 0.3s ease-in-out', // Slightly longer for rotation animation
    // Add pulsate animation when theme not guessed
    animation: shouldPulsate ? 'pulsate 2s ease-in-out infinite' : 'none',
    // Add pointer cursor when clickable
    cursor: onClick ? 'pointer' : 'default',
    boxSizing: 'border-box' as const
  };

  const handleClick = () => {
    // Add 45-degree clockwise rotation animation on click
    setAdditionalRotation(prev => prev + 45);
    
    if (onClick) {
      onClick();
    }
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    setShowTooltip(true); // Show tooltip on hover
    if (onClick) {
      // Use current rotation state for hover effects
      e.currentTarget.style.transform = scaled 
        ? `rotate(${45 + additionalRotation}deg) scale(0.93)` 
        : `rotate(${45 + additionalRotation}deg) scale(1.03)`;
      e.currentTarget.style.boxShadow = `0 4px 12px ${colors.borderColor}33, 0 0 0 2px ${colors.borderColor}1F`;
    }
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    setShowTooltip(false); // Hide tooltip on leave
    if (onClick) {
      // Reset to current rotation state
      e.currentTarget.style.transform = scaled 
        ? `rotate(${45 + additionalRotation}deg) scale(0.9)` 
        : `rotate(${45 + additionalRotation}deg)`;
      e.currentTarget.style.boxShadow = `0 4px 12px ${colors.borderColor}26, 0 0 0 1px ${colors.borderColor}1A`;
    }
  };

  return (
    <>
      {/* CSS keyframes for pulsate animation */}
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
          // Counter-rotate to keep text upright: base -45deg minus additional rotation
          transform: `rotate(${-45 - additionalRotation}deg) translateX(-0.04em)`,
          marginLeft: '0.08em', // Reduced margin for mobile
          lineHeight: '0.9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'transform 0.3s ease-in-out', // Smooth text rotation
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