/**
 * Types shared between frontend and backend for word-related functionality
 */

/**
 * Shape of a word row from the database
 */
export interface WordRow {
  id: string;
  word: string;
  definition: string;
  first_letter: string;
  in_a_sentence: string;
  equivalents: string[];
  number_of_letters: number;
  etymology: string;
  difficulty: number;
  date: string;
  theme?: string; // Optional theme for Theme of the Week feature
}

/**
 * Shape of a word in the API response
 */
export interface WordResponseShape {
  id: string;
  word: string;
  definition: string;
  first_letter: string;
  in_a_sentence: string;
  equivalents: string[];
  number_of_letters: number;
  etymology: string;
  difficulty: number;
  date: string;
  theme?: string; // Optional theme for Theme of the Week feature
}

/**
 * Full response type for the word API endpoint
 */
export interface WordResponse {
  word: WordResponseShape;
  gameId: string;
  isFallback: boolean;
  start_time: string;  // ISO string of when the game session was created
} 