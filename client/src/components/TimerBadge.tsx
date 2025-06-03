import React, { useEffect, useState } from 'react';

interface TimerBadgeProps {
  seconds: number;
}

export const TimerBadge: React.FC<TimerBadgeProps> = ({ seconds }) => {
  const [isRotating, setIsRotating] = useState(false);

  const formatTime = (s: number) => {
    const minutes = Math.floor(s / 60);
    const remainingSeconds = s % 60;
    return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
  };

  // Trigger rotation animation every second
  useEffect(() => {
    setIsRotating(true);
    const timeout = setTimeout(() => setIsRotating(false), 300);
    return () => clearTimeout(timeout);
  }, [seconds]);

  return (
    <>
      <style>{`
        @media (prefers-reduced-motion: reduce) {
          .timer-badge .sandglass {
            transition: none !important;
            transform: rotate(0deg) !important;
          }
        }
        
        @media (max-width: 640px) {
          .timer-badge {
            top: 0.75rem !important;
            right: 0.75rem !important;
            padding: 0.5rem 0.875rem !important;
            gap: 0.5rem !important;
            font-size: 0.9rem !important;
            min-width: 5.5rem !important;
          }
          .sandglass {
            width: 14px !important;
            height: 16px !important;
          }
        }
        
        @media (max-width: 480px) {
          .timer-badge {
            top: 0.5rem !important;
            right: 0.5rem !important;
            padding: 0.4rem 0.75rem !important;
            font-size: 0.85rem !important;
            min-width: 5rem !important;
          }
          .sandglass {
            width: 12px !important;
            height: 14px !important;
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
          gap: '0.75rem',
          fontFamily: 'Libre Baskerville, Georgia, Times, serif',
          fontSize: 'clamp(0.95rem, 2.8vw, 1.1rem)',
          fontWeight: 600,
          color: '#1a237e',
          boxShadow: '0 3px 12px rgba(26, 35, 126, 0.2)',
          zIndex: 40,
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: '0.02em',
          minWidth: '6rem'
        }}
      >
        <div className="timer-text">
          {formatTime(seconds)}
        </div>
        <div 
          className="sandglass"
          style={{
            width: '16px',
            height: '18px',
            position: 'relative',
            transition: 'transform 0.3s ease-out',
            transform: isRotating ? 'rotate(180deg)' : 'rotate(0deg)',
            transformOrigin: 'center'
          }}
        >
          {/* Top bulb */}
          <div
            style={{
              position: 'absolute',
              top: '0',
              left: '50%',
              width: '14px',
              height: '7px',
              background: '#1a237e',
              borderRadius: '7px 7px 3px 3px',
              transform: 'translateX(-50%)'
            }}
          />
          {/* Bottom bulb */}
          <div
            style={{
              position: 'absolute',
              bottom: '0',
              left: '50%',
              width: '14px',
              height: '7px',
              background: '#1a237e',
              borderRadius: '3px 3px 7px 7px',
              transform: 'translateX(-50%)'
            }}
          />
          {/* Center narrow part */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              width: '4px',
              height: '2px',
              background: '#1a237e',
              transform: 'translateX(-50%) translateY(-50%)'
            }}
          />
          {/* Sand grains */}
          <div
            style={{
              position: 'absolute',
              top: isRotating ? '12px' : '2px',
              left: '50%',
              width: '8px',
              height: '3px',
              background: '#d4a574',
              borderRadius: '1px',
              transform: 'translateX(-50%)',
              transition: 'top 0.3s ease-out'
            }}
          />
        </div>
      </div>
    </>
  );
}; 