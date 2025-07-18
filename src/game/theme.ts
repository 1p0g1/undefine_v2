/**
 * Theme utilities for the Theme of the Week feature
 */

import { createClient } from '@supabase/supabase-js';
import { env } from '../env.server';
import { normalizeText } from '../utils/text';

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

/**
 * Get the theme for a specific date's week
 */
export async function getThemeForDate(date: string): Promise<string | null> {
  try {
    const targetDate = new Date(date);
    const weekStart = getWeekStart(targetDate);
    const weekEnd = getWeekEnd(targetDate);
    
    console.log('[getThemeForDate] Looking for theme between:', {
      date,
      weekStart: weekStart.toISOString().split('T')[0],
      weekEnd: weekEnd.toISOString().split('T')[0]
    });

    const { data, error } = await supabase
      .from('words')
      .select('theme')
      .gte('date', weekStart.toISOString().split('T')[0])
      .lte('date', weekEnd.toISOString().split('T')[0])
      .not('theme', 'is', null)
      .order('date', { ascending: true })
      .limit(1);

    if (error) {
      console.error('[getThemeForDate] Database error:', error);
      return null;
    }

    const theme = data?.[0]?.theme || null;
    console.log('[getThemeForDate] Found theme:', theme);
    return theme;
  } catch (error) {
    console.error('[getThemeForDate] Error:', error);
    return null;
  }
}

/**
 * Get all words for a specific theme
 */
export async function getWordsForTheme(theme: string): Promise<Array<{
  id: string;
  word: string;
  date: string;
}>> {
  try {
    const { data, error } = await supabase
      .from('words')
      .select('id, word, date')
      .eq('theme', theme)
      .order('date', { ascending: true });

    if (error) {
      console.error('[getWordsForTheme] Database error:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('[getWordsForTheme] Error:', error);
    return [];
  }
}

/**
 * Check if a theme guess is correct using AI-powered fuzzy matching
 * 
 * Updated 2025-01-08: Now uses semantic similarity with multi-tier approach
 * - Tier 1: Exact match (free, instant)
 * - Tier 2: Synonym database (free, curated)
 * - Tier 3: Semantic AI (HuggingFace API)
 */
export async function isThemeGuessCorrect(guess: string, actualTheme: string): Promise<{
  isCorrect: boolean;
  method: 'exact' | 'synonym' | 'semantic' | 'error';
  confidence: number;
  similarity?: number;
}> {
  if (!guess || !actualTheme) {
    return {
      isCorrect: false,
      method: 'error',
      confidence: 0
    };
  }

  // Import semantic similarity (dynamic import to avoid circular dependencies)
  const { matchThemeWithFuzzy } = await import('../utils/semanticSimilarity');
  
  try {
    const result = await matchThemeWithFuzzy(guess, actualTheme);
    
    return {
      isCorrect: result.isMatch,
      method: result.method,
      confidence: result.confidence,
      similarity: result.similarity
    };
  } catch (error) {
    console.error('[isThemeGuessCorrect] Error:', error);
    
    // Fallback to legacy matching if AI fails
    const legacyResult = isThemeGuessCorrectLegacy(guess, actualTheme);
    return {
      isCorrect: legacyResult,
      method: 'error',
      confidence: legacyResult ? 90 : 0
    };
  }
}

/**
 * Legacy theme matching (fallback when AI fails)
 * Preserves original logic for reliability
 */
function isThemeGuessCorrectLegacy(guess: string, actualTheme: string): boolean {
  if (!guess || !actualTheme) return false;

  const normalizedGuess = normalizeText(guess);
  const normalizedTheme = normalizeText(actualTheme);

  // Exact match
  if (normalizedGuess === normalizedTheme) return true;

  // Define theme synonyms for common themes (legacy list)
  const themeSynonyms: Record<string, string[]> = {
    'emotions': ['feelings', 'moods', 'sentiments', 'emotions'],
    'space': ['astronomy', 'cosmos', 'universe', 'celestial', 'space'],
    'animals': ['creatures', 'wildlife', 'beasts', 'fauna', 'animals'],
    'food': ['cuisine', 'meals', 'eating', 'cooking', 'food'],
    'colors': ['colours', 'hues', 'shades', 'tints', 'colors'],
    'weather': ['climate', 'meteorology', 'atmospheric', 'weather'],
    'music': ['musical', 'songs', 'melodies', 'instruments', 'music'],
    'sports': ['athletics', 'games', 'competition', 'physical', 'sports'],
    'language': ['words', 'vocabulary', 'linguistics', 'speech', 'terminology', 'lexicon', 'language']
  };

  // Get synonyms for the actual theme
  const synonyms = themeSynonyms[normalizedTheme] || [normalizedTheme];

  // Check if guess matches any synonym
  if (synonyms.some(synonym => normalizeText(synonym) === normalizedGuess)) {
    return true;
  }

  // Check partial matches (for compound themes)
  if (synonyms.some(synonym => 
    normalizedGuess.includes(normalizeText(synonym)) || 
    normalizeText(synonym).includes(normalizedGuess)
  )) {
    return true;
  }

  return false;
}

/**
 * Get week start date (Monday) for a given date
 */
function getWeekStart(date: Date): Date {
  const result = new Date(date);
  const day = result.getDay();
  const diff = result.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  result.setDate(diff);
  result.setHours(0, 0, 0, 0);
  return result;
}

/**
 * Get week end date (Sunday) for a given date
 */
function getWeekEnd(date: Date): Date {
  const result = getWeekStart(date);
  result.setDate(result.getDate() + 6);
  result.setHours(23, 59, 59, 999);
  return result;
}

/**
 * Get current week's theme
 */
export async function getCurrentTheme(): Promise<string | null> {
  const today = new Date().toISOString().split('T')[0];
  return getThemeForDate(today);
}

/**
 * Submit a theme attempt (one per day per theme)
 */
export async function submitThemeAttempt(
  playerId: string,
  theme: string,
  guess: string
): Promise<{
  success: boolean;
  isCorrect: boolean;
  alreadyGuessedToday: boolean;
  wordsCompleted: number;
  totalGuesses: number;
}> {
  try {
    // Check if player already guessed today
    const today = new Date().toISOString().split('T')[0];
    const { data: existingAttempt } = await supabase
      .from('theme_attempts')
      .select('id')
      .eq('player_id', playerId)
      .eq('theme', theme)
      .eq('attempt_date', today)
      .single();

    if (existingAttempt) {
      return {
        success: false,
        isCorrect: false,
        alreadyGuessedToday: true,
        wordsCompleted: 0,
        totalGuesses: 0
      };
    }

    // Get statistics at time of guess
    const progress = await getThemeProgress(playerId, theme);
    const { data: totalGuessStats } = await supabase
      .from('game_sessions')
      .select('guesses')
      .eq('player_id', playerId)
      .eq('is_complete', true);

    const totalWordGuesses = totalGuessStats?.reduce((sum, session) => 
      sum + (session.guesses?.length || 0), 0) || 0;

    // Validate the guess using AI-powered fuzzy matching
    const guessResult = await isThemeGuessCorrect(guess, theme);
    const isCorrect = guessResult.isCorrect;

    // Log the matching method for analytics
    console.log(`[submitThemeAttempt] Theme guess validation:`, {
      guess: guess.trim(),
      theme,
      isCorrect,
      method: guessResult.method,
      confidence: guessResult.confidence,
      similarity: guessResult.similarity
    });

    // Insert theme attempt with similarity tracking
    const { error: insertError } = await supabase
      .from('theme_attempts')
      .insert({
        player_id: playerId,
        theme,
        guess: guess.trim(),
        is_correct: isCorrect,
        attempt_date: today,
        words_completed_when_guessed: progress.completedWords,
        total_word_guesses: totalWordGuesses,
        // Add similarity tracking data
        similarity_score: guessResult.similarity || null,
        confidence_percentage: guessResult.confidence,
        matching_method: guessResult.method
      });

    if (insertError) {
      console.error('[submitThemeAttempt] Insert error:', insertError);
      return {
        success: false,
        isCorrect: false,
        alreadyGuessedToday: false,
        wordsCompleted: progress.completedWords,
        totalGuesses: totalWordGuesses
      };
    }

    return {
      success: true,
      isCorrect,
      alreadyGuessedToday: false,
      wordsCompleted: progress.completedWords,
      totalGuesses: totalWordGuesses
    };
  } catch (error) {
    console.error('[submitThemeAttempt] Error:', error);
    return {
      success: false,
      isCorrect: false,
      alreadyGuessedToday: false,
      wordsCompleted: 0,
      totalGuesses: 0
    };
  }
}

/**
 * Get theme statistics for a player
 */
export async function getPlayerThemeStats(playerId: string): Promise<{
  totalThemeAttempts: number;
  correctThemeGuesses: number;
  averageAttemptsPerTheme: number;
  averageWordsCompletedWhenGuessing: number;
  themesGuessed: string[];
}> {
  try {
    const { data: attempts, error } = await supabase
      .from('theme_attempts')
      .select('theme, is_correct, words_completed_when_guessed')
      .eq('player_id', playerId);

    if (error) {
      console.error('[getPlayerThemeStats] Error:', error);
      return {
        totalThemeAttempts: 0,
        correctThemeGuesses: 0,
        averageAttemptsPerTheme: 0,
        averageWordsCompletedWhenGuessing: 0,
        themesGuessed: []
      };
    }

    const totalAttempts = attempts?.length || 0;
    const correctGuesses = attempts?.filter(a => a.is_correct).length || 0;
    const uniqueThemes = Array.from(new Set(attempts?.map(a => a.theme) || []));
    const averageAttempts = uniqueThemes.length > 0 ? totalAttempts / uniqueThemes.length : 0;
    const averageWordsCompleted = totalAttempts > 0 
      ? (attempts?.reduce((sum, a) => sum + (a.words_completed_when_guessed || 0), 0) || 0) / totalAttempts 
      : 0;

    return {
      totalThemeAttempts: totalAttempts,
      correctThemeGuesses: correctGuesses,
      averageAttemptsPerTheme: Math.round(averageAttempts * 100) / 100,
      averageWordsCompletedWhenGuessing: Math.round(averageWordsCompleted * 100) / 100,
      themesGuessed: attempts?.filter(a => a.is_correct).map(a => a.theme) || []
    };
  } catch (error) {
    console.error('[getPlayerThemeStats] Error:', error);
    return {
      totalThemeAttempts: 0,
      correctThemeGuesses: 0,
      averageAttemptsPerTheme: 0,
      averageWordsCompletedWhenGuessing: 0,
      themesGuessed: []
    };
  }
}

/**
 * Get theme progress for a player
 */
export async function getThemeProgress(playerId: string, theme: string): Promise<{
  totalWords: number;
  completedWords: number;
  themeGuess: string | null;
  canGuessTheme: boolean;
  hasGuessedToday: boolean;
  isCorrectGuess: boolean;
  // Similarity tracking data (available when hasGuessedToday is true)
  similarityScore?: number | null;
  confidencePercentage?: number | null;
  matchingMethod?: string | null;
}> {
  try {
    // Get current week boundaries
    const { monday, sunday } = getThemeWeekBoundaries();
    
    // Get themed words for this theme from CURRENT WEEK ONLY (not all-time)
    const { data: themeWords, error: wordsError } = await supabase
      .from('words')
      .select('id, word, date')
      .eq('theme', theme)
      .gte('date', monday.toISOString().split('T')[0])
      .lte('date', sunday.toISOString().split('T')[0])
      .order('date', { ascending: true });

    if (wordsError) {
      console.error('[getThemeProgress] Database error:', wordsError);
      return {
        totalWords: 0,
        completedWords: 0,
        themeGuess: null,
        canGuessTheme: false,
        hasGuessedToday: false,
        isCorrectGuess: false,
        similarityScore: null,
        confidencePercentage: null,
        matchingMethod: null
      };
    }

    const wordIds = themeWords?.map(w => w.id) || [];
    
    // Get player's completed sessions for CURRENT WEEK themed words only
    const { data: sessions, error } = await supabase
      .from('game_sessions')
      .select('word_id, is_complete')
      .eq('player_id', playerId)
      .in('word_id', wordIds);

    if (error) {
      console.error('[getThemeProgress] Database error:', error);
      return {
        totalWords: themeWords?.length || 0,
        completedWords: 0,
        themeGuess: null,
        canGuessTheme: false,
        hasGuessedToday: false,
        isCorrectGuess: false,
        similarityScore: null,
        confidencePercentage: null,
        matchingMethod: null
      };
    }

    const completedSessions = sessions?.filter(s => s.is_complete) || [];

    // Get all theme attempts for this week, ordered by date (most recent first)
    const { data: weeklyAttempts, error: attemptsError } = await supabase
      .from('theme_attempts')
      .select('guess, is_correct, similarity_score, confidence_percentage, matching_method, attempt_date')
      .eq('player_id', playerId)
      .eq('theme', theme)
      .gte('attempt_date', monday.toISOString().split('T')[0])
      .lte('attempt_date', sunday.toISOString().split('T')[0])
      .order('attempt_date', { ascending: false });

    if (attemptsError && attemptsError.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('[getThemeProgress] Weekly attempts error:', attemptsError);
    }

    // Find the most recent attempt, prioritizing correct answers
    let mostRecentAttempt = null;
    if (weeklyAttempts && weeklyAttempts.length > 0) {
      // First check if there's any correct guess this week
      const correctAttempt = weeklyAttempts.find(attempt => attempt.is_correct);
      if (correctAttempt) {
        mostRecentAttempt = correctAttempt;
      } else {
        // If no correct guess, use the most recent attempt
        mostRecentAttempt = weeklyAttempts[0];
      }
    }

    // Check today's attempt specifically for canGuessTheme logic
    const today = new Date().toISOString().split('T')[0];
    const { data: todayAttempt, error: attemptError } = await supabase
      .from('theme_attempts')
      .select('guess')
      .eq('player_id', playerId)
      .eq('theme', theme)
      .eq('attempt_date', today)
      .single();

    if (attemptError && attemptError.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('[getThemeProgress] Theme attempt error:', attemptError);
    }

    // Can guess theme if completed at least one word this week and haven't guessed today
    const hasCompletedWordThisWeek = completedSessions.length > 0;

    return {
      totalWords: themeWords?.length || 0,
      completedWords: completedSessions.length,
      themeGuess: mostRecentAttempt?.guess || null,
      canGuessTheme: hasCompletedWordThisWeek && !todayAttempt,
      hasGuessedToday: !!todayAttempt,
      isCorrectGuess: mostRecentAttempt?.is_correct || false,
      // Include similarity data if available
      similarityScore: mostRecentAttempt?.similarity_score || null,
      confidencePercentage: mostRecentAttempt?.confidence_percentage || null,
      matchingMethod: mostRecentAttempt?.matching_method || null
    };
  } catch (error) {
    console.error('[getThemeProgress] Error:', error);
    return {
      totalWords: 0,
      completedWords: 0,
      themeGuess: null,
      canGuessTheme: false,
      hasGuessedToday: false,
      isCorrectGuess: false,
      similarityScore: null,
      confidencePercentage: null,
      matchingMethod: null
    };
  }
}

/**
 * Get current theme week boundaries (Monday-Sunday)
 */
function getThemeWeekBoundaries(date: Date = new Date()) {
  const monday = getWeekStart(date);
  const sunday = getWeekEnd(date);
  return { monday, sunday };
}

/**
 * Get player's completed themed words for current week only
 * This is the core logic for weekly words display feature
 */
export async function getPlayerWeeklyThemedWords(playerId: string, theme: string): Promise<Array<{
  id: string;
  word: string;
  date: string;
  completedOn: string;
}>> {
  try {
    const { monday, sunday } = getThemeWeekBoundaries();
    
    console.log('[getPlayerWeeklyThemedWords] Getting weekly themed words for player:', {
      playerId,
      theme,
      weekStart: monday.toISOString().split('T')[0],
      weekEnd: sunday.toISOString().split('T')[0]
    });

    // Find all words from current week with matching theme
    const { data: themedWords, error: wordsError } = await supabase
      .from('words')
      .select('id, word, date')
      .eq('theme', theme)
      .gte('date', monday.toISOString().split('T')[0])
      .lte('date', sunday.toISOString().split('T')[0])
      .order('date', { ascending: true });

    if (wordsError) {
      console.error('[getPlayerWeeklyThemedWords] Error fetching themed words:', wordsError);
      return [];
    }

    if (!themedWords || themedWords.length === 0) {
      console.log('[getPlayerWeeklyThemedWords] No themed words found for current week');
      return [];
    }

    const wordIds = themedWords.map(w => w.id);

    // Find which ones player has completed using game_sessions (consistent with getThemeProgress)
    const { data: completedSessions, error: sessionsError } = await supabase
      .from('game_sessions')
      .select('word_id, created_at')
      .eq('player_id', playerId)
      .eq('is_complete', true)
      .in('word_id', wordIds);

    if (sessionsError) {
      console.error('[getPlayerWeeklyThemedWords] Error fetching completed sessions:', sessionsError);
      return [];
    }

    // Match completed words with their theme word data
    const completedWords = themedWords
      .filter(word => completedSessions?.some(session => session.word_id === word.id))
      .map(word => {
        const session = completedSessions?.find(s => s.word_id === word.id);
        return {
          id: word.id,
          word: word.word,
          date: word.date,
          completedOn: session?.created_at || word.date
        };
      });

    console.log('[getPlayerWeeklyThemedWords] Found completed themed words:', {
      totalThemedWords: themedWords.length,
      completedCount: completedWords.length,
      completedWords: completedWords.map(w => ({ word: w.word, date: w.date }))
    });

    return completedWords;
  } catch (error) {
    console.error('[getPlayerWeeklyThemedWords] Error:', error);
    return [];
  }
} 