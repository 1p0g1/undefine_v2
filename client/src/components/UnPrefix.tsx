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
  
  // 🎯 NEW: Determine what text to show - '?' for call-to-action or 'Un·'
  const getDisplayText = () => {
    // Show '?' when game is complete, theme hasn't been guessed today, AND call-to-action is allowed
    if (showCallToAction && gameComplete && (!themeGuessData?.hasGuessedToday)) {
      return '?';
    }
    // Default to 'Un·' in all other cases
    return 'Un·';
  };

  // 🎯 NEW: Determine styling based on text content
  const getTextStyling = () => {
    const displayText = getDisplayText();
    
    if (displayText === '?') {
      // Special styling for '?' - no italics, larger size
      return {
        fontStyle: 'normal' as const, // Remove italics for '?'
        fontSize: scaled ? 'clamp(1.5rem, 4.2vw, 1.8rem)' : 'clamp(1.6rem, 4.5vw, 2.0rem)', // Even larger
        fontWeight: 700 // Slightly less bold
      };
    } else {
      // Original styling for 'Un·'
      return {
        fontStyle: 'italic' as const,
        fontSize: scaled ? 'clamp(1.1rem, 3.2vw, 1.4rem)' : 'clamp(1.2rem, 3.5vw, 1.5rem)',
        fontWeight: 800
      };
    }
  };
  
  // Determine diamond color based on theme guess results
  const getDiamondColors = () => {
    if (themeGuessData?.hasGuessedToday) {
      const themeColor = getUnDiamondColor(
        themeGuessData.confidencePercentage,
        themeGuessData.isCorrectGuess
      );
      
      // Get proper background color based on theme result
      let backgroundColor: string;
      if (themeGuessData.isCorrectGuess) {
        backgroundColor = '#f0fdf4'; // Light green background for correct
      } else if (themeGuessData.confidencePercentage !== null) {
        if (themeGuessData.confidencePercentage <= 50) {
          backgroundColor = '#fef2f2'; // Light red background for low similarity
        } else if (themeGuessData.confidencePercentage <= 70) {
          backgroundColor = '#fefbeb'; // Light orange/yellow background for medium similarity
        } else {
          backgroundColor = '#f0fdf4'; // Light green background for high similarity
        }
      } else {
        backgroundColor = '#f8f9ff'; // Default light blue
      }
      
      return {
        borderColor: themeColor,
        backgroundColor: backgroundColor,
        textColor: themeColor
      };
    }
    
    // 🎯 NEW: Special styling for call-to-action '?' when game is complete
    if (gameComplete && (!themeGuessData?.hasGuessedToday)) {
      return {
        borderColor: '#8b5cf6', // Purple border for call-to-action
        backgroundColor: '#faf5ff', // Light purple background
        textColor: '#8b5cf6' // Purple text
      };
    }
    
    // Default colors when no theme guess made
    return {
      borderColor: '#1a237e',
      backgroundColor: '#f8f9ff',
      textColor: '#1a237e'
    };
  };

  const colors = getDiamondColors();
  const displayText = getDisplayText();
  const textStyling = getTextStyling();
  
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
    // Transform to diamond shape - rotate 45 degrees
    transform: scaled ? 'rotate(45deg) scale(0.9)' : 'rotate(45deg)',
    boxShadow: `0 4px 12px ${colors.borderColor}26, 0 0 0 1px ${colors.borderColor}1A`,
    transition: 'all 0.2s ease-in-out',
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
      e.currentTarget.style.transform = scaled ? 'rotate(45deg) scale(0.93)' : 'rotate(45deg) scale(1.03)';
      e.currentTarget.style.boxShadow = `0 4px 12px ${colors.borderColor}33, 0 0 0 2px ${colors.borderColor}1F`;
    }
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    setShowTooltip(false); // Hide tooltip on leave
    if (onClick) {
      e.currentTarget.style.transform = scaled ? 'rotate(45deg) scale(0.9)' : 'rotate(45deg)';
      e.currentTarget.style.boxShadow = `0 4px 12px ${colors.borderColor}26, 0 0 0 1px ${colors.borderColor}1A`;
    }
  };

  return (
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
          transform: 'rotate(-45deg) translateX(-0.04em)', // Slightly adjusted for mobile
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
  );
}; 