import React, { useState } from 'react';
import { DefineBoxes } from './DefineBoxes';
import { GameSessionState } from '../api/types';
import { GuessInput } from './GuessInput';
import { GameStatus } from './GameStatus';
import './GameBoard.css';

interface GameBoardProps {
  gameState: GameSessionState;
  guessStatus: ('correct' | 'incorrect' | 'fuzzy' | 'empty' | 'active')[];
  onGuess: (guess: string) => void;
  onPlayAgain?: () => void;
  fuzzyPositions?: number[];
  currentGuess?: string;
}

export function GameBoard({
  gameState,
  guessStatus,
  onGuess,
  onPlayAgain,
  fuzzyPositions = [],
  currentGuess = ''
}: GameBoardProps) {
  const [lastGuess, setLastGuess] = useState('');

  const handleGuess = (guess: string) => {
    setLastGuess(guess);
    onGuess(guess);
  };

  return (
    <div className="game-board">
      {/* D.E.F.I.N.E. boxes */}
      <DefineBoxes
        gameState={gameState}
        revealedClues={gameState.revealedClues}
        guessStatus={guessStatus}
      />

      {/* Clues section */}
      <div className="clues-section">
        {Object.entries(gameState.clues).map(([key, value]) => {
          const isRevealed = gameState.revealedClues.includes(key);
          if (!isRevealed) return null;
          return (
            <div key={key} className="clue-item">
              <span className="clue-label">{key === 'D' ? 'Definition' : key}</span>
              <span className="clue-value">{value}</span>
            </div>
          );
        })}
      </div>

      {/* Guess history */}
      <div className="guess-history">
        {gameState.guesses.map((guess, index) => (
          <div key={index} className={`guess-item ${guessStatus[index]}`}>
            {guess.split('').map((char, charIndex) => {
              const isFuzzy = fuzzyPositions.includes(charIndex) && index === gameState.guesses.length - 1;
              return (
                <span
                  key={charIndex}
                  className={`guess-char ${isFuzzy ? 'fuzzy' : ''}`}
                >
                  {char}
                </span>
              );
            })}
          </div>
        ))}
      </div>

      {/* Guess input */}
      <GuessInput
        onGuess={handleGuess}
        disabled={gameState.isComplete}
        maxLength={20}
      />

      {/* Game status */}
      <GameStatus
        gameState={gameState}
        onPlayAgain={onPlayAgain}
      />
    </div>
  );
} 