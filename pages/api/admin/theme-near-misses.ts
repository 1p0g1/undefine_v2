/**
 * Admin API: /api/admin/theme-near-misses
 * 
 * GET /api/admin/theme-near-misses?theme=X&minConfidence=50&maxConfidence=77
 *   Returns rejected guesses that scored close to the match threshold.
 *   These are candidates for alias expansion or threshold adjustment.
 * 
 * Query params:
 *   - theme (optional): filter by specific theme
 *   - minConfidence (optional, default 50): minimum confidence %
 *   - maxConfidence (optional, default 77): maximum confidence %
 *   - limit (optional, default 50): max results
 * 
 * @see docs/THEME_SCORING_IMPROVEMENT_PLAN.md (Phase 5)
 */

import { createClient } from '@supabase/supabase-js';
import type { NextApiRequest, NextApiResponse } from 'next';
import { env } from '@/src/env.server';
import { withAdminCors } from '@/lib/withAdminAuth';

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

interface NearMiss {
  theme: string;
  guess: string;
  confidencePercentage: number;
  matchingMethod: string | null;
  similarityScore: number | null;
  attemptCount: number;
  playerCount: number;
  latestAttempt: string;
}

interface NearMissResponse {
  nearMisses: NearMiss[];
  total: number;
  filters: {
    theme: string | null;
    minConfidence: number;
    maxConfidence: number;
  };
  summary: {
    uniqueGuesses: number;
    uniqueThemes: number;
    avgConfidence: number;
    topCandidatesForAlias: string[];
  };
}

async function handler(
  req: NextApiRequest,
  res: NextApiResponse<NearMissResponse | { error: string }>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const themeFilter = req.query.theme as string | undefined;
    const minConfidence = parseInt(req.query.minConfidence as string) || 50;
    const maxConfidence = parseInt(req.query.maxConfidence as string) || 77;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);

    let query = supabase
      .from('theme_attempts')
      .select('theme, guess, confidence_percentage, matching_method, similarity_score, player_id, attempt_date')
      .eq('is_correct', false)
      .not('confidence_percentage', 'is', null)
      .gte('confidence_percentage', minConfidence)
      .lte('confidence_percentage', maxConfidence)
      .order('confidence_percentage', { ascending: false });

    if (themeFilter) {
      query = query.eq('theme', themeFilter);
    }

    const { data: attempts, error } = await query;

    if (error) {
      console.error('[theme-near-misses] Database error:', error);
      return res.status(500).json({ error: 'Database query failed' });
    }

    if (!attempts || attempts.length === 0) {
      return res.status(200).json({
        nearMisses: [],
        total: 0,
        filters: { theme: themeFilter || null, minConfidence, maxConfidence },
        summary: {
          uniqueGuesses: 0,
          uniqueThemes: 0,
          avgConfidence: 0,
          topCandidatesForAlias: [],
        },
      });
    }

    // Group by theme + normalized guess to aggregate duplicates
    const grouped = new Map<string, {
      theme: string;
      guess: string;
      maxConfidence: number;
      method: string | null;
      similarity: number | null;
      players: Set<string>;
      count: number;
      latestDate: string;
    }>();

    for (const attempt of attempts) {
      const normalizedGuess = (attempt.guess || '').toLowerCase().trim();
      const key = `${attempt.theme}|||${normalizedGuess}`;
      
      const existing = grouped.get(key);
      if (existing) {
        existing.count++;
        existing.players.add(attempt.player_id);
        if ((attempt.confidence_percentage || 0) > existing.maxConfidence) {
          existing.maxConfidence = attempt.confidence_percentage || 0;
          existing.method = attempt.matching_method;
          existing.similarity = attempt.similarity_score;
        }
        if (attempt.attempt_date > existing.latestDate) {
          existing.latestDate = attempt.attempt_date;
        }
      } else {
        grouped.set(key, {
          theme: attempt.theme,
          guess: attempt.guess || '',
          maxConfidence: attempt.confidence_percentage || 0,
          method: attempt.matching_method,
          similarity: attempt.similarity_score,
          players: new Set([attempt.player_id]),
          count: 1,
          latestDate: attempt.attempt_date,
        });
      }
    }

    // Convert to sorted array
    const nearMisses: NearMiss[] = Array.from(grouped.values())
      .map(g => ({
        theme: g.theme,
        guess: g.guess,
        confidencePercentage: g.maxConfidence,
        matchingMethod: g.method,
        similarityScore: g.similarity,
        attemptCount: g.count,
        playerCount: g.players.size,
        latestAttempt: g.latestDate,
      }))
      .sort((a, b) => {
        // Sort by confidence desc, then by attempt count desc
        if (b.confidencePercentage !== a.confidencePercentage) {
          return b.confidencePercentage - a.confidencePercentage;
        }
        return b.attemptCount - a.attemptCount;
      })
      .slice(0, limit);

    const uniqueThemes = new Set(nearMisses.map(n => n.theme));
    const avgConfidence = nearMisses.length > 0
      ? nearMisses.reduce((sum, n) => sum + n.confidencePercentage, 0) / nearMisses.length
      : 0;

    // Top candidates: guesses with highest confidence AND multiple players
    const topCandidates = nearMisses
      .filter(n => n.confidencePercentage >= 65 && n.playerCount >= 2)
      .slice(0, 5)
      .map(n => `"${n.guess}" for "${n.theme}" (${n.confidencePercentage}%, ${n.playerCount} players)`);

    res.status(200).json({
      nearMisses,
      total: nearMisses.length,
      filters: { theme: themeFilter || null, minConfidence, maxConfidence },
      summary: {
        uniqueGuesses: nearMisses.length,
        uniqueThemes: uniqueThemes.size,
        avgConfidence: Math.round(avgConfidence),
        topCandidatesForAlias: topCandidates,
      },
    });
  } catch (error) {
    console.error('[theme-near-misses] Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export default withAdminCors(handler);
