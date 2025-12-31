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
  method: 'exact' | 'semantic' | 'error';
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

  // First check for exact match (fast, no API needed)
  const normalizedGuess = normalizeText(guess);
  const normalizedTheme = normalizeText(actualTheme);
  
  if (normalizedGuess === normalizedTheme) {
    console.log('[isThemeGuessCorrect] Exact match found');
    return {
      isCorrect: true,
      method: 'exact',
      confidence: 100,
      similarity: 1.0
    };
  }

  // Try semantic similarity with robust error handling
  try {
    // Dynamic import with timeout to prevent hanging
    const importPromise = import('../utils/semanticSimilarity');
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Import timeout')), 5000)
    );
    
    const { matchThemeWithFuzzy } = await Promise.race([importPromise, timeoutPromise]) as any;
    
    const result = await matchThemeWithFuzzy(guess, actualTheme);
    
    return {
      isCorrect: result.isMatch,
      method: result.method,
      confidence: result.confidence,
      similarity: result.similarity
    };
  } catch (error) {
    console.error('[isThemeGuessCorrect] Semantic matching failed, using legacy fallback:', error);
    
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

  // Exact match only (no synonyms)
  return normalizedGuess === normalizedTheme;
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
  guess: string,
  contextDate?: string,
  isArchiveAttempt?: boolean
): Promise<{
  success: boolean;
  isCorrect: boolean;
  alreadyGuessedToday: boolean;
  wordsCompleted: number;
  totalGuesses: number;
  error?: string;
}> {
  try {
    const today = new Date().toISOString().split('T')[0];
    const effectiveContextDate = contextDate || today;
    const derivedIsArchiveAttempt = isArchiveAttempt ?? (effectiveContextDate !== today);
    const weekStart = getWeekStart(new Date(effectiveContextDate)).toISOString().split('T')[0];

    // Check if player already guessed today
    const { data: existingAttempt } = await supabase
      .from('theme_attempts')
      .select('id')
      .eq('player_id', playerId)
      .eq('theme', theme)
      .eq('attempt_date', today)
      .eq('is_archive_attempt', derivedIsArchiveAttempt)
      .eq('week_start', weekStart)
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
    const progress = await getThemeProgress(playerId, theme, effectiveContextDate);
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

    // Insert theme attempt - use tiered fallback for schema compatibility
    // Tier 1: All columns (similarity tracking + week_start/is_archive_attempt)
    // Tier 2: Base columns (week_start/is_archive_attempt but no similarity)
    // Tier 3: Minimal columns (original schema only)
    let insertError = null;
    
    // Minimal required columns (original schema)
    const minimalInsertData = {
      player_id: playerId,
      theme,
      guess: guess.trim(),
      is_correct: isCorrect,
      attempt_date: today,
      words_completed_when_guessed: progress.completedWords,
      total_word_guesses: totalWordGuesses
    };
    
    // Extended columns (requires migration 20251231000001)
    const extendedInsertData = {
      ...minimalInsertData,
      week_start: weekStart,
      is_archive_attempt: derivedIsArchiveAttempt
    };
    
    // Full columns (requires similarity migration)
    const fullInsertData = {
      ...extendedInsertData,
      similarity_score: guessResult.similarity || null,
      confidence_percentage: guessResult.confidence,
      matching_method: guessResult.method
    };
    
    // Tier 1: Try with all columns (full schema)
    const { error: fullInsertError } = await supabase
      .from('theme_attempts')
      .insert(fullInsertData);

    if (fullInsertError) {
      console.warn('[submitThemeAttempt] Tier 1 insert failed (full schema):', fullInsertError.message);
      
      // Tier 2: Try with extended columns but no similarity tracking
      const { error: extendedInsertError } = await supabase
        .from('theme_attempts')
        .insert(extendedInsertData);
      
      if (extendedInsertError) {
        console.warn('[submitThemeAttempt] Tier 2 insert failed (extended schema):', extendedInsertError.message);
        
        // Tier 3: Try with minimal columns (original schema)
        const { error: minimalInsertError } = await supabase
          .from('theme_attempts')
          .insert(minimalInsertData);
        
        insertError = minimalInsertError;
      }
    }

    if (insertError) {
      console.error('[submitThemeAttempt] Insert error:', insertError);
      console.error('[submitThemeAttempt] Insert error details:', {
        code: insertError.code,
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint
      });
      return {
        success: false,
        isCorrect: false,
        alreadyGuessedToday: false,
        wordsCompleted: progress.completedWords,
        totalGuesses: totalWordGuesses,
        error: insertError.message
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
export async function getThemeProgress(playerId: string, theme: string, contextDate?: string): Promise<{
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
}>;

export async function getThemeProgress(
  playerId: string,
  theme: string,
  contextDate?: string
): Promise<{
  totalWords: number;
  completedWords: number;
  themeGuess: string | null;
  canGuessTheme: boolean;
  hasGuessedToday: boolean;
  isCorrectGuess: boolean;
  similarityScore?: number | null;
  confidencePercentage?: number | null;
  matchingMethod?: string | null;
}> {
  try {
    const today = new Date().toISOString().split('T')[0];
    const effectiveContextDate = contextDate || today;
    const isArchiveContext = effectiveContextDate !== today;
    const contextDateObj = new Date(effectiveContextDate);
    const { monday, sunday } = getThemeWeekBoundaries(contextDateObj);
    const weekStart = monday.toISOString().split('T')[0];
    
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
      .select('word_id, is_complete, is_won, is_archive_play')
      .eq('player_id', playerId)
      .eq('is_archive_play', isArchiveContext)
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

    // IMPORTANT:
    // "completedWords" should mean the player actually guessed the word (won),
    // not merely that the session ended (a loss still has is_complete=true).
    const completedWinningSessions =
      sessions?.filter(s => s.is_complete && s.is_won) || [];

    // Get all theme attempts for this theme-week context (archive-safe)
    const { data: weeklyAttempts, error: attemptsError } = await supabase
      .from('theme_attempts')
      .select('guess, is_correct, similarity_score, confidence_percentage, matching_method, attempt_date, week_start, is_archive_attempt')
      .eq('player_id', playerId)
      .eq('theme', theme)
      .eq('week_start', weekStart)
      .eq('is_archive_attempt', isArchiveContext)
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

    // Check today's attempt specifically for canGuessTheme logic (context-scoped)
    const { data: todayAttempt, error: attemptError } = await supabase
      .from('theme_attempts')
      .select('guess')
      .eq('player_id', playerId)
      .eq('theme', theme)
      .eq('attempt_date', today)
      .eq('week_start', weekStart)
      .eq('is_archive_attempt', isArchiveContext)
      .single();

    if (attemptError && attemptError.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('[getThemeProgress] Theme attempt error:', attemptError);
    }

    // Can guess theme if won at least one word in this theme-week context and haven't guessed today
    const hasWonWordThisWeek = completedWinningSessions.length > 0;

    return {
      totalWords: themeWords?.length || 0,
      completedWords: completedWinningSessions.length,
      themeGuess: mostRecentAttempt?.guess || null,
      canGuessTheme: hasWonWordThisWeek && !todayAttempt,
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
 * Get ALL themed words for current week (both completed and missed by player)
 * Used for Sunday revelation to show complete week overview
 */
export async function getAllWeeklyThemedWords(playerId: string, theme: string, contextDate?: string): Promise<Array<{
  id: string;
  word: string;
  date: string;
  completedOn: string | null;
  isCompleted: boolean;
}>>;

export async function getAllWeeklyThemedWords(
  playerId: string,
  theme: string,
  contextDate?: string
): Promise<Array<{
  id: string;
  word: string;
  date: string;
  completedOn: string | null;
  isCompleted: boolean;
}>> {
  try {
    const today = new Date().toISOString().split('T')[0];
    const effectiveContextDate = contextDate || today;
    const isArchiveContext = effectiveContextDate !== today;
    const { monday, sunday } = getThemeWeekBoundaries(new Date(effectiveContextDate));
    
    console.log('[getAllWeeklyThemedWords] Getting all weekly themed words for player:', {
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
      console.error('[getAllWeeklyThemedWords] Error fetching themed words:', wordsError);
      return [];
    }

    if (!themedWords || themedWords.length === 0) {
      console.log('[getAllWeeklyThemedWords] No themed words found for current week');
      return [];
    }

    const wordIds = themedWords.map(w => w.id);

    // Find which ones player has won using game_sessions
    const { data: completedSessions, error: sessionsError } = await supabase
      .from('game_sessions')
      .select('word_id, created_at, is_won, is_archive_play')
      .eq('player_id', playerId)
      .eq('is_complete', true)
      .eq('is_archive_play', isArchiveContext)
      .in('word_id', wordIds);

    if (sessionsError) {
      console.error('[getAllWeeklyThemedWords] Error fetching completed sessions:', sessionsError);
      return [];
    }

    // Map all words with completion status
    const allWords = themedWords.map(word => {
      const session = completedSessions?.find(s => s.word_id === word.id && s.is_won === true);
      return {
        id: word.id,
        word: word.word,
        date: word.date,
        completedOn: session?.created_at || null,
        isCompleted: !!session
      };
    });

    console.log('[getAllWeeklyThemedWords] Found all themed words:', {
      totalThemedWords: themedWords.length,
      completedCount: allWords.filter(w => w.isCompleted).length,
      missedCount: allWords.filter(w => !w.isCompleted).length
    });

    return allWords;
  } catch (error) {
    console.error('[getAllWeeklyThemedWords] Error:', error);
    return [];
  }
}

/**
 * Get player's completed themed words for current week only
 * This is the core logic for weekly words display feature
 */
export async function getPlayerWeeklyThemedWords(playerId: string, theme: string, contextDate?: string): Promise<Array<{
  id: string;
  word: string;
  date: string;
  completedOn: string;
  wasWon: boolean;
}>>;

export async function getPlayerWeeklyThemedWords(
  playerId: string,
  theme: string,
  contextDate?: string
): Promise<Array<{
  id: string;
  word: string;
  date: string;
  completedOn: string;
  wasWon: boolean;
}>> {
  try {
    const today = new Date().toISOString().split('T')[0];
    const effectiveContextDate = contextDate || today;
    const isArchiveContext = effectiveContextDate !== today;
    const { monday, sunday } = getThemeWeekBoundaries(new Date(effectiveContextDate));
    
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

    // Find which themed words player has played this week (won or lost), excluding archive plays.
    // If multiple sessions exist for the same word, prefer a winning session; otherwise use the most recent completion.
    const { data: completedSessions, error: sessionsError } = await supabase
      .from('game_sessions')
      .select('word_id, created_at, end_time, is_won, is_archive_play')
      .eq('player_id', playerId)
      .eq('is_complete', true)
      .eq('is_archive_play', isArchiveContext)
      .in('word_id', wordIds);

    if (sessionsError) {
      console.error('[getPlayerWeeklyThemedWords] Error fetching completed sessions:', sessionsError);
      return [];
    }

    const completedWords = themedWords
      .filter(word => completedSessions?.some(session => session.word_id === word.id))
      .map(word => {
        const sessionsForWord = (completedSessions || []).filter(s => s.word_id === word.id);
        const winningSession = sessionsForWord.find(s => s.is_won === true);
        const mostRecentSession = sessionsForWord
          .slice()
          .sort((a, b) => {
            const aTime = new Date(a.end_time || a.created_at).getTime();
            const bTime = new Date(b.end_time || b.created_at).getTime();
            return bTime - aTime;
          })[0];
        const chosenSession = winningSession || mostRecentSession;

        return {
          id: word.id,
          word: word.word,
          date: word.date,
          completedOn: chosenSession?.created_at || word.date,
          wasWon: chosenSession?.is_won === true
        };
      });

    console.log('[getPlayerWeeklyThemedWords] Found completed themed words:', {
      totalThemedWords: themedWords.length,
      completedCount: completedWords.length,
      completedWords: completedWords.map(w => ({ word: w.word, date: w.date, wasWon: w.wasWon }))
    });

    return completedWords;
  } catch (error) {
    console.error('[getPlayerWeeklyThemedWords] Error:', error);
    return [];
  }
} 