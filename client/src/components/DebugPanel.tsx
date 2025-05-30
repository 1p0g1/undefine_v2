import React from 'react';
import { GameSessionState } from '../../../shared-types/src/game';

interface DebugPanelProps {
  gameState: GameSessionState;
  isVisible: boolean;
}

const DebugPanel: React.FC<DebugPanelProps> = ({ gameState, isVisible }) => {
  if (!isVisible || process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div 
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        background: 'rgba(0, 0, 0, 0.8)',
        color: '#00ff00',
        padding: '15px',
        borderRadius: '8px',
        fontFamily: 'monospace',
        fontSize: '12px',
        maxWidth: '400px',
        maxHeight: '400px',
        overflow: 'auto',
        zIndex: 9999,
      }}
    >
      <h3 style={{ margin: '0 0 10px 0', color: '#fff' }}>Game Debug Info</h3>
      <pre style={{ margin: 0 }}>
        {JSON.stringify({
          gameId: gameState.gameId,
          wordId: gameState.wordId,
          guessCount: gameState.guesses.length,
          revealedClues: gameState.revealedClues,
          isComplete: gameState.isComplete,
          isWon: gameState.isWon,
          score: gameState.score,
          usedHint: gameState.usedHint,
          clueStatus: gameState.clueStatus,
        }, null, 2)}
      </pre>
    </div>
  );
};

export default DebugPanel; 