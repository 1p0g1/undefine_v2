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
}

/**
 * Full response type for the word API endpoint
 */
export interface WordResponse {
  word: WordResponseShape;
  gameId: string;
  isFallback: boolean;
} 