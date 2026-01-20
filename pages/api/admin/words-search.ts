/**
 * Admin API: GET /api/admin/words-search
 * 
 * Search the words table by word, theme, or date.
 * 
 * Query params:
 *   - q: Search query (required)
 *   - type: Search type - 'word' | 'theme' | 'date' (default: 'word')
 *   - limit: Max results (default: 50)
 * 
 * Examples:
 *   /api/admin/words-search?q=harp&type=word
 *   /api/admin/words-search?q=ireland&type=theme
 *   /api/admin/words-search?q=2026-03&type=date
 */

import { createClient } from '@supabase/supabase-js';
import type { NextApiRequest, NextApiResponse } from 'next';
import { env } from '@/src/env.server';
import { withAdminCors } from '@/lib/withAdminAuth';

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

interface WordEntry {
  id: string;
  word: string;
  date: string | null;
  theme: string | null;
  definition: string | null;
  etymology: string | null;
  first_letter: string | null;
  in_a_sentence: string | null;
  number_of_letters: number | null;
  equivalents: string[] | null;
  difficulty: string | null;
  created_at: string;
}

interface SearchResponse {
  words: WordEntry[];
  stats: {
    total: number;
    withTheme: number;
    withClues: number;
  };
}

async function handler(req: NextApiRequest, res: NextApiResponse<SearchResponse | { error: string }>) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { q, type = 'word', limit = '50' } = req.query;

  if (!q || typeof q !== 'string') {
    return res.status(400).json({ error: 'Search query (q) is required' });
  }

  const searchType = type as string;
  const maxResults = Math.min(parseInt(limit as string) || 50, 100);

  try {
    let query = supabase
      .from('words')
      .select('*')
      .order('date', { ascending: false, nullsFirst: false })
      .limit(maxResults);

    switch (searchType) {
      case 'word':
        // Case-insensitive word search
        query = query.ilike('word', `%${q}%`);
        break;
      case 'theme':
        // Case-insensitive theme search
        query = query.ilike('theme', `%${q}%`);
        break;
      case 'date':
        // Date prefix search (e.g., "2026-03" for March 2026)
        query = query.gte('date', q).lte('date', `${q}-31`);
        break;
      default:
        return res.status(400).json({ error: `Invalid search type: ${searchType}` });
    }

    const { data: words, error } = await query;

    if (error) {
      console.error('[/api/admin/words-search] Error:', error);
      return res.status(500).json({ error: 'Search failed' });
    }

    // Calculate stats
    const withTheme = words?.filter(w => w.theme) || [];
    const withClues = words?.filter(w => 
      w.definition && 
      w.etymology && 
      w.in_a_sentence && 
      w.equivalents && 
      w.equivalents.length > 0
    ) || [];

    const stats = {
      total: words?.length || 0,
      withTheme: withTheme.length,
      withClues: withClues.length,
    };

    console.log(`[/api/admin/words-search] Found ${stats.total} words for q="${q}" type="${searchType}"`);

    return res.status(200).json({ 
      words: words || [], 
      stats 
    });

  } catch (error) {
    console.error('[/api/admin/words-search] Unexpected error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export default withAdminCors(handler);
