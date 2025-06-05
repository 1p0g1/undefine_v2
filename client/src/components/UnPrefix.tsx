import React from 'react';

interface UnPrefixProps {
  scaled?: boolean; // For use in GameSummaryModal with transform scale
}

export const UnPrefix: React.FC<UnPrefixProps> = ({ scaled = false }) => {
  // Make Un diamond larger and more prominent than DEFINE boxes
  const baseSize = scaled ? 'clamp(3.5rem, 9vw, 4rem)' : 'clamp(3.8rem, 10vw, 4.5rem)';
  
  const containerStyle = {
    width: baseSize,
    height: baseSize,
    borderRadius: '0.5rem', // Rounded corners like DEFINE boxes
    backgroundColor: '#f8f9ff',
    border: '3px solid #1a237e', // Thicker, stronger border
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'var(--font-primary)',
    fontStyle: 'italic',
    fontWeight: 800, // Bolder weight
    color: '#1a237e',
    fontSize: scaled ? 'clamp(1.2rem, 4vw, 1.5rem)' : 'clamp(1.4rem, 4.5vw, 1.8rem)', // Larger text
    position: 'relative' as const,
    flexShrink: 0,
    aspectRatio: '1 / 1' as const,
    // Transform to diamond shape - rotate 45 degrees
    transform: scaled ? 'rotate(45deg) scale(0.85)' : 'rotate(45deg)',
    // Add subtle shadow and glow for more visual impact
    boxShadow: '0 4px 12px rgba(26, 35, 126, 0.15), 0 0 0 1px rgba(26, 35, 126, 0.1)',
    transition: 'all 0.2s ease-in-out'
  };

  return (
    <div style={containerStyle}>
      {/* "Un·" text - counter-rotate to keep text upright and include interpunct */}
      <span style={{ 
        position: 'relative', 
        zIndex: 2,
        transform: 'rotate(-45deg) translateX(-0.05em)', // Counter-rotate text and adjust centering
        marginLeft: '0.1em' // Slight adjustment to compensate for italic slant
      }}>
        Un·
      </span>
    </div>
  );
}; 