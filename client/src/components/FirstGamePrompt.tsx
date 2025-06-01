import React from 'react';

interface FirstGamePromptProps {
  currentDisplayName: string;
  onSetNickname: () => void;
  onSkip: () => void;
}

export const FirstGamePrompt: React.FC<FirstGamePromptProps> = ({
  currentDisplayName,
  onSetNickname,
  onSkip
}) => {
  // Check if user is using default generated name (starts with "Player " and ends with 4 chars)
  const isUsingDefaultName = currentDisplayName.startsWith('Player ') && currentDisplayName.length <= 12;
  
  // Don't show prompt if user has already set a custom nickname
  if (!isUsingDefaultName) {
    return null;
  }

  return (
    <div
      style={{
        backgroundColor: '#f0f7ff',
        border: '2px solid #3b82f6',
        borderRadius: '0.75rem',
        padding: '1.25rem',
        marginBottom: '1.5rem',
        textAlign: 'center',
      }}
    >
      {/* Header with emoji */}
      <div
        style={{
          fontSize: '1.5rem',
          marginBottom: '0.5rem',
        }}
      >
        🎯
      </div>
      
      {/* Main message */}
      <div
        style={{
          fontWeight: 700,
          fontSize: '1rem',
          marginBottom: '0.5rem',
          color: 'var(--color-primary, #1a237e)',
        }}
      >
        Set your nickname for the leaderboard!
      </div>
      
      {/* Explanation */}
      <div
        style={{
          fontSize: '0.875rem',
          color: '#4b5563',
          marginBottom: '1rem',
          lineHeight: '1.4',
        }}
      >
        You're currently shown as "{currentDisplayName}". 
        <br />
        Choose a custom name to stand out on the leaderboard!
      </div>
      
      {/* Action buttons */}
      <div
        style={{
          display: 'flex',
          gap: '0.75rem',
          justifyContent: 'center',
          flexWrap: 'wrap',
        }}
      >
        <button
          onClick={onSetNickname}
          style={{
            padding: '0.5rem 1.25rem',
            borderRadius: '0.5rem',
            backgroundColor: 'var(--color-primary, #1a237e)',
            color: 'white',
            border: 'none',
            fontSize: '0.875rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'background-color 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#1e40af';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--color-primary, #1a237e)';
          }}
        >
          ⚙️ Set Nickname
        </button>
        
        <button
          onClick={onSkip}
          style={{
            padding: '0.5rem 1.25rem',
            borderRadius: '0.5rem',
            backgroundColor: 'transparent',
            color: '#6b7280',
            border: '1px solid #d1d5db',
            fontSize: '0.875rem',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#f9fafb';
            e.currentTarget.style.borderColor = '#9ca3af';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.borderColor = '#d1d5db';
          }}
        >
          Maybe Later
        </button>
      </div>
    </div>
  );
}; 