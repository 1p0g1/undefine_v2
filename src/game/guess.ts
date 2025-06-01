// Game logic for processing guesses and generating clues
import { ClueKey, CLUE_SEQUENCE, validateClueSequence } from '@/shared-types/src/clues';
import { GuessRequest, GuessResponse } from '@/shared-types/src/game';
import { normalizeText, normalizedEquals } from '@/src/utils/text';

// Fuzzy match threshold constants
const FUZZY_THRESHOLDS = {
  MIN_SIMILARITY_RATIO: 0.4,      // Minimum 40% character similarity
  MIN_SHARED_CHARACTERS: 2,        // At least 2 shared characters
  MIN_CORRECT_POSITIONS: 1,        // At least 1 character in correct position
  LENGTH_TOLERANCE: 0.5            // Allow 50% length difference
} as const;

// Internal implementation that processes the guess
const processGuess = async (
  guess: string,
  targetWord: string,
  currentClues: ClueKey[],
  start_time: string
): Promise<GuessResponse> => {
  // Validate clue sequence
  if (!validateClueSequence(currentClues)) {
    throw new Error('Invalid clue sequence');
  }

  // Validate start_time is a valid ISO string
  if (!Date.parse(start_time)) {
    throw new Error('Invalid start_time format');
  }

  const normalizedGuess = normalizeText(guess);
  const normalizedTarget = normalizeText(targetWord);
  
  // Check for exact match
  const isCorrect = normalizedEquals(guess, targetWord);
  
  // Calculate fuzzy match analysis
  const fuzzyAnalysis = calculateFuzzyMatch(normalizedGuess, normalizedTarget);
  const isFuzzy = fuzzyAnalysis.isFuzzy;
  const fuzzyPositions = fuzzyAnalysis.positions;
  
  // Determine next clue to reveal if incorrect
  const revealedClues = [...currentClues];
  if (!isCorrect) {
    const nextClue = getNextClueKey(currentClues);
    if (nextClue) {
      revealedClues.push(nextClue);
    }
  }
  
  // Game is over if correct or all clues revealed
  const gameOver = isCorrect || revealedClues.length === CLUE_SEQUENCE.length;
  
  return {
    isCorrect,
    guess: normalizedGuess,
    isFuzzy,
    fuzzyPositions,
    gameOver,
    revealedClues,
    score: null
  };
};

/**
 * Enhanced fuzzy matching algorithm that considers multiple factors:
 * - Character position matches
 * - Shared characters 
 * - Word length similarity
 * - Overall similarity ratio
 */
function calculateFuzzyMatch(normalizedGuess: string, normalizedTarget: string): {
  isFuzzy: boolean;
  positions: number[];
  similarity: number;
} {
  const positions: number[] = [];
  let correctPositions = 0;
  let sharedCharacters = 0;
  
  // Track which target characters have been used
  const targetCharsUsed: boolean[] = new Array(normalizedTarget.length).fill(false);
  
  // First pass: Find exact position matches
  for (let i = 0; i < normalizedGuess.length; i++) {
    if (i < normalizedTarget.length && normalizedGuess[i] === normalizedTarget[i]) {
      positions.push(i);
      correctPositions++;
      targetCharsUsed[i] = true;
    }
  }
  
  // Second pass: Find shared characters in wrong positions
  for (let i = 0; i < normalizedGuess.length; i++) {
    // Skip if already matched in correct position
    if (i < normalizedTarget.length && normalizedGuess[i] === normalizedTarget[i]) {
      continue;
    }
    
    // Look for character elsewhere in target
    for (let j = 0; j < normalizedTarget.length; j++) {
      if (!targetCharsUsed[j] && normalizedGuess[i] === normalizedTarget[j]) {
        positions.push(i);
        sharedCharacters++;
        targetCharsUsed[j] = true;
        break;
      }
    }
  }
  
  // Calculate similarity metrics
  const maxLength = Math.max(normalizedGuess.length, normalizedTarget.length);
  const minLength = Math.min(normalizedGuess.length, normalizedTarget.length);
  const totalMatches = correctPositions + sharedCharacters;
  const similarityRatio = totalMatches / maxLength;
  const lengthRatio = minLength / maxLength;
  
  // Determine if this qualifies as a fuzzy match
  const isFuzzy = (
    // Must have some character overlap
    totalMatches >= FUZZY_THRESHOLDS.MIN_SHARED_CHARACTERS &&
    // Must meet minimum similarity threshold
    similarityRatio >= FUZZY_THRESHOLDS.MIN_SIMILARITY_RATIO &&
    // Must have at least one correct position OR high character overlap
    (correctPositions >= FUZZY_THRESHOLDS.MIN_CORRECT_POSITIONS || totalMatches >= 3) &&
    // Words shouldn't be too different in length
    lengthRatio >= FUZZY_THRESHOLDS.LENGTH_TOLERANCE
  );
  
  console.log('[FuzzyMatch] Analysis:', {
    guess: normalizedGuess,
    target: normalizedTarget,
    correctPositions,
    sharedCharacters,
    totalMatches,
    similarityRatio: similarityRatio.toFixed(2),
    lengthRatio: lengthRatio.toFixed(2),
    isFuzzy,
    positions
  });
  
  return {
    isFuzzy,
    positions,
    similarity: similarityRatio
  };
}

/**
 * Legacy simple fuzzy matching for compatibility
 * @deprecated Use calculateFuzzyMatch instead
 */
function getFuzzyPositions(normalizedGuess: string, normalizedTarget: string): number[] {
  const positions: number[] = [];
  
  for (let i = 0; i < normalizedGuess.length; i++) {
    // Check for exact position match
    if (i < normalizedTarget.length && normalizedGuess[i] === normalizedTarget[i]) {
      positions.push(i);
      continue;
    }
    // Check if character appears anywhere in target
    if (normalizedTarget.includes(normalizedGuess[i])) {
      positions.push(i);
    }
  }
  
  return positions;
}

// Get the next clue to reveal based on current revealed clues
function getNextClueKey(revealedClues: ClueKey[]): ClueKey | null {
  for (const clue of CLUE_SEQUENCE) {
    if (!revealedClues.includes(clue)) {
      return clue;
    }
  }
  return null;
}

// Public API that handles both parameter formats
export const submitGuess = async (
  params: GuessRequest | string,
  targetWord?: string,
  currentClues?: ClueKey[]
): Promise<GuessResponse> => {
  // Handle single object parameter
  if (typeof params === 'object') {
    const { guess, start_time } = params;
    if (!targetWord || !currentClues || !start_time) {
      throw new Error('Missing required parameters for submitGuess');
    }
    return processGuess(guess, targetWord, currentClues, start_time);
  }
  
  // Handle three separate parameters
  if (!targetWord || !currentClues) {
    throw new Error('Missing required parameters for submitGuess');
  }
  throw new Error('Legacy parameter format is no longer supported');
}; 