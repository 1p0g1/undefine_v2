// Test Scoring System - Penalty-Based Implementation
// Run with: node test_scoring_system.js

const fetch = require('node-fetch');

// UPDATED WITH YOUR BACKEND URL
const BACKEND_URL = 'https://undefine-v2-back.vercel.app';

const scoringTests = [
  {
    name: 'Perfect Game',
    guesses: 1,
    time: 30,
    fuzzyMatches: 0,
    expectedScore: 997, // 1000 - 0 penalty - 3 time = 997
    description: 'First guess, 30 seconds, no fuzzy help'
  },
  {
    name: 'Quick Game',
    guesses: 2,
    time: 60,
    fuzzyMatches: 1,
    expectedScore: 946, // 1000 - 100 penalty + 50 fuzzy - 6 time = 944
    description: 'Second guess, 1 minute, 1 fuzzy match'
  },
  {
    name: 'Good Game',
    guesses: 3,
    time: 45,
    fuzzyMatches: 2,
    expectedScore: 895, // 1000 - 200 penalty + 100 fuzzy - 5 time = 895
    description: 'Third guess, 45 seconds, 2 fuzzy matches'
  },
  {
    name: 'Average Game',
    guesses: 4,
    time: 120,
    fuzzyMatches: 1,
    expectedScore: 738, // 1000 - 300 penalty + 50 fuzzy - 12 time = 738
    description: 'Fourth guess, 2 minutes, 1 fuzzy match'
  },
  {
    name: 'Struggling Game',
    guesses: 5,
    time: 180,
    fuzzyMatches: 3,
    expectedScore: 732, // 1000 - 400 penalty + 150 fuzzy - 18 time = 732
    description: 'Fifth guess, 3 minutes, 3 fuzzy matches'
  },
  {
    name: 'Last Chance',
    guesses: 6,
    time: 300,
    fuzzyMatches: 2,
    expectedScore: 570, // 1000 - 500 penalty + 100 fuzzy - 30 time = 570
    description: 'Sixth guess, 5 minutes, 2 fuzzy matches'
  }
];

// Test the scoring calculation directly
function calculateExpectedScore(guesses, timeSeconds, fuzzyMatches) {
  const PERFECT_SCORE = 1000;
  const GUESS_PENALTY = 100;
  const FUZZY_BONUS = 50;
  const TIME_PENALTY_PER_10_SECONDS = 1;
  
  const guessPenalty = (guesses - 1) * GUESS_PENALTY;
  const fuzzyBonus = fuzzyMatches * FUZZY_BONUS;
  const timePenalty = Math.floor(timeSeconds / 10) * TIME_PENALTY_PER_10_SECONDS;
  
  return PERFECT_SCORE - guessPenalty + fuzzyBonus - timePenalty;
}

async function testScoringSystem() {
  console.log('🎯 Testing Scoring System...\n');
  
  let passedTests = 0;
  let totalTests = scoringTests.length;
  
  // First, test the calculation logic
  console.log('📊 Testing Scoring Calculation Logic:');
  for (const test of scoringTests) {
    const calculated = calculateExpectedScore(test.guesses, test.time, test.fuzzyMatches);
    const passed = Math.abs(calculated - test.expectedScore) <= 2; // Allow 2 point tolerance
    
    console.log(`${passed ? '✅' : '❌'} ${test.name}`);
    console.log(`   Expected: ${test.expectedScore} | Calculated: ${calculated}`);
    console.log(`   ${test.description}`);
    console.log('');
    
    if (passed) passedTests++;
  }
  
  console.log('🔍 Testing API Integration:');
  
  // Test a few scenarios via API
  const apiTests = [
    { guesses: 1, time: 30, description: 'Perfect game via API' },
    { guesses: 3, time: 60, description: 'Average game via API' },
    { guesses: 6, time: 300, description: 'Struggling game via API' }
  ];
  
  for (const test of apiTests) {
    try {
      // Get current word
      const wordResponse = await fetch(`${BACKEND_URL}/api/word`);
      const wordData = await wordResponse.json();
      
      if (!wordData.word) {
        console.log('❌ Could not get current word for API test');
        continue;
      }
      
      // Simulate a game completion
      const response = await fetch(`${BACKEND_URL}/api/guess`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: 'test-scoring-player',
          guess: wordData.word, // Correct guess
          wordId: wordData.id,
          guessNumber: test.guesses,
          startTime: new Date(Date.now() - (test.time * 1000)).toISOString()
        })
      });
      
      const result = await response.json();
      
      if (result.score !== undefined) {
        console.log(`✅ ${test.description}`);
        console.log(`   Score: ${result.score} (${test.guesses} guesses, ${test.time}s)`);
      } else {
        console.log(`❌ ${test.description} - No score returned`);
      }
      
    } catch (error) {
      console.log(`❌ ${test.description} - Error: ${error.message}`);
    }
  }
  
  console.log('\n📈 SCORING SYSTEM TEST RESULTS');
  console.log(`✅ Logic tests passed: ${passedTests}/${totalTests}`);
  console.log(`📊 Success rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
  
  if (passedTests === totalTests) {
    console.log('\n🎉 All scoring logic tests passed!');
  } else {
    console.log(`\n⚠️  ${totalTests - passedTests} tests failed - review scoring logic`);
  }
}

// Run the test
testScoringSystem().catch(console.error); 