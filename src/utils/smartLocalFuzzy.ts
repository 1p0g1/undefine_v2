/**
 * Smart Local Fuzzy Matching
 * Fast word similarity detection without API calls
 * Focuses on typos, misspellings, and letter patterns
 */

interface LocalFuzzyResult {
  isFuzzy: boolean;
  confidence: number;
  method: 'exact' | 'edit_distance' | 'keyboard_typo' | 'common_misspelling' | 'letter_pattern' | 'phonetic_local' | 'none';
  explanation: string;
}

/**
 * Common misspelling patterns for instant recognition
 */
const COMMON_MISSPELLINGS: Record<string, string[]> = {
  // IE vs EI confusion
  'receive': ['recieve'],
  'believe': ['beleive'],
  'achieve': ['acheive'],
  
  // Double letters
  'accommodate': ['accomodate', 'acommodate'],
  'necessary': ['neccessary', 'necesary'],
  'occurred': ['occured', 'ocurred'],
  'beginning': ['begining', 'beggining'],
  
  // Common letter swaps
  'separate': ['seperate'],
  'definitely': ['definately', 'definetly'],
  'maintenance': ['maintainence'],
  'government': ['goverment', 'govermnent'],
  
  // Missing letters
  'different': ['diffrent', 'diferent'],
  'probably': ['probaly', 'proably'],
  'really': ['realy', 'relly'],
  
  // Extra letters
  'until': ['untill'],
  'truly': ['truely'],
  'forty': ['fourty']
};

/**
 * QWERTY keyboard layout for typo detection
 */
const KEYBOARD_NEIGHBORS: Record<string, string> = {
  'q': 'wa', 'w': 'qeas', 'e': 'wrds', 'r': 'etdf', 't': 'ryfg', 'y': 'tugh', 'u': 'yihj', 'i': 'ujok', 'o': 'ikpl', 'p': 'ol',
  'a': 'qwsz', 's': 'awedxz', 'd': 'serfcx', 'f': 'drtgvc', 'g': 'ftyhjb', 'h': 'gtyunb', 'j': 'hyuimn', 'k': 'juiol', 'l': 'kiop',
  'z': 'asx', 'x': 'zsdcv', 'c': 'xdfvb', 'v': 'cfgbn', 'b': 'vghnm', 'n': 'bhjm', 'm': 'njk'
};

/**
 * Smart local fuzzy matching - NO API calls
 */
export function smartLocalFuzzyMatch(guess: string, target: string): LocalFuzzyResult {
  const normalizedGuess = guess.toLowerCase().trim();
  const normalizedTarget = target.toLowerCase().trim();
  
  // 1. Exact match
  if (normalizedGuess === normalizedTarget) {
    return {
      isFuzzy: false, // Exact match isn't fuzzy
      confidence: 100,
      method: 'exact',
      explanation: 'Exact match'
    };
  }
  
  // 2. NEW: Target word contained in guess (e.g., "hammerhead" contains "hammer")
  // This catches cases like typing the word with extra letters (derivatives, compound words)
  if (normalizedGuess.includes(normalizedTarget) && normalizedTarget.length >= 3) {
    // Calculate how much of the guess is the target
    const overlapRatio = normalizedTarget.length / normalizedGuess.length;
    // Accept if the target is at least 50% of the guess (to avoid "it" matching "iteration")
    if (overlapRatio >= 0.5) {
      return {
        isFuzzy: true,
        confidence: Math.round(overlapRatio * 100),
        method: 'letter_pattern',
        explanation: `Contains the target word "${normalizedTarget}"`
      };
    }
  }
  
  // 2b. Guess contained in target (e.g., "ham" typed when target is "hammer")
  // Less confident - they might have stopped typing early
  if (normalizedTarget.includes(normalizedGuess) && normalizedGuess.length >= 4) {
    const overlapRatio = normalizedGuess.length / normalizedTarget.length;
    if (overlapRatio >= 0.6) {
      return {
        isFuzzy: true,
        confidence: Math.round(overlapRatio * 100),
        method: 'letter_pattern',
        explanation: `Partial match - typed "${normalizedGuess}" (missing letters)`
      };
    }
  }
  
  // 3. Common misspellings (instant recognition)
  for (const [correct, misspellings] of Object.entries(COMMON_MISSPELLINGS)) {
    if (normalizedTarget === correct && misspellings.includes(normalizedGuess)) {
      return {
        isFuzzy: true,
        confidence: 95,
        method: 'common_misspelling',
        explanation: `Common misspelling of "${correct}"`
      };
    }
    if (normalizedGuess === correct && misspellings.includes(normalizedTarget)) {
      return {
        isFuzzy: true,
        confidence: 95,
        method: 'common_misspelling',
        explanation: `Common misspelling of "${correct}"`
      };
    }
  }
  
  // 3. Smart edit distance (optimized for 1-2 character changes)
  const editResult = smartEditDistance(normalizedGuess, normalizedTarget);
  if (editResult.isFuzzy) {
    return editResult;
  }
  
  // 4. Keyboard typo detection (adjacent key mistakes)
  const keyboardResult = smartKeyboardMatch(normalizedGuess, normalizedTarget);
  if (keyboardResult.isFuzzy) {
    return keyboardResult;
  }
  
  // 5. Letter pattern matching (anagrams, jumbled letters)
  const patternResult = letterPatternMatch(normalizedGuess, normalizedTarget);
  if (patternResult.isFuzzy) {
    return patternResult;
  }
  
  // 6. Local phonetic matching (simple sound-alike)
  const phoneticResult = localPhoneticMatch(normalizedGuess, normalizedTarget);
  if (phoneticResult.isFuzzy) {
    return phoneticResult;
  }
  
  // No match found
  return {
    isFuzzy: false,
    confidence: 0,
    method: 'none',
    explanation: 'No similarity detected'
  };
}

/**
 * Smart edit distance - optimized for 1-2 character changes
 */
function smartEditDistance(guess: string, target: string): LocalFuzzyResult {
  // Skip if too different in length
  const lengthDiff = Math.abs(guess.length - target.length);
  if (lengthDiff > 2) {
    return { isFuzzy: false, confidence: 0, method: 'edit_distance', explanation: 'Too different in length' };
  }
  
  const distance = calculateEditDistance(guess, target);
  const maxLen = Math.max(guess.length, target.length);
  
  // Only accept 1-2 character changes for short-medium words
  if (distance <= 1 || (distance <= 2 && maxLen >= 6)) {
    const confidence = Math.round((1 - distance / maxLen) * 100);
    return {
      isFuzzy: true,
      confidence,
      method: 'edit_distance',
      explanation: `${distance} character change${distance !== 1 ? 's' : ''} needed`
    };
  }
  
  return { isFuzzy: false, confidence: 0, method: 'edit_distance', explanation: 'Too many changes needed' };
}

/**
 * Smart keyboard typo detection
 */
function smartKeyboardMatch(guess: string, target: string): LocalFuzzyResult {
  if (Math.abs(guess.length - target.length) > 1) {
    return { isFuzzy: false, confidence: 0, method: 'keyboard_typo', explanation: 'Length difference too big' };
  }
  
  let typoCount = 0;
  let matchingChars = 0;
  
  const minLen = Math.min(guess.length, target.length);
  
  for (let i = 0; i < minLen; i++) {
    if (guess[i] === target[i]) {
      matchingChars++;
    } else {
      // Check if it's a keyboard neighbor
      const neighbors = KEYBOARD_NEIGHBORS[guess[i]] || '';
      if (neighbors.includes(target[i])) {
        typoCount++;
      } else {
        typoCount += 2; // Non-neighbor substitution counts as 2
      }
    }
  }
  
  // Add penalty for length difference
  typoCount += Math.abs(guess.length - target.length);
  
  // Accept if mostly matching with 1-2 keyboard typos
  if (typoCount <= 2 && matchingChars >= minLen - 2) {
    const confidence = Math.round((matchingChars / Math.max(guess.length, target.length)) * 100);
    return {
      isFuzzy: true,
      confidence,
      method: 'keyboard_typo',
      explanation: `Keyboard typo detected (${typoCount} mistake${typoCount !== 1 ? 's' : ''})`
    };
  }
  
  return { isFuzzy: false, confidence: 0, method: 'keyboard_typo', explanation: 'Not a keyboard typo' };
}

/**
 * Letter pattern matching - RESTRICTED to avoid anagram matching
 * Only matches very specific cases where letters are clearly jumbled due to typos
 */
function letterPatternMatch(guess: string, target: string): LocalFuzzyResult {
  // Skip if different lengths (anagrams like LISTEN→SILENT should not match)
  if (guess.length !== target.length) {
    return { isFuzzy: false, confidence: 0, method: 'letter_pattern', explanation: 'Length mismatch' };
  }
  
  // Skip if words are too short (avoid false positives)
  if (guess.length < 5) {
    return { isFuzzy: false, confidence: 0, method: 'letter_pattern', explanation: 'Too short for pattern matching' };
  }
  
  // Count letter frequency in each word
  const guessLetters = countLetters(guess);
  const targetLetters = countLetters(target);
  
  let sharedLetters = 0;
  let correctPositions = 0;
  
  // Count shared letters and correct positions
  for (let i = 0; i < guess.length; i++) {
    if (guess[i] === target[i]) {
      correctPositions++;
    }
  }
  
  for (const [letter, count] of Object.entries(guessLetters)) {
    const targetCount = targetLetters[letter] || 0;
    sharedLetters += Math.min(count, targetCount);
  }
  
  const similarity = sharedLetters / guess.length;
  const positionAccuracy = correctPositions / guess.length;
  
  // VERY RESTRICTIVE: Only match if most letters are shared AND many positions are correct
  // This catches "DEFINE" → "DEFIEN" (letter swap) but rejects "LISTEN" → "SILENT" (anagram)
  if (similarity >= 0.9 && positionAccuracy >= 0.6 && sharedLetters >= 4) {
    return {
      isFuzzy: true,
      confidence: Math.round(similarity * 100),
      method: 'letter_pattern',
      explanation: `Letter transposition (${correctPositions}/${guess.length} correct positions)`
    };
  }
  
  return { isFuzzy: false, confidence: 0, method: 'letter_pattern', explanation: 'Not a simple letter transposition' };
}

/**
 * Local phonetic matching - simple sound-alike detection
 */
function localPhoneticMatch(guess: string, target: string): LocalFuzzyResult {
  // Simple phonetic rules (no external API)
  const phoneticGuess = simplePhonetic(guess);
  const phoneticTarget = simplePhonetic(target);
  
  if (phoneticGuess === phoneticTarget && phoneticGuess.length >= 3) {
    return {
      isFuzzy: true,
      confidence: 85,
      method: 'phonetic_local',
      explanation: `Sounds similar (${phoneticGuess})`
    };
  }
  
  return { isFuzzy: false, confidence: 0, method: 'phonetic_local', explanation: 'Different sounds' };
}

/**
 * Fast edit distance calculation
 */
function calculateEditDistance(str1: string, str2: string): number {
  if (str1 === str2) return 0;
  if (str1.length === 0) return str2.length;
  if (str2.length === 0) return str1.length;
  
  // Use single array for space efficiency
  let previous = Array.from({ length: str2.length + 1 }, (_, i) => i);
  
  for (let i = 0; i < str1.length; i++) {
    const current = [i + 1];
    
    for (let j = 0; j < str2.length; j++) {
      const cost = str1[i] === str2[j] ? 0 : 1;
      current[j + 1] = Math.min(
        current[j] + 1,      // insertion
        previous[j + 1] + 1, // deletion
        previous[j] + cost   // substitution
      );
    }
    
    previous = current;
  }
  
  return previous[str2.length];
}

/**
 * Count letter frequency
 */
function countLetters(word: string): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const letter of word) {
    counts[letter] = (counts[letter] || 0) + 1;
  }
  return counts;
}

/**
 * Simple local phonetic encoding (no API)
 */
function simplePhonetic(word: string): string {
  return word
    .toLowerCase()
    .replace(/[aeiou]/g, '') // Remove vowels
    .replace(/(.)\1+/g, '$1') // Remove consecutive duplicates
    .replace(/ck/g, 'k')
    .replace(/ph/g, 'f')
    .replace(/th/g, 't')
    .replace(/ch/g, 'k')
    .replace(/sh/g, 's')
    .substring(0, 4); // Keep first 4 consonants
}

/**
 * Main export - smart local fuzzy matching
 */
export { smartLocalFuzzyMatch as default }; 