import { WordResponse, GuessRequest, GuessResponse, LeaderboardResponse } from './types';
import { getPlayerId } from '../utils/player';
import { env } from '../env.client';

// Get API base URL from validated environment - must be the Vercel deployment URL
const BASE_URL = 'https://undefine-v2-back.vercel.app';

/**
 * Ensures path starts with a forward slash
 */
const normalizePath = (path: string) => {
  return path.startsWith('/') ? path : `/${path}`;
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
  
  // Add player-id last to ensure it's not overwritten
  const playerId = getPlayerId();
  if (playerId) {
    headers.set('player-id', playerId);
  }

  const normalizedPath = normalizePath(path);
  const url = `${BASE_URL}${normalizedPath}`;
  
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
      });
      throw new Error(`API request failed: ${errorText}`);
    }

    return response.json();
  } catch (error) {
    console.error('Fetch Error:', {
      url,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
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
    return fetchFromApi<WordResponse>('/api/word');
  },

  /**
   * Submit a guess to the API
   * @param request The guess request
   * @returns Promise with the guess response
   */
  async submitGuess(request: GuessRequest): Promise<GuessResponse> {
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
