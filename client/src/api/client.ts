import { WordResponse, GuessRequest, GuessResponse, LeaderboardResponse } from './types';

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '';

/**
 * Fetches from the API with proper error handling and type safety
 * @param path The API path to fetch from
 * @param options Optional fetch options
 * @returns Promise with the typed response
 */
export const fetchFromApi = async <T>(path: string, options: RequestInit = {}): Promise<T> => {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  if (!response.ok) {
    throw new Error(`API request failed: ${response.statusText}`);
  }
  return response.json();
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
