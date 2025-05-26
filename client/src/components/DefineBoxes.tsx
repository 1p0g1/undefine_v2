import React from 'react';
import './DefineBoxes.css';
import { GameSessionState } from '../api/types';

// Use full key list for D.E.F.I.N.E. (E2 is the last box)
const DEFINE_KEYS = ['D', 'E', 'F', 'I', 'N', 'E2'] as const;
const DEFINE_LABELS = ['D', 'E', 'F', 'I', 'N', 'E'];
type DefineKey = (typeof DEFINE_KEYS)[number];

export type GuessStatus = 'correct' | 'incorrect' | 'fuzzy' | 'active' | 'empty';

interface DefineBoxesProps {
  gameState: GameSessionState;
  revealedClues: string[];
  guessStatus?: GuessStatus[];
}

export function DefineBoxes({ gameState, revealedClues, guessStatus = [] }: DefineBoxesProps) {
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

  return (
    <div className="define-boxes-container">
      <div className="define-boxes">
        {DEFINE_KEYS.map((key, i) => (
          <div key={key} className={getBoxClassName(key, i)} data-key={key}>
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
          D: '',
          E: '',
          F: null,
          I: null,
          N: '',
          E2: null,
        },
        guesses: [],
        revealedClues: [],
        clueStatus: {},
        usedHint: false,
        isComplete: false,
        isWon: false,
      }}
      revealedClues={[]}
    />
  );
}
