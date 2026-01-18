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
import { StreakBadge } from './components/StreakBadge';
import { InfoDiamond } from './components/InfoDiamond';
import { UnPrefix } from './components/UnPrefix';
import { getPlayerId } from './utils/player';
import { CLUE_LABELS, CLUE_KEY_MAP } from '../../shared-types/src/clues';
import { AllTimeLeaderboard } from './components/AllTimeLeaderboard';
import { WeeklyThemeLeaderboard } from './components/WeeklyThemeLeaderboard';
import { AllTimeThemeLeaderboard } from './components/AllTimeThemeLeaderboard';
import { SentenceWithLogo } from './components/SentenceWithLogo';
import { ThemeGuessModal } from './components/ThemeGuessModal';
import { BonusRoundInline, BonusGuessResult } from './components/BonusRoundInline';
import { apiClient } from './api/client';
import { usePlayer } from './hooks/usePlayer';

function App() {
  const {
    gameState,
    startNewGame,
    forceNewGame,
    startArchiveGame, // NEW: Archive game support
    submitGuess,
    guessStatus,
    fuzzyMatchCount,
    showLeaderboard,
    leaderboardData,
    playerRank,
    isLeaderboardLoading,
    leaderboardError,
    scoreDetails,
    fetchLeaderboard,
    isRestoredGame,
    wasCompletedInSession
  } = useGame();
  
  // Get player stats including streak data
  const { stats: playerStats, refreshStats } = usePlayer();
  
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
  const [canReopenSummary, setCanReopenSummary] = useState(false);
  const [summaryShownForGame, setSummaryShownForGame] = useState<string | null>(null); // Track which game ID has shown modal
  const [pendingSummaryAfterTheme, setPendingSummaryAfterTheme] = useState(false);
  const pendingSummaryGameIdRef = useRef<string | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const summaryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [showRules, setShowRules] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  
  // Game start state
  const [gameStarted, setGameStarted] = useState(false);

  const computeElapsedSeconds = useCallback(() => {
    if (!gameState?.startTime) return 0;
    const startMs = Date.parse(gameState.startTime);
    if (Number.isNaN(startMs)) return 0;

    const endMs = gameState.isComplete
      ? (gameState.endTime ? Date.parse(gameState.endTime) : Number.NaN)
      : Date.now();

    if (Number.isNaN(endMs)) return 0;

    return Math.max(0, Math.floor((endMs - startMs) / 1000));
  }, [gameState.startTime, gameState.endTime, gameState.isComplete]);
  
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

  // Weekly theme leaderboard state
  const [showWeeklyThemeLeaderboard, setShowWeeklyThemeLeaderboard] = useState(false);

  // All-time theme leaderboard state
  const [showAllTimeThemeLeaderboard, setShowAllTimeThemeLeaderboard] = useState(false);

  // Theme modal state
  const [showThemeModal, setShowThemeModal] = useState(false);

  // Theme data state for UN diamond coloring
  const [themeGuessData, setThemeGuessData] = useState<{
    hasGuessedToday: boolean;
    isCorrectGuess: boolean;
    confidencePercentage: number | null;
  } | undefined>(undefined);

  // Bonus round state (inline UI after winning early)
  const [bonusRoundResults, setBonusRoundResults] = useState<BonusGuessResult[]>([]);
  const [bonusRoundComplete, setBonusRoundComplete] = useState(false);
  
  // NEW: Celebration animation state for post-game ceremony
  const [celebrateDiamond, setCelebrateDiamond] = useState(false);
  // NEW: Track if bonus round should show after theme guess
  const [pendingBonusRound, setPendingBonusRound] = useState(false);

  // After bonus round (or when no bonus), nudge players toward the theme guess
  const themePromptActive =
    gameState.isComplete &&
    !themeGuessData?.hasGuessedToday &&
    (!pendingBonusRound || bonusRoundComplete);

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

  // Handle archive play selection
  const handleArchivePlaySelection = useCallback(async (date: string) => {
    try {
      console.log('[App] Starting archive play for date:', date);
      
      // Use the startArchiveGame method from useGame hook
      await startArchiveGame(date);
      
      // Set game as started
      setGameStarted(true);
      
      // Show toast notification
      setToastMessage(`Playing archive word from ${date}`);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
      
      console.log('[App] Archive game started successfully');
    } catch (error) {
      console.error('[App] Failed to start archive game:', error);
      setToastMessage('Failed to load archive word. Please try again.');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    }
  }, [startArchiveGame]);

  useEffect(() => {
    loadThemeData();
  }, []);

  useEffect(() => {
    startNewGame();
  }, [startNewGame]);

  // Effect to handle game completion - triggers celebration flow
  useEffect(() => {
    const completedInSession = wasCompletedInSession();
    
    console.log('[App] Game completion effect triggered:', {
      isComplete: gameState.isComplete,
      gameStarted,
      isRestoredGame,
      gameId: gameState.gameId,
      wordText: gameState.wordText,
      completedInSession,
      summaryShownForGame
    });
    
    // Only proceed if we have a valid, complete game state
    if (!gameState.gameId || !gameState.isComplete) {
      return;
    }
    
    // Don't show modal if we've already shown it for this game
    if (summaryShownForGame === gameState.gameId) {
      console.log('[App] Summary already shown for this game, skipping');
      return;
    }
    
    // KEY FIX: Check if game was completed in THIS session (not restored from previous session)
    // The `completedInSession` flag is set when submitGuess returns gameOver=true
    if (completedInSession) {
      console.log('[App] Game completed in current session, starting celebration flow');
      setGameStarted(true);
      setShowSummary(false);
      setCanReopenSummary(false);
      setSummaryShownForGame(gameState.gameId); // Mark as shown (flow started)
      setPendingSummaryAfterTheme(true);
      pendingSummaryGameIdRef.current = gameState.gameId;
      setTimer(computeElapsedSeconds());
      
      // Reset bonus round state for new game
      setBonusRoundResults([]);
      setBonusRoundComplete(false);
      
      // Start with celebration animation, then show theme modal
      setCelebrateDiamond(true);
      
      // Check if player is eligible for bonus round (won in < 6 guesses)
      const hasUnusedGuesses = gameState.isWon && gameState.guesses && gameState.guesses.length < 6;
      if (hasUnusedGuesses) {
        console.log('[App] Player eligible for bonus round:', 6 - gameState.guesses.length, 'attempts');
        setPendingBonusRound(true);
      }
    } else if (!gameStarted) {
      // This is a restored completed game from a previous session
      console.log('[App] Restored completed game, enabling reopen summary');
      setGameStarted(true);
      setCanReopenSummary(true);
    }
  }, [gameState.isComplete, gameState.gameId, gameStarted, wasCompletedInSession, summaryShownForGame]);

  useEffect(() => {
    // Always derive timer from start/end timestamps so it doesn't reset on refresh.
    setTimer(computeElapsedSeconds());

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // For completed games, timer should be fixed.
    if (gameState.isComplete) return;

    // Only run timer for active games.
    if (gameStarted) {
      timerRef.current = setInterval(() => {
        setTimer(computeElapsedSeconds());
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [computeElapsedSeconds, gameStarted, gameState.isComplete]);

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
          lastWinDate: guessResult.stats.updated_at,
        });
        
        console.log('[App] Streak counter should update immediately with:', {
          currentStreak: guessResult.stats.current_streak,
          longestStreak: guessResult.stats.longest_streak
        });
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
    setCanReopenSummary(true);
  };

  const handleReopenSummary = () => {
    setShowSummary(true);
    setCanReopenSummary(false);
  };

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
    setCanReopenSummary(false);
    
    // Always fetch leaderboard data when modal is opened
    await fetchLeaderboard();
  }, [gameState.wordId, gameState.isComplete, gameState.isWon, gameState.guesses.length, isRestoredGame, wasCompletedInSession, fetchLeaderboard]);

  // Handler to show all-time leaderboard
  const handleShowAllTimeLeaderboard = useCallback(() => {
    setShowAllTimeLeaderboard(true);
  }, []);

  // Handler to show weekly theme leaderboard
  const handleShowWeeklyThemeLeaderboard = useCallback(() => {
    setShowWeeklyThemeLeaderboard(true);
  }, []);

  // Handler to show all-time theme leaderboard
  const handleShowAllTimeThemeLeaderboard = useCallback(() => {
    setShowAllTimeThemeLeaderboard(true);
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

  useEffect(() => {
    if (gameState.isComplete && gameState.isWon) {
      setTimeout(() => {
        launchConfetti();
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
    // Reset celebration/bonus state for fresh game
    setCelebrateDiamond(false);
    setPendingBonusRound(false);
  };

  // Theme modal handlers
  const handleThemeClick = () => {
    setShowThemeModal(true);
    setShowSummary(false); // Close summary modal when opening theme modal
  };
  
  // NEW: Handler for when diamond celebration completes
  // FLOW: Celebration → Bonus Round (if eligible) → Theme Modal → Leaderboard
  const handleCelebrationComplete = () => {
    console.log('[App] Diamond celebration complete');
    setCelebrateDiamond(false);
    
    // If bonus round is pending, let it show inline (don't show theme modal yet)
    if (pendingBonusRound) {
      console.log('[App] Bonus round pending - showing inline bonus round first');
      return; // Bonus round will show inline, then trigger theme modal when complete
    }
    
    // No bonus round, go straight to theme modal
    setShowThemeModal(true);
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

    // If we were waiting to show the results modal after theme flow...
    // FLOW: Celebration → Bonus Round (done) → Theme Modal (closing now) → Leaderboard
    const pendingGameId = pendingSummaryGameIdRef.current;
    if (pendingSummaryAfterTheme && pendingGameId && pendingGameId === gameState.gameId) {
      // Theme modal done, show leaderboard now
      console.log('[App] Theme modal closed, showing leaderboard');
      setPendingSummaryAfterTheme(false);
      pendingSummaryGameIdRef.current = null;
      showLeaderboardModal();
    }
  };

  // Bonus round completion handler (for inline UI)
  // FLOW: After bonus round → Show theme modal → Then leaderboard
  const handleBonusRoundComplete = (results: BonusGuessResult[]) => {
    console.log('[App] Bonus round complete with results:', results);
    console.log('[App] Result tiers:', results.map(r => r.tier));
    setBonusRoundResults(results);
    setBonusRoundComplete(true);
    setPendingBonusRound(false);
    
    // After bonus round, show theme modal (then theme modal will trigger leaderboard on close)
    if (pendingSummaryAfterTheme) {
      console.log('[App] Bonus round done, now showing theme modal');
      // Small delay to let bonus results display before showing theme modal
      setTimeout(() => {
        setShowThemeModal(true);
      }, 1500);
    }
  };

  // Calculate bonus attempts (unused guesses) - only for early wins
  const bonusAttempts = gameState.isWon && gameState.guesses 
    ? Math.max(0, 6 - gameState.guesses.length) 
    : 0;

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
      {/* Archive Play Banner */}
      {gameState?.isArchivePlay && (
        <div style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          padding: '0.75rem 1rem',
          borderRadius: '0.75rem',
          marginBottom: '1rem',
          textAlign: 'center',
          boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
          maxWidth: '90%',
          margin: '0 auto 1rem auto'
        }}>
          <div style={{ fontWeight: 'bold', fontSize: '0.95rem', marginBottom: '0.25rem' }}>
            📚 Archive Play
          </div>
          <div style={{ fontSize: '0.85rem', opacity: 0.95 }}>
            {gameState.gameDate} • Won't affect your streak or leaderboard
          </div>
        </div>
      )}

      {/* No Word of the Day Notice */}
      {gameState?.isFallback && !gameState?.isArchivePlay && (
        <div style={{
          background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
          color: 'white',
          padding: '0.75rem 1rem',
          borderRadius: '0.75rem',
          marginBottom: '1rem',
          textAlign: 'center',
          boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)',
          maxWidth: '90%',
          margin: '0 auto 1rem auto'
        }}>
          <div style={{ fontWeight: 'bold', fontSize: '0.95rem', marginBottom: '0.25rem' }}>
            ⚠️ No Word of the Day Set
          </div>
          <div style={{ fontSize: '0.85rem', opacity: 0.95 }}>
            Playing the most recent word instead. Check back later for today's word!
          </div>
        </div>
      )}

      {/* Timer Badge - Centered at top */}
      <div style={{ 
        width: '100%', 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        gap: '0.75rem',
        marginBottom: '1rem',
        paddingTop: '0.5rem'
      }}>
        <TimerBadge seconds={timer} />
          <InfoDiamond onClick={() => setShowRules(true)} />
          <StreakBadge 
            streak={effectivePlayerStats?.currentStreak || 0}
          highestStreak={effectivePlayerStats?.longestStreak || 0}
          lastWinDate={effectivePlayerStats?.lastWinDate || null}
          playerId={getPlayerId()}
          onSelectArchiveDate={handleArchivePlaySelection}
        />
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
          gap: 'clamp(0.1rem, 0.4vw, 0.2rem)',
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
        {/* Un· enhanced design */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <UnPrefix 
            onClick={handleThemeClick} 
            themeGuessData={themeGuessData}
            gameComplete={gameState.isComplete}
            celebrateCompletion={celebrateDiamond}
            onCelebrationComplete={handleCelebrationComplete}
            bonusRoundActive={pendingBonusRound && !celebrateDiamond && !bonusRoundComplete}
            themePromptActive={themePromptActive}
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
            bonusResults={bonusRoundResults.map(r => r.tier || null)}
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
                Guess today's word in 6 guesses or less. Clues revealed after each guess:
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
                {' '}23:59, guess what theme connects this week's 7 secret words
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
            
            <h3 style={{ marginBottom: '0.75rem', fontSize: '1.2rem', fontWeight: 'bold', color: '#1a237e' }}>
              🏆 How Rankings Work
            </h3>
            <p style={{ marginBottom: '1rem', lineHeight: '1.6', fontSize: '0.95rem' }}>
              Your daily ranking is determined by three factors in order of importance:
            </p>
            <div style={{ 
              marginBottom: '1.5rem',
              fontSize: '0.9rem',
              lineHeight: '1.5'
            }}>
              <div style={{ marginBottom: '0.5rem' }}>
                <strong>1. Fewer Guesses</strong> - Solve the word in fewer attempts to rank higher
              </div>
              <div style={{ marginBottom: '0.5rem' }}>
                <strong>2. Faster Time</strong> - If tied on guesses, faster completion time wins
              </div>
              <div style={{ marginBottom: '0.5rem' }}>
                <strong>3. More "Fuzzy" Matches</strong> - If still tied, more partial matches (orange highlights) wins
              </div>
            </div>
            <p style={{ marginBottom: '1rem', lineHeight: '1.6', fontSize: '0.9rem', fontStyle: 'italic', color: '#666' }}>
              💡 A "fuzzy" match occurs when your guess is similar to the target word - look for orange highlights in your guesses!
            </p>
            
            {/* Colored Box Examples */}
            <h3 style={{ marginBottom: '0.75rem', fontSize: '1.2rem', fontWeight: 'bold', color: '#1a237e' }}>
              📦 Box Colors Explained
            </h3>
            <div style={{ 
              display: 'flex', 
              gap: '0.5rem', 
              marginBottom: '1rem',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {/* Correct - Green */}
              <div style={{
                width: '2.5rem',
                height: '2.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#4ade80',
                border: '2px solid #22c55e',
                borderRadius: '0.5rem',
                color: '#14532d',
                fontWeight: 700,
                fontSize: '1.1rem',
                fontFamily: 'var(--font-primary)'
              }}>D</div>
              <span style={{ fontSize: '0.9rem', color: '#059669', fontWeight: 600 }}>Correct</span>
              
              {/* Fuzzy - Orange */}
              <div style={{
                width: '2.5rem',
                height: '2.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#f4c430',
                border: '2px solid #ff9800',
                borderRadius: '0.5rem',
                color: '#b45309',
                fontWeight: 700,
                fontSize: '1.1rem',
                fontFamily: 'var(--font-primary)',
                marginLeft: '1rem'
              }}>D</div>
              <span style={{ fontSize: '0.9rem', color: '#ea580c', fontWeight: 600 }}>Fuzzy</span>
              
              {/* Incorrect - Red */}
              <div style={{
                width: '2.5rem',
                height: '2.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#ffb3b3',
                border: '2px solid #dc2626',
                borderRadius: '0.5rem',
                color: '#fff',
                fontWeight: 700,
                fontSize: '1.1rem',
                fontFamily: 'var(--font-primary)',
                marginLeft: '1rem'
              }}>D</div>
              <span style={{ fontSize: '0.9rem', color: '#dc2626', fontWeight: 600 }}>Wrong</span>
            </div>
            
            {/* Theme Explanation */}
            <h3 style={{ marginBottom: '0.75rem', fontSize: '1.2rem', fontWeight: 'bold', color: '#1a237e' }}>
              🎭 Unlock the Theme of the Week
            </h3>
            <p style={{ marginBottom: '1rem', lineHeight: '1.6', fontSize: '0.95rem' }}>
              Each week, all 7 daily words are connected by a hidden theme. After completing any daily word, you can guess the weekly theme for bonus points and leaderboard glory!
            </p>
            <div style={{ 
              backgroundColor: '#f0fdf4',
              border: '2px solid #d1fae5',
              borderRadius: '0.75rem',
              padding: '1rem',
              marginBottom: '1.5rem'
            }}>
              <div style={{ 
                fontSize: '0.9rem',
                lineHeight: '1.5',
                color: '#059669'
              }}>
                <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>🔓 Theme Benefits:</div>
                <div>• Compete on weekly and all-time theme leaderboards</div>
                <div>• Track your theme-guessing streak and statistics</div>
                <div>• Unlock themes early in the week for maximum points</div>
              </div>
            </div>
            
            {/* Bonus Round Explanation */}
            <h3 style={{ marginBottom: '0.75rem', fontSize: '1.2rem', fontWeight: 'bold', color: '#f59e0b' }}>
              🎯 Bonus Round
            </h3>
            <p style={{ marginBottom: '1rem', lineHeight: '1.6', fontSize: '0.95rem' }}>
              Solve the word in fewer than 6 guesses? You've unlocked the Bonus Round! Guess words that are <strong>close to today's word in the dictionary</strong> to earn bonus medals:
            </p>
            <div style={{ 
              backgroundColor: '#fef3c7',
              border: '2px solid #fcd34d',
              borderRadius: '0.75rem',
              padding: '1rem',
              marginBottom: '1rem'
            }}>
              <div style={{ 
                fontSize: '0.9rem',
                lineHeight: '1.5',
                color: '#92400e'
              }}>
                <div><span style={{ color: '#fbbf24' }}>🥇</span> <strong>Gold</strong> - Within 10 words (Perfect!)</div>
                <div><span style={{ color: '#9ca3af' }}>🥈</span> <strong>Silver</strong> - Within 25 words (Good!)</div>
                <div><span style={{ color: '#d97706' }}>🥉</span> <strong>Bronze</strong> - Within 50 words (Average)</div>
              </div>
            </div>
            <p style={{ marginBottom: '1.5rem', lineHeight: '1.6', fontSize: '0.85rem', fontStyle: 'italic', color: '#666' }}>
              Our dictionary is based on{' '}
              <a 
                href="https://www.mso.anu.edu.au/~ralph/OPTED/" 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ color: '#1a237e', textDecoration: 'underline' }}
              >
                OPTED (Online Plain Text English Dictionary)
              </a>
              , derived from Webster's 1913 Unabridged Dictionary. Both British and American English spellings are accepted!
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
          margin: 'calc(0.25rem + 4px) 0 0.25rem 0'
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
          {/* Show word reveal when game is complete */}
          {gameState.isComplete && (
            <div style={{
              textAlign: 'center',
              fontSize: 'clamp(1.125rem, 3.5vw, 1.25rem)',
              color: gameState.isWon ? '#22c55e' : '#ef4444',
              fontWeight: 700,
              marginBottom: 'calc(0.75rem - 5px)',
              padding: '0'
            }}>
              The word was: {gameState.wordText}
            </div>
          )}

          {/* Bonus Round - inline on main page (consolidated into single component) */}
          {gameState.isComplete && gameState.isWon && bonusAttempts > 0 && 
           pendingBonusRound && !celebrateDiamond && !bonusRoundComplete && (
              <BonusRoundInline
                wordId={gameState.wordId}
                playerId={getPlayerId()}
                targetWord={gameState.wordText}
                remainingAttempts={bonusAttempts}
                guessesUsed={gameState.guesses.length}
                gameSessionId={gameState.gameId}
                onComplete={handleBonusRoundComplete}
              />
          )}

          {/* Bonus Round Results Summary */}
          {bonusRoundComplete && bonusRoundResults.length > 0 && (
            <div style={{
              background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
              border: '2px solid #22c55e',
              borderRadius: '12px',
              padding: '0.75rem',
              marginTop: '0.5rem',
              marginBottom: '0.5rem',
              textAlign: 'center',
            }}>
              <div style={{ fontWeight: 600, color: '#166534', marginBottom: '0.25rem' }}>
                🎯 Bonus Round Complete!
              </div>
              <div style={{ fontSize: '0.85rem', color: '#15803d' }}>
                {bonusRoundResults.filter(r => r.tier === 'perfect').length} Gold,{' '}
                {bonusRoundResults.filter(r => r.tier === 'good').length} Silver,{' '}
                {bonusRoundResults.filter(r => r.tier === 'average').length} Bronze
              </div>
            </div>
          )}

          {bonusRoundComplete && !themeGuessData?.hasGuessedToday && (
            <div style={{
              background: 'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)',
              border: '2px solid #4338ca',
              borderRadius: '12px',
              padding: '0.85rem',
              marginBottom: '0.35rem',
              textAlign: 'center',
              boxShadow: '0 8px 20px rgba(67, 56, 202, 0.08)'
            }}>
              <div style={{
                fontWeight: 700,
                color: '#312e81',
                fontSize: '1.05rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.35rem'
              }}>
                Tap the Un diamond to unlock this week’s theme
                <span role="img" aria-label="sparkles">✨</span>
              </div>
              <div style={{
                fontSize: '0.9rem',
                color: '#4338ca',
                marginTop: '0.2rem'
              }}>
                It’s jiggling above — that’s your next step!
              </div>
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
                  fontSize: 'clamp(0.875rem, 2.5vw, 1rem)',
                  backgroundColor: wasWinningClue ? '#22c55e' : undefined,
                  color: wasWinningClue ? '#fff' : undefined
                }}>{clue.key === 'E2' ? 'E' : clue.key}</div>
                <div className="hint-box" style={{
                  backgroundColor: wasWinningClue ? '#f0fdf4' : '#fff', // Light green only for winning clue
                  borderColor: wasWinningClue ? '#d1fae5' : 'var(--color-primary)', // Match DEFINE box border color
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
        isArchivePlay={gameState.isArchivePlay}
        gameDate={gameState.gameDate}
        bonusRoundResults={bonusRoundResults}
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
        onShowWeeklyThemeLeaderboard={handleShowWeeklyThemeLeaderboard}
        onShowAllTimeThemeLeaderboard={handleShowAllTimeThemeLeaderboard}
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
      {/* Weekly Theme Leaderboard */}
      <WeeklyThemeLeaderboard
        open={showWeeklyThemeLeaderboard}
        onClose={() => setShowWeeklyThemeLeaderboard(false)}
      />
      {/* All-Time Theme Leaderboard */}
      <AllTimeThemeLeaderboard
        open={showAllTimeThemeLeaderboard}
        onClose={() => setShowAllTimeThemeLeaderboard(false)}
      />

      {/* Theme Guess Modal */}
      <ThemeGuessModal
        open={showThemeModal}
        onClose={() => handleCloseThemeModal()}
        gameId={gameState.gameId}
        gameDate={gameState.gameDate}
        isArchivePlay={gameState.isArchivePlay === true}
        gameComplete={gameState.isComplete}
        onThemeDataUpdate={(themeData) => handleCloseThemeModal(themeData)}
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
