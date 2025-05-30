/**
 * Shared clue types and constants for Un-Define v2
 * Used by both frontend and backend
 */

/**
 * All possible clue keys that match Supabase column names
 */
export type ClueKey =
  | 'definition'
  | 'equivalents'
  | 'first_letter'
  | 'in_a_sentence'
  | 'number_of_letters'
  | 'etymology';

/**
 * Short form clue keys used in frontend display
 */
export type ShortClueKey = 'D' | 'E' | 'F' | 'I' | 'N' | 'E2';

/**
 * Mapping between short and full clue keys
 */
export const CLUE_KEY_MAP: Record<ShortClueKey, ClueKey> = {
  'D': 'definition',
  'E': 'equivalents',
  'F': 'first_letter',
  'I': 'in_a_sentence',
  'N': 'number_of_letters',
  'E2': 'etymology'
};

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
  'etymology'
];

/**
 * Display labels for each clue type
 */
export const CLUE_LABELS: Record<ClueKey, string> = {
  definition: 'Definition',
  equivalents: 'Equivalents',
  first_letter: 'First Letter',
  in_a_sentence: 'In a Sentence',
  number_of_letters: 'Number of Letters',
  etymology: 'Etymology'
};

/**
 * Type for clue status in game sessions
 * This matches the JSONB structure in Supabase
 */
export type ClueStatus = {
  [K in ClueKey]: boolean;
};

/**
 * Frontend clue structure
 */
export interface GameClues {
  D: string;
  E: string;
  F: string;
  I: string;
  N: string;
  E2: string;
}

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
    etymology: false
  };
}

export function validateClueSequence(clues: ClueKey[]): boolean {
  // Check if sequence is valid
  if (clues.length > CLUE_SEQUENCE.length) {
    return false;
  }

  // Check if clues are in correct order
  for (let i = 0; i < clues.length; i++) {
    if (clues[i] !== CLUE_SEQUENCE[i]) {
      return false;
    }
  }

  return true;
}

// Runtime validations
if (CLUE_SEQUENCE.length !== 6) {
  throw new Error('CLUE_SEQUENCE must contain exactly 6 clues');
}

const uniqueClues = new Set(CLUE_SEQUENCE);
if (uniqueClues.size !== CLUE_SEQUENCE.length) {
  throw new Error('CLUE_SEQUENCE contains duplicate clues');
}

// Validate key mappings
for (const [shortKey, fullKey] of Object.entries(CLUE_KEY_MAP)) {
  if (!CLUE_SEQUENCE.includes(fullKey)) {
    throw new Error(`Invalid clue key mapping: ${shortKey} -> ${fullKey}`);
  }
} 