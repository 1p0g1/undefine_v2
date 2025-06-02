import React from 'react';
import './DefineBoxes.css';
import { GameSessionState } from '../../../shared-types/src/game';
import { ShortClueKey, createDefaultClueStatus } from '../../../shared-types/src/clues';

// Use full key list for D.E.F.I.N.E. (E2 is the last box)
const DEFINE_KEYS = ['D', 'E', 'F', 'I', 'N', 'E2'] as const;
const DEFINE_LABELS = ['D', 'E', 'F', 'I', 'N', 'E'];
type DefineKey = (typeof DEFINE_KEYS)[number];

export type GuessStatus = 'correct' | 'incorrect' | 'fuzzy' | 'active' | 'empty';

// Mapping of DEFINE keys to their hint descriptions
const DEFINE_HINTS: Record<DefineKey, string> = {
  'D': 'Definition: Unlock hints by making a guess',
  'E': 'Equivalents: Unlock hints by making a guess', 
  'F': 'First Letter: Unlock hints by making a guess',
  'I': 'In a Sentence: Unlock hints by making a guess',
  'N': 'Number of Letters: Unlock hints by making a guess',
  'E2': 'Etymology: Unlock hints by making a guess'
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

  return (
    <div style={{ display: 'flex', gap: '0.4rem' }}>
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

        return (
          <div
            key={letter}
            onClick={() => {
              if (onBoxClick && isRevealed) {
                onBoxClick(`${letter}: ${gameState.clues[letter.toLowerCase() as keyof typeof gameState.clues]}`);
              }
            }}
            style={{
              width: '3.5rem',
              height: '3.5rem',
              border: `2px solid ${borderColor}`,
              borderRadius: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.75rem',
              fontWeight: 700,
              color: isCorrect || isIncorrect || isFuzzy ? '#fff' : 'var(--color-primary, #1a237e)',
              backgroundColor,
              cursor: isRevealed ? 'pointer' : 'default',
              transition: 'all 0.2s ease',
              animation: isLoading ? `jiggle 0.6s ease-in-out ${index * 0.1}s infinite` : 'none',
              fontFamily: 'var(--font-primary)',
            }}
          >
            {letter}
          </div>
        );
      })}
      <style>{`
        @keyframes jiggle {
          0%, 100% {
            transform: translateY(0);
          }
          25% {
            transform: translateY(-4px) rotate(-2deg);
          }
          75% {
            transform: translateY(4px) rotate(2deg);
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
