import { WordResponse, GuessRequest, GuessResponse, LeaderboardResponse } from './types';
import { getPlayerId } from '../utils/player';
import { env } from '../env.client';
import { validateApiResponse, WordResponseSchema, GuessResponseSchema, LeaderboardResponseSchema } from './validation';

// Get API base URL from validated environment
const BASE_URL = env.VITE_API_BASE_URL.replace(/\/$/, '');

/**
 * Configuration for API requests
 */
const API_CONFIG = {
  maxRetries: 2,
  initialRetryDelay: 1000, // 1 second
  maxRetryDelay: 5000, // 5 seconds
} as const;

/**
 * Calculate delay for exponential backoff
 */
function getRetryDelay(attempt: number): number {
  const delay = Math.min(
    API_CONFIG.initialRetryDelay * Math.pow(2, attempt - 1),
    API_CONFIG.maxRetryDelay
  );
  // Add some jitter to prevent thundering herd
  return delay + Math.random() * 100;
}

/**
 * Ensures path starts with a forward slash
 */
const normalizePath = (path: string) => {
  return path.startsWith('/') ? path : `/${path}`;
};

/**
 * Fetches from the API with proper error handling and type safety
 * Includes retry logic with exponential backoff for failed requests
 * 
 * @param path The API path to fetch from
 * @param options Optional fetch options
 * @returns Promise with the typed response
 */
export const fetchFromApi = async <T>(path: string, options: RequestInit = {}): Promise<T> => {
  if (!BASE_URL) {
    console.error('⚠️ API base URL is not configured');
    throw new Error('API base URL is not configured. Set VITE_API_BASE_URL in your Vercel deployment or .env file.');
  }

  // Get existing headers from options
  const existingHeaders = options.headers || {};
  
  // Create new headers with our required values
  const headers = new Headers(existingHeaders);
  headers.set('Content-Type', 'application/json');
  headers.set('Accept', 'application/json');
  
  // Add player-id last to ensure it's not overwritten
  const playerId = getPlayerId();
  if (playerId) {
    headers.set('player-id', playerId);
  }

  const normalizedPath = normalizePath(path);
  const url = `${BASE_URL}${normalizedPath}`;
  
  let lastError: Error | null = null;
  
  // Try the initial request plus retries
  for (let attempt = 1; attempt <= API_CONFIG.maxRetries + 1; attempt++) {
    try {
      const response = await fetch(url, {
        ...options,
        headers,
        mode: 'cors',
        credentials: 'include',
        cache: 'no-cache',
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText,
          url,
          attempt,
          headers: Object.fromEntries(headers.entries()),
        });
        
        // Don't retry 4xx errors (except 429 rate limit)
        if (response.status < 500 && response.status !== 429) {
          throw new Error(`API request failed: ${errorText}`);
        }
        
        throw new Error(`API request failed (${response.status}): ${errorText}`);
      }

      return response.json();
    } catch (error) {
      lastError = error as Error;
      
      // If this was our last attempt, throw the error
      if (attempt === API_CONFIG.maxRetries + 1) {
        throw lastError;
      }
      
      // Otherwise wait and retry
      console.warn(`API request failed, retrying (attempt ${attempt}/${API_CONFIG.maxRetries + 1})...`, error);
      await new Promise(resolve => setTimeout(resolve, getRetryDelay(attempt)));
    }
  }
  
  // This should never happen due to the throw above, but TypeScript doesn't know that
  throw lastError || new Error('API request failed');
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
    const response = await fetchFromApi<unknown>('/api/word');
    return validateApiResponse(response, WordResponseSchema);
  },

  /**
   * Submit a guess to the API
   * @param request The guess request
   * @returns Promise with the guess response
   */
  async submitGuess(request: GuessRequest): Promise<GuessResponse> {
    const response = await fetchFromApi<unknown>('/api/guess', {
      method: 'POST',
      body: JSON.stringify(request),
    });
    return validateApiResponse(response, GuessResponseSchema);
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
    const response = await fetchFromApi<unknown>(`/api/leaderboard?${params.toString()}`);
    return validateApiResponse(response, LeaderboardResponseSchema);
  },
};
