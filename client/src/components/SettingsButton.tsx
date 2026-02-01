import React, { useState } from 'react';

interface SettingsButtonProps {
  onClick: () => void;
  currentNickname?: string;
}

export const SettingsButton: React.FC<SettingsButtonProps> = ({ 
  onClick, 
  currentNickname 
}) => {
  const [showTooltip, setShowTooltip] = useState(false);

  const tooltipText = `Settings (Current: ${currentNickname || 'Default name'})`;

  return (
    <button
      onClick={onClick}
      style={{
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: '4px',
        borderRadius: '4px',
        fontSize: '1rem',
        opacity: 0.7,
        transition: 'opacity 0.2s, background-color 0.2s',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '28px',
        height: '28px',
        color: 'var(--color-primary, #1a237e)',
        position: 'relative',
      }}
      onMouseEnter={(e) => {
        setShowTooltip(true);
        e.currentTarget.style.opacity = '1';
        e.currentTarget.style.backgroundColor = 'rgba(26, 35, 126, 0.1)';
      }}
      onMouseLeave={(e) => {
        setShowTooltip(false);
        e.currentTarget.style.opacity = '0.7';
        e.currentTarget.style.backgroundColor = 'transparent';
      }}
      aria-label="Settings"
    >
      ⚙️
      {showTooltip && (
        <span
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 0.6rem)',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: 'rgba(26, 35, 126, 0.9)',
            backdropFilter: 'blur(4px)',
            color: 'white',
            padding: '0.4rem 0.75rem',
            borderRadius: '0.375rem',
            fontSize: '0.75rem',
            fontWeight: 500,
            fontFamily: 'var(--font-primary)',
            whiteSpace: 'nowrap',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            zIndex: 1000,
            letterSpacing: '0.01em',
            pointerEvents: 'none'
          }}
        >
          {tooltipText}
        </span>
      )}
    </button>
  );
}; 