import { WordResponse, GuessRequest, GuessResponse, LeaderboardResponse } from './types';
import { getPlayerId } from '../utils/player';
import { getApiBaseUrl } from '../utils/apiHelpers';

// 🔧 PRODUCTION FIX: Use the new getApiBaseUrl helper for proper domain detection
// This replaces the direct VITE_API_BASE_URL usage that was causing separate backend calls

// Log initial configuration
console.log('[API Client] Initialized with:', {
  baseUrl: 'will use getApiBaseUrl() dynamically',
  env: import.meta.env.MODE,
  preview: typeof window !== 'undefined' && window.location.hostname.includes('vercel.app') ? 'vercel-preview' : 'other'
});

/**
 * Cache configurations for different API endpoints
 */
const CACHE_CONFIG = {
  '/api/word': { cache: 'default' as const, maxAge: 3600 }, // 1 hour - daily words don't change
  '/api/guess': { cache: 'no-cache' as const }, // Always fresh - real-time game state
  '/api/leaderboard': { cache: 'default' as const, maxAge: 300 }, // 5 minutes - semi-static data
  default: { cache: 'no-cache' as const }
};

/**
 * Gets cache configuration for a given path
 */
const getCacheConfig = (path: string) => {
  return CACHE_CONFIG[path as keyof typeof CACHE_CONFIG] || CACHE_CONFIG.default;
};

/**
 * Ensures path starts with a forward slash
 */
const normalizePath = (path: string) => {
  return path.startsWith('/') ? path : `/${path}`;
};

/**
 * Custom error class for API errors
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public statusText?: string,
    public body?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Fetches from theme APIs (which are in frontend /pages/api/) with proper error handling
 * @param path The API path to fetch from
 * @param options Optional fetch options
 * @returns Promise with the typed response
 */
export const fetchFromThemeApi = async <T>(path: string, options: RequestInit = {}): Promise<T> => {
  // Get existing headers from options
  const existingHeaders = options.headers || {};
  
  // Create new headers with our required values
  const headers = new Headers(existingHeaders);
  headers.set('Content-Type', 'application/json');
  headers.set('Accept', 'application/json');
  
  // Add player-id if available
  const playerId = getPlayerId();
  if (playerId) {
    headers.set('player-id', playerId);
  }

  const normalizedPath = normalizePath(path);
  // Use relative path for theme endpoints (they're in frontend /pages/api/)
  const url = normalizedPath;
  
  const requestId = Math.random().toString(36).substring(7);
  
  try {
    console.log(`[Theme API ${requestId}] Request:`, {
      url,
      method: options.method || 'GET',
      headers: Object.fromEntries(headers.entries()),
      body: options.body ? JSON.parse(options.body as string) : undefined
    });

    const startTime = performance.now();
    
    const response = await fetch(url, {
      ...options,
      headers,
      mode: 'cors',
      cache: getCacheConfig(path).cache,
    });

    const duration = Math.round(performance.now() - startTime);
    console.log(`[Theme API ${requestId}] Response received in ${duration}ms:`, {
      status: response.status,
      statusText: response.statusText,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Theme API ${requestId}] Error:`, {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
        url,
      });
      throw new ApiError(
        `Theme API request failed: ${errorText}`,
        response.status,
        response.statusText,
        errorText
      );
    }

    const data = await response.json();
    console.log(`[Theme API ${requestId}] Success:`, { data });
    return data;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    console.error(`[Theme API ${requestId}] Fetch Error:`, {
      url,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw new ApiError(
      error instanceof Error ? error.message : 'Theme API request failed',
      0,
      'Network Error'
    );
  }
};

/**
 * Fetches from the API with proper error handling and type safety
 * @param path The API path to fetch from
 * @param options Optional fetch options
 * @returns Promise with the typed response
 */
export const fetchFromApi = async <T>(path: string, options: RequestInit = {}): Promise<T> => {
  // Get existing headers from options
  const existingHeaders = options.headers || {};
  
  // Create new headers with our required values
  const headers = new Headers(existingHeaders);
  headers.set('Content-Type', 'application/json');
  headers.set('Accept', 'application/json');
  
  // Add player-id if available
  const playerId = getPlayerId();
  if (playerId) {
    headers.set('player-id', playerId);
  }

  const normalizedPath = normalizePath(path);
  const url = `${getApiBaseUrl()}${normalizedPath}`;
  
  const requestId = Math.random().toString(36).substring(7);
  
  try {
    console.log(`[API ${requestId}] Request:`, {
      url,
      method: options.method || 'GET',
      headers: Object.fromEntries(headers.entries()),
      body: options.body ? JSON.parse(options.body as string) : undefined
    });

    const startTime = performance.now();
    
    const response = await fetch(url, {
      ...options,
      headers,
      mode: 'cors',
      cache: getCacheConfig(path).cache,
    });

    const duration = Math.round(performance.now() - startTime);
    console.log(`[API ${requestId}] Response received in ${duration}ms:`, {
      status: response.status,
      statusText: response.statusText,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[API ${requestId}] Error:`, {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
        url,
      });
      throw new ApiError(
        `API request failed: ${errorText}`,
        response.status,
        response.statusText,
        errorText
      );
    }

    const data = await response.json();
    console.log(`[API ${requestId}] Success:`, { data });
    return data;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    console.error(`[API ${requestId}] Fetch Error:`, {
      url,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw new ApiError(
      error instanceof Error ? error.message : 'Network request failed',
      0,
      'Network Error'
    );
  }
};

/**
 * API client for Un-Define v2
 */
export const apiClient = {
  /**
   * Get a new word from the API
   * @returns Promise with the word response
   */
  async getNewWord(): Promise<WordResponse> {
    const response = await fetchFromApi<WordResponse>('/api/word');
    
    // Basic null check
    if (!response?.word) {
      throw new ApiError('Invalid word response: missing word data');
    }
    
    return response;
  },

  /**
   * Get an archive word for a specific date
   * @param date The date in YYYY-MM-DD format
   * @returns Promise with the word response including archive metadata
   */
  async getArchiveWord(date: string): Promise<WordResponse> {
    const response = await fetchFromApi<WordResponse>(`/api/word?date=${date}`);
    
    // Basic null check
    if (!response?.word) {
      throw new ApiError('Invalid word response: missing word data');
    }
    
    return response;
  },

  /**
   * Submit a guess to the API
   * @param request The guess request
   * @returns Promise with the guess response
   */
  async submitGuess(request: GuessRequest): Promise<GuessResponse> {
    // Validate all required fields
    const missingFields = [
      !request.gameId && 'gameId',
      !request.wordId && 'wordId',
      !request.start_time && 'start_time',
      !request.guess && 'guess',
      !request.playerId && 'playerId'
    ].filter(Boolean);

    if (missingFields.length > 0) {
      console.error('[submitGuess] Missing fields:', missingFields, request);
      throw new ApiError(`Missing required fields: ${missingFields.join(', ')}`);
    }

    console.log('[submitGuess] Submitting guess:', {
      guess: request.guess,
      gameId: request.gameId,
      wordId: request.wordId,
      playerId: request.playerId,
      hasStartTime: !!request.start_time
    });

    try {
      const response = await fetchFromApi<GuessResponse>('/api/guess', {
        method: 'POST',
        body: JSON.stringify(request),
      });
      console.log('[submitGuess] Success:', {
        isCorrect: response.isCorrect,
        isFuzzy: response.isFuzzyMatch
      });
      return response;
    } catch (error) {
      console.error('[submitGuess] Failed:', error);
      throw error;
    }
  },

  /**
   * Get leaderboard data for a word
   * @param wordId The word ID to get leaderboard for
   * @param playerId Optional player ID to get their rank if not in top 10
   * @returns Promise with the leaderboard response
   */
  async getLeaderboard(wordId: string, playerId?: string): Promise<LeaderboardResponse> {
    const params = new URLSearchParams({ wordId });
    if (playerId) {
      params.append('playerId', playerId);
    }
    return fetchFromApi<LeaderboardResponse>(`/api/leaderboard?${params.toString()}`);
  },

  /**
   * Submit a theme guess
   * @param request The theme guess request
   * @returns Promise with the theme guess response
   */
  async submitThemeGuess(request: {
    player_id: string;
    guess: string;
    gameId: string;
  }): Promise<{
    isCorrect: boolean;
    guess: string;
    actualTheme?: string;
    progress: {
      totalWords: number;
      completedWords: number;
      themeGuess: string | null;
      canGuessTheme: boolean;
      isCorrectGuess?: boolean;
    };
    fuzzyMatch?: {
      method: 'exact' | 'semantic' | 'error';
      confidence: number;
      similarity?: number;
    };
    // NEW: Sunday failure revelation
    shouldRevealTheme?: boolean;
    revelationReason?: 'sunday_failure';
    weeklyWords?: Array<{
      id: string;
      word: string;
      date: string;
      completedOn: string | null;
      isCompleted: boolean;
    }>;
  }> {
    return fetchFromApi('/api/theme-guess', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  },

  /**
   * Get theme status and progress
   * @param playerId The player ID
   * @returns Promise with the theme status response
   */
  async getThemeStatus(playerId: string): Promise<{
    currentTheme?: string | null;
    hasActiveTheme: boolean;
    progress: {
      totalWords: number;
      completedWords: number;
      themeGuess: string | null;
      canGuessTheme: boolean;
      hasGuessedToday: boolean;
      isCorrectGuess: boolean;
      // Similarity tracking data (available when hasGuessedToday is true)
      similarityScore?: number | null;
      confidencePercentage?: number | null;
      matchingMethod?: string | null;
    };
    weeklyThemedWords: Array<{
      id: string;
      word: string;
      date: string;
      completedOn: string;
    }>;
  }> {
    return fetchFromApi(`/api/theme-status?player_id=${playerId}`);
  },

  /**
   * Get theme statistics for a player
   * @param playerId The player ID
   * @returns Promise with the theme statistics response
   */
  async getThemeStats(playerId: string): Promise<{
    totalThemeAttempts: number;
    correctThemeGuesses: number;
    averageAttemptsPerTheme: number;
    averageWordsCompletedWhenGuessing: number;
    themesGuessed: string[];
  }> {
    return fetchFromApi(`/api/theme-stats?player_id=${playerId}`);
  },

  /**
   * Get player streak statistics
   * @param playerId The player ID
   * @returns Promise with the player streak statistics response
   */
  async getPlayerStats(playerId: string): Promise<{
    current_streak: number;
    longest_streak: number;
    last_win_date: string | null;
    games_played: number;
    games_won: number;
    total_guesses: number;
    average_guesses_per_game: number;
    total_play_time_seconds: number;
  }> {
    // First get streak data
    const streakResponse = await fetchFromApi<{
      currentStreak: number;
      longestStreak: number;
      lastWinDate: string | null;
    }>('/api/streak-status', {
      method: 'POST',
      body: JSON.stringify({ player_id: playerId }),
    });

    // Mock other stats for now (these would come from a separate endpoint)
    return {
      current_streak: streakResponse.currentStreak,
      longest_streak: streakResponse.longestStreak,
      last_win_date: streakResponse.lastWinDate,
      games_played: 0, // TODO: Add to API
      games_won: 0, // TODO: Add to API
      total_guesses: 0, // TODO: Add to API
      average_guesses_per_game: 0, // TODO: Add to API
      total_play_time_seconds: 0, // TODO: Add to API
    };
  },
};
