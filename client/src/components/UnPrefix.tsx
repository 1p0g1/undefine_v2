import React from 'react';

interface UnPrefixProps {
  scaled?: boolean; // For use in GameSummaryModal with transform scale
}

export const UnPrefix: React.FC<UnPrefixProps> = ({ scaled = false }) => {
  const containerStyle = {
    width: 'clamp(3rem, 8vw, 3.5rem)',
    height: 'clamp(3rem, 8vw, 3.5rem)',
    borderRadius: '50%',
    backgroundColor: '#f8f9ff',
    border: '2px solid #e0e4ff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'var(--font-primary)',
    fontStyle: 'italic',
    fontWeight: 700,
    color: '#1a237e',
    fontSize: 'clamp(1rem, 3vw, 1.2rem)',
    position: 'relative' as const,
    flexShrink: 0,
    aspectRatio: '1 / 1' as const
  };

  if (scaled) {
    Object.assign(containerStyle, { transform: 'scale(0.78)' });
  }

  return (
    <div style={containerStyle}>
      {/* "Un·" text */}
      <span style={{ position: 'relative', zIndex: 2 }}>Un·</span>
    </div>
  );
}; 