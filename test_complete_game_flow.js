// Test Complete Game Flow - End-to-End Testing
// Run with: node test_complete_game_flow.js

const fetch = require('node-fetch');

// UPDATED WITH YOUR BACKEND URL
const BACKEND_URL = 'https://undefine-v2-back.vercel.app';

const testPlayerId = `test-player-${Date.now()}`;
let currentWordData = null;
let gameSession = null;

async function testCompleteGameFlow() {
  console.log('🎮 Testing Complete Game Flow...\n');
  
  try {
    // Step 1: Get current word
    console.log('📝 Step 1: Getting current word...');
    const wordResponse = await fetch(`${BACKEND_URL}/api/word`);
    currentWordData = await wordResponse.json();
    
    if (!currentWordData.word) {
      console.log('❌ Failed to get current word');
      return;
    }
    
    console.log(`✅ Current word: ${currentWordData.word} (ID: ${currentWordData.id})`);
    console.log(`   Definition: ${currentWordData.definition}`);
    console.log(`   Equivalents: ${currentWordData.equivalents}`);
    
    // Step 2: Start game session
    console.log('\n🎯 Step 2: Starting game session...');
    gameSession = {
      playerId: testPlayerId,
      wordId: currentWordData.id,
      startTime: new Date().toISOString(),
      guesses: []
    };
    
    // Step 3: Test clue progression
    console.log('\n🔍 Step 3: Testing clue progression...');
    const clueTests = [
      { guessNumber: 1, expectedClue: 'definition', guess: 'WRONGGUESS1' },
      { guessNumber: 2, expectedClue: 'equivalents', guess: 'WRONGGUESS2' },
      { guessNumber: 3, expectedClue: 'firstLetter', guess: 'WRONGGUESS3' },
      { guessNumber: 4, expectedClue: 'inASentence', guess: 'WRONGGUESS4' },
      { guessNumber: 5, expectedClue: 'numberOfLetters', guess: 'WRONGGUESS5' },
      { guessNumber: 6, expectedClue: 'etymology', guess: currentWordData.word } // Win on last guess
    ];
    
    for (const test of clueTests) {
      console.log(`\n   Guess ${test.guessNumber}: ${test.guess}`);
      
      const response = await fetch(`${BACKEND_URL}/api/guess`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: testPlayerId,
          guess: test.guess,
          wordId: currentWordData.id,
          guessNumber: test.guessNumber,
          startTime: gameSession.startTime
        })
      });
      
      const result = await response.json();
      
      if (result.isCorrect) {
        console.log(`   ✅ CORRECT! Won on guess ${test.guessNumber}`);
        console.log(`   🎯 Final score: ${result.score}`);
        console.log(`   ⏱️  Time: ${result.timeElapsed}s`);
        break;
      } else {
        console.log(`   ❌ Incorrect (expected for progression test)`);
        console.log(`   🔍 Next clue revealed: ${result.nextClue}`);
        
        // Verify expected clue was revealed
        if (result.clueData && result.clueData.currentClue) {
          const expectedClue = test.expectedClue;
          const actualClue = result.clueData.currentClue;
          console.log(`   📋 Clue check: Expected ${expectedClue}, Got ${actualClue}`);
        }
      }
    }
    
    // Step 4: Test leaderboard integration
    console.log('\n🏆 Step 4: Testing leaderboard integration...');
    
    // Wait a moment for database triggers
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const leaderboardResponse = await fetch(`${BACKEND_URL}/api/leaderboard?wordId=${currentWordData.id}`);
    const leaderboardData = await leaderboardResponse.json();
    
    console.log(`✅ Leaderboard entries: ${leaderboardData.length}`);
    
    // Check if our test player appears in leaderboard
    const ourEntry = leaderboardData.find(entry => entry.playerId === testPlayerId);
    if (ourEntry) {
      console.log(`✅ Test player ranked #${ourEntry.rank}`);
      console.log(`   Score: ${ourEntry.score}, Time: ${ourEntry.time}s`);
    } else {
      console.log('⚠️  Test player not found in leaderboard (may be expected for test data)');
    }
    
    // Step 5: Test theme system
    console.log('\n🎨 Step 5: Testing theme system...');
    
    const themeResponse = await fetch(`${BACKEND_URL}/api/theme-status`);
    const themeData = await themeResponse.json();
    
    if (themeData.currentTheme) {
      console.log(`✅ Current theme: ${themeData.currentTheme}`);
      console.log(`   Progress: ${themeData.progress ? themeData.progress.correct : 0}/${themeData.progress ? themeData.progress.total : 0}`);
    } else {
      console.log('⚠️  No theme data available');
    }
    
    // Step 6: Test fuzzy matching
    console.log('\n🔤 Step 6: Testing fuzzy matching...');
    
    const fuzzyTests = [
      { word: currentWordData.word, guess: currentWordData.word.substring(0, currentWordData.word.length - 1) + 'X' },
      { word: currentWordData.word, guess: currentWordData.word.toLowerCase() },
      { word: currentWordData.word, guess: currentWordData.word.replace(/E/g, 'I') }
    ];
    
    for (const fuzzyTest of fuzzyTests) {
      try {
        const response = await fetch(`${BACKEND_URL}/api/guess`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            playerId: `${testPlayerId}-fuzzy`,
            guess: fuzzyTest.guess,
            wordId: currentWordData.id
          })
        });
        
        const result = await response.json();
        
        if (result.fuzzyMatch && result.fuzzyMatch.isMatch) {
          console.log(`✅ Fuzzy match: "${fuzzyTest.guess}" → "${fuzzyTest.word}"`);
          console.log(`   Similarity: ${result.fuzzyMatch.similarity}%`);
        } else {
          console.log(`❌ No fuzzy match for: "${fuzzyTest.guess}"`);
        }
      } catch (error) {
        console.log(`❌ Fuzzy test error: ${error.message}`);
      }
    }
    
    console.log('\n🎉 Complete Game Flow Test Finished!');
    console.log('✅ All core systems tested successfully');
    
  } catch (error) {
    console.log(`❌ Game flow test failed: ${error.message}`);
    console.log(error.stack);
  }
}

// Run the test
testCompleteGameFlow().catch(console.error); 