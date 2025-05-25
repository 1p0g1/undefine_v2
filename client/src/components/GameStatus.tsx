import React from 'react';
import { GameSessionState } from '../api/types';
import './GameStatus.css';

interface GameStatusProps {
  gameState: GameSessionState;
  onPlayAgain?: () => void;
}

export function GameStatus({ gameState, onPlayAgain }: GameStatusProps) {
  const getTimeElapsed = () => {
    if (!gameState.startTime) return '0:00';
    const start = new Date(gameState.startTime).getTime();
    const end = gameState.endTime 
      ? new Date(gameState.endTime).getTime()
      : Date.now();
    const elapsed = Math.floor((end - start) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="game-status">
      {/* Game progress */}
      <div className="game-progress">
        <div className="progress-item">
          <span className="progress-label">Guesses</span>
          <span className="progress-value">{gameState.guessesUsed}/6</span>
        </div>
        <div className="progress-item">
          <span className="progress-label">Time</span>
          <span className="progress-value">{getTimeElapsed()}</span>
        </div>
        <div className="progress-item">
          <span className="progress-label">Clues</span>
          <span className="progress-value">
            {gameState.revealedClues.length}/6
          </span>
        </div>
      </div>

      {/* Game completion */}
      {gameState.isComplete && (
        <div className="game-completion">
          <div className={`completion-message ${gameState.isWon ? 'win' : 'lose'}`}>
            {gameState.isWon ? (
              <>
                <span className="emoji">🎉</span>
                <span>Congratulations! You won!</span>
              </>
            ) : (
              <>
                <span className="emoji">😔</span>
                <span>Game Over</span>
              </>
            )}
          </div>
          {onPlayAgain && (
            <button
              onClick={onPlayAgain}
              className="play-again-button"
              aria-label="Play again"
            >
              Play Again
            </button>
          )}
        </div>
      )}
    </div>
  );
} 