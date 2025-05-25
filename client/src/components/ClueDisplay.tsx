import React from 'react';
import { GameSessionState } from '../api/types';
import { CLUE_SEQUENCE } from '../hooks/useGame';
import './ClueDisplay.css';

interface ClueDisplayProps {
  gameState: GameSessionState;
}

export function ClueDisplay({ gameState }: ClueDisplayProps) {
  return (
    <div className="clue-display">
      {CLUE_SEQUENCE.map(({ key, label }) => {
        const value = gameState.clues[key as keyof typeof gameState.clues];
        const isRevealed = gameState.revealedClues.includes(key);
        const status = gameState.clueStatus[key];

        return (
          <div
            key={key}
            className={`clue-card ${isRevealed ? 'revealed' : 'hidden'} ${status}`}
          >
            <div className="clue-header">
              <span className="clue-key">{key}</span>
              <span className="clue-label">{label}</span>
            </div>
            <div className="clue-content">
              {isRevealed ? (
                <span className="clue-value">{value}</span>
              ) : (
                <span className="clue-placeholder">?</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
} 