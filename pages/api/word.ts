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
    hasSupabaseKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
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
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
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

    // Ensure player exists in user_stats
    async function ensurePlayerExists(player_id: string) {
      console.log('[api/word] Checking if player exists:', player_id);
      
      try {
        // First try to get existing stats
        const { data: existingStats, error: selectError } = await supabase
          .from('user_stats')
          .select('player_id')
          .eq('player_id', player_id)
          .single();

        if (selectError) {
          console.error('[api/word] Error checking existing player:', selectError);
          throw new Error(`Failed to check existing player: ${selectError.message}`);
        }

        console.log('[api/word] Existing stats check result:', existingStats);

        if (!existingStats) {
          console.log('[api/word] Creating new user_stats entry');
          
          // Create new user_stats entry if doesn't exist
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
            console.error('[api/word] Error creating user_stats:', createError);
            console.error('[api/word] Create payload:', {
              player_id,
              games_played: 0,
              games_won: 0,
              current_streak: 0,
              longest_streak: 0,
              average_completion_time: 0,
            });
            throw new Error(`Failed to create user stats: ${createError.message}`);
          }

          console.log('[api/word] Created new user_stats:', newStats);
        }
      } catch (err) {
        console.error('[api/word] Error in ensurePlayerExists:', err);
        throw err; // Re-throw to be caught by the main error handler
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
    await ensurePlayerExists(TEMP_PLAYER_ID);

    // Explicitly get today's date in YYYY-MM-DD format
    const now = new Date();
    const today = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`;
    
    console.log('[api/word] Current server time:', now.toISOString());
    console.log('[api/word] Requesting word for date:', today);

    // First check if we have a word with today's exact date
    const { data: todayWord, error: todayWordError } = await supabase
      .from('words')
      .select('*')
      .eq('date', today)
      .single();
    
    if (todayWordError) {
      console.error(`[api/word] Error fetching word for date ${today}:`, todayWordError);
      
      // Only allow fallback in development
      if (process.env.NODE_ENV === 'development') {
        console.warn('[api/word] WARNING: Using fallback word in development mode');
        
        // Try fetching any word as a last resort
        const { data: anyWord, error: anyWordError } = await supabase
          .from('words')
          .select('*')
          .limit(1)
          .single();
        
        if (anyWordError || !anyWord) {
          console.error('[api/word] Failed to fetch any word:', anyWordError);
          res.status(404).json({ error: 'No words found in database' });
          console.log('[api/word] Response status: 404 (No words found)');
          return;
        }
        
        console.log('[api/word] Using fallback word:', anyWord.word);
        
        // Use hardcoded player_id for MVP testing
        const player_id = TEMP_PLAYER_ID;
        console.log('[api/word] Using temporary player_id:', player_id);
        
        // Create game session with the fallback word
        const { data: session, error: sessionError } = await supabase
          .from('game_sessions')
          .insert([
            {
              word_id: anyWord.id,
              player_id,
              start_time: new Date().toISOString(),
              clue_status: DEFAULT_CLUE_STATUS,
              guesses: [],
              is_complete: false,
            },
          ])
          .select()
          .single();

        if (sessionError) {
          console.error('[api/word] Error creating game session:', sessionError);
          console.error('[api/word] Attempted session data:', {
            word_id: anyWord.id,
            player_id,
            start_time: new Date().toISOString(),
          });
          res.status(500).json({ error: 'Error creating game session: ' + sessionError.message });
          console.log('[api/word] Response status: 500 (Session creation failed)');
          return;
        }

        // Return fallback word with flag
        res.status(200).json({
          word: {
            id: anyWord.id,
            word: anyWord.word,
            definition: anyWord.definition,
            first_letter: anyWord.first_letter,
            in_a_sentence: anyWord.in_sentence,
            equivalents: anyWord.equivalents,
            number_of_letters: anyWord.num_letters,
            etymology: anyWord.etymology,
            difficulty: anyWord.difficulty,
            date: anyWord.date,
          },
          gameId: session.id,
          isFallback: true,
        });
        console.log('[api/word] Response status: 200 (Using fallback word)');
        return;
      }
      
      // In production, return 404 if no word found
      return res.status(404).json({ error: 'No word found for today' });
    }
    
    console.log('[api/word] Found word for today:', todayWord.word);
    
    // Use hardcoded player_id for MVP testing
    const player_id = TEMP_PLAYER_ID;
    console.log('[api/word] Using temporary player_id:', player_id);
    
    // Create game session linked to today's word
    const { data: session, error: sessionError } = await supabase
      .from('game_sessions')
      .insert([
        {
          word_id: todayWord.id,
          player_id,
          start_time: new Date().toISOString(),
          clue_status: DEFAULT_CLUE_STATUS,
          guesses: [],
          is_complete: false,
        },
      ])
      .select()
      .single();

    if (sessionError) {
      console.error('[api/word] Error creating game session:', sessionError);
      console.error('[api/word] Attempted session data:', {
        word_id: todayWord.id,
        player_id,
        start_time: new Date().toISOString(),
      });
      res.status(500).json({ error: 'Error creating game session: ' + sessionError.message });
      console.log('[api/word] Response status: 500 (Session creation failed)');
      return;
    }

    // Return today's word
    res.status(200).json({
      word: {
        id: todayWord.id,
        word: todayWord.word,
        definition: todayWord.definition,
        first_letter: todayWord.first_letter,
        in_a_sentence: todayWord.in_sentence,
        equivalents: todayWord.equivalents,
        number_of_letters: todayWord.num_letters,
        etymology: todayWord.etymology,
        difficulty: todayWord.difficulty,
        date: todayWord.date,
      },
      gameId: session.id,
    });
    console.log('[api/word] Response status: 200 (Using today\'s word)');
  } catch (err) {
    console.error('[api/word] Critical initialization error:', err);
    const errorDetails = err instanceof Error ? {
      message: err.message,
      stack: err.stack,
      name: err.name,
      environment: envState // Include environment state in error
    } : err;
    
    // Always return error details for critical errors
    return res.status(500).json({ 
      error: 'Critical initialization error',
      details: errorDetails,
      environment: envState
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