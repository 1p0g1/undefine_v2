// Test script for enhanced leaderboard API
// Tests both current-day (real-time) and historical (snapshot) queries

async function testLeaderboardAPI() {
  console.log('🧪 Testing Enhanced Leaderboard API\n');

  const baseUrl = 'https://undefine-v2-front.vercel.app';
  
  try {
    // Step 1: Test current day leaderboard (should use real-time data)
    console.log('📊 Step 1: Testing current day leaderboard...');
    
    const currentResponse = await fetch(`${baseUrl}/api/leaderboard?wordId=test-word-id`);
    if (!currentResponse.ok) {
      console.log(`⚠️  Current day API returned ${currentResponse.status}: ${currentResponse.statusText}`);
    } else {
      const currentData = await currentResponse.json();
      console.log(`✅ Current day API works:`, {
        leaderboardCount: currentData.leaderboard?.length || 0,
        totalEntries: currentData.totalEntries || 0,
        source: 'real-time (expected)'
      });
    }

    // Step 2: Test historical date leaderboard (should try snapshots)
    console.log('\n📸 Step 2: Testing historical date leaderboard...');
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayDate = yesterday.toISOString().split('T')[0];
    
    const historicalResponse = await fetch(`${baseUrl}/api/leaderboard?wordId=test-word-id&date=${yesterdayDate}`);
    if (!historicalResponse.ok) {
      console.log(`⚠️  Historical API returned ${historicalResponse.status}: ${historicalResponse.statusText}`);
    } else {
      const historicalData = await historicalResponse.json();
      console.log(`✅ Historical API works:`, {
        leaderboardCount: historicalData.leaderboard?.length || 0,
        totalEntries: historicalData.totalEntries || 0,
        date: yesterdayDate,
        source: 'snapshot (expected) or fallback to real-time'
      });
    }

    // Step 3: Test with player ID
    console.log('\n👤 Step 3: Testing with player ID...');
    
    const playerResponse = await fetch(`${baseUrl}/api/leaderboard?wordId=test-word-id&playerId=test-player`);
    if (!playerResponse.ok) {
      console.log(`⚠️  Player API returned ${playerResponse.status}: ${playerResponse.statusText}`);
    } else {
      const playerData = await playerResponse.json();
      console.log(`✅ Player API works:`, {
        leaderboardCount: playerData.leaderboard?.length || 0,
        playerRank: playerData.playerRank,
        totalEntries: playerData.totalEntries || 0
      });
    }

    // Step 4: Test finalization endpoint (if snapshot system is deployed)
    console.log('\n📸 Step 4: Testing finalization endpoint...');
    
    try {
      const finalizeResponse = await fetch(`${baseUrl}/api/admin/finalize-daily-leaderboard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ autoFinalize: true })
      });
      
      if (!finalizeResponse.ok) {
        console.log(`⚠️  Finalization endpoint returned ${finalizeResponse.status}: ${finalizeResponse.statusText}`);
        if (finalizeResponse.status === 404) {
          console.log('📝 Note: Finalization endpoint not yet deployed');
        }
      } else {
        const finalizeData = await finalizeResponse.json();
        console.log(`✅ Finalization endpoint works:`, {
          success: finalizeData.success,
          finalized: finalizeData.stats?.successCount || 0,
          errors: finalizeData.stats?.errorCount || 0
        });
      }
    } catch (finalizeError) {
      console.log('⚠️  Finalization endpoint not available:', finalizeError.message);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testLeaderboardAPI()
  .then(() => {
    console.log('\n🎉 Leaderboard API test completed!');
  })
  .catch(error => {
    console.error('\n💥 Test failed:', error);
  }); 