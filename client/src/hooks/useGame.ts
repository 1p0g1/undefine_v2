import { useState, useCallback, useEffect } from 'react';
import { GameSessionState, LeaderboardEntry } from '../../../shared-types/src/game';
import { apiClient } from '../api/client';
import { getPlayerId } from '../utils/player';
import { normalizedEquals } from '../../../src/utils/text';
import { ClueKey, CLUE_SEQUENCE, CLUE_LABELS, ShortClueKey, CLUE_KEY_MAP, createDefaultClueStatus } from '../../../shared-types/src/clues';
import { ScoreResult } from '../../../shared-types/src/scoring';
import { gameService } from '../services/GameService';
import type { LeaderboardResponse } from '../api/types';

// Add callback interface for refreshing player stats
interface UseGameOptions {
  onPlayerStatsUpdate?: () => Promise<void> | void;
}

const useGame = (options?: UseGameOptions) => {
  const [gameState, setGameState] = useState<GameSessionState>(() => {
    const currentState = gameService.getCurrentState();
    return currentState || {
      gameId: '',
      wordId: '',
      wordText: '',
      clues: {
        definition: '',
        equivalents: '',
        first_letter: '',
        in_a_sentence: '',
        number_of_letters: '',
        etymology: '',
      },
      guesses: [],
      revealedClues: [],
      clueStatus: createDefaultClueStatus(),
      isComplete: false,
      isWon: false,
      score: null,
      startTime: ''
    };
  });

  // Track if the current game was restored from a previous session
  const [isRestoredGame, setIsRestoredGame] = useState(false);

  // Track guess status for each box (max 6)
  const [guessStatus, setGuessStatus] = useState<
    ('correct' | 'incorrect' | 'fuzzy' | 'empty' | 'active')[]
  >(['empty', 'empty', 'empty', 'empty', 'empty', 'empty']);

  // Track fuzzy match count
  const [fuzzyMatchCount, setFuzzyMatchCount] = useState(0);

  // Track leaderboard modal
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
  const [playerRank, setPlayerRank] = useState<number | null>(null);
  const [isLeaderboardLoading, setIsLeaderboardLoading] = useState(false);
  const [leaderboardError, setLeaderboardError] = useState<string | null>(null);
  const [scoreDetails, setScoreDetails] = useState<ScoreResult | null>(null);

  // Function to fetch leaderboard data
  const fetchLeaderboard = useCallback(async () => {
    if (!gameState.wordId) return;
    setIsLeaderboardLoading(true);
    setLeaderboardError(null);
    try {
      const playerId = getPlayerId();
      const data: LeaderboardResponse = await apiClient.getLeaderboard(gameState.wordId, playerId);
      
      // Convert API response to shared type format
      const convertedLeaderboard: LeaderboardEntry[] = data.leaderboard.map(entry => ({
        ...entry,
        was_top_10: entry.rank <= 10
      }));
      
      setLeaderboardData(convertedLeaderboard);
      setPlayerRank(data.playerRank);
    } catch (error) {
      console.error('[Game] Failed to fetch leaderboard:', error);
      setLeaderboardError('Failed to load leaderboard. Please try again.');
    } finally {
      setIsLeaderboardLoading(false);
    }
  }, [gameState.wordId]);

  // Initialize game on mount
  useEffect(() => {
    const initGame = async () => {
      try {
        const initialState = await gameService.initializeGame();
        setGameState(initialState);
        setIsRestoredGame(initialState.isRestoredGame);
        
        // If this is a restored completed game, refresh player stats to show current streak
        if (initialState.isRestoredGame && initialState.isComplete && options?.onPlayerStatsUpdate) {
          console.log('[Game] Restored completed game detected, refreshing player stats for current streak display');
          try {
            await options.onPlayerStatsUpdate();
            console.log('[Game] Player stats refreshed for restored game');
          } catch (error) {
            console.error('[Game] Failed to refresh player stats for restored game:', error);
          }
        }
        
        // Initialize guess status based on current game state
        if (initialState.guesses && initialState.guesses.length > 0) {
          const newGuessStatus: ('correct' | 'incorrect' | 'fuzzy' | 'empty' | 'active')[] = 
            ['empty', 'empty', 'empty', 'empty', 'empty', 'empty'];
          initialState.guesses.forEach((guess, index) => {
            // For restored games, we need to determine the status
            if (initialState.isWon && index === initialState.guesses.length - 1) {
              newGuessStatus[index] = 'correct';
            } else if (normalizedEquals(guess, initialState.wordText)) {
              newGuessStatus[index] = 'correct';
            } else {
              newGuessStatus[index] = 'incorrect';
            }
          });
          setGuessStatus(newGuessStatus);
        }
      } catch (error) {
        console.error('[Game] Failed to initialize game:', error);
      }
    };
    
    initGame();
  }, [options]);

  const startNewGame = useCallback(async () => {
    try {
      const newState = await gameService.startNewGame();
      setGameState(newState);
      setIsRestoredGame(false); // New games are never restored
      setGuessStatus(['empty', 'empty', 'empty', 'empty', 'empty', 'empty']);
      setFuzzyMatchCount(0);
      setShowLeaderboard(false);
      setScoreDetails(null);
    } catch (error) {
      console.error('[Game] Failed to start new game:', error);
      throw error;
    }
  }, []);

  // Add a separate method for forcing a new game (Play Again)
  const forceNewGame = useCallback(async () => {
    try {
      const newState = await gameService.startNewGame();
      setGameState(newState);
      setIsRestoredGame(false); // New games are never restored
      setGuessStatus(['empty', 'empty', 'empty', 'empty', 'empty', 'empty']);
      setFuzzyMatchCount(0);
      setShowLeaderboard(false);
      setScoreDetails(null);
    } catch (error) {
      console.error('[Game] Failed to force new game:', error);
      throw error;
    }
  }, []);

  const submitGuess = useCallback(
    async (guess: string) => {
      try {
        const data = await gameService.submitGuess(guess);
        
        // Update game state from service
        const currentState = gameService.getCurrentState();
        if (currentState) {
          setGameState(currentState);
        }

        // Update guess status based on response
        const newGuessStatus = [...guessStatus];
        const guessIndex = gameState.guesses.length;
        
        if (data.isCorrect) {
          newGuessStatus[guessIndex] = 'correct';
        } else if (data.isFuzzy) {
          newGuessStatus[guessIndex] = 'fuzzy';
          setFuzzyMatchCount(prev => prev + 1);
          console.log('[Game] Fuzzy match detected:', {
            guess,
            fuzzyPositions: data.fuzzyPositions,
            totalFuzzyMatches: fuzzyMatchCount + 1
          });
        } else {
          newGuessStatus[guessIndex] = 'incorrect';
        }
        
        setGuessStatus(newGuessStatus);

        // Fetch leaderboard and refresh player stats if game is complete
        if (data.gameOver) {
          console.log('[Game] Game completed, starting refresh process:', {
            gameOver: data.gameOver,
            hasStatsCallback: !!options?.onPlayerStatsUpdate,
            callbackType: typeof options?.onPlayerStatsUpdate
          });
          
          // Small delay to ensure database triggers complete
          setTimeout(async () => {
            await fetchLeaderboard();
            
            // Refresh player stats immediately after game completion
            if (options?.onPlayerStatsUpdate) {
              try {
                console.log('[Game] Calling player stats refresh callback...');
                await options.onPlayerStatsUpdate();
                console.log('[Game] Player stats refreshed after game completion');
              } catch (error) {
                console.error('[Game] Failed to refresh player stats:', error);
              }
            } else {
              console.warn('[Game] No player stats update callback provided');
            }
          }, 500);
        }

        return data;
      } catch (error) {
        console.error('[Game] Failed to submit guess:', error);
        throw error;
      }
    },
    [gameState, guessStatus, fuzzyMatchCount, fetchLeaderboard, options]
  );

  const wasCompletedInSession = useCallback(() => {
    return gameService.wasCompletedInSession();
  }, []);

  return {
    gameState,
    startNewGame,
    forceNewGame,
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
  };
};

/**
 * Returns the clues to display based on the number of incorrect guesses.
 * D: Definition (always shown)
 * E: Equivalents (after 1st incorrect guess)
 * F: First Letter (after 2nd incorrect guess)
 * I: In a Sentence (after 3rd incorrect guess)
 * N: Number of Letters (after 4th incorrect guess)
 * E2: Etymology (after 5th incorrect guess)
 */
export function getVisibleClues(
  clues: Record<ClueKey, string>,
  guesses: string[] = [],
  correctAnswer: string = ''
): { key: ShortClueKey; label: string; value: string }[] {
  if (!clues) return [];
  // Count incorrect guesses only
  const incorrectGuesses = guesses.filter(g => !normalizedEquals(g, correctAnswer));
  const visibleClues: { key: ShortClueKey; label: string; value: string }[] = [];

  // Always show definition
  visibleClues.push({ 
    key: 'D', 
    label: CLUE_LABELS[CLUE_KEY_MAP.D], 
    value: clues[CLUE_KEY_MAP.D] 
  });

  // Show remaining clues based on incorrect guesses
  if (incorrectGuesses.length >= 1) {
    visibleClues.push({
      key: 'E',
      label: CLUE_LABELS[CLUE_KEY_MAP.E],
      value: clues[CLUE_KEY_MAP.E],
    });
  }
  if (incorrectGuesses.length >= 2) {
    visibleClues.push({ 
      key: 'F', 
      label: CLUE_LABELS[CLUE_KEY_MAP.F], 
      value: clues[CLUE_KEY_MAP.F] 
    });
  }
  if (incorrectGuesses.length >= 3) {
    visibleClues.push({ 
      key: 'I', 
      label: CLUE_LABELS[CLUE_KEY_MAP.I], 
      value: clues[CLUE_KEY_MAP.I] 
    });
  }
  if (incorrectGuesses.length >= 4) {
    visibleClues.push({
      key: 'N',
      label: CLUE_LABELS[CLUE_KEY_MAP.N],
      value: clues[CLUE_KEY_MAP.N],
    });
  }
  if (incorrectGuesses.length >= 5) {
    visibleClues.push({ 
      key: 'E2', 
      label: CLUE_LABELS[CLUE_KEY_MAP.E2], 
      value: clues[CLUE_KEY_MAP.E2] 
    });
  }
  return visibleClues;
}

/**
 * Returns all clues for display after game completion
 */
export function getAllClues(
  clues: Record<ClueKey, string>
): { key: ShortClueKey; label: string; value: string }[] {
  if (!clues) return [];
  
  const allClues: { key: ShortClueKey; label: string; value: string }[] = [];

  // Show all clues in D-E-F-I-N-E order
  allClues.push({ 
    key: 'D', 
    label: CLUE_LABELS[CLUE_KEY_MAP.D], 
    value: clues[CLUE_KEY_MAP.D] 
  });
  allClues.push({
    key: 'E',
    label: CLUE_LABELS[CLUE_KEY_MAP.E],
    value: clues[CLUE_KEY_MAP.E],
  });
  allClues.push({ 
    key: 'F', 
    label: CLUE_LABELS[CLUE_KEY_MAP.F], 
    value: clues[CLUE_KEY_MAP.F] 
  });
  allClues.push({ 
    key: 'I', 
    label: CLUE_LABELS[CLUE_KEY_MAP.I], 
    value: clues[CLUE_KEY_MAP.I] 
  });
  allClues.push({
    key: 'N',
    label: CLUE_LABELS[CLUE_KEY_MAP.N],
    value: clues[CLUE_KEY_MAP.N],
  });
  allClues.push({ 
    key: 'E2', 
    label: CLUE_LABELS[CLUE_KEY_MAP.E2], 
    value: clues[CLUE_KEY_MAP.E2] 
  });

  return allClues;
}

export default useGame;
