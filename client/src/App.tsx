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
import { FlameAnimation } from './components/FlameAnimation';
import { StreakDiamond } from './components/StreakDiamond';
import PadlockCTA from './components/PadlockCTA';
import { getPlayerId } from './utils/player';
import { CLUE_LABELS, CLUE_KEY_MAP } from '../../shared-types/src/clues';
import { AllTimeLeaderboard } from './components/AllTimeLeaderboard';
import { SentenceWithLogo } from './components/SentenceWithLogo';
import { ThemeGuessModal } from './components/ThemeGuessModal';
import { StreakCalendarModal } from './components/StreakCalendarModal';
import { apiClient } from './api/client';
import { usePlayer } from './hooks/usePlayer';

function App() {
  const { 
    gameState, 
    startNewGame, 
    forceNewGame, 
    submitGuess, 
    guessStatus,
    fuzzyMatchCount,
    // showLeaderboard, // unused
    leaderboardData,
    playerRank,
    isLeaderboardLoading,
    leaderboardError,
    // scoreDetails, // unused
    fetchLeaderboard,
    isRestoredGame,
    wasCompletedInSession
  } = useGame();
  
  // Get player stats including streak data
  const { stats: playerStats } = usePlayer();
  
  // Local override for immediate streak updates (like theme system)
  const [immediateStreakData, setImmediateStreakData] = useState<{
    currentStreak: number;
    longestStreak: number;
    lastWinDate: string | null;
  } | null>(null);
  
  // Use immediate streak data if available, otherwise fall back to playerStats
  const effectivePlayerStats = immediateStreakData 
    ? { ...playerStats, ...immediateStreakData }
    : playerStats;

  const [guess, setGuess] = useState('');
  const [timer, setTimer] = useState(0);
  const [showSummary, setShowSummary] = useState(false);
  // const [canReopenSummary, setCanReopenSummary] = useState(false);
  const [summaryShownForGame, setSummaryShownForGame] = useState<string | null>(null); // Track which game ID has shown modal
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const summaryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [showRules, setShowRules] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  
  // Game start state
  const [gameStarted, setGameStarted] = useState(false);
  
  // Settings modal state
  const [showSettings, setShowSettings] = useState(false);
  const [currentDisplayName, setCurrentDisplayName] = useState<string>('');
  
  // Streak calendar modal state  
  const [showStreakCalendar, setShowStreakCalendar] = useState(false);

  // Toast state
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);

  // Loading state
  const [isSubmitting, setIsSubmitting] = useState(false);

  // All-time leaderboard state
  const [showAllTimeLeaderboard, setShowAllTimeLeaderboard] = useState(false);

  // Theme modal state
  const [showThemeModal, setShowThemeModal] = useState(false);

  // Theme data state for UN diamond coloring
  const [themeGuessData, setThemeGuessData] = useState<{
    hasGuessedToday: boolean;
    isCorrectGuess: boolean;
    confidencePercentage: number | null;
  } | undefined>(undefined);

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

  // Load theme data for UN diamond coloring
  const loadThemeData = async () => {
    try {
      const playerId = getPlayerId();
      if (!playerId) return;
      
      const themeStatus = await apiClient.getThemeStatus(playerId);
      if (themeStatus && themeStatus.progress) {
        setThemeGuessData({
          hasGuessedToday: themeStatus.progress.hasGuessedToday,
          isCorrectGuess: themeStatus.progress.isCorrectGuess,
          confidencePercentage: themeStatus.progress.confidencePercentage || null
        });
      }
    } catch (error) {
      console.log('[App] Failed to load theme data for UN diamond coloring:', error);
      // Don't show error for this background load
    }
  };

  useEffect(() => {
    loadThemeData();
  }, []);

  useEffect(() => {
    startNewGame();
  }, [startNewGame]);

  // Updated effect to handle restored completed games - DON'T show modal for restored games
  useEffect(() => {
    console.log('[App] Restoration effect triggered:', {
      isComplete: gameState.isComplete,
      gameStarted,
      isRestoredGame,
      gameId: gameState.gameId,
      wordText: gameState.wordText,
      wasCompletedInSession: wasCompletedInSession(),
      summaryShownForGame
    });
    
    // Only proceed if we have a valid game state
    if (!gameState.gameId) {
      return;
    }
    
    // Don't show modal if we've already shown it for this game
    if (summaryShownForGame === gameState.gameId) {
      console.log('[App] Summary already shown for this game, skipping');
      return;
    }
    
    if (gameState.isComplete && !gameStarted && !isRestoredGame) {
      // This is a game that was completed in the current session (not restored)
      // Double-check with wasCompletedInSession to avoid race conditions
      if (wasCompletedInSession()) {
        console.log('[App] Game completed in current session, showing summary modal');
        setGameStarted(true);
        setShowSummary(true);
        // setCanReopenSummary(false);
        setSummaryShownForGame(gameState.gameId); // Mark as shown
        if (gameState.score) {
          setTimer(0);
        }
      } else {
        console.log('[App] Game completed but not in current session, treating as restored');
        setGameStarted(true);
         // setCanReopenSummary(true);
      }
    } else if (gameState.isComplete && !gameStarted && isRestoredGame) {
      // This is a restored game - just mark as started but don't show modal
      console.log('[App] Restored completed game, NOT showing summary modal');
      setGameStarted(true);
       // setCanReopenSummary(true);
    }
  }, [gameState.isComplete, gameState.gameId, gameStarted, isRestoredGame, wasCompletedInSession, summaryShownForGame]);

  useEffect(() => {
    // Don't show modal with delay if we've already shown it for this game
    if (summaryShownForGame === gameState.gameId) {
      return;
    }
    
    if (gameState.isComplete && gameStarted && wasCompletedInSession()) {
      // Only show modal with delay if game was completed in this session
      if (timerRef.current) clearInterval(timerRef.current);
      summaryTimeoutRef.current = setTimeout(() => {
        setShowSummary(true);
        // setCanReopenSummary(false);
        setSummaryShownForGame(gameState.gameId); // Mark as shown
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
  }, [gameState.isComplete, gameStarted, wasCompletedInSession, gameState.gameId, summaryShownForGame]);

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
      const guessResult = await submitGuess(normalizedGuess);
      console.log('[App] Guess result received:', {
        gameOver: guessResult.gameOver,
        isCorrect: guessResult.isCorrect,
        condition: guessResult.gameOver && guessResult.isCorrect,
        stats: guessResult.stats
      });
      
      // If game just completed and was won, update streak data IMMEDIATELY from response
      if (guessResult.gameOver && guessResult.isCorrect && guessResult.stats) {
        console.log('[App] Game won! Updating streak data immediately from response');
        console.log('[App] New stats from API:', guessResult.stats);
        
        // Update streak data immediately with the response data (like theme system)
        setImmediateStreakData({
          currentStreak: guessResult.stats.current_streak,
          longestStreak: guessResult.stats.longest_streak,
          lastWinDate: new Date().toISOString(), // Set to current time since we just won
        });
        
        console.log('[App] Streak counter should update immediately with:', {
          currentStreak: guessResult.stats.current_streak,
          longestStreak: guessResult.stats.longest_streak
        });
        
        // Debug flame animation
        console.log('[App] 🔥 Flame animation should now appear with streak:', guessResult.stats.current_streak);
      } else {
        console.log('[App] Game not won or not over:', {
          gameOver: guessResult.gameOver,
          isCorrect: guessResult.isCorrect,
          hasStats: !!guessResult.stats
        });
      }
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
    // setCanReopenSummary(true);
  };

  // const handleReopenSummary = () => {
  //   setShowSummary(true);
  //   setCanReopenSummary(false);
  // };

  // Handler to show leaderboard modal (View Results)
  const showLeaderboardModal = useCallback(async () => {
    console.log('[App] showLeaderboardModal called with state:', {
      wordId: gameState.wordId,
      isComplete: gameState.isComplete,
      isWon: gameState.isWon,
      guessesLength: gameState.guesses.length,
      isRestoredGame,
      wasCompletedInSession: wasCompletedInSession()
    });
    
    if (!gameState.wordId) return;
    
    // Only show modal if game was actually completed (current session or restored)
    if (!gameState.isComplete) {
      console.log('[App] Attempted to show leaderboard modal for incomplete game - preventing');
      setToastMessage('Complete today\'s word to see results!');
      setShowToast(true);
      return;
    }
    
    console.log('[App] Showing leaderboard modal for completed game');
    setShowSummary(true);
    
    // Always fetch leaderboard data when modal is opened
    await fetchLeaderboard();
  }, [gameState.wordId, gameState.isComplete, gameState.isWon, gameState.guesses.length, isRestoredGame, wasCompletedInSession, fetchLeaderboard]);

  // Handler to show all-time leaderboard
  const handleShowAllTimeLeaderboard = useCallback(() => {
    setShowAllTimeLeaderboard(true);
  }, []);

  // Handle Play Again - reset game and timer
  const handlePlayAgain = () => {
    setGameStarted(false);
    setTimer(0);
    setSummaryShownForGame(null); // Reset summary tracking for new game
    setImmediateStreakData(null); // Clear immediate streak override for new game
    forceNewGame();
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
    setImmediateStreakData(null); // Clear any previous immediate streak data
  };

  // Theme modal handlers
  const handleThemeClick = () => {
    setShowThemeModal(true);
    setShowSummary(false); // Close summary modal when opening theme modal
  };

  const handleCloseThemeModal = (updatedThemeData?: {
    hasGuessedToday: boolean;
    isCorrectGuess: boolean;
    confidencePercentage: number | null;
  }) => {
    setShowThemeModal(false);
    
    // Update theme data immediately if provided from modal
    if (updatedThemeData) {
      setThemeGuessData(updatedThemeData);
    } else {
      // Fallback: reload theme data if no data provided
      loadThemeData();
    }
  };

  return (
    <div
      className="flex flex-col items-center text-center w-full min-h-screen main-container"
      style={{ 
        paddingTop: 'clamp(1rem, 4vw, 2rem)',
        paddingBottom: 'clamp(1rem, 4vw, 2rem)',
        paddingLeft: 'clamp(0.5rem, 2vw, 1rem)',
        paddingRight: 'clamp(0.5rem, 2vw, 1rem)',
        minHeight: '100dvh', // Dynamic viewport height for mobile
        width: '100%',
        maxWidth: 'min(100vw, 28rem)',
        margin: '0 auto',
        boxSizing: 'border-box',
        overflowX: 'hidden' // Prevent horizontal scrolling
      }}
    >
      {/* Timer Badge - Centered at top */}
      <div style={{
        width: '100%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '1.5rem',
        marginBottom: '1rem',
        paddingTop: '0.5rem',
        position: 'relative', // For flame positioning
      }}>
        <TimerBadge seconds={timer} />
        
        {/* Streak Diamond with Enveloping Flames */}
        <div style={{
          position: 'relative',
          width: '5.5rem', // Container for both absolute elements
          height: '5.5rem', // Container for both absolute elements
        }}>
          <StreakDiamond 
            currentStreak={effectivePlayerStats?.currentStreak || 0}
            bestStreak={effectivePlayerStats?.longestStreak || 0}
            lastWinDate={effectivePlayerStats?.lastWinDate || null}
          />
          <FlameAnimation 
            streak={effectivePlayerStats?.currentStreak || 0} 
            highestStreak={effectivePlayerStats?.longestStreak || 0}
            lastWinDate={effectivePlayerStats?.lastWinDate || null}
            size="large"
            position="absolute"
          />
        </div>
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
          gap: 'clamp(0.02rem, 0.18vw, 0.08rem)',
          width: '100%',
          maxWidth: '100vw',
          marginTop: 'clamp(0.5rem, 2vw, 1rem)',
          marginBottom: '0.3rem',
          position: 'relative',
          padding: '0 clamp(0.2rem, 1vw, 0.4rem)',
          boxSizing: 'border-box',
          // Ensure it fits on mobile
          minWidth: 0
        }}
      >
        {/* Padlock CTA replaces homepage Un diamond; UnPrefix remains in modal */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <PadlockCTA
            locked={!themeGuessData?.isCorrectGuess}
            onClick={handleThemeClick}
            size="lg"
            disabled={false}
          />
        </div>
        <div className="define-boxes" style={{ 
          display: 'flex', 
          gap: 'clamp(0.08rem, 0.3vw, 0.15rem)',
          flex: '0 0 auto',
          flexShrink: 0,
          alignItems: 'center',
          justifyContent: 'center'
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
            fontSize: 'clamp(1rem, 3vw, 1.25rem)',
            color: '#374151',
            textAlign: 'center',
            lineHeight: '1.7',
            margin: '1rem auto',
            maxWidth: '600px',
            padding: '0 1.5rem'
          }}
        >
          {/* Game Description */}
          <div style={{ 
            marginBottom: '2rem',
            fontSize: 'clamp(1rem, 3vw, 1.3rem)',
            fontWeight: '600',
            lineHeight: '1.4',
            background: 'linear-gradient(135deg, #1a237e 0%, #3b82f6 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            Un·define today's secret word to un·lock this week's theme
          </div>

          {/* Game Modes in Boxes */}
          <div style={{ 
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            marginBottom: '2rem'
          }}>
            {/* Today's Challenge Box */}
            <div style={{
              backgroundColor: '#f8f9ff',
              border: '2px solid #e0e4ff',
              borderRadius: '0.75rem',
              padding: '1.5rem',
              textAlign: 'left'
            }}>
              <div style={{ 
                fontWeight: '700',
                fontSize: 'clamp(1rem, 2.8vw, 1.2rem)',
                color: 'var(--color-primary)',
                marginBottom: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem'
              }}>
                Today:
                {/* Inline DEFINE boxes */}
                <div style={{
                  display: 'flex',
                  gap: '0.1rem',
                  alignItems: 'center'
                }}>
                  {['D', 'E', 'F', 'I', 'N', 'E'].map((letter, index) => (
                    <div
                      key={index}
                      style={{
                        width: 'clamp(1.6rem, 4.5vw, 1.8rem)',
                        height: 'clamp(1.6rem, 4.5vw, 1.8rem)',
                        border: '2px solid var(--color-primary)',
                        borderRadius: '0.3rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontFamily: 'var(--font-primary)',
                        fontWeight: 700,
                        fontSize: 'clamp(0.85rem, 2.8vw, 1.0rem)',
                        color: 'var(--color-primary)',
                        backgroundColor: 'white',
                        flexShrink: 0
                      }}
                    >
                      {letter}
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ color: '#374151', fontSize: '0.9em', marginBottom: '0.5rem' }}>
                Guess today's word in 6 guesses or less. Clues revealed each round:
              </div>
              <ol style={{ 
                margin: '0', 
                padding: '0 0 0 2.2rem', 
                fontSize: '0.75em',
                lineHeight: '1.4',
                color: '#374151'
              }}>
                <li style={{ marginBottom: '0.15rem' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.15em' }}>
                    <div style={{
                      width: '1.6em',
                      height: '1.6em',
                      border: '2px solid var(--color-primary)',
                      borderRadius: '0.25rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontFamily: 'var(--font-primary)',
                      fontWeight: 700,
                      fontSize: '0.8em',
                      color: 'var(--color-primary)',
                      backgroundColor: 'white',
                      flexShrink: 0
                    }}>D</div>
                    <span style={{ color: 'var(--color-primary)' }}>efinition</span>
                  </span>
                </li>
                <li style={{ marginBottom: '0.15rem' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.15em' }}>
                    <div style={{
                      width: '1.6em',
                      height: '1.6em',
                      border: '2px solid var(--color-primary)',
                      borderRadius: '0.25rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontFamily: 'var(--font-primary)',
                      fontWeight: 700,
                      fontSize: '0.8em',
                      color: 'var(--color-primary)',
                      backgroundColor: 'white',
                      flexShrink: 0
                    }}>E</div>
                    <span style={{ color: 'var(--color-primary)' }}>quivalents</span>
                  </span>
                </li>
                <li style={{ marginBottom: '0.15rem' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.15em' }}>
                    <div style={{
                      width: '1.6em',
                      height: '1.6em',
                      border: '2px solid var(--color-primary)',
                      borderRadius: '0.25rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontFamily: 'var(--font-primary)',
                      fontWeight: 700,
                      fontSize: '0.8em',
                      color: 'var(--color-primary)',
                      backgroundColor: 'white',
                      flexShrink: 0
                    }}>F</div>
                    <span style={{ color: 'var(--color-primary)' }}>irst Letter</span>
                  </span>
                </li>
                <li style={{ marginBottom: '0.15rem' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.15em' }}>
                    <div style={{
                      width: '1.6em',
                      height: '1.6em',
                      border: '2px solid var(--color-primary)',
                      borderRadius: '0.25rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontFamily: 'var(--font-primary)',
                      fontWeight: 700,
                      fontSize: '0.8em',
                      color: 'var(--color-primary)',
                      backgroundColor: 'white',
                      flexShrink: 0
                    }}>I</div>
                    <span style={{ color: 'var(--color-primary)' }}>n a Sentence</span>
                  </span>
                </li>
                <li style={{ marginBottom: '0.15rem' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.15em' }}>
                    <div style={{
                      width: '1.6em',
                      height: '1.6em',
                      border: '2px solid var(--color-primary)',
                      borderRadius: '0.25rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontFamily: 'var(--font-primary)',
                      fontWeight: 700,
                      fontSize: '0.8em',
                      color: 'var(--color-primary)',
                      backgroundColor: 'white',
                      flexShrink: 0
                    }}>N</div>
                    <span style={{ color: 'var(--color-primary)' }}>umber of Letters</span>
                  </span>
                </li>
                <li style={{ marginBottom: '0.15rem' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.15em' }}>
                    <div style={{
                      width: '1.6em',
                      height: '1.6em',
                      border: '2px solid var(--color-primary)',
                      borderRadius: '0.25rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontFamily: 'var(--font-primary)',
                      fontWeight: 700,
                      fontSize: '0.8em',
                      color: 'var(--color-primary)',
                      backgroundColor: 'white',
                      flexShrink: 0
                    }}>E</div>
                    <span style={{ color: 'var(--color-primary)' }}>tymology</span>
                  </span>
                </li>
              </ol>
            </div>

            {/* This Week's Challenge Box */}
            <div style={{
              backgroundColor: '#f0fdf4',
              border: '2px solid #d1fae5',
              borderRadius: '0.75rem',
              padding: '1.5rem',
              textAlign: 'left'
            }}>
              <div style={{ 
                fontWeight: '700',
                fontSize: 'clamp(1rem, 2.8vw, 1.2rem)',
                color: '#059669',
                marginBottom: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                This week:
                {/* Inline Un diamond */}
                <div
                  style={{
                    width: 'clamp(1.8rem, 5vw, 2.1rem)',
                    height: 'clamp(1.8rem, 5vw, 2.1rem)',
                    border: '2px solid #059669',
                    borderRadius: '0.35rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: 'var(--font-primary)',
                    fontWeight: 800,
                    fontSize: 'clamp(0.8rem, 2.5vw, 0.9rem)',
                    color: '#059669',
                    backgroundColor: 'white',
                    transform: 'rotate(45deg)',
                    flexShrink: 0,
                    fontStyle: 'italic',
                    boxShadow: '0 2px 8px rgba(5, 150, 105, 0.15), 0 0 0 1px rgba(5, 150, 105, 0.1)'
                  }}
                >
                  <span style={{ 
                    transform: 'rotate(-45deg) translateX(-0.05em)',
                    lineHeight: '1',
                    marginLeft: '0.1em'
                  }}>
                    Un·
                  </span>
                </div>
                <span style={{
                  fontStyle: 'italic',
                  fontSize: '0.95em',
                  color: '#059669',
                  marginLeft: '-0.25rem'
                }}>
                  lock
                </span>
              </div>
              <div style={{ color: '#374151', fontSize: '0.9em' }}>
                Before{' '}
                <span style={{
                  fontWeight: '700',
                  color: '#059669',
                  fontSize: '1.05em',
                  background: 'linear-gradient(135deg, #059669 0%, #34d399 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text'
                }}>
                  {(() => {
                    const now = new Date();
                    const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
                    const daysUntilSunday = currentDay === 0 ? 0 : 7 - currentDay;
                    const nextSunday = new Date(now);
                    nextSunday.setDate(now.getDate() + daysUntilSunday);
                    
                    const day = nextSunday.getDate();
                    const month = nextSunday.toLocaleString('default', { month: 'long' });
                    const getOrdinal = (n: number) => {
                      const s = ["th", "st", "nd", "rd"];
                      const v = n % 100;
                      return n + (s[(v - 20) % 10] || s[v] || s[0]);
                    };
                    
                    return `Sunday ${getOrdinal(day)} ${month}`;
                  })()}
                </span>
                {' '}23:59, guess this week's theme
              </div>
            </div>
          </div>
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
            maxWidth: '600px'
          }}
        >
          <div
            style={{
              fontFamily: 'var(--font-primary)',
              fontSize: 'clamp(0.9rem, 2.5vw, 1.1rem)',
              color: '#6b7280',
              textAlign: 'center',
              fontStyle: 'italic',
              fontWeight: '500'
            }}
          >
            Your time starts when you click 'Ready'
          </div>
          <button
            onClick={handleStartGame}
            style={{
              fontFamily: 'var(--font-primary)',
              fontSize: 'clamp(1rem, 3vw, 1.2rem)',
              fontWeight: 600,
              padding: '1rem 3rem',
              backgroundColor: 'var(--color-primary)',
              color: 'white',
              border: 'none',
              borderRadius: '0.75rem',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(26, 35, 126, 0.3)',
              transition: 'all 0.2s ease'
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
          
          {visibleClues.map((clue) => {
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
                    fontWeight: 500,
                    textTransform: 'uppercase',
                    color: 'var(--color-primary)',
                    opacity: 0.6,
                    marginBottom: '0.25rem',
                    fontFamily: 'var(--font-primary)',
                    letterSpacing: '0.03em'
                  }}>
                    {clueLabel}
                  </div>
                  <div className="hint-text" style={{
                    fontSize: 'clamp(0.9rem, 2.5vw, 1.1rem)',
                    lineHeight: '1.5',
                    fontWeight: 500,
                    color: 'var(--color-primary)'
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
        onOpenThemeModal={handleThemeClick}
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
        onShowGameHistory={() => setShowStreakCalendar(true)}
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
        onClose={() => handleCloseThemeModal()}
        gameId={gameState.gameId}
        gameComplete={gameState.isComplete}
        onThemeDataUpdate={(themeData) => handleCloseThemeModal(themeData)}
      />

      {/* Streak Calendar Modal */}
      <StreakCalendarModal
        open={showStreakCalendar}
        onClose={() => setShowStreakCalendar(false)}
        playerId={getPlayerId() || ''}
      />

      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        
        /* Sequential 7-Flame Animation */
        @keyframes flame-sequence {
          0%, 14.29% { opacity: 1; }
          14.30%, 100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}

export default App;
