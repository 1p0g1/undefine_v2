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
 * Check if a theme guess is correct using fuzzy matching
 */
export function isThemeGuessCorrect(guess: string, actualTheme: string): boolean {
  if (!guess || !actualTheme) return false;

  const normalizedGuess = normalizeText(guess);
  const normalizedTheme = normalizeText(actualTheme);

  // Exact match
  if (normalizedGuess === normalizedTheme) return true;

  // Define theme synonyms for common themes
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

    // Validate the guess
    const isCorrect = isThemeGuessCorrect(guess, theme);

    // Insert theme attempt
    const { error: insertError } = await supabase
      .from('theme_attempts')
      .insert({
        player_id: playerId,
        theme,
        guess: guess.trim(),
        is_correct: isCorrect,
        attempt_date: today,
        words_completed_when_guessed: progress.completedWords,
        total_word_guesses: totalWordGuesses
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
}> {
  try {
    // Get all words for this theme
    const themeWords = await getWordsForTheme(theme);
    
    // Get player's game sessions for this theme's words
    const wordIds = themeWords.map(w => w.id);
    
    const { data: sessions, error } = await supabase
      .from('game_sessions')
      .select('word_id, is_complete')
      .eq('player_id', playerId)
      .in('word_id', wordIds);

    if (error) {
      console.error('[getThemeProgress] Database error:', error);
      return {
        totalWords: themeWords.length,
        completedWords: 0,
        themeGuess: null,
        canGuessTheme: false,
        hasGuessedToday: false,
        isCorrectGuess: false
      };
    }

    const completedSessions = sessions?.filter(s => s.is_complete) || [];

    // Check today's theme attempt
    const today = new Date().toISOString().split('T')[0];
    const { data: todayAttempt, error: attemptError } = await supabase
      .from('theme_attempts')
      .select('guess, is_correct')
      .eq('player_id', playerId)
      .eq('theme', theme)
      .eq('attempt_date', today)
      .single();

    if (attemptError && attemptError.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('[getThemeProgress] Theme attempt error:', attemptError);
    }

    // Get completed words from this week only
    const weeklyWords = await getPlayerWeeklyThemedWords(playerId, theme);
    const hasCompletedWordThisWeek = weeklyWords.length > 0;

    return {
      totalWords: themeWords.length,
      completedWords: completedSessions.length,
      themeGuess: todayAttempt?.guess || null,
      canGuessTheme: hasCompletedWordThisWeek && !todayAttempt, // Can guess if completed words THIS WEEK AND haven't guessed today
      hasGuessedToday: !!todayAttempt,
      isCorrectGuess: todayAttempt?.is_correct || false
    };
  } catch (error) {
    console.error('[getThemeProgress] Error:', error);
    return {
      totalWords: 0,
      completedWords: 0,
      themeGuess: null,
      canGuessTheme: false,
      hasGuessedToday: false,
      isCorrectGuess: false
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