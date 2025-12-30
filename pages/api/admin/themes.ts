/**
 * Admin API: /api/admin/themes
 * 
 * GET /api/admin/themes
 *   Returns all unique themes and their usage stats
 * 
 * POST /api/admin/themes/assign
 *   Assign a theme to multiple words (by date range or word IDs)
 * 
 * Response for GET:
 * {
 *   themes: [
 *     { theme: "Natural World", wordCount: 7, weeks: ["2025-01-06", "2025-01-13"] },
 *     ...
 *   ],
 *   total: 12
 * }
 */

import { createClient } from '@supabase/supabase-js';
import type { NextApiRequest, NextApiResponse } from 'next';
import { env } from '@/src/env.server';
import { withAdminCors } from '@/lib/withAdminAuth';

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

interface ThemeStats {
  theme: string;
  wordCount: number;
  weeks: string[];
  firstDate: string;
  lastDate: string;
}

interface ThemesResponse {
  themes: ThemeStats[];
  total: number;
}

function getMonday(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split('T')[0];
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req;

  try {
    switch (method) {
      case 'GET':
        return handleGet(req, res);
      case 'POST':
        return handlePost(req, res);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('[/api/admin/themes] Unexpected error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function handleGet(req: NextApiRequest, res: NextApiResponse<ThemesResponse | { error: string }>) {
  // Fetch all words with themes
  const { data: words, error } = await supabase
    .from('words')
    .select('theme, date')
    .not('theme', 'is', null)
    .not('date', 'is', null)
    .order('date', { ascending: true });

  if (error) {
    console.error('[/api/admin/themes] Error fetching themes:', error);
    return res.status(500).json({ error: 'Failed to fetch themes' });
  }

  // Aggregate by theme
  const themeMap = new Map<string, { dates: string[]; weeks: Set<string> }>();

  for (const word of words || []) {
    if (!word.theme || !word.date) continue;

    if (!themeMap.has(word.theme)) {
      themeMap.set(word.theme, { dates: [], weeks: new Set() });
    }

    const entry = themeMap.get(word.theme)!;
    entry.dates.push(word.date);
    entry.weeks.add(getMonday(new Date(word.date)));
  }

  // Build response
  const themes: ThemeStats[] = [];
  Array.from(themeMap.entries()).forEach(([theme, data]) => {
    const sortedDates = data.dates.sort();
    themes.push({
      theme,
      wordCount: data.dates.length,
      weeks: Array.from(data.weeks).sort(),
      firstDate: sortedDates[0],
      lastDate: sortedDates[sortedDates.length - 1]
    });
  });

  // Sort by most recent first
  themes.sort((a, b) => b.lastDate.localeCompare(a.lastDate));

  return res.status(200).json({
    themes,
    total: themes.length
  });
}

async function handlePost(req: NextApiRequest, res: NextApiResponse) {
  const { theme, wordIds, startDate, endDate } = req.body;

  if (!theme) {
    return res.status(400).json({ error: 'theme is required' });
  }

  // Option 1: Assign by word IDs
  if (wordIds && Array.isArray(wordIds) && wordIds.length > 0) {
    const { data, error } = await supabase
      .from('words')
      .update({ theme })
      .in('id', wordIds)
      .select('id, word, date');

    if (error) {
      console.error('[/api/admin/themes] Error assigning theme by IDs:', error);
      return res.status(500).json({ error: 'Failed to assign theme', details: error.message });
    }

    console.log('[/api/admin/themes] Assigned theme to words:', { theme, count: data?.length });
    return res.status(200).json({
      success: true,
      theme,
      updated: data?.length || 0,
      words: data
    });
  }

  // Option 2: Assign by date range
  if (startDate && endDate) {
    const { data, error } = await supabase
      .from('words')
      .update({ theme })
      .gte('date', startDate)
      .lte('date', endDate)
      .select('id, word, date');

    if (error) {
      console.error('[/api/admin/themes] Error assigning theme by date range:', error);
      return res.status(500).json({ error: 'Failed to assign theme', details: error.message });
    }

    console.log('[/api/admin/themes] Assigned theme to date range:', { theme, startDate, endDate, count: data?.length });
    return res.status(200).json({
      success: true,
      theme,
      startDate,
      endDate,
      updated: data?.length || 0,
      words: data
    });
  }

  return res.status(400).json({ error: 'Either wordIds or startDate/endDate range required' });
}

export default withAdminCors(handler);

