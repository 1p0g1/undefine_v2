import React, { useEffect, useState } from 'react';

interface TimerBadgeProps {
  seconds: number;
}

export const TimerBadge: React.FC<TimerBadgeProps> = ({ seconds }) => {
  const [isTicking, setIsTicking] = useState(false);

  const formatTime = (s: number) => {
    const minutes = Math.floor(s / 60);
    const remainingSeconds = s % 60;
    return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
  };

  // Trigger tick animation every second
  useEffect(() => {
    setIsTicking(true);
    const timeout = setTimeout(() => setIsTicking(false), 200);
    return () => clearTimeout(timeout);
  }, [seconds]);

  return (
    <>
      <style>{`
        @media (prefers-reduced-motion: reduce) {
          .timer-badge .tick-hand {
            transition: none !important;
            transform: scale(1) rotate(0deg) !important;
          }
          .timer-badge .tick-hand-needle {
            transition: none !important;
            transform: translateX(-50%) rotate(0deg) !important;
          }
        }
        
        @media (max-width: 640px) {
          .timer-badge {
            top: 0.75rem !important;
            right: 0.75rem !important;
            padding: 0.375rem 0.75rem !important;
            gap: 0.375rem !important;
            font-size: 0.8rem !important;
            min-width: 4.5rem !important;
          }
        }
        
        @media (max-width: 480px) {
          .timer-badge {
            top: 0.5rem !important;
            right: 0.5rem !important;
            padding: 0.3rem 0.6rem !important;
            font-size: 0.75rem !important;
            min-width: 4rem !important;
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
          padding: '0.5rem 1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontFamily: 'Libre Baskerville, Georgia, Times, serif',
          fontSize: 'clamp(0.875rem, 2.5vw, 1rem)',
          fontWeight: 600,
          color: '#1a237e',
          boxShadow: '0 2px 8px rgba(26, 35, 126, 0.15)',
          zIndex: 40,
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: '0.02em',
          minWidth: '5rem',
          justifyContent: 'center'
        }}
      >
        <div className="timer-text">
          {formatTime(seconds)}
        </div>
        <div 
          className="tick-hand"
          style={{
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            background: '#1a237e',
            position: 'relative',
            transition: 'transform 0.1s ease-out',
            transform: isTicking ? 'scale(1.2) rotate(15deg)' : 'scale(1) rotate(0deg)',
            transformOrigin: 'center bottom'
          }}
        >
          <div
            className="tick-hand-needle"
            style={{
              position: 'absolute',
              top: '-6px',
              left: '50%',
              width: '2px',
              height: '8px',
              background: '#1a237e',
              borderRadius: '1px',
              transition: 'transform 0.1s ease-out',
              transformOrigin: 'center bottom',
              transform: isTicking ? 'translateX(-50%) rotate(10deg)' : 'translateX(-50%) rotate(-10deg)'
            }}
          />
        </div>
      </div>
    </>
  );
}; 