import { createClient } from '@supabase/supabase-js';
import { env } from '../env.server';

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

export interface Player {
  id: string;
  created_at: string;
  last_active: string;
  display_name: string | null;
  is_anonymous: boolean;
  metadata: Record<string, unknown>;
}

/**
 * Ensure a player exists in the database
 * @param playerId The player ID to ensure exists
 * @returns The player ID if successful
 * @throws Error if player creation fails
 */
export async function ensurePlayerExists(playerId: string): Promise<string> {
  try {
    const { data, error } = await supabase
      .rpc('ensure_player_exists', { p_id: playerId });

    if (error) {
      console.error('[ensurePlayerExists] Failed to ensure player:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('[ensurePlayerExists] Unexpected error:', error);
    throw error;
  }
}

/**
 * Get or create a unique player ID
 * @returns The player ID or undefined if running on server
 */
export function getPlayerId(): string | undefined {
  // Check if we're in a browser environment
  if (typeof window === 'undefined') {
    console.log('[getPlayerId] Running on server, no player ID available');
    return undefined;
  }

  try {
    const storedId = localStorage.getItem('playerId');
    if (storedId) {
      console.log('[getPlayerId] Using existing player ID');
      return storedId;
    }

    console.log('[getPlayerId] Generating new player ID');
    const newId = crypto.randomUUID();
    localStorage.setItem('playerId', newId);
    console.log('[getPlayerId] New player ID stored successfully');
    return newId;
  } catch (error) {
    console.error('[getPlayerId] Failed to access localStorage:', error);
    // Return a temporary ID if localStorage is not available
    const tempId = crypto.randomUUID();
    console.log('[getPlayerId] Using temporary ID due to localStorage error');
    return tempId;
  }
}

/**
 * Get a player by ID
 * @param playerId The player ID to get
 * @returns The player data or null if not found
 */
export async function getPlayer(playerId: string): Promise<Player | null> {
  try {
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .eq('id', playerId)
      .single();

    if (error) {
      console.error('[getPlayer] Failed to get player:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('[getPlayer] Unexpected error:', error);
    return null;
  }
}

/**
 * Update a player's metadata
 * @param playerId The player ID to update
 * @param metadata The metadata to update
 * @returns True if successful, false otherwise
 */
export async function updatePlayerMetadata(
  playerId: string,
  metadata: Record<string, unknown>
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('players')
      .update({ metadata })
      .eq('id', playerId);

    if (error) {
      console.error('[updatePlayerMetadata] Failed to update player:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[updatePlayerMetadata] Unexpected error:', error);
    return false;
  }
} 