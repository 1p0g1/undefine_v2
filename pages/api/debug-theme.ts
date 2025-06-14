import { createClient } from '@supabase/supabase-js';
import type { NextApiRequest, NextApiResponse } from 'next';
import { env } from '@/src/env.server';
import { withCors } from '@/lib/withCors';
import { getCurrentTheme, getThemeForDate } from '@/src/game/theme';

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

export default withCors(async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const today = new Date().toISOString().split('T')[0];
    console.log('[debug-theme] Today:', today);

    // Get current theme
    const currentTheme = await getCurrentTheme();
    console.log('[debug-theme] Current theme:', currentTheme);

    // Get all words with themes
    const { data: themedWords, error } = await supabase
      .from('words')
      .select('id, word, date, theme')
      .not('theme', 'is', null)
      .order('date', { ascending: true });

    if (error) {
      console.error('[debug-theme] Error fetching themed words:', error);
      return res.status(500).json({ error: 'Database error' });
    }

    // Calculate week boundaries for today
    const targetDate = new Date(today);
    const day = targetDate.getDay();
    const diff = targetDate.getDate() - day + (day === 0 ? -6 : 1);
    const weekStart = new Date(targetDate);
    weekStart.setDate(diff);
    weekStart.setHours(0, 0, 0, 0);
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const weekStartStr = weekStart.toISOString().split('T')[0];
    const weekEndStr = weekEnd.toISOString().split('T')[0];

    console.log('[debug-theme] Week boundaries:', { weekStartStr, weekEndStr });

    // Filter themed words for current week
    const currentWeekThemedWords = themedWords?.filter(word => 
      word.date >= weekStartStr && word.date <= weekEndStr
    ) || [];

    return res.status(200).json({
      today,
      currentTheme,
      weekBoundaries: { start: weekStartStr, end: weekEndStr },
      allThemedWords: themedWords,
      currentWeekThemedWords,
      debug: {
        totalThemedWords: themedWords?.length || 0,
        currentWeekCount: currentWeekThemedWords.length,
        themes: Array.from(new Set(themedWords?.map(w => w.theme) || []))
      }
    });

  } catch (error) {
    console.error('[debug-theme] Error:', error);
    return res.status(500).json({ 
      error: 'Debug failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}); 