import { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import { GuessRequest, GuessResponse, GameSessionState } from '../../../shared-types/src/game';
import { WordResponse } from '../../../shared-types/src/word';
import { getPlayerId } from '../utils/player';
import { ClueKey, createDefaultClueStatus } from '../../../shared-types/src/clues';
import { convertToClueKeys } from '../utils/clue';

const MAX_GUESSES = 6;
const STORAGE_KEY = 'undefine_game_state';

interface GameState extends GameSessionState {
  clues: Record<ClueKey, string>;
  isTestMode: boolean;
}

export function useGameState() {
  const [isTestMode, setIsTestMode] = useState(false);
  const [gameState, setGameState] = useState<GameState>({
    gameId: '',
    wordId: '',
    wordText: '',
    clues: {
      definition: '',
      equivalents: '',
      first_letter: '',
      in_a_sentence: '',
      number_of_letters: '',
      etymology: ''
    },
    guesses: [],
    revealedClues: [],
    clueStatus: {
      definition: false,
      equivalents: false,
      first_letter: false,
      in_a_sentence: false,
      number_of_letters: false,
      etymology: false
    },
    isComplete: false,
    isWon: false,
    score: null,
    startTime: '',
    isTestMode: false
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Persist state to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(gameState));
  }, [gameState]);

  useEffect(() => {
    startNewGame();
  }, []);

  const startNewGame = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiClient.getNewWord();
      if (!response.word?.id || !response.gameId || !response.start_time) {
        throw new Error('Invalid response from server');
      }

      setGameState({
        gameId: response.gameId,
        wordId: response.word.id,
        wordText: response.word.word,
        clues: {
          definition: response.word.definition || '',
          equivalents: response.word.equivalents?.join(', ') || '',
          first_letter: response.word.first_letter || '',
          in_a_sentence: response.word.in_a_sentence || '',
          number_of_letters: String(response.word.number_of_letters || ''),
          etymology: response.word.etymology || ''
        },
        guesses: [],
        revealedClues: [],
        clueStatus: {
          definition: false,
          equivalents: false,
          first_letter: false,
          in_a_sentence: false,
          number_of_letters: false,
          etymology: false
        },
        isComplete: false,
        isWon: false,
        score: null,
        startTime: response.start_time,
        isTestMode
      });
    } catch (err) {
      setError('Failed to start new game');
      console.error('Start game error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const getNextClue = (): string | null => {
    // Get all clue values from the gameState.clues object
    const allClues = Object.entries(gameState.clues).map(([key, value]) => {
      const clueKey = key as ClueKey; // Cast to ClueKey for type safety
      if (Array.isArray(value)) {
        return value.join(', ');
      }
      return value.toString();
    });
    
    // Find the first clue that hasn't been revealed yet
    // Note: revealedClues contains ClueKey values, so we need to check against clue keys
    const unrevealedClueKeys = Object.keys(gameState.clues).filter(
      key => !gameState.revealedClues.includes(key as ClueKey)
    ) as ClueKey[];
    
    if (unrevealedClueKeys.length === 0) {
      return null;
    }
    
    // Return the value of the first unrevealed clue
    const nextClueKey = unrevealedClueKeys[0];
    const clueValue = gameState.clues[nextClueKey];
    return Array.isArray(clueValue) ? clueValue.join(', ') : clueValue.toString();
  };

  const submitGuess = async (guess: string) => {
    if (gameState.isComplete || gameState.guesses.length >= MAX_GUESSES) {
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      // Validate all required fields
      const missingFields = [
        !gameState.gameId && 'gameId',
        !gameState.wordId && 'wordId',
        !gameState.startTime && 'start_time',
        !guess && 'guess'
      ].filter(Boolean);

      if (missingFields.length > 0) {
        throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
      }

      const playerId = getPlayerId();
      if (!playerId) {
        throw new Error('No player ID available');
      }

      const request: GuessRequest = {
        gameId: gameState.gameId,
        wordId: gameState.wordId,
        guess,
        playerId,
        start_time: gameState.startTime
      };

      const response = await apiClient.submitGuess(request);

      // Convert string[] to ClueKey[] using utility
      const validClues = convertToClueKeys(response.revealedClues as string[]);

      // Update clue status
      const newClueStatus = { ...gameState.clueStatus };
      validClues.forEach(clue => {
        newClueStatus[clue] = true;
      });

      setGameState(prev => ({
        ...prev,
        guesses: [...prev.guesses, guess],
        revealedClues: validClues,
        clueStatus: newClueStatus,
        isComplete: response.gameOver,
        isWon: response.isCorrect
      }));
    } catch (err) {
      setError('Failed to submit guess');
      console.error('Submit guess error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    gameState,
    isLoading,
    error,
    submitGuess,
    startNewGame,
    setIsTestMode,
    getNextClue,
  };
}
