import { useState, useCallback } from 'react';
import { GameSessionState, WordResponse, LeaderboardEntry } from '../api/types';
import { apiClient } from '../api/client';
import { getPlayerId } from '../utils/player';
import { normalizedEquals } from '../../../src/utils/text';
import { ClueKey, CLUE_SEQUENCE, CLUE_LABELS, createDefaultClueStatus, CLUE_KEY_MAP } from '../../../shared-types/src/clues';
import { ScoreResult } from '../../../shared-types/src/scoring';

const useGame = () => {
  const [gameState, setGameState] = useState<GameSessionState>({
    gameId: '',
    wordId: '',
    wordText: '',
    clues: {
      D: '',
      E: '',
      F: '',
      I: '',
      N: '',
      E2: '',
    },
    guesses: [],
    revealedClues: [],
    clueStatus: createDefaultClueStatus(),
    usedHint: false,
    isComplete: false,
    isWon: false,
    score: null
  });
  // Track guess status for each box (max 6)
  const [guessStatus, setGuessStatus] = useState<
    ('correct' | 'incorrect' | 'fuzzy' | 'empty' | 'active')[]
  >(['empty', 'empty', 'empty', 'empty', 'empty', 'empty']);
  // Track leaderboard modal
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  // Store leaderboard data
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
  const [playerRank, setPlayerRank] = useState<number | null>(null);
  const [isLeaderboardLoading, setIsLeaderboardLoading] = useState(false);
  const [leaderboardError, setLeaderboardError] = useState<string | null>(null);
  // Track score details
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
      console.error('Failed to fetch leaderboard:', error);
      setLeaderboardError('Failed to load leaderboard. Please try again.');
    } finally {
      setIsLeaderboardLoading(false);
    }
  }, [gameState.wordId]);

  const startNewGame = useCallback(async () => {
    try {
      console.log('Fetching word…');
      const data = await apiClient.getNewWord();
      
      setGameState({
        gameId: data.gameId,
        wordId: data.word.id,
        wordText: data.word.word,
        clues: {
          D: data.word.definition,
          E: data.word.equivalents.join(', '), // Convert array to string
          F: data.word.first_letter,
          I: data.word.in_a_sentence,
          N: data.word.number_of_letters.toString(),
          E2: data.word.etymology,
        },
        guesses: [],
        revealedClues: [],
        clueStatus: createDefaultClueStatus(),
        usedHint: false,
        isComplete: false,
        isWon: false,
        score: null
      });
      setGuessStatus(['empty', 'empty', 'empty', 'empty', 'empty', 'empty']);
      setShowLeaderboard(false);
      setScoreDetails(null);
    } catch (error) {
      console.error('Failed to start new game:', error);
    }
  }, []);

  const submitGuess = useCallback(
    async (guess: string) => {
      const trimmedGuess = guess.trim();
      if (!trimmedGuess || gameState.isComplete) return;

      try {
        const playerId = getPlayerId();
        if (!playerId) {
          console.error('No player ID available');
          return;
        }

        const data = await apiClient.submitGuess({
          gameId: gameState.gameId,
          guess: trimmedGuess,
          playerId,
        });

        setGameState((prevState: GameSessionState) => {
          const newGuesses = [...prevState.guesses, trimmedGuess];
          // Determine status for this guess
          let status: 'correct' | 'incorrect' | 'fuzzy' = 'incorrect';
          if (data.isCorrect) {
            status = 'correct';
          } else if (data.isFuzzy) {
            status = 'fuzzy';
          }

          // Update guessStatus array
          const newGuessStatus = [...guessStatus];
          newGuessStatus[newGuesses.length - 1] = status;
          setGuessStatus(newGuessStatus);

          // Show leaderboard if 6 guesses or game over
          if (data.gameOver) {
            setShowLeaderboard(true);
            fetchLeaderboard();
            if (data.score) {
              setScoreDetails(data.score);
            }
          }

          return {
            ...prevState,
            guesses: newGuesses,
            revealedClues: data.revealedClues,
            isComplete: data.gameOver,
            isWon: data.isCorrect,
            score: data.score?.score || null
          };
        });
      } catch (error) {
        console.error('Failed to submit guess:', error);
      }
    },
    [gameState.gameId, gameState.isComplete, guessStatus, fetchLeaderboard]
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
  clues: GameSessionState['clues'],
  guesses: string[] = [],
  correctAnswer: string = ''
): { key: string; label: string; value: string }[] {
  if (!clues) return [];
  // Count incorrect guesses only
  const incorrectGuesses = guesses.filter(g => !normalizedEquals(g, correctAnswer));
  const visibleClues: { key: string; label: string; value: string }[] = [];

  // Always show definition
  visibleClues.push({ 
    key: CLUE_KEY_MAP.D, 
    label: CLUE_LABELS[CLUE_KEY_MAP.D], 
    value: clues.D 
  });

  // Show remaining clues based on incorrect guesses
  if (incorrectGuesses.length >= 1) {
    visibleClues.push({
      key: CLUE_KEY_MAP.E,
      label: CLUE_LABELS[CLUE_KEY_MAP.E],
      value: clues.E,
    });
  }
  if (incorrectGuesses.length >= 2) {
    visibleClues.push({ 
      key: CLUE_KEY_MAP.F, 
      label: CLUE_LABELS[CLUE_KEY_MAP.F], 
      value: clues.F 
    });
  }
  if (incorrectGuesses.length >= 3) {
    visibleClues.push({ 
      key: CLUE_KEY_MAP.I, 
      label: CLUE_LABELS[CLUE_KEY_MAP.I], 
      value: clues.I 
    });
  }
  if (incorrectGuesses.length >= 4) {
    visibleClues.push({
      key: CLUE_KEY_MAP.N,
      label: CLUE_LABELS[CLUE_KEY_MAP.N],
      value: clues.N,
    });
  }
  if (incorrectGuesses.length >= 5) {
    visibleClues.push({ 
      key: CLUE_KEY_MAP.E2, 
      label: CLUE_LABELS[CLUE_KEY_MAP.E2], 
      value: clues.E2 
    });
  }
  return visibleClues;
}

export default useGame;
