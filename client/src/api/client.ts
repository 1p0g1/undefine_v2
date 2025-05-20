import { WordResponse, GuessRequest, GuessResponse, LeaderboardResponse } from './types';

// Use the full URL since env var might not be available, but without /api
const BASE_URL = 'https://undefine-v2-back-i3qc28y96-paddys-projects-82cb6057.vercel.app';

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

  const fullUrl = `${BASE_URL}${path}`;
  console.log('Making API request to:', fullUrl, {
    method: options.method || 'GET',
    headers: Object.fromEntries(headers.entries()),
  });

  const response = await fetch(fullUrl, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('API Error:', {
      url: fullUrl,
      status: response.status,
      statusText: response.statusText,
      error: errorText,
      headers: Object.fromEntries(headers.entries()),
    });
    throw new Error(`API request failed: ${errorText}`);
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
   * @returns Promise with the leaderboard response
   */
  async getLeaderboard(wordId: string): Promise<LeaderboardResponse> {
    const params = new URLSearchParams({ wordId });
    return fetchFromApi<LeaderboardResponse>(`/api/leaderboard?${params.toString()}`);
  },
};
