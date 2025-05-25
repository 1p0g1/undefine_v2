/**
 * Type for clue keys that must match Supabase column names
 */
export type ClueKey =
  | 'definition'
  | 'equivalents'
  | 'first_letter'
  | 'in_a_sentence'
  | 'number_of_letters'
  | 'etymology';

/**
 * The sequence in which clues are revealed
 * This must match our Supabase schema and game logic
 */
export const CLUE_SEQUENCE: ClueKey[] = [
  'definition',
  'equivalents',
  'first_letter',
  'in_a_sentence',
  'number_of_letters',
  'etymology',
];

/**
 * Runtime validation to ensure clue sequence integrity
 * This protects our game logic from accidental edits
 */
if (CLUE_SEQUENCE.length !== 6) {
  throw new Error('CLUE_SEQUENCE must contain exactly 6 clues');
}

// Validate each clue is unique
const uniqueClues = new Set(CLUE_SEQUENCE);
if (uniqueClues.size !== CLUE_SEQUENCE.length) {
  throw new Error('CLUE_SEQUENCE contains duplicate clues');
}

/**
 * Type for clue status in game sessions
 * This matches the JSONB structure in Supabase
 */
export type ClueStatus = {
  [K in ClueKey]: boolean;
};

/**
 * Create a default clue status object
 * Used when initializing new game sessions
 */
export function createDefaultClueStatus(): ClueStatus {
  return {
    definition: false,
    equivalents: false,
    first_letter: false,
    in_a_sentence: false,
    number_of_letters: false,
    etymology: false,
  };
} 