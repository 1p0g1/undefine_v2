import { WordResponse, GuessResponse } from '../api/types';
import { GuessRequest } from '../../../shared-types/src/game';
import { apiClient } from '../api/client';
import { getPlayerId } from '../utils/player';
import { GameSessionState } from '../../../shared-types/src/game';
import { createDefaultClueStatus } from '../../../shared-types/src/clues';

const STORAGE_KEY = 'undefine_game_state';

class GameService {
  private static instance: GameService;
  private currentState: GameSessionState | null = null;

  private constructor() {
    this.loadState();
  }

  public static getInstance(): GameService {
    if (!GameService.instance) {
      GameService.instance = new GameService();
    }
    return GameService.instance;
  }

  private loadState(): void {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (this.validateGameState(parsed)) {
          this.currentState = parsed;
          console.log('[GameService] Restored state:', {
            gameId: parsed.gameId,
            wordId: parsed.wordId,
            startTime: parsed.startTime,
            isComplete: parsed.isComplete
          });
        } else {
          console.warn('[GameService] Invalid saved state, clearing...');
          this.clearState();
        }
      }
    } catch (error) {
      console.error('[GameService] Failed to load state:', error);
      this.clearState();
    }
  }

  private validateGameState(state: any): state is GameSessionState {
    return (
      state &&
      typeof state.gameId === 'string' &&
      typeof state.wordId === 'string' &&
      typeof state.startTime === 'string' &&
      typeof state.isComplete === 'boolean' &&
      Array.isArray(state.guesses) &&
      Array.isArray(state.revealedClues)
    );
  }

  private saveState(): void {
    try {
      if (this.currentState) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.currentState));
      }
    } catch (error) {
      console.error('[GameService] Failed to save state:', error);
    }
  }

  public clearState(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
      this.currentState = null;
    } catch (error) {
      console.error('[GameService] Failed to clear state:', error);
    }
  }

  public async startNewGame(): Promise<GameSessionState> {
    try {
      console.log('[GameService] Starting new game...');
      
      // Clear any previous state when starting a new game
      this.clearState();
      
      const data = await apiClient.getNewWord();

      // Validate required fields
      if (!data.gameId || !data.word?.id || !data.start_time) {
        throw new Error('Invalid response from /api/word: missing required fields');
      }

      // Process clues
      const processedClues = {
        definition: String(data.word.definition || ''),
        equivalents: Array.isArray(data.word.equivalents) ? data.word.equivalents.join(', ') : String(data.word.equivalents || ''),
        first_letter: String(data.word.first_letter || ''),
        in_a_sentence: String(data.word.in_a_sentence || ''),
        number_of_letters: String(data.word.number_of_letters || ''),
        etymology: String(data.word.etymology || '')
      };

      // Create new state
      this.currentState = {
        gameId: data.gameId,
        wordId: data.word.id,
        wordText: data.word.word,
        clues: processedClues,
        guesses: [],
        revealedClues: [],
        clueStatus: createDefaultClueStatus(),
        isComplete: false,
        isWon: false,
        score: null,
        startTime: data.start_time
      };

      console.log('[GameService] New game started:', {
        gameId: this.currentState.gameId,
        wordId: this.currentState.wordId,
        startTime: this.currentState.startTime
      });

      this.saveState();
      return this.currentState;
    } catch (error) {
      console.error('[GameService] Failed to start new game:', error);
      throw error;
    }
  }

  public async submitGuess(guess: string): Promise<GuessResponse> {
    if (!this.currentState) {
      throw new Error('No active game session');
    }

    const { gameId, wordId, startTime, isComplete } = this.currentState;

    // Validate all required fields
    const missingFields = [
      !gameId && 'gameId',
      !wordId && 'wordId',
      !startTime && 'start_time',
      !guess && 'guess'
    ].filter(Boolean);

    if (missingFields.length > 0) {
      throw new Error(`Invalid game state: missing required fields: ${missingFields.join(', ')}`);
    }

    if (isComplete) {
      throw new Error('Game is already complete');
    }

    try {
      const playerId = getPlayerId();
      if (!playerId) {
        throw new Error('No player ID available');
      }

      const request: GuessRequest = {
        gameId,
        wordId,
        guess,
        playerId,
        start_time: startTime
      };

      const response = await apiClient.submitGuess(request);

      // Update state with response
      this.currentState = {
        ...this.currentState,
        guesses: [...this.currentState.guesses, guess],
        revealedClues: response.revealedClues,
        isComplete: response.gameOver,
        isWon: response.isCorrect,
        score: response.score?.score ?? null
      };

      // Always save state (including completed state)
      this.saveState();
      
      if (response.gameOver) {
        console.log('[GameService] Game completed:', {
          isWon: response.isCorrect,
          score: response.score?.score
        });
      }

      return response;
    } catch (error) {
      console.error('[GameService] Failed to submit guess:', error);
      throw error;
    }
  }

  public getCurrentState(): GameSessionState | null {
    return this.currentState;
  }

  public isGameActive(): boolean {
    return !!this.currentState && !this.currentState.isComplete;
  }
}

export const gameService = GameService.getInstance(); 