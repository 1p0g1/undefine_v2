import React from 'react';

interface UnPrefixProps {
  scaled?: boolean; // For use in GameSummaryModal with transform scale
  onClick?: () => void;
}

export const UnPrefix: React.FC<UnPrefixProps> = ({ scaled = false, onClick }) => {
  // Make UN diamond slightly larger than DEFINE boxes (2.4rem vs 2.2rem)
  const baseSize = scaled ? '2.1rem' : '2.4rem';
  
  const containerStyle = {
    width: baseSize,
    height: baseSize,
    borderRadius: '0.5rem',
    backgroundColor: '#f8f9ff',
    border: '3px solid #1a237e',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'var(--font-primary)',
    fontStyle: 'italic',
    fontWeight: 800,
    color: '#1a237e',
    fontSize: scaled ? '1.0rem' : '1.2rem',
    position: 'relative' as const,
    flexShrink: 0,
    aspectRatio: '1 / 1' as const,
    // Transform to diamond shape - rotate 45 degrees
    transform: scaled ? 'rotate(45deg) scale(0.9)' : 'rotate(45deg)',
    boxShadow: '0 4px 12px rgba(26, 35, 126, 0.15), 0 0 0 1px rgba(26, 35, 126, 0.1)',
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