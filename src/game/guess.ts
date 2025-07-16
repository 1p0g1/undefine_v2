// Game logic for processing guesses and generating clues
import { ClueKey, CLUE_SEQUENCE, validateClueSequence } from '@/shared-types/src/clues';
import { GuessRequest, GuessResponse } from '@/shared-types/src/game';
import { normalizeText, normalizedEquals } from '@/src/utils/text';
import { smartLocalFuzzyMatch } from '@/src/utils/smartLocalFuzzy';

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
  
  // Calculate smart local fuzzy match analysis (no API calls)
  const fuzzyResult = smartLocalFuzzyMatch(normalizedGuess, normalizedTarget);
  const isFuzzy = fuzzyResult.isFuzzy;
  
  // Generate fuzzy positions for UI highlighting (legacy compatibility)
  const fuzzyPositions = isFuzzy ? generateFuzzyPositions(normalizedGuess, normalizedTarget) : [];
  
  // Log detailed fuzzy analysis
  console.log('[FuzzyMatch] Smart Local Analysis:', {
    guess: normalizedGuess,
    target: normalizedTarget,
    isFuzzy,
    method: fuzzyResult.method,
    confidence: fuzzyResult.confidence,
    explanation: fuzzyResult.explanation,
    positions: fuzzyPositions
  });
  
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
 * Generate fuzzy positions for UI highlighting (legacy compatibility)
 * This provides backward compatibility with existing UI components
 */
function generateFuzzyPositions(normalizedGuess: string, normalizedTarget: string): number[] {
  const positions: number[] = [];
  const targetCharsUsed: boolean[] = new Array(normalizedTarget.length).fill(false);
  
  // First pass: Find exact position matches
  for (let i = 0; i < normalizedGuess.length; i++) {
    if (i < normalizedTarget.length && normalizedGuess[i] === normalizedTarget[i]) {
      positions.push(i);
      targetCharsUsed[i] = true;
    }
  }
  
  // Second pass: Find shared characters in wrong positions
  for (let i = 0; i < normalizedGuess.length; i++) {
    if (i < normalizedTarget.length && normalizedGuess[i] === normalizedTarget[i]) {
      continue; // Already matched
    }
    
    for (let j = 0; j < normalizedTarget.length; j++) {
      if (!targetCharsUsed[j] && normalizedGuess[i] === normalizedTarget[j]) {
        positions.push(i);
        targetCharsUsed[j] = true;
        break;
      }
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