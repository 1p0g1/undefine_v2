import { WordResponse, GuessRequest, GuessResponse, LeaderboardResponse } from './types';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001';

/**
 * API client for Un-Define v2
 */
export const apiClient = {
  /**
   * Get a new word from the API
   * @returns Promise with the word response
   */
  async getNewWord(): Promise<WordResponse> {
    const response = await fetch(`${API_BASE_URL}/api/word`);
    if (!response.ok) {
      throw new Error('Failed to fetch new word');
    }
    return response.json();
  },

  /**
   * Submit a guess to the API
   * @param request The guess request
   * @returns Promise with the guess response
   */
  async submitGuess(request: GuessRequest): Promise<GuessResponse> {
    const response = await fetch(`${API_BASE_URL}/api/guess`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });
    if (!response.ok) {
      throw new Error('Failed to submit guess');
    }
    return response.json();
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
    const response = await fetch(`${API_BASE_URL}/api/leaderboard?${params.toString()}`);
    if (!response.ok) {
      throw new Error('Failed to fetch leaderboard');
    }
    return response.json();
  },
};
