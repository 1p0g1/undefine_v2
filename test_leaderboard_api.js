// Leaderboard API Verification Test
// Run with: node test_leaderboard_api.js

const fetch = require('node-fetch');

// UPDATED WITH YOUR BACKEND URL
const BACKEND_URL = 'https://undefine-v2-back.vercel.app';
const FRONTEND_URL = 'https://undefine-v2-front.vercel.app'; // Update with your frontend URL if needed

async function testLeaderboardAPI() {
    console.log('🔍 Testing Leaderboard API...\n');
    
    try {
        // Test 1: Get current word
        console.log('1. Testing /api/word endpoint...');
        const wordResponse = await fetch(`${BACKEND_URL}/api/word`);
        const wordData = await wordResponse.json();
        console.log(`✅ Current word: ${wordData.word} (ID: ${wordData.id})`);
        
        const currentWordId = wordData.id;
        
        // Test 2: Get leaderboard for current word
        console.log('\n2. Testing /api/leaderboard endpoint...');
        const leaderboardResponse = await fetch(`${BACKEND_URL}/api/leaderboard?wordId=${currentWordId}`);
        const leaderboardData = await leaderboardResponse.json();
        
        console.log(`✅ Leaderboard entries: ${leaderboardData.leaderboard.length}`);
        console.log(`✅ Total entries: ${leaderboardData.totalEntries}`);
        
        if (leaderboardData.leaderboard.length > 0) {
            console.log('📊 Top 3 entries:');
            leaderboardData.leaderboard.slice(0, 3).forEach((entry, index) => {
                console.log(`   ${index + 1}. ${entry.player_name} - ${entry.best_time}s, ${entry.guesses_used} guesses`);
            });
        }
        
        // Test 3: Check data structure
        console.log('\n3. Validating data structure...');
        if (leaderboardData.leaderboard.length > 0) {
            const firstEntry = leaderboardData.leaderboard[0];
            const requiredFields = ['player_id', 'player_name', 'rank', 'best_time', 'guesses_used', 'was_top_10'];
            
            const missingFields = requiredFields.filter(field => !(field in firstEntry));
            if (missingFields.length === 0) {
                console.log('✅ All required fields present');
            } else {
                console.log('❌ Missing fields:', missingFields);
            }
        }
        
        // Test 4: Test all-time leaderboard
        console.log('\n4. Testing /api/leaderboard/all-time endpoint...');
        const allTimeResponse = await fetch(`${BACKEND_URL}/api/leaderboard/all-time`);
        const allTimeData = await allTimeResponse.json();
        
        if (allTimeData.success) {
            console.log(`✅ All-time leaderboard loaded successfully`);
            console.log(`✅ Total players: ${allTimeData.data.totalPlayers}`);
            console.log(`✅ Total games: ${allTimeData.data.totalGames}`);
            console.log(`✅ Top games leaders: ${allTimeData.data.topByGames.length}`);
            console.log(`✅ Top streak leaders: ${allTimeData.data.topByStreaks.length}`);
        } else {
            console.log('❌ All-time leaderboard failed:', allTimeData.error);
        }
        
        // Test 5: Test ranking consistency
        console.log('\n5. Testing ranking consistency...');
        const entries = leaderboardData.leaderboard;
        let rankingConsistent = true;
        
        for (let i = 0; i < entries.length - 1; i++) {
            const current = entries[i];
            const next = entries[i + 1];
            
            // Check if ranking is consistent (better time = better rank)
            if (current.best_time > next.best_time) {
                console.log(`❌ Ranking inconsistency: Rank ${current.rank} (${current.best_time}s) > Rank ${next.rank} (${next.best_time}s)`);
                rankingConsistent = false;
            }
        }
        
        if (rankingConsistent) {
            console.log('✅ Ranking algorithm consistent');
        }
        
        // Test 6: Test top 10 flag accuracy
        console.log('\n6. Testing top 10 flag accuracy...');
        let top10Accurate = true;
        
        entries.forEach(entry => {
            const shouldBeTop10 = entry.rank <= 10;
            if (entry.was_top_10 !== shouldBeTop10) {
                console.log(`❌ Top 10 flag incorrect: Rank ${entry.rank}, flag: ${entry.was_top_10}`);
                top10Accurate = false;
            }
        });
        
        if (top10Accurate) {
            console.log('✅ Top 10 flags accurate');
        }
        
        console.log('\n🎉 API verification complete!');
        
    } catch (error) {
        console.error('❌ API test failed:', error.message);
    }
}

// Run the test
testLeaderboardAPI(); 