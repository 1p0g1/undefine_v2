/**
 * Utility functions for text normalization and manipulation
 */

/**
 * Normalizes text by:
 * - Trimming whitespace
 * - Converting to lowercase
 * - Removing accents and diacritics
 * - Removing invisible Unicode characters and hyphens
 * - Removing punctuation and special characters (keeps only letters)
 * 
 * This ensures that guesses like "chaotic]" match "chaotic" correctly.
 * 
 * @param text The text to normalize
 * @returns The normalized text (letters only, lowercase)
 */
export const normalizeText = (text: string): string => {
  if (!text) return '';
  
  return text
    .trim() // Remove leading/trailing whitespace
    .toLowerCase() // Convert to lowercase
    .normalize('NFD') // Decompose accented characters
    .replace(/[\u0300-\u036f]/g, '') // Remove combining diacritical marks
    .replace(/[\u200B\u200D\u200C\uFEFF-]/g, '') // Remove zero-width spaces and hyphens
    .replace(/[^a-z]/g, ''); // Remove all non-letter characters (punctuation, numbers, brackets, etc.)
};

/**
 * Checks if two strings are equal after normalization
 * 
 * @param a First string to compare
 * @param b Second string to compare
 * @returns True if strings are equal after normalization
 */
export const normalizedEquals = (a: string, b: string): boolean => {
  return normalizeText(a) === normalizeText(b);
};

/**
 * Checks if a string contains another string after normalization
 * 
 * @param text The text to search in
 * @param search The text to search for
 * @returns True if normalized text contains normalized search
 */
export const normalizedIncludes = (text: string, search: string): boolean => {
  return normalizeText(text).includes(normalizeText(search));
}; 