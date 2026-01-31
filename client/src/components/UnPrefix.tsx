import React, { useState, useEffect, useRef } from 'react';
import { getUnDiamondColor } from '../utils/themeMessages';

interface UnPrefixProps {
  scaled?: boolean; // For use in GameSummaryModal with transform scale
  onClick?: () => void;
  gameComplete?: boolean; // To detect when game is finished
  showCallToAction?: boolean; // Control whether to show '?' call-to-action
  // Celebratory animation for just-completed games
  celebrateCompletion?: boolean; // Triggers the spin/grow animation
  onCelebrationComplete?: () => void; // Callback when celebration ends
  // Bonus round active - subtle shake to prompt theme guess
  bonusRoundActive?: boolean; // Shows subtle cranking animation during bonus round
  // Post-bonus/theme CTA nudge to encourage tapping the diamond
  themePromptActive?: boolean;
  // Theme guess color-coding props
  themeGuessData?: {
    hasGuessedToday: boolean;
    isCorrectGuess: boolean;
    confidencePercentage: number | null;
  };
}

export const UnPrefix: React.FC<UnPrefixProps> = ({ 
  scaled = false, 
  onClick, 
  gameComplete = false,
  showCallToAction = true,
  celebrateCompletion = false,
  onCelebrationComplete,
  bonusRoundActive = false,
  themePromptActive = false,
  themeGuessData 
}) => {
  // Hover state for tooltip
  const [showTooltip, setShowTooltip] = useState(false);
  
  // Track celebration animation state
  const [isCelebrating, setIsCelebrating] = useState(false);
  
  // Use refs to prevent issues with cleanup clearing timeouts
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const callbackFiredRef = useRef(false);
  
  // Trigger celebration when prop changes to true
  useEffect(() => {
    // Start celebration when prop becomes true
    if (celebrateCompletion && !callbackFiredRef.current) {
      console.log('[UnPrefix] Starting celebration animation, celebrateCompletion:', celebrateCompletion);
      setIsCelebrating(true);
      
      // Clear any existing timer
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      
      // Animation lasts 1.5s, then trigger callback
      timerRef.current = setTimeout(() => {
        console.log('[UnPrefix] Celebration animation complete, firing callback');
        setIsCelebrating(false);
        callbackFiredRef.current = true;
        timerRef.current = null;
        
        if (onCelebrationComplete) {
          console.log('[UnPrefix] Calling onCelebrationComplete');
          onCelebrationComplete();
        }
      }, 1500);
    }
    
    // Reset when celebrateCompletion goes back to false
    if (!celebrateCompletion && callbackFiredRef.current) {
      callbackFiredRef.current = false;
      setIsCelebrating(false);
    }
    
    // Cleanup only on unmount
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [celebrateCompletion, onCelebrationComplete]); // Removed isCelebrating from deps!
  
  // Make UN diamond slightly larger than DEFINE boxes but more mobile-friendly
  const baseSize = scaled ? 'clamp(2.6rem, 7vw, 3.0rem)' : 'clamp(2.8rem, 7.5vw, 3.2rem)';
  
  // Always show 'Un·' text
  const displayText = 'Un·';
  
  // Standard styling for 'Un·'
  const textStyling = {
    fontStyle: 'italic' as const,
    fontSize: scaled ? 'clamp(1.1rem, 3.2vw, 1.4rem)' : 'clamp(1.2rem, 3.5vw, 1.5rem)',
    fontWeight: 800
  };
  
  // Determine if diamond should pulsate (game complete + theme not guessed)
  const shouldPulsate = showCallToAction && gameComplete && (!themeGuessData?.hasGuessedToday) && !isCelebrating;
  
  // Determine diamond color based on theme guess results
  const getDiamondColors = () => {
    // During celebration, KEEP the original neutral colors - animation only, no color change
    // This avoids confusion with gold (which means perfect bonus round guess)
    if (isCelebrating) {
      return {
        backgroundColor: '#f8fafc', // Keep neutral background
        borderColor: '#64748b', // Keep neutral border
        textColor: '#1e293b', // Keep dark text
        glowColor: '#64748b', // Neutral glow for animation
        isCelebrating: true
      };
    }
    
    // After celebration, show interactive state to encourage theme guess
    // Use subtle animation cue without color change
    if (shouldPulsate) {
      return {
        backgroundColor: '#f8fafc', // Keep neutral background
        borderColor: '#64748b', // Keep neutral border (no purple)
        textColor: '#1e293b', // Keep dark text (no purple)
        glowColor: '#64748b', // Neutral glow
        isPulsating: true // Flag for animation
      };
    }
    
    // Theme-based coloring for 'Un·' (existing logic)
    if (!themeGuessData?.hasGuessedToday) {
      // Default neutral state
      return {
        backgroundColor: '#f8fafc',
        borderColor: '#64748b', 
        textColor: '#1e293b',
        glowColor: '#64748b'
      };
    }

    const { isCorrectGuess, confidencePercentage } = themeGuessData;
    
    // 💎 DIAMOND BLUE for perfect 100% match
    if (confidencePercentage === 100) {
      return {
        backgroundColor: '#dbeafe',
        borderColor: '#3b82f6',
        textColor: '#1e40af',
        glowColor: '#60a5fa',
        isDiamond: true
      };
    }
    
    // 🟢 GREEN for correct answers OR high confidence (85%+)
    if (isCorrectGuess || (confidencePercentage !== null && confidencePercentage >= 85)) {
      return {
        backgroundColor: '#f0fdf4',
        borderColor: '#22c55e',
        textColor: '#15803d',
        glowColor: '#22c55e'
      };
    }
    
    // 🟠 ORANGE for medium confidence (70-84%)
    if (confidencePercentage !== null && confidencePercentage >= 70) {
      return {
        backgroundColor: '#fff7ed',
        borderColor: '#f97316',
        textColor: '#ea580c',
        glowColor: '#f97316'
      };
    }
    
    // 🔴 RED for low confidence/incorrect
    return {
      backgroundColor: '#fef2f2',
      borderColor: '#ef4444',
      textColor: '#dc2626',
      glowColor: '#ef4444'
    };
  };

  const colors = getDiamondColors();
  const isPerfectMatch = (colors as any).isDiamond === true;
  const showCelebrationAnimation = (colors as any).isCelebrating === true;
  
  // Determine which animation to use
  const getAnimation = () => {
    if (showCelebrationAnimation) {
      return 'celebrateSpin 1.5s ease-in-out';
    }
    if (themePromptActive && !themeGuessData?.hasGuessedToday) {
      // After bonus round, draw attention to theme guess with a brighter nudge
      return 'themeSummon 2.4s ease-in-out infinite';
    }
    if (bonusRoundActive && !themeGuessData?.hasGuessedToday) {
      // Subtle crank/nudge during bonus round to prompt theme guess
      return 'bonusCrank 3s ease-in-out infinite';
    }
    if (isPerfectMatch) {
      return 'diamondGlisten 2s ease-in-out infinite';
    }
    if (shouldPulsate) {
      return 'pulsate 2s ease-in-out infinite';
    }
    return 'none';
  };
  
  const containerStyle: React.CSSProperties = {
    width: baseSize,
    height: baseSize,
    borderRadius: '0.5rem',
    backgroundColor: colors.backgroundColor,
    border: `3px solid ${colors.borderColor}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'var(--font-primary)',
    fontStyle: 'italic',
    fontWeight: 800,
    color: colors.textColor,
    fontSize: scaled ? 'clamp(1.1rem, 3.2vw, 1.4rem)' : 'clamp(1.2rem, 3.5vw, 1.5rem)',
    position: 'relative',
    flexShrink: 0,
    aspectRatio: '1 / 1',
    // Transform to diamond shape
    transform: scaled ? `rotate(45deg) scale(0.9)` : `rotate(45deg)`,
    boxShadow: showCelebrationAnimation
      ? `0 0 30px ${colors.glowColor}80, 0 0 60px ${colors.glowColor}50, 0 8px 24px ${colors.borderColor}60`
      : isPerfectMatch 
        ? `0 0 20px ${colors.glowColor}66, 0 0 40px ${colors.glowColor}33, 0 4px 12px ${colors.borderColor}40, inset 0 0 10px ${colors.glowColor}20`
        : `0 4px 12px ${colors.borderColor}26, 0 0 0 1px ${colors.borderColor}1A`,
    transition: showCelebrationAnimation ? 'none' : 'all 0.3s ease-in-out',
    animation: getAnimation(),
    cursor: onClick ? 'pointer' : 'default',
    boxSizing: 'border-box'
  };

  const handleClick = () => {
    // Allow click even during celebration - user might want to skip
    if (onClick) {
      onClick();
    }
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isCelebrating) return;
    setShowTooltip(true);
    if (onClick) {
      e.currentTarget.style.transform = scaled 
        ? `rotate(45deg) scale(0.93)` 
        : `rotate(45deg) scale(1.03)`;
      
      if (isPerfectMatch) {
        e.currentTarget.style.boxShadow = `0 0 35px ${colors.glowColor}80, 0 0 70px ${colors.glowColor}50, 0 6px 20px ${colors.borderColor}60, inset 0 0 20px ${colors.glowColor}30`;
        e.currentTarget.style.filter = 'brightness(1.3)';
      } else {
        e.currentTarget.style.boxShadow = `0 4px 12px ${colors.borderColor}33, 0 0 0 2px ${colors.borderColor}1F`;
      }
    }
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isCelebrating) return;
    setShowTooltip(false);
    if (onClick) {
      e.currentTarget.style.transform = scaled 
        ? `rotate(45deg) scale(0.9)` 
        : `rotate(45deg)`;
      
      if (isPerfectMatch) {
        e.currentTarget.style.boxShadow = `0 0 20px ${colors.glowColor}66, 0 0 40px ${colors.glowColor}33, 0 4px 12px ${colors.borderColor}40, inset 0 0 10px ${colors.glowColor}20`;
        e.currentTarget.style.filter = 'brightness(1)';
      } else {
        e.currentTarget.style.boxShadow = `0 4px 12px ${colors.borderColor}26, 0 0 0 1px ${colors.borderColor}1A`;
      }
    }
  };

  return (
    <>
      {/* CSS keyframes for animations */}
      <style>
        {`
          /* Pulsate animation - neutral glow to indicate interactivity without color change */
          @keyframes pulsate {
            0%, 100% {
              opacity: 1;
              box-shadow: 0 4px 12px rgba(100, 116, 139, 0.3), 0 0 0 2px rgba(100, 116, 139, 0.2);
              transform: rotate(45deg) scale(1);
            }
            50% {
              opacity: 0.85;
              box-shadow: 0 8px 24px rgba(100, 116, 139, 0.5), 0 0 0 3px rgba(100, 116, 139, 0.35);
              transform: rotate(45deg) scale(1.03);
            }
          }
          
          /* Bonus round crank - subtle periodic nudge to remind player to guess theme */
          @keyframes bonusCrank {
            0%, 85%, 100% {
              transform: rotate(45deg) scale(1);
              box-shadow: 0 4px 12px rgba(100, 116, 139, 0.3);
            }
            88% {
              transform: rotate(48deg) scale(1.02);
              box-shadow: 0 4px 16px rgba(100, 116, 139, 0.4);
            }
            91% {
              transform: rotate(42deg) scale(1.02);
              box-shadow: 0 4px 16px rgba(100, 116, 139, 0.4);
            }
            94% {
              transform: rotate(46deg) scale(1.01);
              box-shadow: 0 4px 14px rgba(100, 116, 139, 0.35);
            }
            97% {
              transform: rotate(44deg) scale(1.01);
              box-shadow: 0 4px 14px rgba(100, 116, 139, 0.35);
            }
          }
          
          /* Post-bonus theme summon - brighter nudge to drive theme guess click */
          @keyframes themeSummon {
            0%, 78%, 100% {
              transform: rotate(45deg) scale(1);
              box-shadow: 0 6px 16px rgba(26, 35, 126, 0.35), 0 0 0 2px rgba(26, 35, 126, 0.25);
            }
            82% {
              transform: rotate(47deg) scale(1.08);
              box-shadow: 0 10px 26px rgba(26, 35, 126, 0.5), 0 0 0 4px rgba(26, 35, 126, 0.3);
            }
            86% {
              transform: rotate(43deg) scale(1.08);
              box-shadow: 0 10px 26px rgba(26, 35, 126, 0.5), 0 0 0 4px rgba(26, 35, 126, 0.3);
            }
            90% {
              transform: rotate(45deg) scale(1.03);
              box-shadow: 0 8px 20px rgba(26, 35, 126, 0.4), 0 0 0 3px rgba(26, 35, 126, 0.28);
            }
          }
          
          @keyframes diamondGlisten {
            0%, 100% {
              box-shadow: 0 0 20px rgba(59, 130, 246, 0.4), 
                          0 0 40px rgba(59, 130, 246, 0.2), 
                          0 4px 12px rgba(59, 130, 246, 0.25),
                          inset 0 0 10px rgba(96, 165, 250, 0.15);
              filter: brightness(1);
            }
            25% {
              box-shadow: 0 0 30px rgba(59, 130, 246, 0.6), 
                          0 0 60px rgba(59, 130, 246, 0.3), 
                          0 6px 20px rgba(59, 130, 246, 0.4),
                          inset 0 0 20px rgba(96, 165, 250, 0.3),
                          inset -5px -5px 15px rgba(255, 255, 255, 0.4);
              filter: brightness(1.15);
            }
            50% {
              box-shadow: 0 0 40px rgba(59, 130, 246, 0.7), 
                          0 0 80px rgba(59, 130, 246, 0.4), 
                          0 8px 24px rgba(59, 130, 246, 0.5),
                          inset 0 0 25px rgba(96, 165, 250, 0.4),
                          inset -8px -8px 20px rgba(255, 255, 255, 0.5),
                          inset 8px 8px 20px rgba(59, 130, 246, 0.2);
              filter: brightness(1.25);
            }
            75% {
              box-shadow: 0 0 30px rgba(59, 130, 246, 0.6), 
                          0 0 60px rgba(59, 130, 246, 0.3), 
                          0 6px 20px rgba(59, 130, 246, 0.4),
                          inset 0 0 20px rgba(96, 165, 250, 0.3),
                          inset 5px 5px 15px rgba(255, 255, 255, 0.4);
              filter: brightness(1.15);
            }
          }
          
          /* Vault unlocking animation - click, click, swing open */
          @keyframes celebrateSpin {
            /* Initial state - vault locked */
            0% {
              transform: rotate(45deg) scale(1);
              filter: brightness(1);
              box-shadow: 0 4px 12px rgba(100, 116, 139, 0.3);
            }
            /* First tumbler click - small jerk */
            10% {
              transform: rotate(45deg) scale(1.05);
              filter: brightness(1.2);
              box-shadow: 0 0 20px rgba(100, 116, 139, 0.5);
            }
            15% {
              transform: rotate(60deg) scale(1.05);
              filter: brightness(1.1);
              box-shadow: 0 0 25px rgba(100, 116, 139, 0.4);
            }
            /* Second tumbler click - rotate more */
            25% {
              transform: rotate(60deg) scale(1.08);
              filter: brightness(1.3);
              box-shadow: 0 0 30px rgba(100, 116, 139, 0.6);
            }
            30% {
              transform: rotate(135deg) scale(1.08);
              filter: brightness(1.2);
              box-shadow: 0 0 35px rgba(100, 116, 139, 0.5);
            }
            /* Third tumbler - the big turn */
            40% {
              transform: rotate(135deg) scale(1.12);
              filter: brightness(1.4);
              box-shadow: 0 0 45px rgba(100, 116, 139, 0.7),
                          inset 0 0 20px rgba(255, 255, 255, 0.3);
            }
            50% {
              transform: rotate(315deg) scale(1.15);
              filter: brightness(1.5);
              box-shadow: 0 0 60px rgba(100, 116, 139, 0.8),
                          0 0 100px rgba(100, 116, 139, 0.4),
                          inset 0 0 30px rgba(255, 255, 255, 0.4);
            }
            /* Vault swings open - final rotation + slight tilt */
            60% {
              transform: rotate(405deg) scale(1.18) perspective(500px) rotateY(15deg);
              filter: brightness(1.6);
              box-shadow: 0 0 70px rgba(100, 116, 139, 0.9),
                          0 0 120px rgba(100, 116, 139, 0.5),
                          inset 0 0 40px rgba(255, 255, 255, 0.5);
            }
            /* Hold open briefly */
            75% {
              transform: rotate(405deg) scale(1.12) perspective(500px) rotateY(10deg);
              filter: brightness(1.4);
              box-shadow: 0 0 50px rgba(100, 116, 139, 0.7),
                          0 0 80px rgba(100, 116, 139, 0.4);
            }
            /* Settle back */
            90% {
              transform: rotate(405deg) scale(1.03);
              filter: brightness(1.1);
              box-shadow: 0 0 25px rgba(100, 116, 139, 0.4);
            }
            100% {
              transform: rotate(405deg) scale(1);
              filter: brightness(1);
              box-shadow: 0 4px 12px rgba(100, 116, 139, 0.3);
            }
          }
          
          /* Spoke decoration for vault effect */
          .vault-spoke {
            position: absolute;
            width: 2px;
            height: 40%;
            background: linear-gradient(to bottom, rgba(100, 116, 139, 0.6), transparent);
            top: 50%;
            left: 50%;
            transform-origin: center top;
            opacity: 0;
            pointer-events: none;
          }
          
          .celebrating .vault-spoke {
            animation: spokeReveal 1.5s ease-out;
          }
          
          @keyframes spokeReveal {
            0% { opacity: 0; }
            20% { opacity: 0.8; }
            60% { opacity: 0.6; }
            100% { opacity: 0; }
          }
          
          @keyframes counterRotateText {
            /* Counter-rotate text to keep it readable during vault unlock */
            0% { transform: rotate(-45deg) translateX(-0.04em); }
            15% { transform: rotate(-60deg) translateX(-0.04em); }
            30% { transform: rotate(-135deg) translateX(-0.04em); }
            50% { transform: rotate(-315deg) translateX(-0.04em); }
            60% { transform: rotate(-405deg) translateX(-0.04em); }
            100% { transform: rotate(-405deg) translateX(-0.04em); }
          }
        `}
      </style>
      
      <div style={{ position: 'relative', display: 'inline-block' }}>
        <div 
          className={isCelebrating ? 'celebrating' : ''}
          style={containerStyle}
          onClick={handleClick}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {/* Vault spokes - decorative lines that appear during unlock animation */}
          {isCelebrating && (
            <>
              <div className="vault-spoke" style={{ transform: 'rotate(0deg) translateX(-50%)' }} />
              <div className="vault-spoke" style={{ transform: 'rotate(45deg) translateX(-50%)' }} />
              <div className="vault-spoke" style={{ transform: 'rotate(90deg) translateX(-50%)' }} />
              <div className="vault-spoke" style={{ transform: 'rotate(135deg) translateX(-50%)' }} />
              <div className="vault-spoke" style={{ transform: 'rotate(180deg) translateX(-50%)' }} />
              <div className="vault-spoke" style={{ transform: 'rotate(225deg) translateX(-50%)' }} />
              <div className="vault-spoke" style={{ transform: 'rotate(270deg) translateX(-50%)' }} />
              <div className="vault-spoke" style={{ transform: 'rotate(315deg) translateX(-50%)' }} />
            </>
          )}
          
          {/* Dynamic text with appropriate styling */}
          <span style={{ 
            position: 'relative', 
            zIndex: 2,
            transform: `rotate(-45deg) translateX(-0.04em)`,
            marginLeft: '0.08em',
            lineHeight: '0.9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: isCelebrating ? 'counterRotateText 1.5s ease-in-out' : 'none',
            ...textStyling
          }}>
            {displayText}
          </span>
        </div>

      {/* Tooltip for 'Theme of the week' */}
      {showTooltip && onClick && !isCelebrating && (
        <div style={{
          position: 'absolute',
          top: '-3rem',
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
