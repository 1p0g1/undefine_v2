import React, { useState } from 'react';

interface PadlockCTAProps {
  locked: boolean;
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  showTooltip?: boolean;
}

// Replaces the homepage Un diamond with a padlock image while preserving
// a perfectly centered "Un·" overlay for brand continuity.
export const PadlockCTA: React.FC<PadlockCTAProps> = ({
  locked,
  onClick,
  size = 'md',
  disabled = false,
  showTooltip = true
}) => {
  const [hover, setHover] = useState(false);

  // Match historical Un diamond footprint using clamp
  const dimension = size === 'lg'
    ? 'clamp(8.0rem, 14vw, 9.25rem)'
    : size === 'sm'
    ? 'clamp(2.8rem, 6.8vw, 3.2rem)'
    : 'clamp(7.0rem, 12.5vw, 8.0rem)';

  // Use provided PNGs placed at project root public folder
  // If later moved to /padlocks/, only the paths here need changing
  const src = locked ? '/padlock_locked_256.png' : '/padlock_unlocked_256.png';

  const handleEnter = () => setHover(true);
  const handleLeave = () => setHover(false);

  return (
    <button
      type="button"
      aria-label={locked ? 'Guess the theme' : 'Theme unlocked'}
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      style={{
        all: 'unset',
        cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'inline-block'
      }}
    >
      <span
        style={{
          position: 'relative',
          display: 'grid',
          placeItems: 'center',
          width: dimension,
          height: dimension,
          userSelect: 'none',
          transform: 'translateY(-0.68rem)',
          marginRight: locked ? 'calc(-1.25rem - 1vw)' : 'calc(-1.55rem - 1vw)',
          zIndex: 0
        }}
      >
        <img
          src={src}
          alt=""
          draggable={false}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            display: 'block',
            filter: hover && !disabled ? 'drop-shadow(0 2px 8px rgba(26,35,126,0.25))' : 'none'
          }}
        />

        {/* Centered brand text overlay */}
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: '50%',
            left: locked ? '51%' : '57%',
            transform: 'translate(-50%, -46%)',
            fontFamily: 'var(--font-primary)',
            fontStyle: 'italic',
            fontWeight: 800,
            // Revert to original Un· text sizing
            fontSize: 'clamp(1.2rem, 3.5vw, 1.5rem)',
            color: '#1a237e',
            lineHeight: 1,
            pointerEvents: 'none'
          }}
        >
          Un·
        </span>

        {/* Tooltip */}
        {showTooltip && hover && onClick && (
          <span
            style={{
              position: 'absolute',
              bottom: 'calc(100% + 0.5rem)',
              left: '50%',
              transform: 'translateX(-50%)',
              backgroundColor: '#1a237e',
              color: '#fff',
              padding: '0.35rem 0.6rem',
              borderRadius: '0.5rem',
              fontSize: '0.8rem',
              fontWeight: 600,
              whiteSpace: 'nowrap',
              boxShadow: '0 4px 6px rgba(0,0,0,0.12)',
              zIndex: 10
            }}
          >
            Theme of the week
          </span>
        )}
      </span>
    </button>
  );
};

export default PadlockCTA;


