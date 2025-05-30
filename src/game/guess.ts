// Game logic for processing guesses and generating clues
import { ClueKey, CLUE_SEQUENCE, validateClueSequence } from '@/shared-types/src/clues';
import { GuessRequest, GuessResponse } from '@/shared-types/src/game';
import { normalizeText, normalizedEquals } from '@/src/utils/text';

// Internal implementation that processes the guess
const processGuess = async (
  guess: string,
  targetWord: string,
  currentClues: ClueKey[]
): Promise<GuessResponse> => {
  // Validate clue sequence
  if (!validateClueSequence(currentClues)) {
    throw new Error('Invalid clue sequence');
  }

  const normalizedGuess = normalizeText(guess);
  const normalizedTarget = normalizeText(targetWord);
  
  // Check for exact match
  const isCorrect = normalizedEquals(guess, targetWord);
  
  // Calculate fuzzy match positions
  const fuzzyPositions = getFuzzyPositions(normalizedGuess, normalizedTarget);
  const isFuzzy = fuzzyPositions.length > 0;
  
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
 * Calculate fuzzy match positions between two normalized strings
 * Note: Both inputs should already be normalized
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
    const { guess } = params;
    if (!targetWord || !currentClues) {
      throw new Error('Missing required parameters for submitGuess');
    }
    return processGuess(guess, targetWord, currentClues);
  }
  
  // Handle three separate parameters
  if (!targetWord || !currentClues) {
    throw new Error('Missing required parameters for submitGuess');
  }
  return processGuess(params, targetWord, currentClues);
}; 