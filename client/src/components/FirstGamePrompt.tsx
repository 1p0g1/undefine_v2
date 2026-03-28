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
            padding: '0.75rem 1rem',
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
          <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--color-primary, #1a237e)', marginBottom: '0.3rem' }}>
            Save Un·Define to your homescreen
          </div>
          <div style={{ fontSize: '0.78rem', color: '#4b5563', lineHeight: '1.4' }}>
            {isIOS ? (
              <>Tap <strong>Share</strong> (the square with an arrow) then <strong>"Add to Home Screen"</strong></>
            ) : isAndroid ? (
              <>Tap the <strong>menu (⋮)</strong> then <strong>"Add to Home screen"</strong> or <strong>"Install app"</strong></>
            ) : (
              <>In your browser menu, look for <strong>"Install"</strong> or <strong>"Add to Home Screen"</strong></>
            )}
          </div>
        </div>
      )}

      {isUsingDefaultName && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            fontSize: '0.8rem',
            color: '#6b7280',
          }}
        >
          <span>You're "{currentDisplayName}" — </span>
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
            }}
          >
            Set Nickname
          </button>
        </div>
      )}
    </div>
  );
}; 