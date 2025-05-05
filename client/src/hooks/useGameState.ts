import { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import { GameSessionState, WordResponse, GuessResponse, GuessRequest } from '../api/types';

const MAX_GUESSES = 6;
const STORAGE_KEY = 'undefine_game_state';

interface GameState extends GameSessionState {
  clues: {
    D: string;
    E: string[];
    F: string;
    I: string;
    N: number;
    E2: string;
  };
  isTestMode: boolean;
}

export function useGameState() {
  const [isTestMode, setIsTestMode] = useState(false);
  const [gameState, setGameState] = useState<GameState>(() => {
    // Try to load state from localStorage
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse saved game state:', e);
      }
    }
    return {
      gameId: '',
      clues: {
        D: '',
        E: [],
        F: '',
        I: '',
        N: 0,
        E2: '',
      },
      guesses: [],
      revealedClues: [],
      clueStatus: {},
      isComplete: false,
      isWon: false,
      usedHint: false,
      isTestMode: false,
    };
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Persist state to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(gameState));
  }, [gameState]);

  useEffect(() => {
    startNewGame();
  }, [isTestMode]);

  const startNewGame = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiClient.getNewWord();
      setGameState({
        gameId: response.gameId,
        clues: response.clues,
        guesses: [],
        revealedClues: [],
        clueStatus: {},
        isComplete: false,
        isWon: false,
        usedHint: false,
        isTestMode,
      });
    } catch (err) {
      setError('Failed to start new game');
      console.error('Start game error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const getNextClue = (): string | null => {
    const allClues = Object.entries(gameState.clues).map(([_, value]) => {
      if (Array.isArray(value)) {
        return value.join(', ');
      }
      return value.toString();
    });
    return allClues.find(clue => !gameState.revealedClues.includes(clue)) || null;
  };

  const submitGuess = async (guess: string) => {
    if (gameState.isComplete || gameState.guesses.length >= MAX_GUESSES) {
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const request: GuessRequest = {
        gameId: gameState.gameId,
        guess,
      };
      const response = await apiClient.submitGuess(request);

      setGameState(prev => ({
        ...prev,
        guesses: [...prev.guesses, guess],
        revealedClues: response.revealedClues,
        isComplete: response.gameOver,
        isWon: response.isCorrect,
        usedHint: response.usedHint,
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
    startNewGame,
    submitGuess,
    getNextClue,
    setIsTestMode,
  };
}
