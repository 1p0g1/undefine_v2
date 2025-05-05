/**
 * Game session repository for Un-Define v2
 */

import { supabase } from '../config/SupabaseClient.js';
import { GameSessionEntry } from '../types/database.js';
import { v4 as generateUUID } from 'uuid';
import { logger } from '../utils/logger.js';
import { initializeClueStatus, getRevealedClues, updateClueStatus } from '../utils/clueUtils.js';
import { ensurePlayerStatsExists } from './userStatsRepository.js';

/**
 * Create a new game session
 */
export async function createGameSession(word: string, playerId: string): Promise<GameSessionEntry> {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  // Ensure player stats row exists before creating session
  await ensurePlayerStatsExists(playerId);

  const gameSession: any = {
    id: generateUUID(),
    word: word,
    player_id: playerId,
    guesses: [],
    revealed_clues: [],
    clue_status: initializeClueStatus(),
    is_complete: false,
    is_won: false,
    created_at: new Date().toISOString(),
    start_time: new Date().toISOString(),
    end_time: null,
  };

  const { data, error } = await supabase
    .from('game_sessions')
    .insert(gameSession)
    .select()
    .single();

  if (error) {
    logger.error('Error creating game session:', { message: error.message });
    throw new Error(`Failed to create game session: ${error.message}`);
  }

  return data;
}

/**
 * Get a game session by ID
 */
export async function getGameSessionById(id: string): Promise<GameSessionEntry> {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  const { data, error } = await supabase.from('game_sessions').select('*').eq('id', id).single();

  if (error) {
    logger.error('Error fetching game session:', { message: error.message });
    throw new Error(`Failed to fetch game session: ${error.message}`);
  }

  return data;
}

/**
 * Update a game session
 */
export async function updateGameSession(
  id: string,
  updates: Partial<GameSessionEntry>
): Promise<GameSessionEntry> {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  const { data, error } = await supabase
    .from('game_sessions')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    logger.error('Error updating game session:', { message: error.message });
    throw new Error(`Failed to update game session: ${error.message}`);
  }

  return data;
}

/**
 * Add a guess to a game session and update clue status
 */
export async function addGuess(
  gameSessionId: string,
  guess: string,
  isCorrect: boolean
): Promise<GameSessionEntry> {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  const gameSession = await getGameSessionById(gameSessionId);
  const updatedGuesses = [...gameSession.guesses, guess];

  // Get the clues that should be revealed based on guess count
  const revealedClues = getRevealedClues(updatedGuesses.length);

  // Update clue status based on revealed clues
  const updatedClueStatus = updateClueStatus(gameSession.clue_status, revealedClues);

  // Check if game is over
  const isComplete = isCorrect || updatedGuesses.length >= 6;

  return updateGameSession(gameSessionId, {
    guesses: updatedGuesses,
    revealed_clues: revealedClues,
    clue_status: updatedClueStatus,
    is_complete: isComplete,
    is_won: isCorrect,
    end_time: isComplete ? new Date().toISOString() : null,
  });
}

/**
 * Check if a player has an active game session for today's word
 */
export async function getActiveSessionForPlayer(
  playerId: string,
  word: string
): Promise<GameSessionEntry | null> {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  const { data, error } = await supabase
    .from('game_sessions')
    .select('*')
    .eq('player_id', playerId)
    .eq('word', word)
    .eq('is_complete', false)
    .single();

  if (error && error.code !== 'PGRST116') {
    // PGRST116 is "no rows returned"
    logger.error('Error checking active session:', { message: error.message });
    throw new Error(`Failed to check active session: ${error.message}`);
  }

  return data || null;
}
