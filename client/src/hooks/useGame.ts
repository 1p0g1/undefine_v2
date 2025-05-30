import { useState, useCallback } from 'react';
import { GameSessionState, LeaderboardEntry } from '../../../shared-types/src/game';
import { WordResponse } from '../../../shared-types/src/word';
import { apiClient } from '../api/client';
import { getPlayerId } from '../utils/player';
import { normalizedEquals, normalizeText } from '../../../src/utils/text';
import { ClueKey, CLUE_SEQUENCE, CLUE_LABELS, createDefaultClueStatus, ShortClueKey, CLUE_KEY_MAP } from '../../../shared-types/src/clues';
import { ScoreResult } from '../../../shared-types/src/scoring';
import { env } from '../env.client';

const useGame = () => {
  const [gameState, setGameState] = useState<GameSessionState>({
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
    score: null
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
      console.log('[Game] Fetching word…');
      const data = await apiClient.getNewWord();
      
      // Debug log in development
      if (import.meta.env.DEV) {
        console.log('[Debug] Word Response:', {
          word: data.word,
          gameId: data.gameId,
          isFallback: data.isFallback
        });
      }

      // Ensure all clues are strings
      const processedClues = {
        definition: String(data.word.definition || ''),
        equivalents: Array.isArray(data.word.equivalents) ? data.word.equivalents.join(', ') : String(data.word.equivalents || ''),
        first_letter: String(data.word.first_letter || ''),
        in_a_sentence: String(data.word.in_a_sentence || ''),
        number_of_letters: String(data.word.number_of_letters || ''),
        etymology: String(data.word.etymology || '')
      };

      // Debug log in development
      if (import.meta.env.DEV) {
        console.log('[Debug] Processed Clues:', processedClues);
      }
      
      setGameState({
        gameId: data.gameId,
        wordId: data.word.id,
        wordText: data.word.word,
        clues: processedClues,
        guesses: [],
        revealedClues: [],
        clueStatus: createDefaultClueStatus(),
        isComplete: false,
        isWon: false,
        score: null
      });
      
      setGuessStatus(['empty', 'empty', 'empty', 'empty', 'empty', 'empty']);
      setShowLeaderboard(false);
      setScoreDetails(null);
    } catch (error) {
      console.error('[Game] Failed to start new game:', error);
    }
  }, []);

  const submitGuess = useCallback(
    async (guess: string) => {
      const normalizedGuess = normalizeText(guess);
      
      // Early defensive returns
      if (!normalizedGuess) {
        console.warn('[Game] Empty guess submitted');
        return;
      }
      if (gameState.isComplete) {
        console.warn('[Game] Attempted to submit guess for completed game');
        return;
      }
      if (!gameState.gameId || !gameState.wordId) {
        console.error('[Game] Invalid game state - missing gameId or wordId');
        return;
      }

      try {
        const playerId = getPlayerId();
        if (!playerId) {
          console.error('[Game] No player ID available');
          return;
        }

        // Validate and format request payload
        const guessRequest = {
          gameId: gameState.gameId,
          wordId: gameState.wordId,
          guess: normalizedGuess,
          playerId,
          start_time: new Date().toISOString()
        };
        
        // Debug log in development
        if (import.meta.env.DEV) {
          console.log('[Debug] Submitting guess:', {
            ...guessRequest,
            currentState: {
              guessCount: gameState.guesses.length,
              revealedClues: gameState.revealedClues,
              isComplete: gameState.isComplete
            }
          });
        }

        const data = await apiClient.submitGuess(guessRequest);

        // Debug log in development
        if (import.meta.env.DEV) {
          console.log('[Debug] Guess response:', {
            ...data,
            stateBeforeUpdate: {
              guessCount: gameState.guesses.length,
              revealedClues: gameState.revealedClues
            }
          });
        }

        setGameState((prevState: GameSessionState) => {
          const newGuesses = [...prevState.guesses, normalizedGuess];
          
          // Determine guess status using normalizedEquals
          let status: 'correct' | 'incorrect' | 'fuzzy' = 'incorrect';
          if (normalizedEquals(normalizedGuess, gameState.wordText)) {
            status = 'correct';
          } else if (data.isFuzzy) {
            status = 'fuzzy';
          }

          // Update guess status array
          const newGuessStatus = [...guessStatus];
          newGuessStatus[newGuesses.length - 1] = status;
          setGuessStatus(newGuessStatus);

          // Handle game completion
          if (data.gameOver) {
            setShowLeaderboard(true);
            fetchLeaderboard();
            
            // Dev warning for missing score when game is complete
            if (import.meta.env.DEV && !data.score) {
              console.warn('[Game] Score is null for completed game', {
                isCorrect: data.isCorrect,
                guessCount: newGuesses.length
              });
            }
            
            setScoreDetails(data.score);
          }

          // Ensure revealedClues is always an array
          const safeRevealedClues = Array.isArray(data.revealedClues) 
            ? data.revealedClues 
            : prevState.revealedClues;

          // Dev warning for unexpected revealedClues state
          if (import.meta.env.DEV && !Array.isArray(data.revealedClues)) {
            console.warn('[Game] Received invalid revealedClues from server', {
              received: data.revealedClues,
              using: safeRevealedClues
            });
          }

          return {
            ...prevState,
            guesses: newGuesses,
            revealedClues: safeRevealedClues,
            isComplete: data.gameOver,
            isWon: data.isCorrect,
            score: data.score?.score || null
          };
        });
      } catch (error) {
        console.error('[Game] Failed to submit guess:', error);
        // Log detailed error info in development
        if (import.meta.env.DEV) {
          console.error('[Debug] Error context:', {
            gameState: {
              gameId: gameState.gameId,
              wordId: gameState.wordId,
              guessCount: gameState.guesses.length,
              isComplete: gameState.isComplete
            },
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
    },
    [gameState.gameId, gameState.wordId, gameState.isComplete, gameState.guesses.length, gameState.wordText, guessStatus, fetchLeaderboard]
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
