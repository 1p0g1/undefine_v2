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
  const [testLocked, setTestLocked] = useState(true); // For testing toggle functionality

  // Reasonable padlock size - slightly larger than original UnPrefix but not massive
  const dimension = size === 'lg'
    ? 'clamp(4.2rem, 11vw, 4.8rem)' // 1.5x original UnPrefix size
    : size === 'sm'
    ? 'clamp(3.9rem, 10.5vw, 4.5rem)'
    : 'clamp(4.05rem, 10.75vw, 4.65rem)';

  // Use provided PNGs placed at project root public folder
  // For testing: use testLocked state instead of locked prop
  const src = testLocked ? '/padlock_locked_256.png' : '/padlock_unlocked_256.png';

  const handleEnter = () => setHover(true);
  const handleLeave = () => setHover(false);

  return (
    <button
      type="button"
      aria-label={testLocked ? 'Guess the theme (click to test unlock)' : 'Theme unlocked (click to test lock)'}
      onClick={(e) => {
        // Toggle for testing
        setTestLocked(!testLocked);
        // Also call original onClick if provided
        if (onClick) onClick();
      }}
      disabled={disabled}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      style={{
        all: 'unset',
        cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'inline-block',
        // Allow overlapping without affecting layout
        marginRight: '-1rem', // Negative margin to pull closer to DEFINE boxes
        zIndex: 1 // Behind DEFINE boxes but above background
      }}
    >
      <span
        style={{
          position: 'relative',
          display: 'grid',
          placeItems: 'center',
          width: dimension,
          height: dimension,
          userSelect: 'none'
        }}
      >
        <img
          src={src}
          alt=""
          draggable={false}
          style={{
            width: '150%',
            height: '150%',
            objectFit: 'contain',
            display: 'block',
            filter: hover && !disabled ? 'drop-shadow(0 2px 8px rgba(26,35,126,0.25))' : 'none',
            transform: 'translateY(-45px)'
          }}
        />

        {/* Centered brand text overlay */}
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            fontFamily: 'var(--font-primary)',
            fontStyle: 'italic',
            fontWeight: 800,
            // Scale the text relative to the container to keep it centered and consistent
            fontSize: 'clamp(1.1rem, 3.5vw, 1.5rem)',
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


