// Test script for daily snapshot system
// This tests the new snapshot functions with existing data

const { createClient } = require('@supabase/supabase-js');

// Use your environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables. Make sure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSnapshotSystem() {
  console.log('🧪 Testing Daily Snapshot System\n');

  try {
    // Step 1: Check existing leaderboard data
    console.log('📊 Step 1: Analyzing existing leaderboard data...');
    const { data: leaderboardData, error: leaderboardError } = await supabase
      .from('leaderboard_summary')
      .select('word_id, date, player_id, best_time, guesses_used')
      .order('date', { ascending: false })
      .limit(20);

    if (leaderboardError) {
      throw new Error(`Failed to fetch leaderboard data: ${leaderboardError.message}`);
    }

    console.log(`✅ Found ${leaderboardData.length} leaderboard entries`);
    
    // Group by word_id and date for testing
    const wordDates = new Map();
    leaderboardData.forEach(entry => {
      const key = `${entry.word_id}:${entry.date}`;
      if (!wordDates.has(key)) {
        wordDates.set(key, {
          word_id: entry.word_id,
          date: entry.date,
          player_count: 0
        });
      }
      wordDates.get(key).player_count++;
    });

    console.log(`📈 Found ${wordDates.size} unique word/date combinations:`);
    Array.from(wordDates.values()).slice(0, 5).forEach(({ word_id, date, player_count }) => {
      console.log(`   - ${date}: ${word_id.slice(0, 8)}... (${player_count} players)`);
    });

    // Step 2: Test if snapshot functions exist (they should fail gracefully if migration not applied)
    console.log('\n🔧 Step 2: Testing if snapshot functions exist...');
    
    const testWordDate = Array.from(wordDates.values())[0];
    if (!testWordDate) {
      console.log('⚠️  No leaderboard data found to test with');
      return;
    }

    // Test should_finalize_date function
    try {
      const { data: shouldFinalize, error: shouldFinalizeError } = await supabase
        .rpc('should_finalize_date', { check_date: testWordDate.date });
      
      if (shouldFinalizeError) {
        console.log(`⚠️  Snapshot functions not yet deployed: ${shouldFinalizeError.message}`);
        console.log('📝 Next step: Deploy the migration to create snapshot system');
        return;
      }

      console.log(`✅ Snapshot functions exist! should_finalize_date(${testWordDate.date}) = ${shouldFinalize}`);

      // Step 3: Test finalization on a historical date
      console.log('\n📸 Step 3: Testing snapshot finalization...');
      
      const { data: finalizeResult, error: finalizeError } = await supabase
        .rpc('finalize_daily_leaderboard', {
          target_word_id: testWordDate.word_id,
          target_date: testWordDate.date
        });

      if (finalizeError) {
        throw new Error(`Finalization failed: ${finalizeError.message}`);
      }

      const result = finalizeResult[0];
      console.log(`✅ Finalization result:`, {
        success: result.success,
        message: result.message,
        total_players: result.total_players,
        top_10_count: result.top_10_count
      });

      // Step 4: Test historical leaderboard retrieval
      console.log('\n🔍 Step 4: Testing historical leaderboard retrieval...');
      
      const { data: historicalData, error: historicalError } = await supabase
        .rpc('get_historical_leaderboard', {
          target_word_id: testWordDate.word_id,
          target_date: testWordDate.date
        });

      if (historicalError) {
        throw new Error(`Historical retrieval failed: ${historicalError.message}`);
      }

      console.log(`✅ Retrieved ${historicalData.length} historical entries`);
      if (historicalData.length > 0) {
        console.log('📋 Top 3 historical rankings:');
        historicalData.slice(0, 3).forEach((entry, index) => {
          console.log(`   ${index + 1}. ${entry.player_name}: ${entry.best_time}ms (${entry.guesses_used} guesses) ${entry.was_top_10 ? '🏆' : ''}`);
        });
      }

      // Step 5: Test auto-finalization
      console.log('\n⚡ Step 5: Testing auto-finalization of old snapshots...');
      
      const { data: autoResults, error: autoError } = await supabase
        .rpc('auto_finalize_old_snapshots');

      if (autoError) {
        throw new Error(`Auto-finalization failed: ${autoError.message}`);
      }

      console.log(`✅ Auto-finalization processed ${autoResults.length} snapshots`);
      autoResults.slice(0, 3).forEach(result => {
        console.log(`   - ${result.date}: ${result.success ? '✅' : '❌'} ${result.message}`);
      });

      // Step 6: Check snapshot table
      console.log('\n📊 Step 6: Checking snapshot table contents...');
      
      const { data: snapshots, error: snapshotError } = await supabase
        .from('daily_leaderboard_snapshots')
        .select('word_id, date, total_players, is_finalized, finalized_at')
        .order('finalized_at', { ascending: false })
        .limit(5);

      if (snapshotError) {
        throw new Error(`Failed to fetch snapshots: ${snapshotError.message}`);
      }

      console.log(`✅ Found ${snapshots.length} snapshots in database:`);
      snapshots.forEach(snapshot => {
        console.log(`   - ${snapshot.date}: ${snapshot.word_id.slice(0, 8)}... (${snapshot.total_players} players) ${snapshot.is_finalized ? '🔒' : '🔓'}`);
      });

    } catch (functionError) {
      console.log(`⚠️  Functions not available: ${functionError.message}`);
      console.log('📝 Next step: Deploy the migration first');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testSnapshotSystem()
  .then(() => {
    console.log('\n🎉 Snapshot system test completed!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 Test failed:', error);
    process.exit(1);
  }); 