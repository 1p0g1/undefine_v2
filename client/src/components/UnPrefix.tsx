import React from 'react';
import { getUnDiamondColor } from '../utils/themeMessages';

interface UnPrefixProps {
  scaled?: boolean; // For use in GameSummaryModal with transform scale
  onClick?: () => void;
  // Theme guess color-coding props
  themeGuessData?: {
    hasGuessedToday: boolean;
    isCorrectGuess: boolean;
    confidencePercentage: number | null;
  };
}

export const UnPrefix: React.FC<UnPrefixProps> = ({ scaled = false, onClick, themeGuessData }) => {
  // Make UN diamond slightly larger than DEFINE boxes but more mobile-friendly
  const baseSize = scaled ? 'clamp(2.6rem, 7vw, 3.0rem)' : 'clamp(2.8rem, 7.5vw, 3.2rem)';
  
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
    
    // Default colors when no theme guess made
    return {
      borderColor: '#1a237e',
      backgroundColor: '#f8f9ff',
      textColor: '#1a237e'
    };
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
    if (onClick) {
      e.currentTarget.style.transform = scaled ? 'rotate(45deg) scale(0.93)' : 'rotate(45deg) scale(1.03)';
      e.currentTarget.style.boxShadow = `0 4px 12px ${colors.borderColor}33, 0 0 0 2px ${colors.borderColor}1F`;
    }
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    if (onClick) {
      e.currentTarget.style.transform = scaled ? 'rotate(45deg) scale(0.9)' : 'rotate(45deg)';
      e.currentTarget.style.boxShadow = '0 2px 8px rgba(26, 35, 126, 0.12), 0 0 0 1px rgba(26, 35, 126, 0.08)';
    }
  };

  return (
    <div 
      style={containerStyle}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* "Un·" text - counter-rotate to keep text upright and include interpunct */}
      <span style={{ 
        position: 'relative', 
        zIndex: 2,
        transform: 'rotate(-45deg) translateX(-0.04em)', // Slightly adjusted for mobile
        marginLeft: '0.08em', // Reduced margin for mobile
        lineHeight: '0.9',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        Un·
      </span>
    </div>
  );
}; 