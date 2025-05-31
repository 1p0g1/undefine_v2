import { ClueKey, CLUE_SEQUENCE } from '../../../shared-types/src/clues';

/**
 * Type guard to check if a string is a valid ClueKey
 * @param value String to check
 * @returns true if the value is a valid ClueKey
 */
export function isValidClueKey(value: string): value is ClueKey {
  return CLUE_SEQUENCE.includes(value as ClueKey);
}

/**
 * Convert an array of strings to ClueKey[], filtering out invalid keys
 * @param clues Array of strings to convert
 * @returns Array of valid ClueKey values
 */
export function convertToClueKeys(clues: string[]): ClueKey[] {
  return clues.filter(isValidClueKey);
}

/**
 * Validate that all clues in the array are valid ClueKeys
 * @param clues Array to validate
 * @returns true if all clues are valid
 */
export function validateClueKeys(clues: string[]): boolean {
  return clues.every(isValidClueKey);
}

/**
 * Convert ClueKey array to string array (safe for API serialization)
 * @param clues Array of ClueKey values
 * @returns Array of strings
 */
export function clueKeysToStrings(clues: ClueKey[]): string[] {
  return clues.map(clue => clue);
} 