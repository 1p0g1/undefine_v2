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
  private sessionId: string; // Track current session
  private completedInSession: boolean = false; // Track if game was completed in this session

  private constructor() {
    this.sessionId = crypto.randomUUID(); // Generate unique session ID
    console.log('[GameService] New session started:', this.sessionId);
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
        const parsed: any = JSON.parse(saved);
        if (this.validateGameState(parsed)) {
          const restoredEndTime =
            typeof parsed.endTime === 'string'
              ? parsed.endTime
              : (parsed.isComplete && typeof parsed.savedAt === 'string' ? parsed.savedAt : undefined);

          // Extract only GameSessionState properties
          this.currentState = {
            gameId: parsed.gameId,
            wordId: parsed.wordId,
            wordText: parsed.wordText,
            clues: parsed.clues,
            guesses: parsed.guesses,
            revealedClues: parsed.revealedClues,
            clueStatus: parsed.clueStatus,
            isComplete: parsed.isComplete,
            isWon: parsed.isWon,
            score: parsed.score,
            startTime: parsed.startTime,
            endTime: restoredEndTime,
            isArchivePlay: parsed.isArchivePlay,
            gameDate: parsed.gameDate
          };
          
          // IMPORTANT: Detect if game was RECENTLY completed (within 30 seconds)
          // This handles HMR/module reload scenarios where the singleton gets recreated
          // but the game was completed in the same browser session
          const completedRecently = parsed.isComplete && parsed.completedInSession && parsed.savedAt;
          if (completedRecently) {
            const savedTime = new Date(parsed.savedAt).getTime();
            const now = Date.now();
            const secondsSinceSave = (now - savedTime) / 1000;
            
            // If completed within last 30 seconds, treat as freshly completed
            if (secondsSinceSave < 30) {
              this.completedInSession = true;
              console.log('[GameService] Game completed recently, restoring completedInSession flag:', {
                secondsSinceSave,
                savedAt: parsed.savedAt
              });
            }
          }
          
          console.log('[GameService] Restored state:', {
            gameId: parsed.gameId,
            wordId: parsed.wordId,
            startTime: parsed.startTime,
            endTime: restoredEndTime,
            isComplete: parsed.isComplete,
            savedSessionId: parsed.sessionId || 'unknown',
            currentSessionId: this.sessionId,
            savedCompletedInSession: parsed.completedInSession,
            restoredCompletedInSession: this.completedInSession
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
        const stateToSave = {
          ...this.currentState,
          sessionId: this.sessionId,
          completedInSession: this.completedInSession,
          savedAt: new Date().toISOString() // Add timestamp for debugging
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
        console.log('[GameService] State saved:', {
          gameId: this.currentState.gameId,
          isComplete: this.currentState.isComplete,
          completedInSession: this.completedInSession,
          sessionId: this.sessionId
        });
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

  /**
   * Initialize the game - either restore completed state or start new game
   * This should be called on app startup instead of startNewGame
   */
  public async initializeGame(): Promise<GameSessionState & { isRestoredGame: boolean }> {
    try {
      console.log('[GameService] Initializing game...');
      
      // Check if we have a saved completed state
      if (this.currentState && this.currentState.isComplete) {
        console.log('[GameService] Found completed game state, checking if it\'s for today\'s word...');
        
        // Get today's word to check if our saved state is still valid
        const todaysWordData = await apiClient.getNewWord();
        
        // If the saved state is for today's word, restore it
        if (this.currentState.wordId === todaysWordData.word.id) {
          console.log('[GameService] Saved state is for today\'s word, restoring completed game');
          
          // Check if this was completed in a previous session
          const savedData = localStorage.getItem(STORAGE_KEY);
          const savedParsed = savedData ? JSON.parse(savedData) : null;
          const savedSessionId = savedParsed?.sessionId || null;
          const isRestoredGame = savedSessionId !== this.sessionId;
          
          console.log('[GameService] Session comparison:', {
            savedSessionId,
            currentSessionId: this.sessionId,
            isRestoredGame
          });
          
          // Reset completion flag for restored games
          this.completedInSession = false;
          
          // For restored games, mark the restoration time
          if (isRestoredGame) {
            console.log('[GameService] Game was completed in a previous session - marking as restored');
          }
          
          return {
            ...this.currentState,
            isRestoredGame
          };
        } else {
          console.log('[GameService] Saved state is for different word, starting new game');
          // Clear old state and start new game
          this.clearState();
          const newState = await this.startNewGame();
          return {
            ...newState,
            isRestoredGame: false
          };
        }
      }
      
      // If no saved state or it's not complete, start new game
      console.log('[GameService] No completed state found, starting new game');
      const newState = await this.startNewGame();
      return {
        ...newState,
        isRestoredGame: false
      };
    } catch (error) {
      console.error('[GameService] Failed to initialize game:', error);
      // Fallback to starting new game
      const newState = await this.startNewGame();
      return {
        ...newState,
        isRestoredGame: false
      };
    }
  }

  public async startNewGame(): Promise<GameSessionState> {
    try {
      console.log('[GameService] Starting new game...');
      
      // Clear any previous state when starting a new game
      this.clearState();
      
      // Reset session completion flag
      this.completedInSession = false;
      
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
        startTime: data.start_time,
        endTime: undefined,
        isArchivePlay: false,
        gameDate: data.gameDate,
        isFallback: data.isFallback  // Track if no word of the day was set
      };

      console.log('[GameService] New game started:', {
        gameId: this.currentState.gameId,
        wordId: this.currentState.wordId,
        startTime: this.currentState.startTime,
        isFallback: data.isFallback
      });

      this.saveState();
      return this.currentState;
    } catch (error) {
      console.error('[GameService] Failed to start new game:', error);
      throw error;
    }
  }

  /**
   * Start an archive game for a specific date
   */
  public async startArchiveGame(date: string): Promise<GameSessionState> {
    try {
      console.log('[GameService] Starting archive game for date:', date);
      
      // Clear any previous state
      this.clearState();
      
      // Reset session completion flag
      this.completedInSession = false;
      
      const data = await apiClient.getArchiveWord(date);

      // Validate required fields
      if (!data.gameId || !data.word?.id || !data.start_time) {
        throw new Error('Invalid response from /api/word: missing required fields');
      }

      if (!data.isArchivePlay) {
        console.warn('[GameService] Expected archive play but got live game');
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

      // Create new state with archive metadata
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
        startTime: data.start_time,
        endTime: undefined,
        isArchivePlay: true,        // NEW: Archive flag
        gameDate: data.gameDate      // NEW: Original word date
      };

      console.log('[GameService] Archive game started:', {
        gameId: this.currentState.gameId,
        wordId: this.currentState.wordId,
        gameDate: data.gameDate,
        startTime: this.currentState.startTime
      });

      this.saveState();
      return this.currentState;
    } catch (error) {
      console.error('[GameService] Failed to start archive game:', error);
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
        score: response.score?.score ?? null,
        endTime: response.gameOver ? new Date().toISOString() : this.currentState.endTime
      };

      // Mark as completed in this session if game is over
      if (response.gameOver) {
        this.completedInSession = true;
        console.log('[GameService] Game completed in current session:', {
          isWon: response.isCorrect,
          score: response.score?.score
        });
      }

      // Always save state (including completed state)
      this.saveState();
      
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

  /**
   * Check if the current game was completed in this session
   */
  public wasCompletedInSession(): boolean {
    const result = this.completedInSession;
    console.log('[GameService] wasCompletedInSession called:', {
      completedInSession: this.completedInSession,
      sessionId: this.sessionId,
      currentState: this.currentState ? {
        isComplete: this.currentState.isComplete,
        isWon: this.currentState.isWon,
        gameId: this.currentState.gameId
      } : null,
      result
    });
    return result;
  }

  /**
   * Get debug info about the current session
   */
  public getDebugInfo() {
    return {
      sessionId: this.sessionId,
      completedInSession: this.completedInSession,
      currentState: this.currentState
    };
  }
}

export const gameService = GameService.getInstance(); 