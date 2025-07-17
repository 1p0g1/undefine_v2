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
  method?: 'exact' | 'synonym' | 'semantic' | 'error'
): ThemeMessage {
  
  // Handle different matching methods
  if (method === 'exact') {
    return {
      message: `BANG ON! It's "${actualTheme}"`,
      isCorrect: true,
      showActualTheme: true,
      emoji: '🎯'
    };
  }
  
  if (method === 'synonym') {
    return {
      message: `Perfect! That's exactly "${actualTheme}"`,
      isCorrect: true,
      showActualTheme: true,
      emoji: '✨'
    };
  }
  
  if (method === 'error') {
    return {
      message: "Hmm, something went wrong with the matching system",
      isCorrect: false,
      showActualTheme: false,
      emoji: '❌'
    };
  }
  
  // Semantic similarity scoring (0-100)
  if (confidence >= 90) {
    return {
      message: `Fair play, that's pretty much "${actualTheme}"`,
      isCorrect: true,
      showActualTheme: true,
      emoji: '🔥'
    };
  }
  
  if (confidence >= 80) {
    return {
      message: `Nice, I've got you, it was "${actualTheme}"`,
      isCorrect: true,
      showActualTheme: true,
      emoji: '👏'
    };
  }
  
  if (confidence >= 70) {
    return {
      message: `Yeah, sure I'll give you that, it was "${actualTheme}"`,
      isCorrect: true,
      showActualTheme: true,
      emoji: '👍'
    };
  }
  
  if (confidence >= 60) {
    return {
      message: "Fairly warm now",
      isCorrect: false,
      showActualTheme: false,
      emoji: '🌡️'
    };
  }
  
  if (confidence >= 40) {
    return {
      message: "I mean, I guess, sort of?",
      isCorrect: false,
      showActualTheme: false,
      emoji: '🤔'
    };
  }
  
  if (confidence >= 20) {
    return {
      message: "Hmm, don't think so",
      isCorrect: false,
      showActualTheme: false,
      emoji: '🤷'
    };
  }
  
  // Below 20%
  return {
    message: "lol nope",
    isCorrect: false,
    showActualTheme: false,
    emoji: '😂'
  };
}

/**
 * Get similarity bar color based on confidence score
 */
export function getSimilarityBarColor(confidence: number): string {
  if (confidence >= 70) return '#059669'; // Green for winning scores
  if (confidence >= 60) return '#d97706'; // Orange for warm
  if (confidence >= 40) return '#dc2626'; // Red for cold
  return '#6b7280'; // Gray for very cold
}

/**
 * Get UN diamond color based on theme guess result
 * This is for coloring the UN diamond after theme guesses
 */
export function getUnDiamondColor(confidence: number | null, isCorrect: boolean): string {
  if (isCorrect) return '#059669'; // Green for correct answers
  if (confidence === null) return '#1a237e'; // Default blue if no guess yet
  if (confidence <= 50) return '#dc2626'; // Red for ≤50%
  if (confidence <= 70) return '#d97706'; // Orange for 51-70%
  return '#059669'; // Green for >70%
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