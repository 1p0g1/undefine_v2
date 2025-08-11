import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { env } from '../../../src/env.server';
import { withCors } from '../../../lib/withCors';

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

interface ThemeLeaderboardEntry {
  player_id: string;
  display_name: string | null;
  avg_similarity: number;
  attempts: number;
}

export default withCors(async function handler(
  req: NextApiRequest,
  res: NextApiResponse<{ entries: ThemeLeaderboardEntry[] } | { error: string }>
) {
  try {
    const week_key = (req.query.week_key as string) || new Date().toISOString().slice(0,10);
    const min_attempts = Number(req.query.min_attempts || 1);

    // Derive ISO week_key if a date was passed instead of explicit week key
    const derivedWeek = week_key.includes('W')
      ? week_key
      : ((): string => {
          const d = new Date(week_key);
          // ISO week number
          const target = new Date(d.valueOf());
          const dayNr = (d.getDay() + 6) % 7; // Monday=0
          target.setDate(target.getDate() - dayNr + 3);
          const firstThursday = new Date(target.getFullYear(),0,4);
          const weekNo = 1 + Math.round(((target.getTime() - firstThursday.getTime()) / 86400000 - 3 + ((firstThursday.getDay()+6)%7)) / 7);
          return `${target.getFullYear()}-W${String(weekNo).padStart(2,'0')}`;
        })();

    const { data, error } = await supabase.rpc('get_theme_leaderboard', {
      p_week_key: derivedWeek,
      p_min_attempts: min_attempts
    });

    if (error) {
      // Fallback: compute via SQL if RPC missing
      const { data: rows, error: qErr } = await supabase
        .from('theme_attempts')
        .select('player_id, similarity_percent, week_key, user_stats:player_id(display_name)')
        .eq('week_key', derivedWeek);

      if (qErr) return res.status(500).json({ error: qErr.message });

      type Row = { player_id: string; similarity_percent: number; user_stats?: { display_name: string | null } | null };
      const agg = new Map<string, { total: number; count: number; name: string | null }>();
      for (const r of (rows as unknown as Row[]) || []) {
        const cur = agg.get(r.player_id) || { total: 0, count: 0, name: r.user_stats?.display_name || null };
        cur.total += Number(r.similarity_percent || 0);
        cur.count += 1;
        cur.name = r.user_stats?.display_name ?? cur.name;
        agg.set(r.player_id, cur);
      }

      const entries: ThemeLeaderboardEntry[] = Array.from(agg.entries())
        .map(([player_id, v]) => ({
          player_id,
          display_name: v.name,
          avg_similarity: v.count ? +(v.total / v.count).toFixed(2) : 0,
          attempts: v.count
        }))
        .filter(e => e.attempts >= min_attempts)
        .sort((a, b) => b.avg_similarity - a.avg_similarity);

      return res.status(200).json({ entries });
    }

    return res.status(200).json({ entries: (data as any[]) as ThemeLeaderboardEntry[] });
  } catch (e: any) {
    return res.status(500).json({ error: e.message || 'Failed to load theme leaderboard' });
  }
}); 