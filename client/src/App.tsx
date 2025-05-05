import { useEffect, useRef, useState } from 'react';
import useGame from './hooks/useGame';
import { DefineBoxes } from './components/DefineBoxes';
import { getVisibleClues } from './hooks/useGame';
import { GameSummaryModal } from './GameSummaryModal';
import confetti from 'canvas-confetti';
import PowerGame from "./components/PowerGame";
import { Routes, Route } from 'react-router-dom';

function App() {
  const { gameState, startNewGame, submitGuess, solution, clues, guessStatus, showLeaderboard } =
    useGame();
  const [guess, setGuess] = useState('');
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

  const handleGuessSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = guess.trim();
    if (!trimmed) return;
    if (gameState.guesses.includes(trimmed)) return;
    submitGuess(trimmed);
    setGuess('');
  };

  const visibleClues =
    clues && solution && gameState && gameState.guesses
      ? getVisibleClues(clues, gameState.guesses, solution)
      : [];
  const revealedClueKeys = visibleClues.map(c => c.key);

  // Compute box status for each box
  const boxStatus = guessStatus.slice();
  if (!gameState.isComplete && gameState.guesses.length < 6) {
    boxStatus[gameState.guesses.length] = 'active';
  }

  // Mock leaderboard data for now
  const leaderboard = [
    { rank: 1, player: 'Alice', time: '01:23', guesses: 3, fuzzy: 1, hints: 0 },
    { rank: 2, player: 'Bob', time: '01:45', guesses: 4, fuzzy: 0, hints: 1 },
    {
      rank: 3,
      player: 'You',
      time: `${String(Math.floor(timer / 60)).padStart(2, '0')}:${String(timer % 60).padStart(2, '0')}`,
      guesses: gameState.guesses.length,
      fuzzy: 0,
      hints: 0,
      isSelf: true,
    },
    { rank: 4, player: 'Carol', time: '02:10', guesses: 5, fuzzy: 2, hints: 1 },
  ];

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
      {/* Hints as structured rows */}
      <div className="hint-blocks" style={{ width: '100%', maxWidth: 420, margin: '0 auto' }}>
        {visibleClues.map((clue, idx) => {
          const clueTitles = {
            D: 'Definition',
            E: 'Equivalents',
            F: 'First Letter',
            I: 'In a Sentence',
            N: 'Number of Letters',
            E2: 'Etymology',
          };
          const clueLetters = { D: 'D', E: 'E', F: 'F', I: 'I', N: 'N', E2: 'E' };
          const title = clueTitles[clue.key as keyof typeof clueTitles] || clue.key;
          const letter = clueLetters[clue.key as keyof typeof clueLetters] || '';
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
      {/* Solution reveal */}
      {gameState.isComplete && solution && (
        <div
          className="solution-reveal"
          style={{ fontSize: 20, fontWeight: 700, margin: '1.2rem 0' }}
        >
          The word was: {solution}
        </div>
      )}
      {/* Play Again and View Results buttons after game completion */}
      {gameState.isComplete && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 20,
            marginTop: 20,
            marginBottom: 16,
          }}
        >
          <button
            type="button"
            className="play-again-btn"
            style={{
              minHeight: 48,
              minWidth: 180,
              padding: '0 1.5rem',
              border: '2px solid var(--color-primary)',
              borderRadius: 10,
              background: '#fff',
              color: 'var(--color-primary)',
              fontFamily: 'var(--font-primary)',
              fontWeight: 700,
              fontSize: 17,
              cursor: 'pointer',
              margin: '0 auto',
              outline: 'none',
              boxShadow: '0 1px 4px rgba(26,35,126,0.06)',
            }}
            tabIndex={0}
            role="button"
            onClick={() => {
              setShowSummary(false);
              setCanReopenSummary(false);
              startNewGame();
            }}
          >
            Play Again
          </button>
          <button
            type="button"
            className="view-results-btn button-secondary"
            style={{
              minHeight: 48,
              minWidth: 180,
              padding: '0 1.5rem',
              border: '2px solid var(--color-primary)',
              borderRadius: 10,
              background: '#fff',
              color: 'var(--color-primary)',
              fontFamily: 'var(--font-primary)',
              fontWeight: 700,
              fontSize: 17,
              cursor: 'pointer',
              margin: '0 auto',
              outline: 'none',
              boxShadow: '0 1px 4px rgba(26,35,126,0.06)',
            }}
            tabIndex={0}
            role="button"
            onClick={showLeaderboardModal}
            aria-label="View Results"
          >
            View Results
          </button>
        </div>
      )}
      {/* GameSummaryModal: appears 5s after game completion or via View Results */}
      <GameSummaryModal
        open={showSummary}
        onClose={handleCloseSummary}
        onPlayAgain={() => {
          setShowSummary(false);
          setCanReopenSummary(false);
          startNewGame();
        }}
        leaderboard={leaderboard}
        guessStatus={boxStatus}
        word={solution || ''}
        time={`${String(Math.floor(timer / 60)).padStart(2, '0')}:${String(timer % 60).padStart(2, '0')}`}
        rank={3}
        guessesUsed={gameState.guesses.length}
        fuzzyMatches={0}
        hintsUsed={0}
        date={new Date().toLocaleDateString('en-GB')}
      />
      {/* Fixed Guess Input Bar */}
      <form
        onSubmit={handleGuessSubmit}
        className="guess-area-fixed"
        autoComplete="off"
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 50,
          width: '100vw',
          maxWidth: '425px',
          margin: '0 auto',
          background: '#faf7f2',
          boxShadow: '0 -2px 12px rgba(26,35,126,0.06)',
          borderTop: '1.5px solid #e5e7eb',
          padding: '0.75rem 1rem 0.75rem 1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          minHeight: 56,
        }}
      >
        <input
          type="text"
          value={guess}
          onChange={e => setGuess(e.target.value)}
          className="guess-input"
          placeholder="Enter your guess"
          disabled={gameState.isComplete}
          style={{
            flex: 1,
            fontSize: '1rem',
            fontFamily: 'var(--font-primary)',
            fontStyle: 'italic',
            border: 'none',
            borderBottom: '2px solid #1a237e',
            background: 'transparent',
            outline: 'none',
            textAlign: 'center',
            padding: '0.5rem 0.5rem',
            minHeight: 36,
            color: '#1a237e',
          }}
        />
        <button
          type="submit"
          className="guess-btn-inline"
          aria-label="Submit guess"
          disabled={gameState.isComplete}
          style={{
            height: '2.25rem',
            minWidth: '2.25rem',
            padding: '0 0.75rem',
            borderRadius: '1.25rem',
            background: '#1a237e',
            color: '#fff',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.25rem',
            fontFamily: 'var(--font-primary)',
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 1px 4px rgba(26,35,126,0.08)',
            transition: 'background 0.15s',
          }}
        >
          <span
            style={{ fontSize: '1.25rem', lineHeight: 1, display: 'inline-block' }}
            aria-hidden="true"
          >
            ↵
          </span>
        </button>
      </form>
      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @media (max-width: 600px) {
          .guess-area-fixed { max-width: 100vw !important; }
        }
        .guess-area-fixed input::placeholder {
          color: #1a237e;
          opacity: 0.7;
          font-style: italic;
        }
      `}</style>
      <Routes>
        <Route path="/power" element={<PowerGame />} />
      </Routes>
    </div>
  );
}

export default App;
