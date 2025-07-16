import React from 'react';

interface UnPrefixProps {
  scaled?: boolean; // For use in GameSummaryModal with transform scale
  onClick?: () => void;
}

export const UnPrefix: React.FC<UnPrefixProps> = ({ scaled = false, onClick }) => {
  // Better mobile-responsive sizing
  const baseSize = scaled 
    ? 'clamp(2.4rem, 6vw, 2.8rem)' 
    : 'clamp(2.6rem, 6.5vw, 3.2rem)';
  
  const containerStyle = {
    width: baseSize,
    height: baseSize,
    borderRadius: '0.4rem', // Slightly smaller radius for mobile
    backgroundColor: '#f8f9ff',
    border: '2px solid #1a237e', // Thinner border for mobile
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'var(--font-primary)',
    fontStyle: 'italic',
    fontWeight: 700, // Slightly lighter for mobile
    color: '#1a237e',
    fontSize: scaled 
      ? 'clamp(1rem, 3.5vw, 1.3rem)' 
      : 'clamp(1.1rem, 4vw, 1.5rem)', // More conservative sizing
    position: 'relative' as const,
    flexShrink: 0,
    aspectRatio: '1 / 1' as const,
    // Transform to diamond shape - rotate 45 degrees
    transform: scaled ? 'rotate(45deg) scale(0.9)' : 'rotate(45deg)',
    // Reduced shadow for mobile performance
    boxShadow: '0 2px 8px rgba(26, 35, 126, 0.12), 0 0 0 1px rgba(26, 35, 126, 0.08)',
    transition: 'all 0.2s ease-in-out',
    // Add pointer cursor when clickable
    cursor: onClick ? 'pointer' : 'default',
    // Ensure it doesn't overflow on mobile
    maxWidth: '100%',
    maxHeight: '100%',
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
      e.currentTarget.style.boxShadow = '0 4px 12px rgba(26, 35, 126, 0.2), 0 0 0 2px rgba(26, 35, 126, 0.12)';
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