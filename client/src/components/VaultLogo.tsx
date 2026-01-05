import React, { useState, useEffect, useRef, useCallback } from 'react';

// Vault unlock animation sequence
const VAULT_UNLOCK_SEQUENCE = [
  { image: '/ClosedVault.png', duration: 300 },
  { image: '/ShineKeyVault.png', duration: 400 },
  { image: '/ClosedVault.png', duration: 200 },
  { image: '/AjarVault.png', duration: 350 },
  { image: '/AjarVault2.png', duration: 350 },
  { image: '/OpenVault.png', duration: 0 } // Final state, holds
];

interface VaultLogoProps {
  scaled?: boolean; // For use in modals with transform scale
  onClick?: () => void;
  gameComplete?: boolean; // To detect when game is finished
  showCallToAction?: boolean; // Control whether to show pulsing hint
  // Celebratory animation for just-completed games (main page celebration)
  celebrateCompletion?: boolean;
  onCelebrationComplete?: () => void;
  // Bonus round active - subtle animation during bonus round
  bonusRoundActive?: boolean;
  // Theme guess data
  themeGuessData?: {
    hasGuessedToday: boolean;
    isCorrectGuess: boolean;
    confidencePercentage: number | null;
  };
  // For animation in theme modal (controlled externally)
  isAnimating?: boolean;
  currentAnimationFrame?: string;
  // Callback when modal animation completes
  onAnimationComplete?: () => void;
}

export const VaultLogo: React.FC<VaultLogoProps> = ({
  scaled = false,
  onClick,
  gameComplete = false,
  showCallToAction = true,
  celebrateCompletion = false,
  onCelebrationComplete,
  bonusRoundActive = false,
  themeGuessData,
  isAnimating = false,
  currentAnimationFrame,
  onAnimationComplete
}) => {
  // Hover state for tooltip
  const [showTooltip, setShowTooltip] = useState(false);
  
  // Internal animation state (for modal animation)
  const [animationFrameIndex, setAnimationFrameIndex] = useState(0);
  const [internalAnimating, setInternalAnimating] = useState(false);
  
  // Celebration state (for main page unlock animation)
  const [isCelebrating, setIsCelebrating] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const callbackFiredRef = useRef(false);
  
  // Preload all images on mount
  useEffect(() => {
    VAULT_UNLOCK_SEQUENCE.forEach(frame => {
      const img = new Image();
      img.src = frame.image;
    });
  }, []);
  
  // Handle celebration animation (main page)
  useEffect(() => {
    if (celebrateCompletion && !callbackFiredRef.current) {
      console.log('[VaultLogo] Starting celebration animation');
      setIsCelebrating(true);
      
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      
      // Play through the unlock sequence
      let elapsed = 0;
      VAULT_UNLOCK_SEQUENCE.forEach((frame, index) => {
        setTimeout(() => {
          setAnimationFrameIndex(index);
        }, elapsed);
        elapsed += frame.duration;
      });
      
      // Total animation time
      const totalDuration = VAULT_UNLOCK_SEQUENCE.reduce((sum, f) => sum + f.duration, 0) + 300; // +300ms buffer
      
      timerRef.current = setTimeout(() => {
        console.log('[VaultLogo] Celebration animation complete');
        setIsCelebrating(false);
        callbackFiredRef.current = true;
        timerRef.current = null;
        
        if (onCelebrationComplete) {
          onCelebrationComplete();
        }
      }, totalDuration);
    }
    
    if (!celebrateCompletion && callbackFiredRef.current) {
      callbackFiredRef.current = false;
      setIsCelebrating(false);
      setAnimationFrameIndex(0);
    }
    
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [celebrateCompletion, onCelebrationComplete]);
  
  // Determine which image to show
  const getCurrentImage = useCallback(() => {
    // If externally controlled animation (modal)
    if (currentAnimationFrame) {
      return currentAnimationFrame;
    }
    
    // If celebrating or internally animating
    if (isCelebrating || internalAnimating) {
      return VAULT_UNLOCK_SEQUENCE[animationFrameIndex]?.image || '/ClosedVault.png';
    }
    
    // Theme-based state
    if (themeGuessData?.hasGuessedToday && themeGuessData?.isCorrectGuess) {
      return '/OpenVault.png';
    }
    
    // Default: closed vault
    return '/ClosedVault.png';
  }, [currentAnimationFrame, isCelebrating, internalAnimating, animationFrameIndex, themeGuessData]);
  
  // Size - same as original UnPrefix diamond
  const baseSize = scaled ? 'clamp(2.6rem, 7vw, 3.0rem)' : 'clamp(2.8rem, 7.5vw, 3.2rem)';
  
  // Determine if should pulsate (game complete + theme not guessed)
  const shouldPulsate = showCallToAction && gameComplete && (!themeGuessData?.hasGuessedToday) && !isCelebrating;
  
  // Get animation class
  const getAnimation = () => {
    if (isCelebrating) {
      return 'vaultUnlock 0.3s ease-in-out';
    }
    if (bonusRoundActive && !themeGuessData?.hasGuessedToday) {
      return 'vaultNudge 3s ease-in-out infinite';
    }
    if (shouldPulsate) {
      return 'vaultPulsate 2s ease-in-out infinite';
    }
    return 'none';
  };
  
  const containerStyle: React.CSSProperties = {
    width: baseSize,
    height: baseSize,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    flexShrink: 0,
    // OVERLAP the D box - push into it slightly and ensure higher z-index
    marginRight: '-0.4rem',
    zIndex: 10,
    cursor: onClick ? 'pointer' : 'default',
    animation: getAnimation(),
    transition: 'transform 0.2s ease-in-out'
  };
  
  const imageStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
    // Smooth transitions between images
    transition: 'opacity 0.1s ease-in-out'
  };

  const handleClick = () => {
    if (onClick) {
      onClick();
    }
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isCelebrating) return;
    setShowTooltip(true);
    if (onClick) {
      e.currentTarget.style.transform = scaled ? 'scale(1.05)' : 'scale(1.08)';
    }
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isCelebrating) return;
    setShowTooltip(false);
    if (onClick) {
      e.currentTarget.style.transform = 'scale(1)';
    }
  };

  return (
    <>
      {/* CSS keyframes for animations */}
      <style>
        {`
          @keyframes vaultPulsate {
            0%, 100% {
              transform: scale(1);
              filter: brightness(1);
            }
            50% {
              transform: scale(1.05);
              filter: brightness(1.1);
            }
          }
          
          @keyframes vaultNudge {
            0%, 85%, 100% {
              transform: scale(1) rotate(0deg);
            }
            88% {
              transform: scale(1.02) rotate(2deg);
            }
            91% {
              transform: scale(1.02) rotate(-2deg);
            }
            94% {
              transform: scale(1.01) rotate(1deg);
            }
            97% {
              transform: scale(1.01) rotate(-1deg);
            }
          }
          
          @keyframes vaultUnlock {
            0% {
              transform: scale(1);
              filter: brightness(1);
            }
            50% {
              transform: scale(1.08);
              filter: brightness(1.2);
            }
            100% {
              transform: scale(1);
              filter: brightness(1);
            }
          }
          
          @media (prefers-reduced-motion: reduce) {
            .vault-logo-container {
              animation: none !important;
            }
          }
        `}
      </style>
      
      <div style={{ position: 'relative', display: 'inline-block' }}>
        <div
          className="vault-logo-container"
          style={containerStyle}
          onClick={handleClick}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <img
            src={getCurrentImage()}
            alt="Vault"
            style={imageStyle}
            draggable={false}
          />
        </div>

        {/* Tooltip for 'Theme of the week' */}
        {showTooltip && onClick && !isCelebrating && (
          <div style={{
            position: 'absolute',
            top: '-2.5rem',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: '#1a237e',
            color: 'white',
            padding: '0.5rem 0.75rem',
            borderRadius: '0.5rem',
            fontSize: '0.875rem',
            fontWeight: '600',
            whiteSpace: 'nowrap',
            zIndex: 1000,
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
          }}>
            Theme of the week
          </div>
        )}
      </div>
    </>
  );
};

// Export the animation sequence for use in ThemeGuessModal
export { VAULT_UNLOCK_SEQUENCE };

