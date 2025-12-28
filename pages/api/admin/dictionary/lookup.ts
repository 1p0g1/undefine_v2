/**
 * Admin API: GET /api/admin/dictionary/lookup
 * 
 * Search the dictionary table for word definitions and suggestions.
 * 
 * Query params:
 *   - q: Search query (partial word match)
 *   - word: Exact word lookup (normalized)
 *   - limit: Max results (default 20)
 * 
 * Response:
 * {
 *   results: [
 *     {
 *       id: 1234,
 *       word: "Canyon",
 *       normalized_word: "canyon",
 *       definition: "A deep gorge...",
 *       etymology: "From Spanish cañón...",
 *       part_of_speech: "n.",
 *       lex_rank: 15234
 *     },
 *     ...
 *   ],
 *   total: 5,
 *   query: "canyon"
 * }
 */

import { createClient } from '@supabase/supabase-js';
import type { NextApiRequest, NextApiResponse } from 'next';
import { env } from '@/src/env.server';
import { withAdminCors } from '@/lib/withAdminAuth';

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

interface DictionaryEntry {
  id: number;
  word: string;
  normalized_word: string;
  definition: string | null;
  etymology: string | null;
  part_of_speech: string | null;
  first_letter: string;
  number_of_letters: number;
  lex_rank: number;
}

interface LookupResponse {
  results: DictionaryEntry[];
  total: number;
  query: string;
  neighbours?: {
    before: DictionaryEntry | null;
    after: DictionaryEntry | null;
  };
}

async function handler(req: NextApiRequest, res: NextApiResponse<LookupResponse | { error: string }>) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { q, word, limit: limitParam } = req.query;
    const limit = Math.min(parseInt(limitParam as string) || 20, 100);

    // Exact word lookup
    if (word) {
      const normalized = (word as string).toLowerCase().trim();
      
      const { data: entry, error } = await supabase
        .from('dictionary')
        .select('*')
        .eq('normalized_word', normalized)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('[/api/admin/dictionary/lookup] Error:', error);
        return res.status(500).json({ error: 'Failed to lookup word' });
      }

      if (!entry) {
        return res.status(200).json({
          results: [],
          total: 0,
          query: normalized
        });
      }

      // Get neighbours by lex_rank
      const { data: neighbours } = await supabase
        .from('dictionary')
        .select('*')
        .gte('lex_rank', entry.lex_rank - 1)
        .lte('lex_rank', entry.lex_rank + 1)
        .order('lex_rank', { ascending: true });

      const before = neighbours?.find(n => n.lex_rank === entry.lex_rank - 1) || null;
      const after = neighbours?.find(n => n.lex_rank === entry.lex_rank + 1) || null;

      return res.status(200).json({
        results: [entry],
        total: 1,
        query: normalized,
        neighbours: { before, after }
      });
    }

    // Partial search
    if (q) {
      const searchTerm = (q as string).toLowerCase().trim();
      
      if (searchTerm.length < 2) {
        return res.status(400).json({ error: 'Search query must be at least 2 characters' });
      }

      // Search by prefix (most useful for autocomplete)
      const { data: results, error } = await supabase
        .from('dictionary')
        .select('*')
        .ilike('normalized_word', `${searchTerm}%`)
        .order('lex_rank', { ascending: true })
        .limit(limit);

      if (error) {
        console.error('[/api/admin/dictionary/lookup] Search error:', error);
        return res.status(500).json({ error: 'Failed to search dictionary' });
      }

      // If no prefix matches, try contains
      if (!results || results.length === 0) {
        const { data: containsResults, error: containsError } = await supabase
          .from('dictionary')
          .select('*')
          .ilike('normalized_word', `%${searchTerm}%`)
          .order('lex_rank', { ascending: true })
          .limit(limit);

        if (containsError) {
          console.error('[/api/admin/dictionary/lookup] Contains search error:', containsError);
          return res.status(500).json({ error: 'Failed to search dictionary' });
        }

        return res.status(200).json({
          results: containsResults || [],
          total: containsResults?.length || 0,
          query: searchTerm
        });
      }

      return res.status(200).json({
        results,
        total: results.length,
        query: searchTerm
      });
    }

    return res.status(400).json({ error: 'Either q (search) or word (exact) query param required' });

  } catch (error) {
    console.error('[/api/admin/dictionary/lookup] Unexpected error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export default withAdminCors(handler);

