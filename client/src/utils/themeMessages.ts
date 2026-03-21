/**
 * Fuzzy Matching Feedback Messages for Theme Guessing
 * 
 * Provides funny, engaging feedback based on semantic similarity scores
 * from the Hugging Face AI fuzzy matching system.
 */

export interface ThemeMessage {
  message: string;
  isCorrect: boolean;
  showActualTheme: boolean;
  emoji: string;
}

/**
 * Generate funny feedback message based on similarity score
 * 
 * @param confidence - Similarity score from 0-100
 * @param actualTheme - The actual theme word (shown when correct)
 * @param method - How the match was determined
 * @returns Formatted message with emoji and styling info
 */
export function getThemeFeedbackMessage(
  confidence: number, 
  actualTheme?: string,
  method?: 'exact' | 'semantic' | 'error'
): ThemeMessage {
  
  if (method === 'exact') {
    return {
      message: `Perfect! The theme is "${actualTheme}"`,
      isCorrect: true,
      showActualTheme: true,
      emoji: ''
    };
  }
  
  if (method === 'error') {
    return {
      message: "Something went wrong with the matching system",
      isCorrect: false,
      showActualTheme: false,
      emoji: ''
    };
  }
  
  // 95%+ — near-perfect, reveal theme
  if (confidence >= 95) {
    return {
      message: `Fair play, that's pretty much "${actualTheme}"`,
      isCorrect: true,
      showActualTheme: true,
      emoji: ''
    };
  }
  
  // 90-94% — very close but encourage perfection
  if (confidence >= 90) {
    return {
      message: "So, so close to perfect",
      isCorrect: true,
      showActualTheme: false,
      emoji: ''
    };
  }
  
  // 85-89% — correct but not perfect, encourage retry
  if (confidence >= 85) {
    return {
      message: "You're pretty much right, but not yet perfect",
      isCorrect: true,
      showActualTheme: false,
      emoji: ''
    };
  }
  
  // 70-84% — close but not correct
  if (confidence >= 70) {
    return {
      message: "Very, very close...",
      isCorrect: false,
      showActualTheme: false,
      emoji: ''
    };
  }
  
  // 60-69%
  if (confidence >= 60) {
    return {
      message: "Fairly warm now",
      isCorrect: false,
      showActualTheme: false,
      emoji: ''
    };
  }
  
  // 40-59%
  if (confidence >= 40) {
    return {
      message: "I mean, I guess, sort of?",
      isCorrect: false,
      showActualTheme: false,
      emoji: ''
    };
  }
  
  // 20-39%
  if (confidence >= 20) {
    return {
      message: "Hmm, don't think so",
      isCorrect: false,
      showActualTheme: false,
      emoji: ''
    };
  }
  
  return {
    message: "Nope",
    isCorrect: false,
    showActualTheme: false,
    emoji: ''
  };
}

/**
 * Get similarity bar color based on confidence score
 * 
 * THEME GUESS COLOR SYSTEM (Updated July 2025):
 * - 0-69%: Red (#dc2626) - Incorrect/far from correct
 * - 70-85%: Orange (#d97706) - Very close but not quite correct  
 * - 85%+: Green (#059669) - Effectively correct (high confidence)
 */
export function getSimilarityBarColor(confidence: number): string {
  if (confidence >= 85) return '#059669'; // Green for 85%+ (effectively correct)
  if (confidence >= 70) return '#d97706'; // Orange for 70-85% (very close)
  if (confidence >= 40) return '#dc2626'; // Red for 40-69% (cold)
  return '#6b7280'; // Gray for <40% (very cold)
}

/**
 * Get UN diamond color based on theme guess result
 * This is for coloring the UN diamond after theme guesses
 * 
 * THEME GUESS COLOR SYSTEM (Updated July 2025):
 * - Correct guess: Always green regardless of confidence
 * - 0-69%: Red (#dc2626) - Incorrect/far from correct
 * - 70-85%: Orange (#d97706) - Very close but not quite correct
 * - 85%+: Green (#059669) - Effectively correct (high confidence)
 */
export function getUnDiamondColor(confidence: number | null, isCorrect: boolean): string {
  if (isCorrect) return '#059669'; // Green for correct answers
  if (confidence === null) return '#1a237e'; // Default blue if no guess yet
  if (confidence < 70) return '#dc2626'; // Red for <70%
  if (confidence < 85) return '#d97706'; // Orange for 70-85%
  return '#059669'; // Green for 85%+
}

const THEME_KEY_SCORE_THRESHOLD_GREEN = 85;
const THEME_KEY_SCORE_THRESHOLD_ORANGE = 70;
const THEME_KEY_IMAGE_DEFAULT = '/Key.png';
const THEME_KEY_IMAGE_GREEN = '/GreenKey.png';
const THEME_KEY_IMAGE_ORANGE = '/OrangeKey.png';
const THEME_KEY_IMAGE_RED = '/RedKey.png';

interface ThemeKeyState {
  hasGuessedToday?: boolean;
  isCorrectGuess?: boolean;
  confidencePercentage?: number | null;
  highestConfidencePercentage?: number | null;
}

export function getThemeKeyImage({
  hasGuessedToday,
  isCorrectGuess,
  confidencePercentage,
  highestConfidencePercentage
}: ThemeKeyState): string {
  if (!hasGuessedToday) return THEME_KEY_IMAGE_DEFAULT;
  if (isCorrectGuess) return THEME_KEY_IMAGE_GREEN;

  const effectiveConfidence = highestConfidencePercentage ?? confidencePercentage;
  if (effectiveConfidence === null || effectiveConfidence === undefined) {
    return THEME_KEY_IMAGE_DEFAULT;
  }
  if (effectiveConfidence >= THEME_KEY_SCORE_THRESHOLD_GREEN) return THEME_KEY_IMAGE_GREEN;
  if (effectiveConfidence >= THEME_KEY_SCORE_THRESHOLD_ORANGE) return THEME_KEY_IMAGE_ORANGE;
  return THEME_KEY_IMAGE_RED;
}

/**
 * Get similarity bar color with override for correct answers
 * This ensures correct answers are always green regardless of confidence
 */
export function getSimilarityBarColorWithCorrect(confidence: number, isCorrect: boolean): string {
  if (isCorrect) return '#059669'; // Always green for correct answers
  return getSimilarityBarColor(confidence);
}

/**
 * Get similarity bar width as percentage
 */
export function getSimilarityBarWidth(confidence: number): number {
  return Math.min(confidence, 100);
} 