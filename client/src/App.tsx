import { useEffect, useRef, useState, useCallback } from 'react';
import useGame from './hooks/useGame';
import { DefineBoxes } from './components/DefineBoxes';
import { getVisibleClues, getAllClues } from './hooks/useGame';
import { GameSummaryModal } from './GameSummaryModal';
import confetti from 'canvas-confetti';
import DebugPanel from './components/DebugPanel';
import { normalizeText } from '../../src/utils/text';
import { SettingsModal } from './components/SettingsModal';
import { Toast } from './components/Toast';
import { TimerBadge } from './components/TimerBadge';
import { UnPrefix } from './components/UnPrefix';
import { getPlayerId } from './utils/player';
import { CLUE_LABELS, CLUE_KEY_MAP } from '../../shared-types/src/clues';
import { AllTimeLeaderboard } from './components/AllTimeLeaderboard';
import { SentenceWithLogo } from './components/SentenceWithLogo';
import { ThemeGuessModal } from './components/ThemeGuessModal';

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
  
  // Game start state
  const [gameStarted, setGameStarted] = useState(false);
  
  // Settings modal state
  const [showSettings, setShowSettings] = useState(false);
  const [currentDisplayName, setCurrentDisplayName] = useState<string>('');

  // Toast state
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);

  // Loading state
  const [isSubmitting, setIsSubmitting] = useState(false);

  // All-time leaderboard state
  const [showAllTimeLeaderboard, setShowAllTimeLeaderboard] = useState(false);

  // Theme modal state
  const [showThemeModal, setShowThemeModal] = useState(false);

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
    // Only start timer if game has been started
    if (gameStarted) {
      timerRef.current = setInterval(() => setTimer(t => t + 1), 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameState.isComplete, gameStarted]);

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
      setToastMessage('Word already guessed');
      setShowToast(true);
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
    ? gameState.isComplete 
      ? getAllClues(gameState.clues) // Show all clues when game is complete
      : getVisibleClues(gameState.clues, gameState.guesses, gameState.wordText)
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

  // Handler to show all-time leaderboard
  const handleShowAllTimeLeaderboard = useCallback(() => {
    setShowAllTimeLeaderboard(true);
  }, []);

  // Handle Play Again - reset game and timer
  const handlePlayAgain = () => {
    setGameStarted(false);
    setTimer(0);
    startNewGame();
  };

  const launchConfetti = () => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
    });
  };

  const launchSpecialConfetti = () => {
    // Multiple bursts for 1-guess wins
    const duration = 3000;
    const animationEnd = Date.now() + duration;
    
    const randomInRange = (min: number, max: number) => {
      return Math.random() * (max - min) + min;
    };

    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        clearInterval(interval);
        return;
      }

      const particleCount = 50 * (timeLeft / duration);

      // Left side burst
      confetti({
        particleCount,
        startVelocity: 30,
        spread: 55,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
        colors: ['#FFD700', '#FFA500', '#FF6347', '#32CD32', '#1E90FF', '#FF69B4']
      });

      // Right side burst
      confetti({
        particleCount,
        startVelocity: 30,
        spread: 55,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
        colors: ['#FFD700', '#FFA500', '#FF6347', '#32CD32', '#1E90FF', '#FF69B4']
      });
    }, 250);
  };

  useEffect(() => {
    if (gameState.isComplete && gameState.isWon) {
      setTimeout(() => {
        // Check if it's a 1-guess win for special confetti
        if (gameState.guesses.length === 1) {
          launchSpecialConfetti();
        } else {
          launchConfetti();
        }
      }, 300);
    }
  }, [gameState.isComplete, gameState.isWon, gameState.guesses.length]);

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

  // Handle game start
  const handleStartGame = () => {
    setGameStarted(true);
  };

  // Theme modal handlers
  const handleThemeClick = () => {
    setShowThemeModal(true);
  };

  const handleCloseThemeModal = () => {
    setShowThemeModal(false);
  };

  return (
    <div
      className="flex flex-col items-center text-center w-full min-h-screen main-container"
      style={{ 
        paddingTop: '2rem',
        paddingBottom: 32,
        paddingLeft: 'clamp(0.5rem, 2vw, 1rem)',
        paddingRight: 'clamp(0.5rem, 2vw, 1rem)',
        minHeight: '100vh',
        width: '100%',
        maxWidth: 'min(100vw, 28rem)',
        margin: '0 auto',
        boxSizing: 'border-box'
      }}
    >
      {/* Timer Badge - Centered at top */}
      <div style={{ 
        width: '100%', 
        display: 'flex', 
        justifyContent: 'center', 
        marginBottom: '1rem',
        paddingTop: '0.5rem'
      }}>
        <TimerBadge seconds={timer} />
      </div>
      
      {/* Hamburger Menu - Top left positioning with mobile-safe positioning */}
      <div
        style={{ 
          position: 'fixed',
          top: 'max(0.5rem, env(safe-area-inset-top))',
          left: 'max(0.5rem, env(safe-area-inset-left))',
          zIndex: 40
        }}
      >
        <button
          onClick={() => setShowSettings(true)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '0.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
            width: '24px',
            height: '24px',
            justifyContent: 'center',
            borderRadius: '0.25rem'
          }}
          aria-label="Menu"
        >
          <div style={{ width: '16px', height: '2px', backgroundColor: 'var(--color-primary)', borderRadius: '1px' }} />
          <div style={{ width: '16px', height: '2px', backgroundColor: 'var(--color-primary)', borderRadius: '1px' }} />
          <div style={{ width: '16px', height: '2px', backgroundColor: 'var(--color-primary)', borderRadius: '1px' }} />
        </button>
      </div>
      
      {/* Un·DEFINE Row - with overlapping effect and mobile-safe spacing */}
      <div
        className="define-header"
        style={{
          display: 'flex',
          flexWrap: 'nowrap',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'visible',
          whiteSpace: 'nowrap',
          gap: 'clamp(0.05rem, 0.2vw, 0.1rem)',
          width: '100%',
          maxWidth: '100vw',
          marginTop: 'clamp(0.5rem, 2vw, 1rem)',
          marginBottom: '0.3rem',
          position: 'relative',
          minHeight: 'clamp(3.2rem, 8.5vw, 4rem)',
          padding: '0 clamp(0.5rem, 2vw, 1rem)',
          boxSizing: 'border-box'
        }}
      >
        {/* Un· enhanced design */}
        <UnPrefix onClick={handleThemeClick} />
        <div className="define-boxes" style={{ 
          display: 'flex', 
          gap: 'clamp(0.05rem, 0.2vw, 0.1rem)',
          flex: '0 0 auto',
          flexShrink: 0
        }}>
          <DefineBoxes
            gameState={gameState}
            revealedClues={revealedClueKeys}
            guessStatus={boxStatus}
            onBoxClick={handleDefineBoxClick}
            isLoading={isSubmitting}
          />
        </div>
      </div>
      
      {/* Intro Text - only show when game hasn't started */}
      {!gameStarted && (
        <div
          style={{
            fontFamily: 'var(--font-primary)',
            fontSize: 'clamp(0.875rem, 2.5vw, 1rem)',
            color: '#6b7280',
            textAlign: 'center',
            lineHeight: '1.6',
            margin: '1rem auto',
            maxWidth: '420px',
            padding: '0 1rem'
          }}
        >
          <b>Objective:</b> 'Un·Define' (reverse engineer) today's word in 6 guesses or less.
          <br /><br />
          The D-E-F-I-N-E boxes represent 6 different clues (hover over to learn more).
          <br /><br />
          Clues are revealed on each guess. Fastest time with the fewest guesses wins. Good luck!
        </div>
      )}
      
      {/* Start Game Section */}
      {!gameStarted && (
        <div
          className="start-game-section"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1rem',
            margin: '1rem 0',
            maxWidth: '420px'
          }}
        >
          <div
            style={{
              fontFamily: 'var(--font-primary)',
              fontSize: 'clamp(0.7rem, 1.8vw, 0.8rem)',
              color: '#6b7280',
              textAlign: 'center',
              fontStyle: 'italic'
            }}
          >
            Your time starts when you click 'Ready'
          </div>
          <button
            onClick={handleStartGame}
            style={{
              fontFamily: 'var(--font-primary)',
              fontSize: 'clamp(0.875rem, 2.5vw, 1rem)',
              fontWeight: 600,
              padding: '0.75rem 2rem',
              backgroundColor: 'var(--color-primary)',
              color: 'white',
              border: 'none',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: '0 2px 4px rgba(26, 35, 126, 0.2)'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = '#1e2875';
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 4px 8px rgba(26, 35, 126, 0.3)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-primary)';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 2px 4px rgba(26, 35, 126, 0.2)';
            }}
          >
            Ready
          </button>
        </div>
      )}
      
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
      {gameStarted && gameState.guesses.length > 0 && (
        <div className="past-guesses" style={{
          fontSize: 'clamp(0.75rem, 2vw, 0.875rem)',
          margin: '0.25rem 0'
        }}>Past guesses: {gameState.guesses.join(', ')}</div>
      )}
      {/* Clues Section */}
      {gameStarted && (
        <div className="hint-blocks" style={{ 
          width: '100%', 
          maxWidth: 420, 
          margin: '1.5rem auto 0 auto',
          gap: 'clamp(0.5rem, 1.5vw, 0.75rem)'
        }}>
          {/* Show all clues message when game is complete */}
          {gameState.isComplete && (
            <div style={{
              textAlign: 'center',
              fontSize: 'clamp(0.75rem, 2vw, 0.85rem)',
              color: '#666',
              fontStyle: 'italic',
              marginBottom: '0.75rem',
              padding: '0.5rem',
              backgroundColor: '#f8f9ff',
              borderRadius: '0.5rem',
              border: '1px solid #e0e4ff'
            }}>
              📚 All clues revealed - the light green clue shows when you solved it!
            </div>
          )}
          
          {visibleClues.map((clue, idx) => {
            // Get the full label for the clue heading
            const clueKey = CLUE_KEY_MAP[clue.key as keyof typeof CLUE_KEY_MAP];
            const clueLabel = CLUE_LABELS[clueKey];
            
            // Only highlight clues after game completion, and only the winning clue
            let wasWinningClue = false;
            if (gameState.isComplete && gameState.isWon) {
              // Map guess number to DEFINE letter: 1st guess = D, 2nd = E, 3rd = F, 4th = I, etc.
              const winningGuessNumber = gameState.guesses.length;
              const clueLetters = ['D', 'E', 'F', 'I', 'N', 'E2'];
              const winningClueKey = clueLetters[winningGuessNumber - 1];
              wasWinningClue = clue.key === winningClueKey;
            }
            
            return (
              <div className="hint-row" key={clue.key}>
                <div className="hint-letter" style={{
                  fontSize: 'clamp(0.875rem, 2.5vw, 1rem)'
                }}>{clue.key}</div>
                <div className="hint-box" style={{
                  backgroundColor: wasWinningClue ? '#f0fdf4' : '#fff', // Light green only for winning clue
                  borderColor: wasWinningClue ? '#d1fae5' : '#e5e7eb', // Slightly green border only for winning clue
                  transition: 'background-color 0.2s ease'
                }}>
                  <div className="hint-title" style={{
                    fontSize: 'clamp(0.625rem, 1.8vw, 0.75rem)',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    color: 'var(--color-primary)',
                    marginBottom: '0.25rem',
                    fontFamily: 'var(--font-primary)',
                    letterSpacing: '0.03em'
                  }}>
                    {clueLabel}
                  </div>
                  <div className="hint-text" style={{
                    fontSize: 'clamp(0.75rem, 2vw, 0.875rem)',
                    lineHeight: '1.4'
                  }}>
                    {clueKey === 'in_a_sentence' ? (
                      <SentenceWithLogo text={clue.value} />
                    ) : (
                      clue.value
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {/* Solution Reveal */}
      {gameState.isComplete && (
        <div
          className="solution-reveal"
          style={{ 
            fontSize: 'clamp(1.125rem, 3.5vw, 1.25rem)', 
            fontWeight: 700, 
            margin: '1rem 0' 
          }}
        >
          The word was: {gameState.wordText}
        </div>
      )}
      {/* Guess Input Form */}
      {!gameState.isComplete && gameStarted && (
        <form onSubmit={handleGuessSubmit} style={{ width: '100%', maxWidth: 420, margin: '0.75rem auto' }}>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              value={guess}
              onChange={(e) => setGuess(e.target.value)}
              placeholder="Enter your guess..."
              disabled={isSubmitting}
              style={{
                flex: 1,
                padding: '0.5rem',
                borderRadius: '0.25rem',
                border: '1px solid #e5e7eb',
                fontSize: 'clamp(0.875rem, 2.5vw, 1rem)',
                fontFamily: 'var(--font-primary)',
                transition: 'all 0.2s ease',
                backgroundColor: isSubmitting ? '#f3f4f6' : '#fff',
                opacity: isSubmitting ? 0.7 : 1,
              }}
            />
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '0.25rem',
                backgroundColor: isSubmitting ? '#cbd5e1' : '#1a237e',
                color: 'white',
                border: 'none',
                cursor: isSubmitting ? 'default' : 'pointer',
                fontSize: 'clamp(0.75rem, 2vw, 0.875rem)',
                fontWeight: 500,
                fontFamily: 'var(--font-primary)',
                transition: 'all 0.2s ease',
              }}
            >
              {isSubmitting ? 'Checking...' : 'Submit'}
            </button>
          </div>
        </form>
      )}
      {/* Game Summary Modal */}
      <GameSummaryModal
        open={showSummary}
        onClose={handleCloseSummary}
        onPlayAgain={handlePlayAgain}
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
        onShowRules={() => setShowRules(true)}
        onShowLeaderboard={showLeaderboardModal}
        onShowAllTimeLeaderboard={handleShowAllTimeLeaderboard}
      />
      {/* Toast Notification */}
      <Toast
        message={toastMessage}
        isVisible={showToast}
        onClose={handleToastClose}
        duration={2000}
      />
      <DebugPanel gameState={gameState} isVisible={showDebug} />
      {/* All-Time Leaderboard Modal */}
      <AllTimeLeaderboard
        open={showAllTimeLeaderboard}
        onClose={() => setShowAllTimeLeaderboard(false)}
      />

      {/* Theme Guess Modal */}
      <ThemeGuessModal
        open={showThemeModal}
        onClose={handleCloseThemeModal}
        gameId={gameState.gameId}
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
