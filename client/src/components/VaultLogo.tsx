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
  scaled?: boolean; // For use in modals with transform scale (smaller)
  large?: boolean; // For theme modal animation showcase (2-3x larger)
  disableCelebrateAnimation?: boolean; // Skip celebrate animation (homepage should stay static)
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
  // Toggle to show "Un" overlay text
  showUnText?: boolean;
}

export const VaultLogo: React.FC<VaultLogoProps> = ({
  scaled = false,
  large = false,
  disableCelebrateAnimation = false,
  onClick,
  gameComplete = false,
  showCallToAction = true,
  celebrateCompletion = false,
  onCelebrationComplete,
  bonusRoundActive = false,
  themeGuessData,
  isAnimating = false,
  currentAnimationFrame,
  onAnimationComplete,
  showUnText = true
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
    if (disableCelebrateAnimation) return;

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
  
  // Size calculations:
  // - Main page: 70% larger than original (was ~3rem, now ~5rem)
  // - Scaled (small modals): slightly smaller
  // - Large (theme modal animation showcase): 2-3x larger for dramatic effect
  const getSize = () => {
    if (large) {
      // Theme modal showcase - 2.5x larger for animation glory
      return 'clamp(7rem, 18vw, 9rem)';
    }
    if (scaled) {
      // Small modal usage
      return 'clamp(4rem, 10vw, 5rem)';
    }
    // Main page - 70% larger than original, keeping center aligned
    return 'clamp(4.5rem, 12vw, 5.5rem)';
  };
  const baseSize = getSize();
  
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
  
  // Margin adjustments to keep center point stable despite size changes
  const getMarginRight = () => {
    if (large) return '0'; // No margin adjustment needed in modal
    if (scaled) return '-0.3rem';
    // Main page: larger image needs more negative margin to overlap correctly
    return '-0.8rem';
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
    // Larger size needs more negative margin to maintain visual center
    marginRight: getMarginRight(),
    zIndex: 10,
    cursor: onClick ? 'pointer' : 'default',
    animation: getAnimation(),
    transition: 'transform 0.2s ease-in-out',
    backgroundColor: 'transparent'
  };
  
  const imageStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
    display: 'block',
    backgroundColor: 'transparent',
    // Smooth transitions between images
    transition: 'opacity 0.1s ease-in-out'
  };

  // Match original UnPrefix text sizes - smaller, proportional to original diamond
  const getUnTextSize = () => {
    if (large) return 'clamp(1.8rem, 4.5vw, 2.4rem)'; // Larger for modal but still proportional
    if (scaled) return 'clamp(1.1rem, 3.2vw, 1.4rem)'; // Match UnPrefix scaled
    return 'clamp(1.2rem, 3.5vw, 1.5rem)'; // Match UnPrefix normal
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
          {showUnText && (
            <span
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'var(--font-primary)',
                fontStyle: 'italic', // Match UnPrefix styling
                fontWeight: 800, // Match UnPrefix fontWeight
                fontSize: getUnTextSize(),
                color: '#1a237e',
                textShadow: '0 0 6px rgba(255,255,255,0.85)',
                pointerEvents: 'none',
                userSelect: 'none',
                lineHeight: 1
              }}
            >
              Un
            </span>
          )}
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

