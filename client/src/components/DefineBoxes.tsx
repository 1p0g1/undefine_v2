import React, { useState, useEffect, useRef } from 'react';
import './DefineBoxes.css';
import { GameSessionState } from '../../../shared-types/src/game';
import { ShortClueKey, createDefaultClueStatus, CLUE_KEY_MAP } from '../../../shared-types/src/clues';

// Use full key list for D.E.F.I.N.E. (E2 is the last box)
const DEFINE_KEYS = ['D', 'E', 'F', 'I', 'N', 'E2'] as const;
const DEFINE_LABELS = ['D', 'E', 'F', 'I', 'N', 'E'];
type DefineKey = (typeof DEFINE_KEYS)[number];

export type GuessStatus = 'correct' | 'incorrect' | 'fuzzy' | 'active' | 'empty';

// Bonus round tier type
export type BonusTier = 'perfect' | 'good' | 'average' | 'miss' | null;

// Bonus round tier colors - Gold, Silver, Bronze
const BONUS_TIER_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  perfect: { bg: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)', border: '#B8860B', text: '#fff' },
  good: { bg: 'linear-gradient(135deg, #C0C0C0 0%, #A8A8A8 100%)', border: '#808080', text: '#fff' },
  average: { bg: 'linear-gradient(135deg, #CD7F32 0%, #A05A2C 100%)', border: '#8B4513', text: '#fff' },
  miss: { bg: '#f3f4f6', border: '#d1d5db', text: '#6b7280' }
};

// Mapping of DEFINE keys to their hover labels (short)
const DEFINE_HINTS: Record<string, string> = {
  'D': 'Definition',
  'E': 'Equivalents',
  'F': 'First Letter',
  'I': 'In a Sentence',
  'N': 'Number of Letters',
  'E2': 'Etymology'
};

const HINT_HIDE_DELAY_MS = 2000;
const HINT_TOOLTIP_OFFSET_REM = 0.35;

interface DefineBoxesProps {
  gameState: GameSessionState;
  revealedClues: ShortClueKey[];
  guessStatus: GuessStatus[];
  onBoxClick?: (message: string) => void;
  isLoading?: boolean;
  // NEW: Bonus round results - array of tiers for each bonus guess
  bonusResults?: BonusTier[];
}

export const DefineBoxes: React.FC<DefineBoxesProps> = ({
  gameState,
  revealedClues,
  guessStatus,
  onBoxClick,
  isLoading = false,
  bonusResults = []
}) => {
  const letters = ['D', 'E', 'F', 'I', 'N', 'E'];
  const [showHint, setShowHint] = useState<string | null>(null);
  const [hintTimer, setHintTimer] = useState<NodeJS.Timeout | null>(null);
  const [hintAnchorLeft, setHintAnchorLeft] = useState<number | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  const handleBoxHover = (letter: string, hoveredElement: HTMLDivElement) => {
    if (hintTimer) clearTimeout(hintTimer);
    setShowHint(DEFINE_HINTS[letter]);
    
    const wrapperElement = wrapperRef.current;
    if (wrapperElement) {
      const wrapperRect = wrapperElement.getBoundingClientRect();
      const hoveredRect = hoveredElement.getBoundingClientRect();
      const hoveredCenterX = hoveredRect.left + hoveredRect.width / 2;
      setHintAnchorLeft(hoveredCenterX - wrapperRect.left);
    } else {
      setHintAnchorLeft(null);
    }
    
    // Hide hint after 2 seconds
    const timer = setTimeout(() => {
      setShowHint(null);
      setHintAnchorLeft(null);
    }, HINT_HIDE_DELAY_MS);
    setHintTimer(timer);
  };

  useEffect(() => {
    return () => {
      if (hintTimer) clearTimeout(hintTimer);
    };
  }, [hintTimer]);

  // Preload the BoxCover frame image (v=2 cache-bust for updated asset)
  useEffect(() => {
    const img = new Image();
    img.src = '/BoxCover.png?v=2';
  }, []);

  // Calculate which boxes are for guesses vs bonus round
  const guessCount = gameState.guesses?.length || 0;
  const isGameWon = gameState.isWon;
  const isGameComplete = gameState.isComplete;

  return (
    <div
      ref={wrapperRef}
      className="define-boxes-wrapper"
      style={{ 
      display: 'flex', 
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative'
    }}>
      {/* Gap between DEFINE boxes */}
      <div style={{ display: 'flex', gap: '0.2rem' }}>
        {letters.map((letter, index) => {
          const isRevealed = revealedClues.includes(letter as ShortClueKey);
          const status = guessStatus[gameState.guesses.length];
          const isActive = status === 'active' && index === gameState.guesses.length;
          const isCorrect = guessStatus[index] === 'correct';
          const isIncorrect = guessStatus[index] === 'incorrect';
          const isFuzzy = guessStatus[index] === 'fuzzy';

          // Determine if this box should show bonus round result
          // Bonus results apply to boxes AFTER the guesses used (when player won early)
          const bonusIndex = index - guessCount;
          const hasBonusResult = isGameWon && isGameComplete && bonusIndex >= 0 && bonusIndex < bonusResults.length;
          const bonusTier = hasBonusResult ? bonusResults[bonusIndex] : null;
          const bonusColors = bonusTier ? BONUS_TIER_COLORS[bonusTier] : null;

          // Determine colors - bonus round takes precedence for remaining boxes
          // Default background is cream color (#fef6e9)
          let backgroundColor = '#fef6e9';
          let borderColor = 'var(--color-primary, #1a237e)';
          let textColor = 'var(--color-primary, #1a237e)';
          let backgroundStyle: React.CSSProperties = {};
          
          if (bonusColors && hasBonusResult) {
            // Bonus round result styling
            backgroundStyle = { background: bonusColors.bg };
            borderColor = bonusColors.border;
            textColor = bonusColors.text;
          } else if (isCorrect) {
            backgroundColor = '#4caf50';
            textColor = '#fff';
          } else if (isIncorrect) {
            backgroundColor = '#ef5350';
            textColor = '#fff';
          } else if (isFuzzy) {
            backgroundColor = '#ff9800';
            textColor = '#fff';
          } else if (isActive) {
            backgroundColor = '#fef6e9'; // Keep cream color when active
          }

          // Handle special case for second E
          const clueKey = letter === 'E' && index === 5 ? 'E2' : letter;

          // Box size optimized for mobile - must fit 6 boxes in ~85vw
          const boxSize = 'clamp(2.5rem, 12vw, 3.2rem)';
          
          return (
            <div
              key={`${letter}-${index}`}
              onMouseEnter={(event) => handleBoxHover(clueKey, event.currentTarget)}
              onMouseLeave={() => {
                if (hintTimer) clearTimeout(hintTimer);
                setShowHint(null);
                setHintAnchorLeft(null);
              }}
              onClick={() => {
                onBoxClick?.('Guess to reveal clues');
              }}
              style={{
                width: boxSize,
                height: boxSize,
                position: 'relative',
                cursor: isRevealed ? 'pointer' : 'default',
                animation: isLoading ? `wave 1.2s ease-in-out ${index * 0.1}s infinite` : 'none',
                zIndex: 1
              }}
            >
              {/* Inner colored content - positioned to show through frame window */}
              <div
                style={{
                  position: 'absolute',
                  top: '18%',
                  left: '15%',
                  right: '15%',
                  bottom: '18%',
                  borderRadius: '0.1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 'clamp(1.1rem, 3vw, 1.4rem)',
                  fontWeight: 700,
                  color: textColor,
                  backgroundColor: bonusColors ? undefined : backgroundColor,
                  transition: 'all 0.3s ease',
                  fontFamily: 'var(--font-primary)',
                  zIndex: 1,
                  ...backgroundStyle
                }}
              >
                {letter}
              </div>
              
              {/* BoxCover frame overlay - positioned to wrap around the colored box */}
              <img
                src="/BoxCover.png?v=2"
                alt=""
                draggable={false}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  pointerEvents: 'none',
                  zIndex: 2,
                  objectFit: 'fill'
                }}
              />
            </div>
          );
        })}
      </div>
      {showHint && (
        <div 
          style={{
            position: 'absolute',
            bottom: `calc(100% + ${HINT_TOOLTIP_OFFSET_REM}rem)`,
            left: hintAnchorLeft !== null ? `${hintAnchorLeft}px` : '50%',
            transform: 'translateX(-50%)',
            fontSize: '0.75rem',
            color: 'white',
            fontFamily: 'var(--font-primary)',
            fontWeight: 500,
            opacity: 0.95,
            transition: 'opacity 0.2s ease',
            textAlign: 'center',
            backgroundColor: 'rgba(26, 35, 126, 0.9)',
            backdropFilter: 'blur(4px)',
            padding: '0.4rem 0.75rem',
            borderRadius: '0.375rem',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            whiteSpace: 'nowrap',
            letterSpacing: '0.01em',
            zIndex: 1000,
            pointerEvents: 'none'
          }}
        >
          {showHint}
        </div>
      )}
      <style>{`
        @keyframes wave {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-3px);
          }
        }
      `}</style>
    </div>
  );
};

/**
 * Inline static DEFINE boxes for homepage Today box - matches top-of-page styling:
 * BoxCover.png overlay + hover tooltips (Definition, Equivalents, etc.)
 * Use where space is constrained (e.g. next to "Today:") - slightly smaller, spaced for PNGs.
 */
export const StaticDefineBoxesInline: React.FC<{
  boxSize?: string;
  gap?: string;
}> = ({ boxSize = 'clamp(1.8rem, 4.5vw, 2.2rem)', gap = '0.35rem' }) => {
  const letters = ['D', 'E', 'F', 'I', 'N', 'E'] as const;
  const [showHint, setShowHint] = useState<string | null>(null);
  const [hintTimer, setHintTimer] = useState<NodeJS.Timeout | null>(null);
  const [hintAnchorLeft, setHintAnchorLeft] = useState<number | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  const handleBoxHover = (clueKey: string, hoveredElement: HTMLDivElement) => {
    if (hintTimer) clearTimeout(hintTimer);
    setShowHint(DEFINE_HINTS[clueKey]);
    const wrapperElement = wrapperRef.current;
    if (wrapperElement) {
      const wrapperRect = wrapperElement.getBoundingClientRect();
      const hoveredRect = hoveredElement.getBoundingClientRect();
      setHintAnchorLeft(hoveredRect.left + hoveredRect.width / 2 - wrapperRect.left);
    } else setHintAnchorLeft(null);
    const timer = setTimeout(() => {
      setShowHint(null);
      setHintAnchorLeft(null);
    }, HINT_HIDE_DELAY_MS);
    setHintTimer(timer);
  };

  useEffect(() => () => { if (hintTimer) clearTimeout(hintTimer); }, [hintTimer]);

  return (
    <div
      ref={wrapperRef}
      style={{ display: 'flex', gap, alignItems: 'center', position: 'relative' }}
    >
      {letters.map((letter, index) => {
        const clueKey = letter === 'E' && index === 5 ? 'E2' : letter;
        return (
          <div
            key={`${letter}-${index}`}
            onMouseEnter={(e) => handleBoxHover(clueKey, e.currentTarget)}
            onMouseLeave={() => {
              if (hintTimer) clearTimeout(hintTimer);
              setShowHint(null);
              setHintAnchorLeft(null);
            }}
            style={{
              width: boxSize,
              height: boxSize,
              position: 'relative',
              cursor: 'pointer',
              zIndex: 1
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: '18%',
                left: '15%',
                right: '15%',
                bottom: '18%',
                borderRadius: '0.1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 'clamp(0.85rem, 2.2vw, 1rem)',
                fontWeight: 700,
                color: 'var(--color-primary, #1a237e)',
                backgroundColor: '#fef6e9',
                fontFamily: 'var(--font-primary)',
                zIndex: 1
              }}
            >
              {letter}
            </div>
            <img
              src="/BoxCover.png?v=2"
              alt=""
              draggable={false}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
                zIndex: 2,
                objectFit: 'fill'
              }}
            />
          </div>
        );
      })}
      {showHint && (
        <div
          style={{
            position: 'absolute',
            bottom: `calc(100% + ${HINT_TOOLTIP_OFFSET_REM}rem)`,
            left: hintAnchorLeft !== null ? `${hintAnchorLeft}px` : '50%',
            transform: 'translateX(-50%)',
            fontSize: '0.75rem',
            color: 'white',
            fontFamily: 'var(--font-primary)',
            fontWeight: 500,
            opacity: 0.95,
            textAlign: 'center',
            backgroundColor: 'rgba(26, 35, 126, 0.9)',
            backdropFilter: 'blur(4px)',
            padding: '0.4rem 0.75rem',
            borderRadius: '0.375rem',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            whiteSpace: 'nowrap',
            zIndex: 1000,
            pointerEvents: 'none'
          }}
        >
          {showHint}
        </div>
      )}
    </div>
  );
};

// Static version for How to Play
export const StaticDefineBoxes = () => {
  const letters = ['D', 'E', 'F', 'I', 'N', 'E'];
  const emptyGameState = {
    gameId: '',
    wordId: '',
    wordText: '',
    clues: {
      definition: '',
      equivalents: '',
      first_letter: '',
      in_a_sentence: '',
      number_of_letters: '',
      etymology: '',
    },
    guesses: [],
    revealedClues: [],
    clueStatus: createDefaultClueStatus(),
    isComplete: false,
    isWon: false,
    score: null,
    startTime: ''
  };

  return (
    <DefineBoxes
      gameState={emptyGameState}
      revealedClues={[]}
      guessStatus={['empty', 'empty', 'empty', 'empty', 'empty', 'empty']}
      isLoading={false}
    />
  );
};
