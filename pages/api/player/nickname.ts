/**
 * @fileoverview
 * Next.js API route for updating player display names (nicknames) in Supabase.
 * 
 * @api {post} /api/player/nickname Update player nickname
 * @apiBody {string} player_id UUID of the player
 * @apiBody {string} display_name The desired display name (1-20 characters)
 * @apiSuccess {Object} response
 * @apiSuccess {boolean} response.success Whether the update was successful
 * @apiSuccess {string} response.display_name The updated display name
 * @apiSuccess {string} response.player_id The player ID
 * @apiError {Object} error Error response
 * @apiError {string} error.error Error message
 * @apiError {string} [error.details] Additional error details if available
 */

import { createClient } from '@supabase/supabase-js';
import type { NextApiRequest, NextApiResponse } from 'next';
import { env } from '@/src/env.server';
import { validate as isUUID } from 'uuid';
import { withCors } from '@/lib/withCors';

// Validate critical environment variables
if (!env.SUPABASE_URL) {
  console.error('❌ Missing SUPABASE_URL in env');
  throw new Error('Missing SUPABASE_URL');
}
if (!env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY in env');
  throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY');
}

// Log environment validation success
console.log('[/api/player/nickname] Environment validation passed:', {
  hasSupabaseUrl: !!env.SUPABASE_URL,
  hasServiceRoleKey: !!env.SUPABASE_SERVICE_ROLE_KEY,
  nodeEnv: env.NODE_ENV
});

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

/**
 * Response interface for nickname update endpoint
 */
interface NicknameResponse {
  success: boolean;
  display_name: string;
  player_id: string;
}

/**
 * Request interface for nickname update endpoint
 */
interface NicknameRequest {
  player_id: string;
  display_name: string;
}

/**
 * Basic profanity filter - checks against common inappropriate words
 * This is a simple implementation for MVP. In production, consider using
 * a more comprehensive service like the profanity-js library
 */
function containsProfanity(text: string): boolean {
  const profanityList = [
    'fuck', 'shit', 'damn', 'hell', 'bitch', 'ass', 'crap',
    'piss', 'cock', 'dick', 'pussy', 'bastard', 'slut', 'whore'
    // Add more as needed, but keep it reasonable for a word game
  ];
  
  const lowercaseText = text.toLowerCase();
  return profanityList.some(word => lowercaseText.includes(word));
}

/**
 * Validate display name according to business rules
 */
function validateDisplayName(displayName: string): { isValid: boolean; error?: string } {
  // Trim whitespace
  const trimmed = displayName.trim();
  
  // Check length - minimum 1, maximum 20 characters
  if (trimmed.length === 0) {
    return { isValid: false, error: 'Display name cannot be empty' };
  }
  
  if (trimmed.length > 20) {
    return { isValid: false, error: 'Display name must be 20 characters or fewer' };
  }
  
  // Check for profanity
  if (containsProfanity(trimmed)) {
    return { isValid: false, error: 'Display name contains inappropriate content' };
  }
  
  // Check for only whitespace/special characters
  if (!/^[a-zA-Z0-9\s\-_.']+$/.test(trimmed)) {
    return { isValid: false, error: 'Display name can only contain letters, numbers, spaces, hyphens, underscores, apostrophes, and periods' };
  }
  
  return { isValid: true };
}

/**
 * Check rate limiting for nickname changes
 * Players can only change nickname once per hour to prevent abuse
 */
async function checkRateLimit(playerId: string): Promise<{ isAllowed: boolean; error?: string }> {
  try {
    const { data: player, error } = await supabase
      .from('players')
      .select('last_nickname_change')
      .eq('id', playerId)
      .single();

    if (error) {
      console.error('[checkRateLimit] Error fetching player:', error);
      // If we can't check rate limit, allow the change but log the issue
      return { isAllowed: true };
    }

    // If no previous change timestamp, allow the change
    if (!player?.last_nickname_change) {
      return { isAllowed: true };
    }

    // Check if last change was within the last hour
    const lastChange = new Date(player.last_nickname_change);
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    if (lastChange > oneHourAgo) {
      const minutesRemaining = Math.ceil((lastChange.getTime() + 60 * 60 * 1000 - Date.now()) / (60 * 1000));
      return { 
        isAllowed: false, 
        error: `You can only change your nickname once per hour. Please wait ${minutesRemaining} more minutes.` 
      };
    }

    return { isAllowed: true };
  } catch (error) {
    console.error('[checkRateLimit] Unexpected error:', error);
    // On error, allow the change but log the issue
    return { isAllowed: true };
  }
}

/**
 * Update player display name in the database
 */
async function updatePlayerDisplayName(playerId: string, displayName: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Ensure player exists first
    const { data: player, error: playerError } = await supabase
      .from('players')
      .select('id, display_name')
      .eq('id', playerId)
      .single();

    if (playerError || !player) {
      console.error('[updatePlayerDisplayName] Player not found:', playerError);
      return { success: false, error: 'Player not found' };
    }

    // Update the display name and timestamp
    const { error: updateError } = await supabase
      .from('players')
      .update({
        display_name: displayName.trim(),
        last_active: new Date().toISOString(),
        last_nickname_change: new Date().toISOString()
      })
      .eq('id', playerId);

    if (updateError) {
      console.error('[updatePlayerDisplayName] Failed to update display name:', updateError);
      return { success: false, error: 'Failed to update display name' };
    }

    console.log('[updatePlayerDisplayName] Successfully updated display name for player:', playerId, 'to:', displayName.trim());
    return { success: true };
  } catch (error) {
    console.error('[updatePlayerDisplayName] Unexpected error:', error);
    return { success: false, error: 'Internal server error' };
  }
}

/**
 * Main API handler for nickname updates
 */
export default withCors(async function handler(
  req: NextApiRequest,
  res: NextApiResponse<NicknameResponse | { error: string; details?: any }>
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      error: 'Method not allowed',
      details: 'This endpoint only accepts POST requests' 
    });
  }

  try {
    // Parse and validate request body
    const { player_id, display_name }: NicknameRequest = req.body;

    // Validate required fields
    if (!player_id || !display_name) {
      return res.status(400).json({
        error: 'Missing required fields',
        details: 'Both player_id and display_name are required'
      });
    }

    // Validate player_id format
    if (!isUUID(player_id)) {
      return res.status(400).json({
        error: 'Invalid player ID format',
        details: 'Player ID must be a valid UUID'
      });
    }

    // Validate display name
    const validation = validateDisplayName(display_name);
    if (!validation.isValid) {
      return res.status(400).json({
        error: 'Invalid display name',
        details: validation.error
      });
    }

    // Check rate limiting
    const rateLimit = await checkRateLimit(player_id);
    if (!rateLimit.isAllowed) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        details: rateLimit.error
      });
    }

    // Update the display name
    const updateResult = await updatePlayerDisplayName(player_id, display_name);
    if (!updateResult.success) {
      return res.status(500).json({
        error: 'Failed to update nickname',
        details: updateResult.error
      });
    }

    // Success response
    return res.status(200).json({
      success: true,
      display_name: display_name.trim(),
      player_id: player_id
    });

  } catch (error) {
    console.error('[/api/player/nickname] Unexpected error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
}); 