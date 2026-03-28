import React, { useState, useEffect } from 'react';

interface FirstGamePromptProps {
  currentDisplayName: string;
  onSetNickname: () => void;
  onSkip: () => void;
}

const HOMESCREEN_DISMISSED_KEY = 'undefine_homescreen_prompt_dismissed';

function isStandalonePWA(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
  );
}

export const FirstGamePrompt: React.FC<FirstGamePromptProps> = ({
  currentDisplayName,
  onSetNickname,
  onSkip
}) => {
  const isUsingDefaultName = currentDisplayName.startsWith('Player ') && currentDisplayName.length <= 12;
  const [showHomescreen, setShowHomescreen] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem(HOMESCREEN_DISMISSED_KEY);
    if (!dismissed && !isStandalonePWA()) {
      setShowHomescreen(true);
    }
  }, []);

  const dismissHomescreen = () => {
    localStorage.setItem(HOMESCREEN_DISMISSED_KEY, 'true');
    setShowHomescreen(false);
  };

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isAndroid = /Android/.test(navigator.userAgent);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%' }}>
      {showHomescreen && (
        <div
          style={{
            backgroundColor: '#f0f7ff',
            border: '2px solid #3b82f6',
            borderRadius: '0.75rem',
            padding: '0.75rem 1rem 0.75rem',
            textAlign: 'center',
            position: 'relative',
          }}
        >
          <button
            onClick={dismissHomescreen}
            style={{
              position: 'absolute',
              top: '0.25rem',
              right: '0.5rem',
              background: 'none',
              border: 'none',
              fontSize: '1rem',
              color: '#9ca3af',
              cursor: 'pointer',
            }}
          >
            &times;
          </button>
          <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--color-primary, #1a237e)', marginBottom: '0.4rem' }}>
            Save Un·Define to your homescreen 📲
          </div>
          <div style={{ fontSize: '0.78rem', color: '#4b5563', lineHeight: '1.6' }}>
            {isAndroid ? (
              <>On Android, tap the menu <strong>⋮</strong> and on iPhone, tap Share <strong>⎋</strong>.</>
            ) : isIOS ? (
              <>On Android, tap the menu <strong>⋮</strong> and on iPhone, tap Share <strong>⎋</strong>.</>
            ) : (
              <>On Android, tap the menu <strong>⋮</strong> and on iPhone, tap Share <strong>⎋</strong>.</>
            )}
            <br />
            <span style={{ display: 'block', textAlign: 'center', marginTop: '0.15rem' }}>
              Then <strong>Add to Home Screen ➕</strong>
            </span>
          </div>
        </div>
      )}

      {isUsingDefaultName && (
        <div
          style={{
            backgroundColor: '#f0f7ff',
            border: '2px solid #3b82f6',
            borderRadius: '0.75rem',
            padding: '0.5rem 1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            fontSize: '0.8rem',
            color: '#4b5563',
          }}
        >
          <span>You're shown as "{currentDisplayName}"</span>
          <button
            onClick={onSetNickname}
            style={{
              padding: '0.25rem 0.6rem',
              borderRadius: '0.375rem',
              backgroundColor: 'var(--color-primary, #1a237e)',
              color: 'white',
              border: 'none',
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            Set Nickname
          </button>
        </div>
      )}
    </div>
  );
}; 