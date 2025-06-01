import React from 'react';
import './DefineBoxes.css';
import { GameSessionState } from '../api/types';
import { createDefaultClueStatus } from '../../../shared-types/src/clues';

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
  revealedClues: string[];
  guessStatus?: GuessStatus[];
  onBoxClick?: (message: string) => void;
}

export function DefineBoxes({ gameState, revealedClues, guessStatus = [], onBoxClick }: DefineBoxesProps) {
  if (!gameState) return null;

  const getBoxClassName = (key: DefineKey, idx: number) => {
    const baseClass = 'define-box';
    const status = guessStatus[idx] || 'empty';
    if (status === 'correct') return `${baseClass} correct`;
    if (status === 'incorrect') return `${baseClass} incorrect`;
    if (status === 'fuzzy') return `${baseClass} fuzzy`;
    if (status === 'active') return `${baseClass} active`;
    return baseClass;
  };

  const handleBoxClick = (key: DefineKey) => {
    if (onBoxClick) {
      onBoxClick(DEFINE_HINTS[key]);
    }
  };

  return (
    <div className="define-boxes-container">
      <div className="define-boxes">
        {DEFINE_KEYS.map((key, i) => (
          <div 
            key={key} 
            className={getBoxClassName(key, i)} 
            data-key={key}
            onClick={() => handleBoxClick(key)}
            style={{ cursor: onBoxClick ? 'pointer' : 'default' }}
          >
            {DEFINE_LABELS[i]}
          </div>
        ))}
      </div>
    </div>
  );
}

// Static version for How to Play
export function StaticDefineBoxes() {
  return (
    <DefineBoxes
      gameState={{
        gameId: '',
        wordId: '',
        wordText: '',
        clues: {
          definition: '',
          equivalents: '',
          first_letter: '',
          in_a_sentence: '',
          number_of_letters: '',
          etymology: ''
        },
        guesses: [],
        revealedClues: [],
        clueStatus: createDefaultClueStatus(),
        isComplete: false,
        isWon: false,
        score: null,
        startTime: ''
      }}
      revealedClues={[]}
    />
  );
}
