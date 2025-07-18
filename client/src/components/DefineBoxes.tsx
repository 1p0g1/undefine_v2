import React, { useState, useEffect } from 'react';
import './DefineBoxes.css';
import { GameSessionState } from '../../../shared-types/src/game';
import { ShortClueKey, createDefaultClueStatus, CLUE_KEY_MAP } from '../../../shared-types/src/clues';

// Use full key list for D.E.F.I.N.E. (E2 is the last box)
const DEFINE_KEYS = ['D', 'E', 'F', 'I', 'N', 'E2'] as const;
const DEFINE_LABELS = ['D', 'E', 'F', 'I', 'N', 'E'];
type DefineKey = (typeof DEFINE_KEYS)[number];

export type GuessStatus = 'correct' | 'incorrect' | 'fuzzy' | 'active' | 'empty';

// Mapping of DEFINE keys to their hint descriptions
const DEFINE_HINTS: Record<string, string> = {
  'D': 'Definition: Guess to reveal hints',
  'E': 'Equivalents: Guess to reveal hints',
  'F': 'First Letter: Guess to reveal hints',
  'I': 'In a Sentence: Guess to reveal hints',
  'N': 'Number of Letters: Guess to reveal hints',
  'E2': 'Etymology: Guess to reveal hints'
};

interface DefineBoxesProps {
  gameState: GameSessionState;
  revealedClues: ShortClueKey[];
  guessStatus: GuessStatus[];
  onBoxClick?: (message: string) => void;
  isLoading?: boolean;
}

export const DefineBoxes: React.FC<DefineBoxesProps> = ({
  gameState,
  revealedClues,
  guessStatus,
  onBoxClick,
  isLoading = false
}) => {
  const letters = ['D', 'E', 'F', 'I', 'N', 'E'];
  const [showHint, setShowHint] = useState<string | null>(null);
  const [hintTimer, setHintTimer] = useState<NodeJS.Timeout | null>(null);

  const handleBoxHover = (letter: string) => {
    if (hintTimer) clearTimeout(hintTimer);
    setShowHint(DEFINE_HINTS[letter]);
    
    // Hide hint after 2 seconds
    const timer = setTimeout(() => {
      setShowHint(null);
    }, 2000);
    setHintTimer(timer);
  };

  useEffect(() => {
    return () => {
      if (hintTimer) clearTimeout(hintTimer);
    };
  }, [hintTimer]);

  return (
    <div className="define-boxes-wrapper" style={{ 
      display: 'flex', 
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative'
    }}>
      <div style={{ display: 'flex', gap: '0.25rem' }}>
        {letters.map((letter, index) => {
          const isRevealed = revealedClues.includes(letter as ShortClueKey);
          const status = guessStatus[gameState.guesses.length];
          const isActive = status === 'active' && index === gameState.guesses.length;
          const isCorrect = guessStatus[index] === 'correct';
          const isIncorrect = guessStatus[index] === 'incorrect';
          const isFuzzy = guessStatus[index] === 'fuzzy';

          let backgroundColor = '#fff';
          let borderColor = 'var(--color-primary, #1a237e)';
          
          if (isCorrect) backgroundColor = '#4caf50';
          else if (isIncorrect) backgroundColor = '#ef5350';
          else if (isFuzzy) backgroundColor = '#ff9800';
          else if (isActive) backgroundColor = '#e8eaf6';

          // Handle special case for second E
          const clueKey = letter === 'E' && index === 5 ? 'E2' : letter;

          return (
            <div
              key={`${letter}-${index}`}
              onMouseEnter={() => handleBoxHover(clueKey)}
              onMouseLeave={() => {
                if (hintTimer) clearTimeout(hintTimer);
                setShowHint(null);
              }}
              onClick={() => {
                // Removed click functionality - hover hints are sufficient
              }}
              style={{
                width: 'clamp(2.2rem, 6vw, 2.5rem)',
                height: 'clamp(2.2rem, 6vw, 2.5rem)',
                border: `2px solid ${borderColor}`,
                borderRadius: '0.4rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 'clamp(1.2rem, 3.5vw, 1.4rem)',
                fontWeight: 700,
                color: isCorrect || isIncorrect || isFuzzy ? '#fff' : 'var(--color-primary, #1a237e)',
                backgroundColor,
                cursor: isRevealed ? 'pointer' : 'default',
                transition: 'all 0.2s ease',
                animation: isLoading ? `wave 1.2s ease-in-out ${index * 0.1}s infinite` : 'none',
                fontFamily: 'var(--font-primary)',
                position: 'relative',
                zIndex: 1
              }}
            >
              {letter}
            </div>
          );
        })}
      </div>
      {showHint && (
        <div 
          style={{
            position: 'absolute',
            top: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            marginTop: '0.25rem',
            fontSize: 'clamp(0.875rem, 2.2vw, 1rem)',
            color: 'var(--color-primary)',
            fontFamily: 'var(--font-primary)',
            opacity: 0.9,
            transition: 'opacity 0.2s ease',
            textAlign: 'center',
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            padding: '0.25rem 0.5rem',
            borderRadius: '0.25rem',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            border: '1px solid rgba(26, 35, 126, 0.1)',
            whiteSpace: 'nowrap',
            zIndex: 10
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
