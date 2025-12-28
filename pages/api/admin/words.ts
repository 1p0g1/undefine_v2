/**
 * Admin API: /api/admin/words
 * 
 * GET  /api/admin/words?date=2025-01-13  - Get word for a specific date
 * GET  /api/admin/words?id=uuid          - Get word by ID
 * POST /api/admin/words                   - Create or update a word
 * DELETE /api/admin/words?id=uuid         - Delete a word
 * 
 * POST body:
 * {
 *   id?: string,           // If provided, updates existing word
 *   word: string,          // The word (required)
 *   date: string,          // Scheduled date YYYY-MM-DD (required)
 *   definition: string,    // D clue
 *   etymology: string,     // E clue
 *   first_letter: string,  // F clue (auto-derived if not provided)
 *   in_a_sentence: string, // I clue
 *   number_of_letters: number, // N clue (auto-derived if not provided)
 *   equivalents: string[], // E clue (synonyms)
 *   theme: string,         // Weekly theme
 *   difficulty: string     // Difficulty rating
 * }
 */

import { createClient } from '@supabase/supabase-js';
import type { NextApiRequest, NextApiResponse } from 'next';
import { env } from '@/src/env.server';
import { withAdminCors } from '@/lib/withAdminAuth';

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

interface WordData {
  id?: string;
  word: string;
  date: string;
  definition?: string;
  etymology?: string;
  first_letter?: string;
  in_a_sentence?: string;
  number_of_letters?: number;
  equivalents?: string[];
  theme?: string;
  difficulty?: string;
}

interface WordResponse {
  id: string;
  word: string;
  date: string | null;
  definition: string | null;
  etymology: string | null;
  first_letter: string | null;
  in_a_sentence: string | null;
  number_of_letters: number | null;
  equivalents: string[] | null;
  theme: string | null;
  difficulty: string | null;
  created_at: string;
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req;

  try {
    switch (method) {
      case 'GET':
        return handleGet(req, res);
      case 'POST':
        return handlePost(req, res);
      case 'DELETE':
        return handleDelete(req, res);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('[/api/admin/words] Unexpected error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function handleGet(req: NextApiRequest, res: NextApiResponse) {
  const { date, id } = req.query;

  if (id) {
    // Get by ID
    const { data, error } = await supabase
      .from('words')
      .select('*')
      .eq('id', id as string)
      .single();

    if (error) {
      console.error('[/api/admin/words] Error fetching word by ID:', error);
      return res.status(404).json({ error: 'Word not found' });
    }

    return res.status(200).json({ word: data });
  }

  if (date) {
    // Get by date
    const { data, error } = await supabase
      .from('words')
      .select('*')
      .eq('date', date as string)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
      console.error('[/api/admin/words] Error fetching word by date:', error);
      return res.status(500).json({ error: 'Failed to fetch word' });
    }

    return res.status(200).json({ word: data || null });
  }

  return res.status(400).json({ error: 'Either date or id query param required' });
}

async function handlePost(req: NextApiRequest, res: NextApiResponse) {
  const body = req.body as WordData;

  if (!body.word || !body.date) {
    return res.status(400).json({ error: 'word and date are required' });
  }

  // Auto-derive first_letter and number_of_letters if not provided
  const wordUpper = body.word.toUpperCase().trim();
  const first_letter = body.first_letter || wordUpper[0];
  const number_of_letters = body.number_of_letters || wordUpper.length;

  const wordData = {
    word: wordUpper,
    date: body.date,
    definition: body.definition || null,
    etymology: body.etymology || null,
    first_letter,
    in_a_sentence: body.in_a_sentence || null,
    number_of_letters,
    equivalents: body.equivalents || null,
    theme: body.theme || null,
    difficulty: body.difficulty || null
  };

  if (body.id) {
    // Update existing word
    const { data, error } = await supabase
      .from('words')
      .update(wordData)
      .eq('id', body.id)
      .select()
      .single();

    if (error) {
      console.error('[/api/admin/words] Error updating word:', error);
      return res.status(500).json({ error: 'Failed to update word', details: error.message });
    }

    console.log('[/api/admin/words] Updated word:', data.id);
    return res.status(200).json({ word: data, action: 'updated' });

  } else {
    // Check if word already exists for this date
    const { data: existing } = await supabase
      .from('words')
      .select('id')
      .eq('date', body.date)
      .single();

    if (existing) {
      // Update existing word for this date
      const { data, error } = await supabase
        .from('words')
        .update(wordData)
        .eq('id', existing.id)
        .select()
        .single();

      if (error) {
        console.error('[/api/admin/words] Error updating existing word:', error);
        return res.status(500).json({ error: 'Failed to update word', details: error.message });
      }

      console.log('[/api/admin/words] Updated existing word for date:', data.id);
      return res.status(200).json({ word: data, action: 'updated' });
    }

    // Create new word
    const { data, error } = await supabase
      .from('words')
      .insert(wordData)
      .select()
      .single();

    if (error) {
      console.error('[/api/admin/words] Error creating word:', error);
      return res.status(500).json({ error: 'Failed to create word', details: error.message });
    }

    console.log('[/api/admin/words] Created new word:', data.id);
    return res.status(201).json({ word: data, action: 'created' });
  }
}

async function handleDelete(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'id query param required' });
  }

  // Check for existing game sessions
  const { data: sessions } = await supabase
    .from('game_sessions')
    .select('id')
    .eq('word_id', id as string)
    .limit(1);

  if (sessions && sessions.length > 0) {
    return res.status(400).json({ 
      error: 'Cannot delete word with existing game sessions',
      hint: 'Archive the word instead or delete game sessions first'
    });
  }

  const { error } = await supabase
    .from('words')
    .delete()
    .eq('id', id as string);

  if (error) {
    console.error('[/api/admin/words] Error deleting word:', error);
    return res.status(500).json({ error: 'Failed to delete word', details: error.message });
  }

  console.log('[/api/admin/words] Deleted word:', id);
  return res.status(200).json({ success: true, deleted: id });
}

export default withAdminCors(handler);

