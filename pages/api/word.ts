// Vercel-native serverless API route for fetching the word of the day from Supabase.
import { createClient } from '@supabase/supabase-js';
import type { NextApiRequest, NextApiResponse } from 'next';

// Wrap the entire handler to catch initialization errors
const apiHandler = async (req: NextApiRequest, res: NextApiResponse) => {
  console.log('[api/word] API route initialized');
  
  // See docs/mvp.md "Player ID Handling" section for details on this temporary solution
  const TEMP_PLAYER_ID = 'mvp-test-player-001';

  // Log environment state
  const envState = {
    nodeEnv: process.env.NODE_ENV,
    hasSupabaseUrl: !!process.env.SUPABASE_URL,
    hasServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    hasAnonKey: !!process.env.SUPABASE_ANON_KEY, // Add check for anon key
    supabaseUrl: process.env.SUPABASE_URL?.substring(0, 20) + '...' // Log partial URL for debugging
  };
  console.log('[api/word] Environment:', envState);

  // Log missing environment variables but continue execution
  if (!process.env.SUPABASE_URL) {
    console.error('[api/word] Missing SUPABASE_URL environment variable');
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('[api/word] Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
  }

  try {
    console.log('[api/word] Initializing Supabase client');
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!, // Using service role key for backend operations
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
    console.log('[api/word] Supabase client initialized');

    // Add connection status check
    console.log('[api/word] Supabase client initialized with URL:', process.env.SUPABASE_URL);

    // Default clue status structure matching game logic
    const DEFAULT_CLUE_STATUS = {
      D: false, // Definition
      E: false, // Equivalents
      F: false, // First Letter
      I: false, // In a Sentence
      N: false, // Number of Letters
      E2: false, // Etymology
    };

    // Helper to validate UUID format
    function isValidUUID(uuid: string) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      return uuidRegex.test(uuid);
    }

    // Ensure player exists in user_stats
    async function ensurePlayerExists(player_id: string): Promise<boolean> {
      console.log('\n[ensurePlayerExists] Starting check for player:', player_id);
      
      if (!player_id) {
        throw new Error('player_id is required');
      }

      try {
        // First check exact count of matching rows
        const { data, error, count } = await supabase
          .from('user_stats')
          .select('*', { count: 'exact', head: false })
          .eq('player_id', player_id);

        console.log('[ensurePlayerExists] Row count check results:', {
          player_id,
          count,
          hasData: !!data,
          dataLength: data?.length,
          error: error?.message
        });

        // Log full details for debugging
        console.log('[ensurePlayerExists] Full query results:', {
          data,
          error
        });

        if (error) {
          console.error('[ensurePlayerExists] Error checking player count:', error);
          throw new Error(`Failed to check player count: ${error.message}`);
        }

        // Handle multiple rows case (indicates missing unique constraint)
        if (count && count > 1) {
          console.error('[ensurePlayerExists] Multiple rows found for player_id - table constraint issue:', {
            player_id,
            rowCount: count
          });
          throw new Error('Multiple user_stats entries found for player - database constraint issue');
        }

        // Handle no rows case (need to create new entry)
        if (count === 0 || !data || data.length === 0) {
          console.log('[ensurePlayerExists] No existing stats found, creating new entry');
          
          const { data: newStats, error: createError } = await supabase
            .from('user_stats')
            .insert({
              player_id,
              games_played: 0,
              games_won: 0,
              current_streak: 0,
              longest_streak: 0,
              average_completion_time: 0,
            })
            .select()
            .single();

          if (createError) {
            console.error('[ensurePlayerExists] Failed to create user_stats:', {
              error: createError,
              attempted_player_id: player_id
            });
            throw new Error(`Failed to create user stats: ${createError.message}`);
          }

          console.log('[ensurePlayerExists] Successfully created new user_stats:', newStats);
          return true;
        }

        // Single row exists case
        console.log('[ensurePlayerExists] Found existing user_stats:', data[0]);
        return true;

      } catch (err) {
        console.error('[ensurePlayerExists] Critical error:', err);
        throw err;
      }
    }

    /**
     * @param {import('http').IncomingMessage} req
     * @param {import('http').ServerResponse & { status: (code: number) => any, json: (body: any) => void }} res
     */
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // Verify database tables exist
    console.log('[api/word] Verifying database tables...');
    
    // Check words table
    const { data: wordsCheck, error: wordsError } = await supabase
      .from('words')
      .select('count')
      .limit(1);
      
    if (wordsError) {
      console.error('[api/word] Error checking words table:', wordsError);
      throw new Error(`Database table check failed: ${wordsError.message}`);
    }
    console.log('[api/word] Words table check passed');

    // Check game_sessions table
    const { data: sessionsCheck, error: sessionsError } = await supabase
      .from('game_sessions')
      .select('count')
      .limit(1);
      
    if (sessionsError) {
      console.error('[api/word] Error checking game_sessions table:', sessionsError);
      throw new Error(`Database table check failed: ${sessionsError.message}`);
    }
    console.log('[api/word] Game sessions table check passed');

    // Ensure player exists before proceeding
    const player_id = TEMP_PLAYER_ID;
    console.log('[api/word] Using player_id:', player_id);
    
    const playerExists = await ensurePlayerExists(player_id);
    if (!playerExists) {
      return res.status(400).json({ error: 'Failed to ensure player exists' });
    }

    // Explicitly get today's date in YYYY-MM-DD format
    const now = new Date();
    const today = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`;
    
    console.log('[api/word] Fetching word for date:', today);

    // First check if we have a word with today's exact date
    const { data: todayWord, error: todayWordError } = await supabase
      .from('words')
      .select('*')
      .eq('date', today)
      .single();
    
    console.log('[api/word] Today\'s word query result:', {
      hasWord: !!todayWord,
      error: todayWordError,
      date: today
    });

    let wordToUse;
    
    if (todayWordError || !todayWord) {
      console.warn('[api/word] No word found for today, attempting fallback');
      
      // Try fetching latest word as fallback
      const { data: fallbackWord, error: fallbackError } = await supabase
        .from('words')
        .select('*')
        .order('date', { ascending: false })
        .limit(1)
        .single();
        
      if (fallbackError || !fallbackWord) {
        console.error('[api/word] Failed to fetch fallback word:', fallbackError);
        return res.status(404).json({ error: 'No words available in database' });
      }
      
      console.log('[api/word] Using fallback word from:', fallbackWord.date);
      wordToUse = fallbackWord;
    } else {
      wordToUse = todayWord;
    }

    // Validate required data before game session creation
    if (!wordToUse?.id || !isValidUUID(wordToUse.id)) {
      console.error('[api/word] Invalid word_id:', wordToUse?.id);
      return res.status(400).json({ error: 'Invalid word_id' });
    }

    // Debug log before game session creation
    console.log('[api/word] Creating game session with:', {
      player_id,
      word_id: wordToUse.id,
      word_date: wordToUse.date,
      start_time: new Date().toISOString()
    });
    
    // Create game session
    const { data: session, error: sessionError } = await supabase
      .from('game_sessions')
      .insert({
        word_id: wordToUse.id,
        player_id,
        start_time: new Date().toISOString(),
        clue_status: DEFAULT_CLUE_STATUS,
        guesses: [],
        is_complete: false,
      })
      .select()
      .single();

    if (sessionError) {
      console.error('[api/word] Failed to create game session:', {
        error: sessionError,
        word_id: wordToUse.id,
        player_id
      });
      return res.status(500).json({ 
        error: 'Failed to create game session',
        details: sessionError.message
      });
    }

    // Return success response
    return res.status(200).json({
      word: {
        id: wordToUse.id,
        word: wordToUse.word,
        definition: wordToUse.definition,
        first_letter: wordToUse.first_letter,
        in_a_sentence: wordToUse.in_sentence,
        equivalents: wordToUse.equivalents,
        number_of_letters: wordToUse.num_letters,
        etymology: wordToUse.etymology,
        difficulty: wordToUse.difficulty,
        date: wordToUse.date,
      },
      gameId: session.id,
      isFallback: wordToUse !== todayWord
    });

  } catch (err) {
    console.error('[api/word] Unexpected error:', err);
    return res.status(500).json({ 
      error: 'Unexpected error',
      details: err instanceof Error ? err.message : 'Unknown error'
    });
  }
};

// Catch any errors that might occur during handler execution
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    await apiHandler(req, res);
  } catch (err) {
    console.error('[api/word] Unhandled error:', err);
    const errorDetails = err instanceof Error ? {
      message: err.message,
      stack: err.stack,
      name: err.name
    } : err;
    return res.status(500).json({ 
      error: 'Unhandled server error',
      details: errorDetails // Always show details for debugging
    });
  }
} 