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
    <>
      <style>{`
        @media (max-width: 640px) {
          .timer-badge {
            top: 0.75rem !important;
            right: 0.75rem !important;
            padding: 0.5rem 0.875rem !important;
            font-size: 0.9rem !important;
            min-width: 5rem !important;
          }
        }
        
        @media (max-width: 480px) {
          .timer-badge {
            top: 0.5rem !important;
            right: 0.5rem !important;
            padding: 0.4rem 0.75rem !important;
            font-size: 0.85rem !important;
            min-width: 4.5rem !important;
          }
        }
      `}</style>
      <div 
        className="timer-badge"
        aria-label={`Game timer: ${formatTime(seconds)}`}
        style={{
          position: 'fixed',
          top: '1rem',
          right: '1rem',
          background: '#faf7f2',
          border: '2px solid #1a237e',
          borderRadius: '2rem',
          padding: '0.6rem 1.2rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'Libre Baskerville, Georgia, Times, serif',
          fontSize: 'clamp(0.95rem, 2.8vw, 1.1rem)',
          fontWeight: 600,
          color: '#1a237e',
          boxShadow: '0 3px 12px rgba(26, 35, 126, 0.2)',
          zIndex: 40,
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: '0.02em',
          minWidth: '5.5rem',
          textAlign: 'center'
        }}
      >
        {formatTime(seconds)}
      </div>
    </>
  );
}; 