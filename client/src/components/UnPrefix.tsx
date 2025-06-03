import React, { useEffect, useState } from 'react';

interface UnPrefixProps {
  scaled?: boolean; // For use in GameSummaryModal with transform scale
}

export const UnPrefix: React.FC<UnPrefixProps> = ({ scaled = false }) => {
  const [isDaytime, setIsDaytime] = useState(true);

  useEffect(() => {
    const updateTimeOfDay = () => {
      const now = new Date();
      const hour = now.getHours();
      // Daytime: 6 AM to 6 PM (more natural than strict 12 PM)
      setIsDaytime(hour >= 6 && hour < 18);
    };

    updateTimeOfDay();
    // Update every minute to check for time changes
    const interval = setInterval(updateTimeOfDay, 60000);
    
    return () => clearInterval(interval);
  }, []);

  const containerStyle = {
    width: 'clamp(3rem, 8vw, 3.5rem)',
    height: 'clamp(3rem, 8vw, 3.5rem)',
    borderRadius: '50%',
    backgroundColor: isDaytime ? '#fff8e1' : '#f8f9ff',
    border: `2px solid ${isDaytime ? '#ffc107' : '#e0e4ff'}`,
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
    aspectRatio: '1 / 1' as const,
    overflow: 'hidden',
    boxShadow: isDaytime 
      ? '0 0 20px rgba(255, 193, 7, 0.3), inset 0 0 10px rgba(255, 193, 7, 0.1)' 
      : '0 2px 8px rgba(224, 228, 255, 0.3)',
    transition: 'all 0.5s ease-in-out'
  };

  if (scaled) {
    Object.assign(containerStyle, { transform: 'scale(0.78)' });
  }

  return (
    <div style={containerStyle}>
      {/* Background celestial effects */}
      {isDaytime ? (
        // Sun rays (subtle)
        <>
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                width: '1px',
                height: '8px',
                backgroundColor: '#ffc107',
                top: '6px',
                left: '50%',
                transformOrigin: '0 calc(clamp(1.5rem, 4vw, 1.75rem) - 6px)',
                transform: `translateX(-50%) rotate(${i * 45}deg)`,
                opacity: 0.6
              }}
            />
          ))}
          {/* Inner glow */}
          <div
            style={{
              position: 'absolute',
              width: '80%',
              height: '80%',
              borderRadius: '50%',
              backgroundColor: 'rgba(255, 193, 7, 0.1)',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)'
            }}
          />
        </>
      ) : (
        // Moon craters (subtle)
        <>
          <div
            style={{
              position: 'absolute',
              width: '4px',
              height: '4px',
              borderRadius: '50%',
              backgroundColor: 'rgba(26, 35, 126, 0.15)',
              top: '30%',
              left: '35%'
            }}
          />
          <div
            style={{
              position: 'absolute',
              width: '2px',
              height: '2px',
              borderRadius: '50%',
              backgroundColor: 'rgba(26, 35, 126, 0.15)',
              top: '60%',
              right: '30%'
            }}
          />
          <div
            style={{
              position: 'absolute',
              width: '3px',
              height: '3px',
              borderRadius: '50%',
              backgroundColor: 'rgba(26, 35, 126, 0.1)',
              top: '45%',
              left: '60%'
            }}
          />
        </>
      )}
      
      {/* "Un·" text */}
      <span style={{ position: 'relative', zIndex: 2 }}>Un·</span>
    </div>
  );
}; 