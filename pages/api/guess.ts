/**
 * @fileoverview
 * Next.js API route for submitting a guess and updating game state in Supabase.
 * 
 * @api {post} /api/guess Submit a guess
 * @apiBody {string} player_id UUID of the player
 * @apiBody {string} guess The word being guessed
 * @apiBody {string} gameId Current game session ID
 * @apiSuccess {Object} response
 * @apiSuccess {boolean} response.isCorrect Whether the guess was correct
 * @apiSuccess {string} response.guess The submitted guess
 * @apiSuccess {boolean} response.isFuzzy Whether the guess was a fuzzy match
 * @apiSuccess {number[]} response.fuzzyPositions Positions of fuzzy matches
 * @apiSuccess {boolean} response.gameOver Whether the game is complete
 * @apiSuccess {Object} response.stats Player statistics
 * @apiError {Object} error Error response
 * @apiError {string} error.error Error message
 * @apiError {string} [error.details] Additional error details if available
 */

import { createClient } from '@supabase/supabase-js';
import type { NextApiRequest, NextApiResponse } from 'next';
import { env } from '@/src/env.server';
import { validate as isUUID } from 'uuid';
import { ClueKey, CLUE_SEQUENCE } from '@/shared-types/src/clues';
import { withCors } from '@/lib/withCors';
import { submitGuess } from '@/src/game/guess';
import type { GuessRequest, GuessResponse } from '@/shared-types/src/game';
import type { GameSession } from '@/src/types/guess';
import { normalizeText } from '@/src/utils/text';
import { calculateScore, type ScoreResult } from '@/shared-types/src/scoring';
import { ensurePlayerExists } from '@/src/utils/player';

// Validate critical environment variables
if (!env.SUPABASE_URL) {
  console.error('❌ Missing SUPABASE_URL in env');
  throw new Error('Missing SUPABASE_URL');
}
if (!env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY in env');
  throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY');
}
if (!env.DB_PROVIDER) {
  console.error('❌ Missing DB_PROVIDER in env');
  throw new Error('Missing DB_PROVIDER');
}

// Log environment validation success
console.log('[/api/guess] Environment validation passed:', {
  hasSupabaseUrl: !!env.SUPABASE_URL,
  hasServiceRoleKey: !!env.SUPABASE_SERVICE_ROLE_KEY,
  dbProvider: env.DB_PROVIDER,
  nodeEnv: env.NODE_ENV
});

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

/**
 * Calculate Levenshtein distance between two strings after normalization
 * Note: This is currently unused as we use fuzzy position matching instead
 * Keeping for potential future use in difficulty calculation or word suggestions
 */
function levenshteinDistance(a: string, b: string): number {
  const normalizedA = normalizeText(a);
  const normalizedB = normalizeText(b);
  
  const matrix = Array(normalizedB.length + 1).fill(null).map(() => Array(normalizedA.length + 1).fill(null));

  for (let i = 0; i <= normalizedA.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= normalizedB.length; j++) matrix[j][0] = j;

  for (let j = 1; j <= normalizedB.length; j++) {
    for (let i = 1; i <= normalizedA.length; i++) {
      const substitutionCost = normalizedA[i - 1] === normalizedB[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1, // deletion
        matrix[j - 1][i] + 1, // insertion
        matrix[j - 1][i - 1] + substitutionCost // substitution
      );
    }
  }

  return matrix[normalizedB.length][normalizedA.length];
}

/**
 * Get the next clue to reveal based on current revealed clues
 */
function getNextClueKey(revealedClues: ClueKey[]): ClueKey | null {
  for (const clue of CLUE_SEQUENCE) {
    if (!revealedClues.includes(clue)) {
      return clue;
    }
  }
  return null;
}

/**
 * REMOVED: ensureUserStatsForFK function - user_stats table dropped
 * Foreign key now points directly to players.id
 */

/**
 * Create a score entry for a completed game
 * UPDATED: Now uses new simplified scoring system with fuzzy bonuses
 */
async function createScoreEntry(
  playerId: string,
  wordId: string,
  guessesUsed: number,
  completionTimeSeconds: number | null,
  isWon: boolean,
  scoreResult: ScoreResult
) {
  if (!completionTimeSeconds) {
    throw new Error('Completion time is required for creating score entry');
  }

  console.log('[createScoreEntry] Using NEW scoring system:', {
    playerId,
    wordId,
    guessesUsed,
    completionTimeSeconds,
    isWon,
    scoreBreakdown: {
      baseScore: scoreResult.baseScore,
      fuzzyBonus: scoreResult.fuzzyBonus,  // NEW: Bonus points for fuzzy matches
      timePenalty: scoreResult.timePenalty,  // FIXED: Now correctly 1 point per 10 seconds
      hintPenalty: scoreResult.hintPenalty,
      finalScore: scoreResult.score
    }
  });

  const { error: scoreError } = await supabase
    .from('scores')
    .insert([{
      player_id: playerId,
      word_id: wordId,
      guesses_used: guessesUsed,
      completion_time_seconds: completionTimeSeconds,
      correct: isWon,
      score: scoreResult.score,
      base_score: scoreResult.baseScore,
      guess_penalty: scoreResult.guessPenalty,  // DEPRECATED: Always 0 in new system
      fuzzy_bonus: scoreResult.fuzzyBonus,      // NEW: Stores fuzzy bonus points
      time_penalty: scoreResult.timePenalty,    // FIXED: Now correctly calculated
      hint_penalty: scoreResult.hintPenalty,
      submitted_at: new Date().toISOString()
    }]);

  if (scoreError) {
    console.error('[createScoreEntry] Failed to create score:', scoreError);
    throw scoreError;
  }

  console.log('[createScoreEntry] Successfully stored score with NEW system');
}

/**
 * Update leaderboard summary if score is in top 10
 */
async function updateLeaderboardSummary(
  playerId: string,
  wordId: string,
  guessesUsed: number,
  completionTimeSeconds: number | null,
  scoreResult: ScoreResult
) {
  if (!completionTimeSeconds) {
    throw new Error('Completion time is required for updating leaderboard');
  }

  console.log('[updateLeaderboardSummary] Starting leaderboard update:', {
    playerId,
    wordId,
    guessesUsed,
    completionTimeSeconds,
    score: scoreResult.score
  });

  try {
    // Ensure player exists in players table before attempting leaderboard insert
    await ensurePlayerExists(playerId);
    console.log('[/api/guess] ✅ Step 1 completed: Player existence confirmed');

    // REMOVED: user_stats upsert - table dropped, FK now points to players.id

    // No need to manually update leaderboard_summary anymore
    // The trigger on game_sessions will handle this automatically
    console.log('[/api/guess] Leaderboard will be updated by database trigger');
  } catch (error) {
    console.error('[/api/guess] Error in leaderboard update:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      playerId,
      wordId,
      scoreResult
    });
    throw error;
  }
}

/**
 * Count fuzzy matches from game session guesses by re-evaluating each guess
 * Updated to use smart local fuzzy matching system (no API calls)
 */
async function countFuzzyMatches(guesses: string[], targetWord: string): Promise<number> {
  const normalizedTarget = normalizeText(targetWord);
  let fuzzyCount = 0;
  
  // Import the smart local fuzzy matcher
  const { smartLocalFuzzyMatch } = await import('@/src/utils/smartLocalFuzzy');
  
  for (const guess of guesses) {
    const normalizedGuess = normalizeText(guess);
    
    // Skip if it's a correct guess
    if (normalizedGuess === normalizedTarget) {
      continue;
    }
    
    // Check if this guess would be considered fuzzy using smart local matching
    try {
      const fuzzyResult = smartLocalFuzzyMatch(normalizedGuess, normalizedTarget);
      if (fuzzyResult.isFuzzy) {
        fuzzyCount++;
        console.log('[countFuzzyMatches] Smart local fuzzy match found:', {
          guess: normalizedGuess,
          target: normalizedTarget,
          method: fuzzyResult.method,
          confidence: fuzzyResult.confidence,
          explanation: fuzzyResult.explanation
        });
      }
    } catch (error) {
      console.warn('[countFuzzyMatches] Error checking fuzzy match:', error);
      
      // Fallback to legacy character-based matching if smart local matching fails
      const legacyResult = checkLegacyFuzzyMatch(normalizedGuess, normalizedTarget);
      if (legacyResult) {
        fuzzyCount++;
        console.log('[countFuzzyMatches] Legacy fuzzy match found:', {
          guess: normalizedGuess,
          target: normalizedTarget,
          method: 'legacy_character_overlap'
        });
      }
    }
  }
  
  return fuzzyCount;
}

/**
 * Legacy fuzzy matching for fallback scenarios
 */
function checkLegacyFuzzyMatch(normalizedGuess: string, normalizedTarget: string): boolean {
  let sharedChars = 0;
  const targetChars = normalizedTarget.split('');
  
  for (const char of normalizedGuess) {
    const index = targetChars.indexOf(char);
    if (index !== -1) {
      sharedChars++;
      targetChars.splice(index, 1); // Remove used character
    }
  }
  
  // Consider it fuzzy if it shares at least 40% of characters
  const similarity = sharedChars / Math.max(normalizedGuess.length, normalizedTarget.length);
  return similarity >= 0.4 && sharedChars >= 2;
}

interface GameSessionWithWord extends GameSession {
  words: {
    word: string;
    definition: string;
    etymology: string | null;
    first_letter: string;
    in_a_sentence: string;
    number_of_letters: number;
    equivalents: string[] | null;
    difficulty: number | null;
    date: string | null;
  };
  clue_status?: Record<string, boolean>;
}

export default withCors(async function handler(
  req: NextApiRequest,
  res: NextApiResponse<GuessResponse | { error: string, details?: any }>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { guess, gameId, wordId, start_time } = req.body;
    const playerId = (req.headers['player-id'] as string) ?? 'anonymous';
    
    console.log('[/api/guess] Processing guess:', { guess, gameId, playerId, wordId });

    // Enhanced validation with detailed error response
    if (!gameId || !wordId || !start_time || !guess || !playerId) {
      const fieldValues = { gameId, wordId, playerId, guess, start_time };
      const missingFields = Object.entries(fieldValues)
        .filter(([_, value]) => !value)
        .map(([field, _]) => field);
      
      console.error('[/api/guess] Missing required fields:', missingFields);
      return res.status(400).json({ 
        error: 'Missing required fields',
        details: {
          missing: missingFields,
          received: fieldValues,
          required: ['gameId', 'wordId', 'playerId', 'guess', 'start_time']
        }
      });
    }

    // Additional validation for field types and formats
    if (typeof guess !== 'string' || guess.trim().length === 0) {
      return res.status(400).json({
        error: 'Invalid guess format',
        details: { guess, expected: 'non-empty string' }
      });
    }

    if (typeof gameId !== 'string' || typeof wordId !== 'string') {
      return res.status(400).json({
        error: 'Invalid ID format',
        details: { gameId, wordId, expected: 'string UUIDs' }
      });
    }

    if (typeof start_time !== 'string' || !Date.parse(start_time)) {
      return res.status(400).json({
        error: 'Invalid start_time format',
        details: { start_time, expected: 'ISO date string' }
      });
    }

    // Validate game session exists and matches
    console.log('[/api/guess] Looking for game session:', { gameId, wordId, playerId });
    
    // Debug: Show all game sessions for this player
    const { data: allSessions, error: allError } = await supabase
      .from('game_sessions')
      .select('id, player_id, word_id, start_time, created_at')
      .eq('player_id', playerId)
      .order('created_at', { ascending: false })
      .limit(5);

    console.log('[/api/guess] Recent sessions for player:', { 
      playerId,
      sessionCount: allSessions?.length || 0,
      sessions: allSessions,
      allError: allError?.message 
    });

    // First, try to find the session by gameId only (to see if it exists at all)
    const { data: anySession, error: anyError } = await supabase
      .from('game_sessions')
      .select('*')
      .eq('id', gameId)
      .single();

    console.log('[/api/guess] Session lookup by gameId only:', { 
      found: !!anySession,
      sessionPlayerId: anySession?.player_id,
      requestPlayerId: playerId,
      playerMatch: anySession?.player_id === playerId,
      anyError: anyError?.message
    });

    // Now try to find the session with player_id validation
    const { data: basicSession, error: basicError } = await supabase
      .from('game_sessions')
      .select('*')
      .eq('id', gameId)
      .eq('player_id', playerId)  // Add player_id validation
      .single();

    console.log('[/api/guess] Session lookup with player validation:', { 
      hasBasicSession: !!basicSession,
      basicSessionId: basicSession?.id,
      basicSessionWordId: basicSession?.word_id,
      basicSessionPlayerId: basicSession?.player_id,
      basicError: basicError?.message 
    });

    if (basicError) {
      console.error('[/api/guess] Session lookup failed:', {
        error: basicError,
        code: basicError.code,
        details: basicError.details,
        hint: basicError.hint,
        gameId,
        wordId,
        playerId,
        sessionExistsButWrongPlayer: !!anySession && anySession.player_id !== playerId
      });
      
      if (anySession && anySession.player_id !== playerId) {
        return res.status(403).json({ 
          error: 'Session belongs to different player',
          details: { 
            gameId, 
            sessionPlayerId: anySession.player_id,
            requestPlayerId: playerId
          }
        });
      }
      
      return res.status(404).json({ 
        error: 'Game session not found',
        details: { 
          gameId, 
          playerId,
          error: basicError.message,
          code: basicError.code,
          allSessions: allSessions?.length || 0
        }
      });
    }

    if (!basicSession) {
      return res.status(404).json({ 
        error: 'Game session not found',
        details: { 
          gameId, 
          playerId,
          allSessions: allSessions?.length || 0,
          sessionExistsButWrongPlayer: !!anySession
        }
      });
    }

    // Check if word_id matches
    if (basicSession.word_id !== wordId) {
      console.error('[/api/guess] Word ID mismatch:', {
        sessionWordId: basicSession.word_id,
        requestWordId: wordId
      });
      return res.status(404).json({ 
        error: 'Word ID mismatch',
        details: { sessionWordId: basicSession.word_id, requestWordId: wordId }
      });
    }

    // Now get the full session with word data
    const { data: gameSession, error: sessionError } = await supabase
      .from('game_sessions')
      .select(`
        id,
        word_id,
        revealed_clues,
        guesses,
        is_complete,
        start_time,
        clue_status,
        words (
          word,
          definition,
          etymology,
          first_letter,
          in_a_sentence,
          number_of_letters,
          equivalents,
          difficulty,
          date
        )
      `)
      .eq('id', gameId)
      .single() as unknown as { data: GameSessionWithWord | null, error: any };

    console.log('[/api/guess] Full session with join result:', { 
      hasGameSession: !!gameSession, 
      sessionError: sessionError?.message,
      sessionErrorCode: sessionError?.code,
      sessionErrorDetails: sessionError?.details,
      gameSessionWordId: gameSession?.word_id
    });

    if (sessionError || !gameSession) {
      console.error('[/api/guess] Failed to fetch game session with join:', {
        error: sessionError,
        details: sessionError?.details,
        hint: sessionError?.hint,
        code: sessionError?.code,
        gameId,
        wordId,
        playerId,
        basicSessionExists: !!basicSession,
        basicSessionWordId: basicSession?.word_id
      });
      
      // If basic session exists but join fails, try without the join
      if (basicSession) {
        console.log('[/api/guess] Basic session exists, trying without words join...');
        
        // Get word data separately
        const { data: wordData, error: wordError } = await supabase
          .from('words')
          .select('word, definition, etymology, first_letter, in_a_sentence, number_of_letters, equivalents, difficulty, date')
          .eq('id', basicSession.word_id)
          .single();
          
        console.log('[/api/guess] Word lookup result:', {
          hasWord: !!wordData,
          wordError: wordError?.message,
          wordId: basicSession.word_id
        });
        
        if (wordError || !wordData) {
          return res.status(500).json({ 
            error: 'Failed to fetch word data',
            details: { 
              wordId: basicSession.word_id,
              wordError: wordError?.message 
            }
          });
        }
        
        // Create combined session object
        const combinedSession: GameSessionWithWord = {
          ...basicSession,
          words: wordData
        };
        
        console.log('[/api/guess] Using combined session data');
        
        // Continue with the rest of the logic using combinedSession instead of gameSession
        if (combinedSession.is_complete) {
          return res.status(400).json({ error: 'Game session is already complete' });
        }

        // Validate start_time matches
        if (combinedSession.start_time !== start_time) {
          console.error('[/api/guess] Start time mismatch:', {
            session: combinedSession.start_time,
            request: start_time
          });
          return res.status(400).json({ 
            error: 'Invalid start time',
            details: 'Start time does not match game session'
          });
        }

        const result = await submitGuess({
          guess,
          gameId,
          playerId,
          wordId: combinedSession.word_id,
          start_time: combinedSession.start_time
        }, combinedSession.words.word, combinedSession.revealed_clues || []);

        // Calculate completion time and score if game is over
        const completionTimeSeconds = result.gameOver ? 
          Math.floor((Date.now() - new Date(combinedSession.start_time).getTime()) / 1000) : null;

        // Count fuzzy matches from session history
        const allGuesses = [...(combinedSession.guesses || []), result.guess];
        const fuzzyMatchCount = await countFuzzyMatches(
          combinedSession.guesses || [], 
          combinedSession.words.word
        );

        const scoreResult = result.gameOver ? calculateScore({
          guessesUsed: allGuesses.length,
          fuzzyMatches: fuzzyMatchCount + (result.isFuzzy ? 1 : 0), // Include current guess if fuzzy
          completionTimeSeconds: completionTimeSeconds || 0,
          isWon: result.isCorrect
        }) : null;

        // Update game session with new state - start with minimal update
        const updateData = {
          guesses: [...(combinedSession.guesses || []), result.guess],
          revealed_clues: result.revealedClues,
          clue_status: result.revealedClues.reduce((acc, key) => ({ ...acc, [key]: true }), combinedSession.clue_status || {}),
          is_complete: result.gameOver,
          is_won: result.isCorrect,
          end_time: result.gameOver ? new Date().toISOString() : null,
          updated_at: new Date().toISOString()
        };
        
        console.log('[/api/guess] Updating session with data:', {
          gameId,
          updateData,
          originalGuesses: combinedSession.guesses,
          newGuess: result.guess
        });
        
        const { error: updateError } = await supabase
          .from('game_sessions')
          .update(updateData)
          .eq('id', gameId);

        if (updateError) {
          console.error('[/api/guess] Failed to update game session:', {
            error: updateError,
            message: updateError.message,
            code: updateError.code,
            details: updateError.details,
            hint: updateError.hint,
            gameId,
            updateData
          });
          return res.status(500).json({ 
            error: 'Failed to update game session',
            details: {
              message: updateError.message,
              code: updateError.code
            }
          });
        }
        
        // If game is complete, update stats and create score entry
        if (result.gameOver && completionTimeSeconds && scoreResult) {
          console.log('[/api/guess] Game completed, updating stats and scores:', {
            playerId,
            isCorrect: result.isCorrect,
            guessesUsed: combinedSession.guesses.length + 1,
            completionTimeSeconds,
            scoreResult: {
              score: scoreResult.score,
              baseScore: scoreResult.baseScore,
              fuzzyBonus: scoreResult.fuzzyBonus,
              timePenalty: scoreResult.timePenalty,
              hintPenalty: scoreResult.hintPenalty
            }
          });
          
          let stats = undefined;
          
          try {
            // Ensure player exists before updating stats
            if (!playerId) {
              console.error('[/api/guess] Missing player ID');
              return res.status(200).json({
                ...result,
                score: scoreResult,
                stats: undefined
              });
            }
            
            console.log('[/api/guess] Step 1: Ensuring player exists for player ID:', playerId);
            try {
              await ensurePlayerExists(playerId);
              console.log('[/api/guess] ✅ Step 1 completed: Player existence confirmed');
            } catch (playerError) {
              console.error('[/api/guess] ❌ Step 1 failed: ensurePlayerExists error:', {
                error: playerError,
                message: playerError instanceof Error ? playerError.message : 'Unknown error',
                code: (playerError as any)?.code,
                details: (playerError as any)?.details,
                playerId
              });
              return res.status(200).json({
                ...result,
                score: scoreResult,
                stats: undefined
              });
            }
            
            if (!combinedSession?.word_id) {
              console.error('[/api/guess] Missing word_id in session');
              return res.status(200).json({
                ...result,
                score: scoreResult,
                stats: undefined
              });
            }
            
            if (typeof completionTimeSeconds !== 'number' || completionTimeSeconds < 0) {
              console.error('[/api/guess] Invalid completion time:', completionTimeSeconds);
              return res.status(200).json({
                ...result,
                score: scoreResult,
                stats: undefined
              });
            }

            console.log('[/api/guess] Step 2: Ensuring player FK record');
            try {
              await ensurePlayerExists(playerId); // Foreign key now points to players.id
              // CLEANUP PHASE 1: No longer calculating stats since user_stats is abandoned
              stats = undefined; // Stats now come from player_streaks and game_sessions
              console.log('[/api/guess] ✅ Step 2 completed: Player FK record ensured');
            } catch (statsError) {
              console.error('[/api/guess] ❌ Step 2 failed: ensurePlayerExists error:', {
                error: statsError,
                message: statsError instanceof Error ? statsError.message : 'Unknown error',
                code: (statsError as any)?.code,
                details: (statsError as any)?.details,
                playerId,
                wordId: combinedSession.word_id
              });
              throw statsError;
            }

            console.log('[/api/guess] Step 3: Creating score entry');
            try {
              await createScoreEntry(
                playerId,
                combinedSession.word_id,
                combinedSession.guesses.length + 1,
                completionTimeSeconds,
                result.isCorrect,
                scoreResult
              );
              console.log('[/api/guess] ✅ Step 3 completed: Score entry created successfully');
            } catch (scoreError) {
              console.error('[/api/guess] ❌ Step 3 failed: createScoreEntry error:', {
                error: scoreError,
                message: scoreError instanceof Error ? scoreError.message : 'Unknown error',
                code: (scoreError as any)?.code,
                details: (scoreError as any)?.details,
                playerId,
                wordId: combinedSession.word_id,
                scoreResult
              });
              throw scoreError;
            }

            console.log('[/api/guess] Step 4: Updating leaderboard summary');
            try {
              await updateLeaderboardSummary(
                playerId,
                combinedSession.word_id,
                combinedSession.guesses.length + 1,
                completionTimeSeconds,
                scoreResult
              );
              console.log('[/api/guess] ✅ Step 4 completed: Leaderboard updated successfully');
            } catch (leaderboardError) {
              console.error('[/api/guess] ❌ Step 4 failed: updateLeaderboardSummary error:', {
                error: leaderboardError,
                message: leaderboardError instanceof Error ? leaderboardError.message : 'Unknown error',
                code: (leaderboardError as any)?.code,
                details: (leaderboardError as any)?.details,
                playerId,
                wordId: combinedSession.word_id,
                scoreResult
              });
              throw leaderboardError;
            }

            // Step 5: Fetch updated player stats (including streaks) after leaderboard triggers
            console.log('[/api/guess] Step 5: Fetching updated player stats');
            try {
              const { data: playerStats, error: statsError } = await supabase
                .from('player_streaks')
                .select('current_streak, highest_streak, last_win_date')
                .eq('player_id', playerId)
                .single();

              if (statsError) {
                console.error('[/api/guess] ❌ Step 5 failed: Stats query error:', statsError);
                // Don't throw - just log and continue without stats
              } else {
                console.log('[/api/guess] ✅ Step 5 completed: Player stats fetched:', playerStats);
                stats = {
                  games_played: 0, // Not fetched in this query
                  games_won: 0,    // Not fetched in this query  
                  current_streak: playerStats?.current_streak || 0,
                  longest_streak: playerStats?.highest_streak || 0,
                  total_guesses: 0, // Not fetched in this query
                  average_guesses_per_game: 0, // Not fetched in this query
                  total_play_time_seconds: 0, // Not fetched in this query
                  total_score: 0, // Not fetched in this query
                  updated_at: new Date().toISOString()
                };
              }
            } catch (statsFetchError) {
              console.error('[/api/guess] ❌ Step 5 failed: Exception fetching stats:', statsFetchError);
              // Continue without stats
            }

            console.log('[/api/guess] 🎉 All completion steps successful! Game stats and leaderboard updated.');

            return res.status(200).json({
              ...result,
              score: scoreResult,
              stats
            });
          } catch (statsError) {
            console.error('[/api/guess] 💥 Final catch: Failed in completion logic:', {
              error: statsError,
              message: statsError instanceof Error ? statsError.message : 'Unknown error',
              stack: statsError instanceof Error ? statsError.stack : undefined,
              playerId,
              wordId: combinedSession.word_id,
              scoreResult,
              step: 'unknown'
            });
            
            // Return success for the guess itself, but log the stats error
            return res.status(200).json({
              ...result,
              score: scoreResult,
              stats: undefined
            });
          }
        }

        return res.status(200).json(result);
      }
      
      return res.status(404).json({ 
        error: 'Game session not found',
        details: 'Invalid game session or word ID'
      });
    }

    if (gameSession.is_complete) {
      return res.status(400).json({ error: 'Game session is already complete' });
    }

    // Validate start_time matches
    if (gameSession.start_time !== start_time) {
      console.error('[/api/guess] Start time mismatch:', {
        session: gameSession.start_time,
        request: start_time
      });
      return res.status(400).json({ 
        error: 'Invalid start time',
        details: 'Start time does not match game session'
      });
    }

    const result = await submitGuess({
      guess,
      gameId,
      playerId,
      wordId: gameSession.word_id,
      start_time: gameSession.start_time
    }, gameSession.words.word, gameSession.revealed_clues || []);

    // Calculate completion time and score if game is over
    const completionTimeSeconds = result.gameOver ? 
      Math.floor((Date.now() - new Date(gameSession.start_time).getTime()) / 1000) : null;

    // Count fuzzy matches from session history
    const allGuesses = [...(gameSession.guesses || []), result.guess];
    const fuzzyMatchCount = await countFuzzyMatches(
      gameSession.guesses || [], 
      gameSession.words.word
    );

    const scoreResult = result.gameOver ? calculateScore({
      guessesUsed: allGuesses.length,
      fuzzyMatches: fuzzyMatchCount + (result.isFuzzy ? 1 : 0), // Include current guess if fuzzy
      completionTimeSeconds: completionTimeSeconds || 0,
      isWon: result.isCorrect
    }) : null;

    // Update game session with new state - start with minimal update
    const updateData = {
        guesses: [...(gameSession.guesses || []), result.guess],
      revealed_clues: result.revealedClues,
        clue_status: result.revealedClues.reduce((acc, key) => ({ ...acc, [key]: true }), gameSession.clue_status || {}),
        is_complete: result.gameOver,
        is_won: result.isCorrect,
        end_time: result.gameOver ? new Date().toISOString() : null,
        updated_at: new Date().toISOString()
    };
    
    console.log('[/api/guess] Updating session with data:', {
      gameId,
      updateData,
      originalGuesses: gameSession.guesses,
      newGuess: result.guess
    });
    
    const { error: updateError } = await supabase
      .from('game_sessions')
      .update(updateData)
      .eq('id', gameId);

    if (updateError) {
      console.error('[/api/guess] Failed to update game session:', {
        error: updateError,
        message: updateError.message,
        code: updateError.code,
        details: updateError.details,
        hint: updateError.hint,
        gameId,
        updateData
      });
      return res.status(500).json({ 
        error: 'Failed to update game session',
        details: {
          message: updateError.message,
          code: updateError.code
        }
      });
    }

    // If game is complete, update stats and create score entry
    if (result.gameOver && completionTimeSeconds && scoreResult) {
      console.log('[/api/guess] Game completed, updating stats and scores:', {
        playerId,
        isCorrect: result.isCorrect,
        guessesUsed: gameSession.guesses.length + 1,
        completionTimeSeconds,
        scoreResult: {
          score: scoreResult.score,
          baseScore: scoreResult.baseScore,
          fuzzyBonus: scoreResult.fuzzyBonus,
          timePenalty: scoreResult.timePenalty,
          hintPenalty: scoreResult.hintPenalty
        }
      });
      
      let stats = undefined;
      
      try {
        // Ensure player exists before updating stats
        if (!playerId) {
          console.error('[/api/guess] Missing player ID');
          return res.status(200).json({
            ...result,
            score: scoreResult,
            stats: undefined
          });
        }
        
        console.log('[/api/guess] Step 1: Ensuring player exists for player ID:', playerId);
        try {
          await ensurePlayerExists(playerId);
          console.log('[/api/guess] ✅ Step 1 completed: Player existence confirmed');
        } catch (playerError) {
          console.error('[/api/guess] ❌ Step 1 failed: ensurePlayerExists error:', {
            error: playerError,
            message: playerError instanceof Error ? playerError.message : 'Unknown error',
            code: (playerError as any)?.code,
            details: (playerError as any)?.details,
            playerId
          });
          return res.status(200).json({
            ...result,
            score: scoreResult,
            stats: undefined
          });
        }
        
        if (!gameSession?.word_id) {
          console.error('[/api/guess] Missing word_id in session');
          return res.status(200).json({
            ...result,
            score: scoreResult,
            stats: undefined
          });
        }
        
        if (typeof completionTimeSeconds !== 'number' || completionTimeSeconds < 0) {
          console.error('[/api/guess] Invalid completion time:', completionTimeSeconds);
          return res.status(200).json({
            ...result,
            score: scoreResult,
            stats: undefined
          });
        }

        console.log('[/api/guess] Step 2: Ensuring player FK record');
        try {
          await ensurePlayerExists(playerId); // Foreign key now points to players.id
          // CLEANUP PHASE 1: No longer calculating stats since user_stats is abandoned
          stats = undefined; // Stats now come from player_streaks and game_sessions
          console.log('[/api/guess] ✅ Step 2 completed: Player FK record ensured');
        } catch (statsError) {
          console.error('[/api/guess] ❌ Step 2 failed: ensurePlayerExists error:', {
            error: statsError,
            message: statsError instanceof Error ? statsError.message : 'Unknown error',
            code: (statsError as any)?.code,
            details: (statsError as any)?.details,
            playerId,
            wordId: gameSession.word_id
          });
          throw statsError;
        }

        console.log('[/api/guess] Step 3: Creating score entry');
        try {
      await createScoreEntry(
        playerId,
        gameSession.word_id,
        gameSession.guesses.length + 1,
        completionTimeSeconds,
        result.isCorrect,
        scoreResult
      );
          console.log('[/api/guess] ✅ Step 3 completed: Score entry created successfully');
        } catch (scoreError) {
          console.error('[/api/guess] ❌ Step 3 failed: createScoreEntry error:', {
            error: scoreError,
            message: scoreError instanceof Error ? scoreError.message : 'Unknown error',
            code: (scoreError as any)?.code,
            details: (scoreError as any)?.details,
            playerId,
            wordId: gameSession.word_id,
            scoreResult
          });
          throw scoreError;
        }

        console.log('[/api/guess] Step 4: Updating leaderboard summary');
        try {
      await updateLeaderboardSummary(
        playerId,
        gameSession.word_id,
        gameSession.guesses.length + 1,
        completionTimeSeconds,
        scoreResult
      );
          console.log('[/api/guess] ✅ Step 4 completed: Leaderboard updated successfully');
        } catch (leaderboardError) {
          console.error('[/api/guess] ❌ Step 4 failed: updateLeaderboardSummary error:', {
            error: leaderboardError,
            message: leaderboardError instanceof Error ? leaderboardError.message : 'Unknown error',
            code: (leaderboardError as any)?.code,
            details: (leaderboardError as any)?.details,
            playerId,
            wordId: gameSession.word_id,
            scoreResult
          });
          throw leaderboardError;
        }

        // Step 5: Fetch updated player stats (including streaks) after leaderboard triggers
        console.log('[/api/guess] Step 5: Fetching updated player stats');
        try {
          const { data: playerStats, error: statsError } = await supabase
            .from('player_streaks')
            .select('current_streak, highest_streak, last_win_date')
            .eq('player_id', playerId)
            .single();

          if (statsError) {
            console.error('[/api/guess] ❌ Step 5 failed: Stats query error:', statsError);
            // Don't throw - just log and continue without stats
          } else {
            console.log('[/api/guess] ✅ Step 5 completed: Player stats fetched:', playerStats);
            stats = {
              games_played: 0, // Not fetched in this query
              games_won: 0,    // Not fetched in this query  
              current_streak: playerStats?.current_streak || 0,
              longest_streak: playerStats?.highest_streak || 0,
              total_guesses: 0, // Not fetched in this query
              average_guesses_per_game: 0, // Not fetched in this query
              total_play_time_seconds: 0, // Not fetched in this query
              total_score: 0, // Not fetched in this query
              updated_at: new Date().toISOString()
            };
          }
        } catch (statsFetchError) {
          console.error('[/api/guess] ❌ Step 5 failed: Exception fetching stats:', statsFetchError);
          // Continue without stats
        }

        console.log('[/api/guess] 🎉 All completion steps successful! Game stats and leaderboard updated.');

      return res.status(200).json({
        ...result,
        score: scoreResult,
        stats
      });
      } catch (statsError) {
        console.error('[/api/guess] 💥 Final catch: Failed in completion logic:', {
          error: statsError,
          message: statsError instanceof Error ? statsError.message : 'Unknown error',
          stack: statsError instanceof Error ? statsError.stack : undefined,
          playerId,
          wordId: gameSession.word_id,
          scoreResult,
          step: 'unknown'
        });
        
        // Return success for the guess itself, but log the stats error
        return res.status(200).json({
          ...result,
          score: scoreResult,
          stats: undefined
        });
      }
    }

    res.status(200).json(result);
  } catch (error) {
    console.error('[/api/guess] Error:', error);
    res.status(500).json({ error: 'Failed to submit guess' });
  }
}); 