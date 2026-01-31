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
import { VaultLogo } from './components/VaultLogo';
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
import { getApiBaseUrl } from './utils/apiHelpers';

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

  // Theme solvers count for intro text
  const [weeklyThemeSolvers, setWeeklyThemeSolvers] = useState<number>(0);
  
  // Daily solvers count and mini leaderboard for intro
  const [dailySolversCount, setDailySolversCount] = useState<number>(0);
  const [miniLeaderboard, setMiniLeaderboard] = useState<Array<{
    rank: number;
    displayName: string;
    guesses: number;
    time: string;
  }>>([]);

  // Theme data state for UN diamond coloring
  // Theme data state for UN diamond coloring - CACHED in localStorage for instant load
  const [themeGuessData, setThemeGuessData] = useState<{
    hasGuessedToday: boolean;
    isCorrectGuess: boolean;
    confidencePercentage: number | null;
    highestConfidencePercentage?: number | null;
  } | undefined>(() => {
    // Initialize from localStorage for instant vault state on page load
    try {
      const cached = localStorage.getItem('themeGuessData');
      if (cached) {
        const parsed = JSON.parse(cached);
        // Validate cached data has required fields
        if (typeof parsed.hasGuessedToday === 'boolean') {
          console.log('[App] Loaded cached themeGuessData:', parsed);
          return parsed;
        }
      }
    } catch (e) {
      console.log('[App] Failed to parse cached themeGuessData');
    }
    return undefined;
  });

  // Bonus round state (inline UI after winning early)
  const [bonusRoundResults, setBonusRoundResults] = useState<BonusGuessResult[]>([]);
  const [bonusRoundComplete, setBonusRoundComplete] = useState(false);
  
  // NEW: Celebration animation state for post-game ceremony
  const [celebrateDiamond, setCelebrateDiamond] = useState(false);
  // NEW: Track if bonus round should show after theme guess
  const [pendingBonusRound, setPendingBonusRound] = useState(false);

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

  // Load theme data for UN diamond coloring - also caches to localStorage
  const loadThemeData = async () => {
    try {
      const playerId = getPlayerId();
      if (!playerId) return;
      
      const themeStatus = await apiClient.getThemeStatus(playerId);
      if (themeStatus && themeStatus.progress) {
        const newThemeData = {
          hasGuessedToday: themeStatus.progress.hasGuessedToday,
          isCorrectGuess: themeStatus.progress.isCorrectGuess,
          confidencePercentage: themeStatus.progress.confidencePercentage || null,
          highestConfidencePercentage: (themeStatus.progress as any).highestConfidencePercentage || null
        };
        setThemeGuessData(newThemeData);
        // Cache to localStorage for instant load on next visit
        try {
          localStorage.setItem('themeGuessData', JSON.stringify(newThemeData));
          console.log('[App] Cached themeGuessData to localStorage');
        } catch (e) {
          console.log('[App] Failed to cache themeGuessData');
        }
      }
      
      // Also fetch weekly theme solvers count
      try {
        const themeStats = await (apiClient as any).getWeeklyThemeSolvers();
        if (themeStats && typeof themeStats.solversCount === 'number') {
          setWeeklyThemeSolvers(themeStats.solversCount);
        }
      } catch (e) {
        console.log('[App] Failed to fetch weekly theme solvers:', e);
      }
    } catch (error) {
      console.log('[App] Failed to load theme data for UN diamond coloring:', error);
      // Don't show error for this background load
    }
  };
  
  // Load daily leaderboard for intro page - independent of playerId
  const loadDailyLeaderboard = async () => {
    try {
      const baseUrl = getApiBaseUrl() || '';
      const apiUrl = `${baseUrl}/api/daily-leaderboard`;
      console.log('[App] Fetching daily leaderboard from:', apiUrl);
      
      const leaderboardRes = await fetch(apiUrl);
      console.log('[App] Daily leaderboard response status:', leaderboardRes.status);
      
      if (!leaderboardRes.ok) {
        console.error('[App] Daily leaderboard fetch failed with status:', leaderboardRes.status);
        return;
      }
      
      const leaderboardData = await leaderboardRes.json();
      console.log('[App] Daily leaderboard data:', leaderboardData);
      
      // Always update totalPlayers (even if 0 initially)
      setDailySolversCount(leaderboardData.totalPlayers || 0);
      
      if (leaderboardData.entries && leaderboardData.entries.length > 0) {
        // Format time helper
        const formatTime = (seconds: number): string => {
          const mins = Math.floor(seconds / 60);
          const secs = seconds % 60;
          return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        };
        
        const top3 = leaderboardData.entries.slice(0, 3).map((entry: any) => ({
          rank: entry.rank,
          displayName: entry.displayName,
          guesses: entry.guesses,
          time: formatTime(entry.timeSeconds || 0)
        }));
        console.log('[App] Setting miniLeaderboard:', top3);
        setMiniLeaderboard(top3);
      } else {
        console.log('[App] No leaderboard entries yet');
      }
    } catch (e) {
      console.error('[App] Failed to fetch daily leaderboard:', e);
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
    loadDailyLeaderboard(); // Fetch intro page leaderboard
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
    highestConfidencePercentage?: number | null;
  }) => {
    setShowThemeModal(false);
    
    // Update theme data immediately if provided from modal
    if (updatedThemeData) {
      setThemeGuessData(updatedThemeData);
      // Cache to localStorage for instant vault state
      try {
        localStorage.setItem('themeGuessData', JSON.stringify(updatedThemeData));
        console.log('[App] Cached themeGuessData after modal close');
      } catch (e) {
        console.log('[App] Failed to cache themeGuessData');
      }
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
    console.log('[App] Bonus round complete:', results);
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
        {/* Vault Logo - replaces Un· diamond with PNG images */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <VaultLogo 
            onClick={handleThemeClick} 
            themeGuessData={themeGuessData}
            gameComplete={gameState.isComplete}
            celebrateCompletion={celebrateDiamond}
            onCelebrationComplete={handleCelebrationComplete}
            bonusRoundActive={pendingBonusRound && !celebrateDiamond && !bonusRoundComplete}
            disableCelebrateAnimation={true} // Keep homepage vault static (only open/closed)
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
            margin: '0.75rem auto',
            maxWidth: '600px',
            padding: '0 1rem'
          }}
        >
          {/* Game Description - New tagline */}
          <div style={{ 
            marginBottom: '1.25rem',
            fontSize: 'clamp(1rem, 3vw, 1.2rem)',
            fontWeight: '600',
            lineHeight: '1.4',
            background: 'linear-gradient(135deg, #1a237e 0%, #3b82f6 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            Can you unlock the theme that connects this week's secret words?
          </div>

          {/* Game Modes in Boxes - REORDERED: This Week first, Today second */}
          <div style={{ 
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
            marginBottom: '1.25rem'
          }}>
            {/* This Week's Challenge Box - NOW FIRST */}
            <div style={{
              backgroundColor: '#f0fdf4',
              border: '2px solid #d1fae5',
              borderRadius: '0.75rem',
              padding: '1rem 1.25rem',
              textAlign: 'left',
              position: 'relative',
              zIndex: 2
            }}>
              <div style={{ 
                fontWeight: '700',
                fontSize: 'clamp(0.95rem, 2.8vw, 1.1rem)',
                color: '#059669',
                marginBottom: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem'
              }}>
                This week:
                {/* Vault door icon with Un· text - LARGER and closer */}
                <div style={{ 
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  marginLeft: '0.25rem'
                }}>
                  <img 
                    src="/ClosedVault.png" 
                    alt="Vault" 
                    style={{ 
                      width: 'clamp(2.2rem, 6vw, 2.8rem)',
                      height: 'clamp(2.2rem, 6vw, 2.8rem)',
                      objectFit: 'contain'
                    }} 
                  />
                  <span style={{
                    position: 'absolute',
                    fontFamily: 'var(--font-primary)',
                    fontWeight: 800,
                    fontSize: 'clamp(0.6rem, 1.8vw, 0.75rem)',
                    color: '#059669',
                    fontStyle: 'italic',
                    textShadow: '0 0 3px white, 0 0 3px white'
                  }}>
                    Un·
                  </span>
                </div>
                <span style={{
                  fontStyle: 'italic',
                  fontSize: '1em',
                  color: '#059669',
                  marginLeft: '-0.1rem'
                }}>
                  lock
                </span>
              </div>
              <div style={{ color: '#374151', fontSize: '0.85em', lineHeight: '1.4' }}>
                Before{' '}
                <span style={{
                  fontWeight: '700',
                  color: '#059669',
                  background: 'linear-gradient(135deg, #059669 0%, #34d399 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text'
                }}>
                  {(() => {
                    const now = new Date();
                    const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
                    // Calculate next Monday (day after Sunday)
                    const daysUntilMonday = currentDay === 0 ? 1 : (8 - currentDay);
                    const nextMonday = new Date(now);
                    nextMonday.setDate(now.getDate() + daysUntilMonday);
                    
                    const day = nextMonday.getDate();
                    const month = nextMonday.toLocaleString('default', { month: 'long' });
                    const dayNames = ['Sun', 'Mon', 'Tues', 'Weds', 'Thurs', 'Fri', 'Sat'];
                    const dayName = dayNames[nextMonday.getDay()];
                    const getOrdinal = (n: number) => {
                      const s = ["th", "st", "nd", "rd"];
                      const v = n % 100;
                      return n + (s[(v - 20) % 10] || s[v] || s[0]);
                    };
                    
                    return `${dayName} ${getOrdinal(day)} ${month}`;
                  })()}
                </span>
                , guess what connects this week's words
              </div>
              
              {/* Player count with glowing effect - inside the box */}
              <div 
                className="theme-solvers-glow"
                style={{ 
                  marginTop: '0.75rem',
                  fontSize: 'clamp(0.8rem, 2.2vw, 0.9rem)',
                  fontWeight: '600',
                  color: '#059669',
                  textAlign: 'center',
                  padding: '0.4rem 0.75rem',
                  background: 'rgba(5, 150, 105, 0.08)',
                  borderRadius: '0.375rem',
                  animation: 'subtleGlow 3s ease-in-out infinite'
                }}
              >
                <span style={{ 
                  fontWeight: '700',
                  background: 'linear-gradient(90deg, #059669 0%, #34d399 50%, #059669 100%)',
                  backgroundSize: '200% auto',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  animation: 'shimmerText 3s linear infinite'
                }}>
                  {weeklyThemeSolvers}
                </span>
                {' '}player{weeklyThemeSolvers !== 1 ? 's have' : ' has'} solved the theme this week
              </div>
            </div>

            {/* Today's Challenge Box - NOW SECOND with overlap effect */}
            <div style={{
              backgroundColor: '#f8f9ff',
              border: '2px solid #e0e4ff',
              borderRadius: '0.75rem',
              padding: '1rem 1.25rem',
              textAlign: 'left',
              marginTop: '-0.5rem',
              position: 'relative',
              zIndex: 1
            }}>
              <div style={{ 
                fontWeight: '700',
                fontSize: 'clamp(0.95rem, 2.8vw, 1.1rem)',
                color: 'var(--color-primary)',
                marginBottom: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                Today:
                {/* Inline DEFINE boxes */}
                <div style={{
                  display: 'flex',
                  gap: '0.08rem',
                  alignItems: 'center'
                }}>
                  {['D', 'E', 'F', 'I', 'N', 'E'].map((letter, index) => (
                    <div
                      key={index}
                      style={{
                        width: 'clamp(1.4rem, 4vw, 1.6rem)',
                        height: 'clamp(1.4rem, 4vw, 1.6rem)',
                        border: '2px solid var(--color-primary)',
                        borderRadius: '0.25rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontFamily: 'var(--font-primary)',
                        fontWeight: 700,
                        fontSize: 'clamp(0.75rem, 2.5vw, 0.9rem)',
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
              <div style={{ color: '#374151', fontSize: '0.85em', marginBottom: '0.5rem' }}>
                Guess today's word in 6 guesses or less. Clues revealed after each guess:
              </div>
              
              {/* Single column clue list with boxes */}
              <div style={{ 
                display: 'flex',
                flexDirection: 'column',
                gap: '0.25rem',
                fontSize: '0.8em',
                color: '#374151',
                marginBottom: '0.75rem'
              }}>
                {[
                  { letter: 'D', label: 'efinition' },
                  { letter: 'E', label: 'quivalents' },
                  { letter: 'F', label: 'irst Letter' },
                  { letter: 'I', label: 'n a Sentence' },
                  { letter: 'N', label: 'umber of Letters' },
                  { letter: 'E', label: 'tymology' }
                ].map((clue, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{ color: '#9ca3af', fontSize: '0.85em', width: '1rem' }}>{idx + 1}.</span>
                    <div style={{
                      width: '1.4rem',
                      height: '1.4rem',
                      border: '2px solid var(--color-primary)',
                      borderRadius: '0.2rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      color: 'var(--color-primary)',
                      backgroundColor: 'white',
                      flexShrink: 0
                    }}>
                      {clue.letter}
                    </div>
                    <span style={{ color: 'var(--color-primary)' }}>{clue.label}</span>
                  </div>
                ))}
              </div>
              
              {/* Daily solvers count + mini leaderboard */}
              {(dailySolversCount > 0 || miniLeaderboard.length > 0) && (
                <div style={{
                  borderTop: '1px solid #e0e4ff',
                  paddingTop: '0.75rem',
                  marginTop: '0.5rem'
                }}>
                  {dailySolversCount > 0 && (
                    <div style={{ 
                      fontSize: '0.85em',
                      fontWeight: '600',
                      color: 'var(--color-primary)',
                      marginBottom: miniLeaderboard.length > 0 ? '0.5rem' : 0
                    }}>
                      {dailySolversCount} player{dailySolversCount !== 1 ? 's' : ''} solved today's word
                    </div>
                  )}
                  
                  {/* Mini leaderboard - top 3 only */}
                  {miniLeaderboard.length > 0 && (
                    <div style={{
                      background: 'rgba(26, 35, 126, 0.03)',
                      borderRadius: '0.375rem',
                      padding: '0.5rem',
                      fontSize: '0.75em'
                    }}>
                      <div style={{ 
                        fontWeight: '600', 
                        color: '#6b7280',
                        marginBottom: '0.35rem',
                        fontSize: '0.9em'
                      }}>
                        Top Scorers:
                      </div>
                      {miniLeaderboard.map((entry) => (
                        <div 
                          key={entry.rank}
                          style={{ 
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            padding: '0.2rem 0',
                            borderBottom: entry.rank < miniLeaderboard.length ? '1px solid rgba(26, 35, 126, 0.08)' : 'none'
                          }}
                        >
                          <span style={{ 
                            fontSize: '1rem',
                            width: '1.2rem'
                          }}>
                            {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : '🥉'}
                          </span>
                          <span style={{ 
                            flex: 1,
                            fontWeight: 600,
                            color: '#374151',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {entry.displayName}
                          </span>
                          <span style={{ 
                            color: '#6b7280',
                            fontSize: '0.9em'
                          }}>
                            {entry.guesses} guess{entry.guesses !== 1 ? 'es' : ''} • {entry.time}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
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

          {/* Bonus Round - inline on main page (component has its own header) */}
          {gameState.isComplete && gameState.isWon && bonusAttempts > 0 && 
           pendingBonusRound && !celebrateDiamond && !bonusRoundComplete && (
            <BonusRoundInline
              wordId={gameState.wordId}
              playerId={getPlayerId() || ''}
              targetWord={gameState.wordText}
              remainingAttempts={bonusAttempts}
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
                fontSize: '16px', // Prevents iOS zoom on focus
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
        
        @keyframes subtleGlow {
          0%, 100% {
            box-shadow: 0 0 8px rgba(26, 35, 126, 0.15), 0 0 16px rgba(59, 130, 246, 0.1);
          }
          50% {
            box-shadow: 0 0 12px rgba(26, 35, 126, 0.25), 0 0 24px rgba(59, 130, 246, 0.15);
          }
        }
        
        @keyframes shimmerText {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
      `}</style>
    </div>
  );
}

export default App;
