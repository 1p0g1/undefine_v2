/**
 * Admin API: GET /api/admin/weeks
 * 
 * Returns an overview of scheduled words and themes by week.
 * 
 * Query params:
 *   - start: Start date (YYYY-MM-DD), defaults to today
 *   - end: End date (YYYY-MM-DD), defaults to 12 weeks from start
 * 
 * Response:
 *   {
 *     weeks: [
 *       {
 *         weekStart: "2025-01-06",
 *         weekEnd: "2025-01-12",
 *         theme: "Natural World" | null,
 *         days: [
 *           { date: "2025-01-06", word: "FOREST", hasWord: true },
 *           { date: "2025-01-07", word: null, hasWord: false },
 *           ...
 *         ]
 *       },
 *       ...
 *     ],
 *     stats: {
 *       totalDays: 84,
 *       daysWithWords: 45,
 *       weeksWithThemes: 6
 *     }
 *   }
 */

import { createClient } from '@supabase/supabase-js';
import type { NextApiRequest, NextApiResponse } from 'next';
import { env } from '@/src/env.server';
import { withAdminCors } from '@/lib/withAdminAuth';

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

interface DayInfo {
  date: string;
  word: string | null;
  wordId: string | null;
  hasWord: boolean;
  theme: string | null;
}

interface WeekInfo {
  weekStart: string;
  weekEnd: string;
  theme: string | null;
  themeCount: number;
  days: DayInfo[];
}

interface WeeksResponse {
  weeks: WeekInfo[];
  stats: {
    totalDays: number;
    daysWithWords: number;
    weeksWithThemes: number;
    uniqueThemes: string[];
  };
}

function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

async function handler(req: NextApiRequest, res: NextApiResponse<WeeksResponse | { error: string }>) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Parse date range
    const startParam = req.query.start as string;
    const endParam = req.query.end as string;
    
    const startDate = startParam ? new Date(startParam) : new Date();
    const endDate = endParam ? new Date(endParam) : addDays(startDate, 84); // 12 weeks default

    // Align to Monday
    const weekStart = getMonday(startDate);
    const weekEnd = endDate;

    console.log('[/api/admin/weeks] Fetching words for range:', {
      start: formatDate(weekStart),
      end: formatDate(weekEnd)
    });

    // Fetch all words in date range
    const { data: words, error } = await supabase
      .from('words')
      .select('id, word, date, theme')
      .gte('date', formatDate(weekStart))
      .lte('date', formatDate(weekEnd))
      .order('date', { ascending: true });

    if (error) {
      console.error('[/api/admin/weeks] Error fetching words:', error);
      return res.status(500).json({ error: 'Failed to fetch words' });
    }

    // Build word lookup by date
    const wordsByDate = new Map<string, { id: string; word: string; theme: string | null }>();
    for (const w of words || []) {
      if (w.date) {
        wordsByDate.set(w.date, { id: w.id, word: w.word, theme: w.theme });
      }
    }

    // Build weeks array
    const weeks: WeekInfo[] = [];
    let currentWeekStart = new Date(weekStart);
    
    while (currentWeekStart <= weekEnd) {
      const days: DayInfo[] = [];
      const themesInWeek = new Map<string, number>();
      
      for (let i = 0; i < 7; i++) {
        const dayDate = addDays(currentWeekStart, i);
        const dateStr = formatDate(dayDate);
        const wordInfo = wordsByDate.get(dateStr);
        
        days.push({
          date: dateStr,
          word: wordInfo?.word || null,
          wordId: wordInfo?.id || null,
          hasWord: !!wordInfo,
          theme: wordInfo?.theme || null
        });

        if (wordInfo?.theme) {
          themesInWeek.set(wordInfo.theme, (themesInWeek.get(wordInfo.theme) || 0) + 1);
        }
      }

      // Determine dominant theme for week (most common)
      let weekTheme: string | null = null;
      let maxCount = 0;
      Array.from(themesInWeek.entries()).forEach(([theme, count]) => {
        if (count > maxCount) {
          weekTheme = theme;
          maxCount = count;
        }
      });

      weeks.push({
        weekStart: formatDate(currentWeekStart),
        weekEnd: formatDate(addDays(currentWeekStart, 6)),
        theme: weekTheme,
        themeCount: maxCount,
        days
      });

      currentWeekStart = addDays(currentWeekStart, 7);
    }

    // Calculate stats
    const allDays = weeks.flatMap(w => w.days);
    const uniqueThemes = new Set<string>();
    for (const day of allDays) {
      if (day.theme) uniqueThemes.add(day.theme);
    }

    const stats = {
      totalDays: allDays.length,
      daysWithWords: allDays.filter(d => d.hasWord).length,
      weeksWithThemes: weeks.filter(w => w.theme !== null).length,
      uniqueThemes: Array.from(uniqueThemes).sort()
    };

    return res.status(200).json({ weeks, stats });

  } catch (error) {
    console.error('[/api/admin/weeks] Unexpected error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export default withAdminCors(handler);

