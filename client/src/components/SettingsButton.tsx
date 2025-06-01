import React from 'react';

interface SettingsButtonProps {
  onClick: () => void;
  currentNickname?: string;
}

export const SettingsButton: React.FC<SettingsButtonProps> = ({ 
  onClick, 
  currentNickname 
}) => {
  return (
    <button
      onClick={onClick}
      title={`Settings (Current: ${currentNickname || 'Default name'})`}
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
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.opacity = '1';
        e.currentTarget.style.backgroundColor = 'rgba(26, 35, 126, 0.1)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.opacity = '0.7';
        e.currentTarget.style.backgroundColor = 'transparent';
      }}
      aria-label="Settings"
    >
      ⚙️
    </button>
  );
}; 