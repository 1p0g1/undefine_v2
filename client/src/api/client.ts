import { WordResponse, GuessRequest, GuessResponse, LeaderboardResponse } from './types';
import { getPlayerId } from '../utils/player';

// Use environment variable for backend URL with fallback
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://undefine-v2-back.vercel.app';

// Log initial configuration
console.log('[API Client] Initialized with:', {
  baseUrl: BASE_URL,
  env: import.meta.env.MODE
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
  const url = `${BASE_URL}${normalizedPath}`;
  
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
      throw new ApiError(`Missing required fields: ${missingFields.join(', ')}`);
    }

    return fetchFromApi<GuessResponse>('/api/guess', {
      method: 'POST',
      body: JSON.stringify(request),
    });
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
};
