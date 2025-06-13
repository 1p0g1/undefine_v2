/**
 * Theme utilities for the Theme of the Week feature
 */

import { createClient } from '@supabase/supabase-js';
import { env } from '@/src/env.server';
import { normalizeText } from '@/src/utils/text';

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
    'sports': ['athletics', 'games', 'competition', 'physical', 'sports']
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
 * Get theme progress for a player
 */
export async function getThemeProgress(playerId: string, theme: string): Promise<{
  totalWords: number;
  completedWords: number;
  themeGuess: string | null;
  canGuessTheme: boolean;
}> {
  try {
    // Get all words for this theme
    const themeWords = await getWordsForTheme(theme);
    
    // Get player's game sessions for this theme's words
    const wordIds = themeWords.map(w => w.id);
    
    const { data: sessions, error } = await supabase
      .from('game_sessions')
      .select('word_id, is_complete, theme_guess')
      .eq('player_id', playerId)
      .in('word_id', wordIds);

    if (error) {
      console.error('[getThemeProgress] Database error:', error);
      return {
        totalWords: themeWords.length,
        completedWords: 0,
        themeGuess: null,
        canGuessTheme: false
      };
    }

    const completedSessions = sessions?.filter(s => s.is_complete) || [];
    const sessionWithThemeGuess = sessions?.find(s => s.theme_guess);

    return {
      totalWords: themeWords.length,
      completedWords: completedSessions.length,
      themeGuess: sessionWithThemeGuess?.theme_guess || null,
      canGuessTheme: completedSessions.length > 0 // Can guess after completing at least one word
    };
  } catch (error) {
    console.error('[getThemeProgress] Error:', error);
    return {
      totalWords: 0,
      completedWords: 0,
      themeGuess: null,
      canGuessTheme: false
    };
  }
} 