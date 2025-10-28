import React, { useState } from 'react';

interface InfoDiamondProps {
  onClick?: () => void;
}

export const InfoDiamond: React.FC<InfoDiamondProps> = ({ onClick }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  
  // Half the size of UnPrefix diamond
  const size = 'clamp(1.4rem, 3.75vw, 1.6rem)';
  
  return (
    <button
      type="button"
      aria-label="How to Play"
      onClick={onClick}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      style={{
        all: 'unset',
        cursor: 'pointer',
        display: 'inline-block',
        position: 'relative'
      }}
    >
      <span
        style={{
          position: 'relative',
          display: 'grid',
          placeItems: 'center',
          width: size,
          height: size,
          transform: 'rotate(45deg)',
          backgroundColor: '#e0e4ff',
          border: '2px solid var(--color-primary)',
          borderRadius: '0.5rem',
          userSelect: 'none'
        }}
      >
        {/* Info text - counter-rotate to keep upright */}
        <span
          aria-hidden="true"
          style={{
            transform: 'rotate(-45deg)',
            fontFamily: 'var(--font-primary)',
            fontStyle: 'normal',
            fontWeight: 700,
            fontSize: 'clamp(0.8rem, 2.2vw, 1rem)',
            color: 'var(--color-primary)',
            lineHeight: 1,
            pointerEvents: 'none'
          }}
        >
          i
        </span>

        {/* Tooltip */}
        {showTooltip && (
          <span
            style={{
              position: 'absolute',
              bottom: 'calc(100% + 1rem)',
              left: '50%',
              transform: 'translateX(-50%) rotate(-45deg)',
              backgroundColor: 'var(--color-primary)',
              color: '#fff',
              padding: '0.35rem 0.6rem',
              borderRadius: '0.5rem',
              fontSize: '0.8rem',
              fontWeight: 600,
              whiteSpace: 'nowrap',
              boxShadow: '0 4px 6px rgba(0,0,0,0.12)',
              zIndex: 1000
            }}
          >
            How to Play
          </span>
        )}
      </span>
    </button>
  );
};

export default InfoDiamond;
