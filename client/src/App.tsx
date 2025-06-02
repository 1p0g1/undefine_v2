import { useEffect, useRef, useState, useCallback } from 'react';
import useGame from './hooks/useGame';
import { DefineBoxes } from './components/DefineBoxes';
import { getVisibleClues } from './hooks/useGame';
import { GameSummaryModal } from './GameSummaryModal';
import confetti from 'canvas-confetti';
import DebugPanel from './components/DebugPanel';
import { normalizeText } from '../../src/utils/text';
import { SettingsButton } from './components/SettingsButton';
import { SettingsModal } from './components/SettingsModal';
import { Toast } from './components/Toast';
import { getPlayerId } from './utils/player';
import { CLUE_LABELS, CLUE_KEY_MAP } from '../../shared-types/src/clues';

function App() {
  const {
    gameState,
    startNewGame,
    submitGuess,
    guessStatus,
    fuzzyMatchCount,
    showLeaderboard,
    leaderboardData,
    playerRank,
    isLeaderboardLoading,
    leaderboardError,
    scoreDetails,
    fetchLeaderboard
  } = useGame();
  const [guess, setGuess] = useState('');
  const [timer, setTimer] = useState(0);
  const [showSummary, setShowSummary] = useState(false);
  const [canReopenSummary, setCanReopenSummary] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const summaryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [showRules, setShowRules] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  
  // Settings modal state
  const [showSettings, setShowSettings] = useState(false);
  const [currentDisplayName, setCurrentDisplayName] = useState<string>('');

  // Toast state
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);

  // Loading state
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize display name from localStorage or generate default
  useEffect(() => {
    const savedDisplayName = localStorage.getItem('playerDisplayName');
    if (savedDisplayName) {
      setCurrentDisplayName(savedDisplayName);
    } else {
      // Generate default name format: "Player [last 4 chars of ID]"
      const playerId = getPlayerId();
      const defaultName = playerId ? `Player ${playerId.slice(-4)}` : 'Player';
      setCurrentDisplayName(defaultName);
    }
  }, []);

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

  // Toggle debug panel with Ctrl+Shift+D
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        setShowDebug(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleGuessSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted');
    const normalizedGuess = normalizeText(guess);
    if (!normalizedGuess) {
      console.log('Empty guess, ignoring');
      return;
    }
    if (gameState.guesses.includes(normalizedGuess)) {
      console.log('Duplicate guess, ignoring:', normalizedGuess);
      return;
    }
    console.log('Submitting guess:', normalizedGuess);
    setIsSubmitting(true);
    try {
      await submitGuess(normalizedGuess);
    } finally {
      setIsSubmitting(false);
    }
    setGuess('');
  };

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
  const showLeaderboardModal = useCallback(async () => {
    if (!gameState.wordId) return;
    setShowSummary(true);
    setCanReopenSummary(false);
    
    // Always fetch leaderboard data when modal is opened
    await fetchLeaderboard();
  }, [gameState.wordId, fetchLeaderboard]);

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

  // Handle nickname updates
  const handleNicknameUpdate = (newNickname: string) => {
    setCurrentDisplayName(newNickname);
    console.log('[App] Nickname updated to:', newNickname);
  };

  // Handle DEFINE box clicks
  const handleDefineBoxClick = (message: string) => {
    setToastMessage(message);
    setShowToast(true);
  };

  const handleToastClose = () => {
    setShowToast(false);
  };

  return (
    <div
      className="flex flex-col items-center text-center px-4 w-full max-w-sm mx-auto min-h-screen main-container"
      style={{ paddingTop: 24, paddingBottom: 88 }}
    >
      <div
        style={{ 
          margin: '0 auto', 
          textAlign: 'center', 
          marginBottom: '0.25rem', 
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem'
        }}
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
        
        {/* Settings Button */}
        <SettingsButton 
          onClick={() => setShowSettings(true)}
          currentNickname={currentDisplayName}
        />
      </div>
      {/* Un·DEFINE Row */}
      <div
        className="define-header"
        style={{
          display: 'flex',
          flexWrap: 'nowrap',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'visible',
          whiteSpace: 'nowrap',
          gap: '0.4rem',
          width: '100%',
          marginTop: '0.7rem',
          marginBottom: '0.5rem',
          position: 'relative',
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
            marginRight: '0.25rem',
            whiteSpace: 'nowrap',
            display: 'inline-block',
            position: 'relative',
            top: '1px',
          }}
        >
          Un·
        </span>
        <div className="define-boxes" style={{ display: 'flex', gap: '0.4rem', flex: '0 0 auto' }}>
          <DefineBoxes
            gameState={gameState}
            revealedClues={revealedClueKeys}
            guessStatus={boxStatus}
            onBoxClick={handleDefineBoxClick}
            isLoading={isSubmitting}
          />
        </div>
      </div>
      {showRules && (
        <div className="modal-overlay" onClick={() => setShowRules(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2 style={{ marginBottom: '1rem', fontSize: '1.5rem', fontWeight: 'bold' }}>How to Play</h2>
            <p style={{ marginBottom: '1rem', lineHeight: '1.6' }}>
              Un·Define is a clue-based word guessing game. Look at the boxes above - each letter reveals a new hint to help you guess the word:
            </p>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'auto 1fr',
              gap: '0.5rem 1rem',
              marginBottom: '1.5rem',
              fontSize: '1.1rem',
              lineHeight: '1.6'
            }}>
              <strong>D</strong><span>Definition of the word</span>
              <strong>E</strong><span>Equivalents (Synonyms)</span>
              <strong>F</strong><span>First Letter</span>
              <strong>I</strong><span>In a Sentence example</span>
              <strong>N</strong><span>Number of Letters</span>
              <strong>E</strong><span>Etymology (word origin)</span>
            </div>
            <p style={{ marginBottom: '1.5rem', lineHeight: '1.6' }}>
              New hints are revealed after each incorrect guess. Try to guess the word within 6 attempts!
            </p>
            <button 
              onClick={() => setShowRules(false)}
              style={{
                width: '100%',
                padding: '0.75rem',
                backgroundColor: '#1a237e',
                color: 'white',
                border: 'none',
                borderRadius: '0.5rem',
                fontSize: '1rem',
                fontWeight: '500',
                cursor: 'pointer'
              }}
            >
              Got it!
            </button>
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
          // Get the full label for the clue heading
          const clueKey = CLUE_KEY_MAP[clue.key as keyof typeof CLUE_KEY_MAP];
          const clueLabel = CLUE_LABELS[clueKey];
          
          return (
            <div className="hint-row" key={clue.key}>
              <div className="hint-letter">{clue.key}</div>
              <div className="hint-box">
                <div className="hint-title" style={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  color: 'var(--color-primary)',
                  marginBottom: '0.25rem',
                  fontFamily: 'var(--font-primary)',
                  letterSpacing: '0.03em'
                }}>
                  {clueLabel}
                </div>
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
      {/* Guess Input Form */}
      {!gameState.isComplete && (
        <form onSubmit={handleGuessSubmit} style={{ width: '100%', maxWidth: 420, margin: '1rem auto' }}>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              value={guess}
              onChange={(e) => setGuess(e.target.value)}
              placeholder="Enter your guess..."
              style={{
                flex: 1,
                padding: '0.5rem',
                borderRadius: '0.25rem',
                border: '1px solid #e5e7eb',
                fontSize: '1rem',
                fontFamily: 'var(--font-primary)',
              }}
            />
            <button
              type="submit"
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '0.25rem',
                backgroundColor: '#1a237e',
                color: 'white',
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: 500,
                fontFamily: 'var(--font-primary)',
              }}
            >
              Submit
            </button>
          </div>
        </form>
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
        <button
          type="button"
          onClick={showLeaderboardModal}
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
          Leaderboard
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
      {/* Game Summary Modal */}
      <GameSummaryModal
        open={showSummary}
        onClose={handleCloseSummary}
        onPlayAgain={startNewGame}
        word={gameState.wordText}
        time={`${String(Math.floor(timer / 60)).padStart(2, '0')}:${String(timer % 60).padStart(2, '0')}`}
        guessesUsed={gameState.guesses.length}
        fuzzyMatches={fuzzyMatchCount}
        hintsUsed={0}
        date={new Date().toLocaleDateString('en-GB')}
        guessStatus={guessStatus}
        leaderboard={leaderboardData}
        playerRank={playerRank}
        isLoading={isLeaderboardLoading}
        error={leaderboardError || undefined}
        currentDisplayName={currentDisplayName}
        onOpenSettings={() => setShowSettings(true)}
      />
      {/* Settings Modal */}
      <SettingsModal
        open={showSettings}
        onClose={() => setShowSettings(false)}
        currentDisplayName={currentDisplayName}
        onNicknameUpdate={handleNicknameUpdate}
      />
      {/* Toast Notification */}
      <Toast
        message={toastMessage}
        isVisible={showToast}
        onClose={handleToastClose}
        duration={2000}
      />
      <DebugPanel gameState={gameState} isVisible={showDebug} />
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
