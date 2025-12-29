/**
 * Admin API Client
 * 
 * Handles all communication with admin API endpoints.
 * Requires admin key stored in sessionStorage.
 */

import { getApiBaseUrl } from '../../utils/apiHelpers';

const ADMIN_KEY_STORAGE = 'undefine_admin_key';

export function getAdminKey(): string | null {
  return sessionStorage.getItem(ADMIN_KEY_STORAGE);
}

export function setAdminKey(key: string): void {
  sessionStorage.setItem(ADMIN_KEY_STORAGE, key);
}

export function clearAdminKey(): void {
  sessionStorage.removeItem(ADMIN_KEY_STORAGE);
}

export function isAdminAuthenticated(): boolean {
  return !!getAdminKey();
}

class AdminApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public details?: string
  ) {
    super(message);
    this.name = 'AdminApiError';
  }
}

async function adminFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const adminKey = getAdminKey();
  if (!adminKey) {
    throw new AdminApiError('Not authenticated', 401);
  }

  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}${path}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-Key': adminKey,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    let errorMessage = `Request failed: ${response.status}`;
    try {
      const parsed = JSON.parse(errorBody);
      errorMessage = parsed.error || errorMessage;
    } catch {}
    throw new AdminApiError(errorMessage, response.status, errorBody);
  }

  return response.json();
}

// ============================================================================
// Types
// ============================================================================

export interface DayInfo {
  date: string;
  word: string | null;
  wordId: string | null;
  hasWord: boolean;
  theme: string | null;
}

export interface WeekInfo {
  weekStart: string;
  weekEnd: string;
  theme: string | null;
  themeCount: number;
  days: DayInfo[];
}

export interface WeeksResponse {
  weeks: WeekInfo[];
  stats: {
    totalDays: number;
    daysWithWords: number;
    weeksWithThemes: number;
    uniqueThemes: string[];
  };
}

export interface WordData {
  id?: string;
  word: string;
  date: string;
  definition?: string;
  etymology?: string;
  first_letter?: string;
  in_a_sentence?: string;
  number_of_letters?: number;
  equivalents?: string[];
  theme?: string;
  difficulty?: string;
}

export interface WordResponse {
  id: string;
  word: string;
  date: string | null;
  definition: string | null;
  etymology: string | null;
  first_letter: string | null;
  in_a_sentence: string | null;
  number_of_letters: number | null;
  equivalents: string[] | null;
  theme: string | null;
  difficulty: string | null;
  created_at: string;
}

export interface DictionaryEntry {
  id: number;
  word: string;
  normalized_word: string;
  definition: string | null;
  etymology: string | null;
  part_of_speech: string | null;
  first_letter: string;
  number_of_letters: number;
  lex_rank: number;
}

export interface DictionaryLookupResponse {
  results: DictionaryEntry[];
  total: number;
  query: string;
  neighbours?: {
    before: DictionaryEntry | null;
    after: DictionaryEntry | null;
  };
}

export interface ThemeStats {
  theme: string;
  wordCount: number;
  weeks: string[];
  firstDate: string;
  lastDate: string;
}

export interface ThemesResponse {
  themes: ThemeStats[];
  total: number;
}

// ============================================================================
// API Methods
// ============================================================================

export const adminApi = {
  /**
   * Verify admin credentials
   */
  async verifyAuth(): Promise<boolean> {
    try {
      await adminFetch<WeeksResponse>('/api/admin/weeks?start=2025-01-01&end=2025-01-07');
      return true;
    } catch (error) {
      if (error instanceof AdminApiError && error.status === 401) {
        return false;
      }
      throw error;
    }
  },

  /**
   * Get weeks overview
   */
  async getWeeks(start: string, end: string): Promise<WeeksResponse> {
    return adminFetch<WeeksResponse>(`/api/admin/weeks?start=${start}&end=${end}`);
  },

  /**
   * Get word for a specific date
   */
  async getWordByDate(date: string): Promise<{ word: WordResponse | null }> {
    return adminFetch<{ word: WordResponse | null }>(`/api/admin/words?date=${date}`);
  },

  /**
   * Get word by ID
   */
  async getWordById(id: string): Promise<{ word: WordResponse }> {
    return adminFetch<{ word: WordResponse }>(`/api/admin/words?id=${id}`);
  },

  /**
   * Create or update a word
   */
  async saveWord(data: WordData): Promise<{ word: WordResponse; action: string }> {
    return adminFetch<{ word: WordResponse; action: string }>('/api/admin/words', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Delete a word
   */
  async deleteWord(id: string): Promise<{ success: boolean }> {
    return adminFetch<{ success: boolean }>(`/api/admin/words?id=${id}`, {
      method: 'DELETE',
    });
  },

  /**
   * Search dictionary
   */
  async searchDictionary(query: string, limit = 20): Promise<DictionaryLookupResponse> {
    return adminFetch<DictionaryLookupResponse>(
      `/api/admin/dictionary/lookup?q=${encodeURIComponent(query)}&limit=${limit}`
    );
  },

  /**
   * Lookup exact word in dictionary
   */
  async lookupWord(word: string): Promise<DictionaryLookupResponse> {
    return adminFetch<DictionaryLookupResponse>(
      `/api/admin/dictionary/lookup?word=${encodeURIComponent(word)}`
    );
  },

  /**
   * Get all themes
   */
  async getThemes(): Promise<ThemesResponse> {
    return adminFetch<ThemesResponse>('/api/admin/themes');
  },

  /**
   * Assign theme to words
   */
  async assignTheme(
    theme: string,
    options: { wordIds?: string[]; startDate?: string; endDate?: string }
  ): Promise<{ success: boolean; updated: number }> {
    return adminFetch<{ success: boolean; updated: number }>('/api/admin/themes', {
      method: 'POST',
      body: JSON.stringify({ theme, ...options }),
    });
  },
};

export default adminApi;

