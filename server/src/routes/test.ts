import { Router } from 'express';
import { supabase } from '../config/SupabaseClient.js';

const router = Router();

router.get('/test-supabase', async (_req, res) => {
  if (!supabase) {
    return res.status(500).json({
      connected: false,
      error: 'Supabase client not initialized',
    });
  }

  try {
    // First test basic connectivity
    const { data: testData, error: testError } = await supabase
      .from('words')
      .select('word')
      .limit(1);

    if (testError) {
      return res.status(500).json({
        connected: false,
        error: testError.message,
      });
    }

    // If we got here, connection is working
    return res.json({
      connected: true,
      sample: testData?.[0]?.word || null,
    });
  } catch (err) {
    return res.status(500).json({
      connected: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }
});

export default router;
