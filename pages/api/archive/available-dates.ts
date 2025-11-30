import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { withCors } from '@/lib/withCors';
import { env } from '@/src/env.server';

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

interface AvailableDateInfo {
  date: string;
  word: string;
  hasWord: boolean;
  theme: string | null;
  difficulty: string | null;
}

interface AvailableDatesResponse {
  dates: AvailableDateInfo[];
  dateRange: {
    start: string;
    end: string;
  };
}

/**
 * GET /api/archive/available-dates
 * 
 * Returns all dates that have words available for archive play.
 * Used by the StreakCalendarModal to determine which dates are playable.
 * 
 * Query params:
 *   start_date: YYYY-MM-DD (inclusive)
 *   end_date: YYYY-MM-DD (inclusive)
 */
export default withCors(async function handler(
  req: NextApiRequest,
  res: NextApiResponse<AvailableDatesResponse | { error: string }>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { start_date, end_date } = req.query;

  if (!start_date || !end_date) {
    return res.status(400).json({ error: 'start_date and end_date are required' });
  }

  try {
    console.log('[/api/archive/available-dates] Fetching available dates:', { 
      start_date, 
      end_date 
    });

    // Get all words between start and end date
    const { data: words, error } = await supabase
      .from('words')
      .select('date, word, theme, difficulty')
      .gte('date', start_date as string)
      .lte('date', end_date as string)
      .order('date', { ascending: true });

    if (error) {
      console.error('[/api/archive/available-dates] Database error:', error);
      return res.status(500).json({ error: 'Failed to fetch available dates' });
    }

    // Transform to expected format
    const dates: AvailableDateInfo[] = (words || []).map(word => ({
      date: word.date,
      word: word.word,
      hasWord: true,
      theme: word.theme,
      difficulty: word.difficulty
    }));

    console.log(`[/api/archive/available-dates] Found ${dates.length} available dates`);

    return res.status(200).json({
      dates,
      dateRange: {
        start: start_date as string,
        end: end_date as string
      }
    });

  } catch (error) {
    console.error('[/api/archive/available-dates] Unexpected error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

