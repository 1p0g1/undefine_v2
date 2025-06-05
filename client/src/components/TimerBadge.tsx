import React from 'react';

interface TimerBadgeProps {
  seconds: number;
}

export const TimerBadge: React.FC<TimerBadgeProps> = ({ seconds }) => {
  const formatTime = (s: number) => {
    const minutes = Math.floor(s / 60);
    const remainingSeconds = s % 60;
    return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
  };

  return (
    <div 
      className="timer-badge"
      aria-label={`Game timer: ${formatTime(seconds)}`}
      style={{
        background: '#faf7f2',
        border: '2px solid #1a237e',
        borderRadius: '2rem',
        padding: 'clamp(0.4rem, 1.5vw, 0.6rem) clamp(0.75rem, 3vw, 1.2rem)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'Libre Baskerville, Georgia, Times, serif',
        fontSize: 'clamp(0.85rem, 2.5vw, 1.1rem)',
        fontWeight: 600,
        color: '#1a237e',
        boxShadow: '0 3px 12px rgba(26, 35, 126, 0.2)',
        fontVariantNumeric: 'tabular-nums',
        letterSpacing: '0.02em',
        minWidth: 'clamp(4.5rem, 12vw, 5.5rem)',
        textAlign: 'center'
      }}
    >
      {formatTime(seconds)}
    </div>
  );
}; 