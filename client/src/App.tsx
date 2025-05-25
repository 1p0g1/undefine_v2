import { useEffect, useRef, useState } from 'react';
import useGame from './hooks/useGame';
import { DefineBoxes } from './components/DefineBoxes';
import { getVisibleClues } from './hooks/useGame';
import { GameSummaryModal } from './GameSummaryModal';
import confetti from 'canvas-confetti';
import { getPlayerId } from './utils/player';
import { GameBoard } from './components/GameBoard';

function App() {
  const {
    gameState,
    startNewGame,
    submitGuess,
    guessStatus,
    showLeaderboard,
    leaderboardData,
    playerRank,
    isLeaderboardLoading,
    leaderboardError,
  } = useGame();
  const [timer, setTimer] = useState(0);
  const [showSummary, setShowSummary] = useState(false);
  const [canReopenSummary, setCanReopenSummary] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const summaryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [showRules, setShowRules] = useState(false);

  useEffect(() => {
    startNewGame();
  }, [startNewGame]);

  useEffect(() => {
    if (gameState.isComplete) {
      if (timerRef.current) clearInterval(timerRef.current);
      summaryTimeoutRef.current = setTimeout(() => {
        setShowSummary(true);
        setCanReopenSummary(false);
      }, 5000);
      return;
    }
    timerRef.current = setInterval(() => setTimer(t => t + 1), 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameState.isComplete]);

  useEffect(() => {
    return () => {
      if (summaryTimeoutRef.current) clearTimeout(summaryTimeoutRef.current);
    };
  }, []);

  const visibleClues = gameState.clues
    ? getVisibleClues(gameState.clues, gameState.guesses, gameState.wordText)
      : [];
  const revealedClueKeys = visibleClues.map(c => c.key);

  // Compute box status for each box
  const boxStatus = guessStatus.slice();
  if (!gameState.isComplete && gameState.guesses.length < 6) {
    boxStatus[gameState.guesses.length] = 'active';
  }

  const handleCloseSummary = () => {
    setShowSummary(false);
    setCanReopenSummary(true);
  };

  const handleReopenSummary = () => {
    setShowSummary(true);
    setCanReopenSummary(false);
  };

  // Handler to show leaderboard modal (View Results)
  const showLeaderboardModal = () => {
    setShowSummary(true);
    setCanReopenSummary(false);
  };

  const launchConfetti = () => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
    });
  };

  useEffect(() => {
    if (gameState.isComplete && gameState.isWon) {
      setTimeout(() => launchConfetti(), 300);
    }
  }, [gameState.isComplete, gameState.isWon]);

  return (
    <div
      className="flex flex-col items-center text-center px-4 w-full max-w-sm mx-auto min-h-screen main-container"
      style={{ paddingTop: 24, paddingBottom: 88 }}
    >
      {/* Timer Row */}
      <div
        style={{ margin: '0 auto', textAlign: 'center', marginBottom: '0.25rem', width: '100%' }}
      >
        <span
          className="game-timer timer"
          style={{
            fontSize: '1rem',
            fontWeight: 400,
            opacity: 0.85,
            fontFamily: 'Inter, Roboto, DM Sans, Arial, sans-serif',
            letterSpacing: '0.04em',
            display: 'inline-block',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {String(Math.floor(timer / 60)).padStart(2, '0')}
          <span className="colon" style={{ animation: 'blink 1s infinite' }}>
            :
          </span>
          {String(timer % 60).padStart(2, '0')}
        </span>
      </div>
      {/* Un·DEFINE Row */}
      <div
        className="define-header"
        style={{
          display: 'flex',
          flexWrap: 'nowrap',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          whiteSpace: 'nowrap',
          gap: '0.4rem',
          width: '100%',
          marginTop: '0.7rem',
          marginBottom: '0.5rem',
        }}
      >
        <span
          className="un-prefix"
          style={{
            fontFamily: 'var(--font-primary)',
            fontStyle: 'italic',
            fontWeight: 700,
            color: '#1a237e',
            fontSize: '1.1rem',
            marginRight: '0.5rem',
            whiteSpace: 'nowrap',
          }}
        >
          Un·
        </span>
        <div className="define-boxes" style={{ display: 'flex', gap: '0.4rem' }}>
          <DefineBoxes
            gameState={gameState}
            revealedClues={revealedClueKeys}
            guessStatus={boxStatus}
          />
        </div>
      </div>
      {showRules && (
        <div className="modal-overlay" onClick={() => setShowRules(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>How to Play</h2>
            <p>
              Un·Define is a clue-based word guessing game. Each letter in D·E·F·I·N·E reveals a
              different hint:
              <br />
              <strong>D</strong>: Definition
              <br />
              <strong>E</strong>: Equivalents (Synonyms)
              <br />
              <strong>F</strong>: First Letter
              <br />
              <strong>I</strong>: In a Sentence
              <br />
              <strong>N</strong>: Number of Letters
              <br />
              <strong>E</strong>: Etymology
              <br />
              <br />
              Use these clues to guess the word within 6 tries. Good luck!
            </p>
            <button onClick={() => setShowRules(false)}>Close</button>
          </div>
        </div>
      )}
      {/* Past Guesses below DEFINE row */}
      {gameState.guesses.length > 0 && (
        <div className="past-guesses">Past guesses: {gameState.guesses.join(', ')}</div>
      )}
      {/* Clues Section */}
      <div className="hint-blocks" style={{ width: '100%', maxWidth: 420, margin: '0 auto' }}>
        {visibleClues.map((clue, idx) => {
          const letter = clue.key;
          const title = clue.label;
          return (
            <div className="hint-row" key={clue.key}>
              <div className="hint-letter">{letter}</div>
              <div className="hint-box">
                <div className="hint-title">{title}</div>
                <div className="hint-text">{clue.value}</div>
              </div>
            </div>
          );
        })}
      </div>
      {/* Solution Reveal */}
      {gameState.isComplete && (
        <div
          className="solution-reveal"
          style={{ fontSize: 20, fontWeight: 700, margin: '1.2rem 0' }}
        >
          The word was: {gameState.wordText}
        </div>
      )}
      {/* Action Buttons */}
        <div
          style={{
            display: 'flex',
          gap: '0.5rem',
          justifyContent: 'center',
          marginTop: '1rem',
          }}
        >
          <button
            type="button"
          onClick={() => setShowRules(true)}
            style={{
            padding: '0.5rem 1rem',
            borderRadius: '0.25rem',
            backgroundColor: '#f3f4f6',
            color: '#374151',
            border: 'none',
            cursor: 'pointer',
              fontFamily: 'var(--font-primary)',
            fontSize: '0.875rem',
            fontWeight: 500,
            transition: 'background-color 0.2s',
            }}
        >
          How to Play
          </button>
        {gameState.isComplete && (
          <button
            type="button"
            onClick={showLeaderboardModal}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '0.25rem',
              backgroundColor: '#1a237e',
              color: 'white',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'var(--font-primary)',
              fontSize: '0.875rem',
              fontWeight: 500,
              transition: 'background-color 0.2s',
            }}
            aria-label="View Results"
          >
            View Results
          </button>
        )}
        </div>
      <GameBoard
        gameState={gameState}
        guessStatus={guessStatus}
        onGuess={submitGuess}
        onPlayAgain={startNewGame}
      />
      <GameSummaryModal
        open={showSummary}
        onClose={handleCloseSummary}
        onPlayAgain={startNewGame}
        word={gameState.wordText}
        time={`${String(Math.floor(timer / 60)).padStart(2, '0')}:${String(timer % 60).padStart(2, '0')}`}
        guessesUsed={gameState.guesses.length}
        fuzzyMatches={0}
        hintsUsed={0}
        date={new Date().toLocaleDateString('en-GB')}
        guessStatus={guessStatus}
        leaderboard={leaderboardData}
        playerRank={playerRank}
        isLoading={isLeaderboardLoading}
        error={leaderboardError || undefined}
      />
      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}

export default App;
