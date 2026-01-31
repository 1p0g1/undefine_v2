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
      </span>

      {/* Tooltip - clean, nearly transparent style */}
      {showTooltip && (
        <span
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 0.75rem)',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: 'rgba(26, 35, 126, 0.9)',
            backdropFilter: 'blur(4px)',
            color: '#fff',
            padding: '0.4rem 0.75rem',
            borderRadius: '0.375rem',
            fontSize: '0.75rem',
            fontWeight: 500,
            fontFamily: 'var(--font-primary)',
            whiteSpace: 'nowrap',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            zIndex: 1000,
            letterSpacing: '0.01em'
          }}
        >
          How to Play
        </span>
      )}
    </button>
  );
};

export default InfoDiamond;
