import { useState, useCallback, useEffect } from 'react';
import { GameSessionState, LeaderboardEntry } from '../../../shared-types/src/game';
import { apiClient } from '../api/client';
import { getPlayerId } from '../utils/player';
import { normalizedEquals } from '../../../src/utils/text';
import { ClueKey, CLUE_SEQUENCE, CLUE_LABELS, ShortClueKey, CLUE_KEY_MAP, createDefaultClueStatus } from '../../../shared-types/src/clues';
import { ScoreResult } from '../../../shared-types/src/scoring';
import { gameService } from '../services/GameService';

const useGame = () => {
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

  // Track guess status for each box (max 6)
  const [guessStatus, setGuessStatus] = useState<
    ('correct' | 'incorrect' | 'fuzzy' | 'empty' | 'active')[]
  >(['empty', 'empty', 'empty', 'empty', 'empty', 'empty']);

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
      const data = await apiClient.getLeaderboard(gameState.wordId, playerId);
      setLeaderboardData(data.leaderboard);
      setPlayerRank(data.playerRank);
    } catch (error) {
      console.error('[Game] Failed to fetch leaderboard:', error);
      setLeaderboardError('Failed to load leaderboard. Please try again.');
    } finally {
      setIsLeaderboardLoading(false);
    }
  }, [gameState.wordId]);

  const startNewGame = useCallback(async () => {
    try {
      const newState = await gameService.startNewGame();
      setGameState(newState);
      setGuessStatus(['empty', 'empty', 'empty', 'empty', 'empty', 'empty']);
      setShowLeaderboard(false);
      setScoreDetails(null);
    } catch (error) {
      console.error('[Game] Failed to start new game:', error);
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

        // Update guess status
        const newGuessStatus = [...guessStatus];
        newGuessStatus[gameState.guesses.length] = data.isCorrect ? 'correct' : 'incorrect';
        setGuessStatus(newGuessStatus);

        // Fetch leaderboard if game is complete
        if (data.gameOver) {
          await fetchLeaderboard();
        }

        return data;
      } catch (error) {
        console.error('[Game] Failed to submit guess:', error);
        throw error;
      }
    },
    [gameState, guessStatus, fetchLeaderboard]
  );

  return {
    gameState,
    startNewGame,
    submitGuess,
    guessStatus,
    showLeaderboard,
    leaderboardData,
    playerRank,
    isLeaderboardLoading,
    leaderboardError,
    scoreDetails
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

export default useGame;
