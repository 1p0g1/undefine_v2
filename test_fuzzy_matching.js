// Test Fuzzy Matching System Performance & Accuracy
// Run with: node test_fuzzy_matching.js

const fetch = require('node-fetch');

// UPDATED WITH YOUR BACKEND URL
const BACKEND_URL = 'https://undefine-v2-back.vercel.app';

const testCases = [
  // Common typos (should match)
  { word: 'MOVEMENT', guess: 'MOVMENT', shouldMatch: true, description: 'Missing letter' },
  { word: 'DEFINE', guess: 'DEFIEN', shouldMatch: true, description: 'Letter swap' },
  { word: 'SEPARATE', guess: 'SEPERATE', shouldMatch: true, description: 'Common misspelling' },
  { word: 'RECEIVE', guess: 'RECIEVE', shouldMatch: true, description: 'IE vs EI confusion' },
  { word: 'WORD', guess: 'QORD', shouldMatch: true, description: 'Keyboard typo' },
  
  // Anagrams (should NOT match)
  { word: 'LISTEN', guess: 'SILENT', shouldMatch: false, description: 'Anagram rejection' },
  { word: 'EVIL', guess: 'VILE', shouldMatch: false, description: 'Anagram rejection' },
  { word: 'HEART', guess: 'EARTH', shouldMatch: false, description: 'Anagram rejection' },
  
  // Completely different words (should NOT match)
  { word: 'MOVEMENT', guess: 'HAPPINESS', shouldMatch: false, description: 'Different concept' },
  { word: 'DEFINE', guess: 'EXAMPLE', shouldMatch: false, description: 'Different concept' },
  
  // Edge cases
  { word: 'MOVEMENT', guess: 'MOVEMENT', shouldMatch: true, description: 'Exact match' },
  { word: 'MOVEMENT', guess: 'movement', shouldMatch: true, description: 'Case insensitive' },
];

async function testFuzzyMatching() {
  console.log('🔍 Testing Fuzzy Matching System...\n');
  
  let passedTests = 0;
  let totalTests = testCases.length;
  const startTime = Date.now();
  
  for (const testCase of testCases) {
    try {
      const response = await fetch(`${BACKEND_URL}/api/guess`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: 'test-player-id',
          guess: testCase.guess,
          wordId: 'test-word-id'
        })
      });
      
      const result = await response.json();
      
      // Check if fuzzy match was detected
      const isFuzzyMatch = result.fuzzyMatch && result.fuzzyMatch.isMatch;
      const passed = isFuzzyMatch === testCase.shouldMatch;
      
      console.log(`${passed ? '✅' : '❌'} ${testCase.description}`);
      console.log(`   Word: ${testCase.word} | Guess: ${testCase.guess}`);
      console.log(`   Expected: ${testCase.shouldMatch ? 'MATCH' : 'NO MATCH'} | Got: ${isFuzzyMatch ? 'MATCH' : 'NO MATCH'}`);
      
      if (result.fuzzyMatch && result.fuzzyMatch.isMatch) {
        console.log(`   Similarity: ${result.fuzzyMatch.similarity}% | Method: ${result.fuzzyMatch.method}`);
      }
      
      console.log('');
      
      if (passed) passedTests++;
      
    } catch (error) {
      console.log(`❌ Error testing ${testCase.description}: ${error.message}\n`);
    }
  }
  
  const endTime = Date.now();
  const totalTime = endTime - startTime;
  const avgTime = totalTime / totalTests;
  
  console.log('📊 FUZZY MATCHING TEST RESULTS');
  console.log(`✅ Passed: ${passedTests}/${totalTests} tests`);
  console.log(`⏱️  Average time: ${avgTime.toFixed(1)}ms per test`);
  console.log(`🚀 Total time: ${totalTime}ms`);
  console.log(`📈 Success rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
  
  if (passedTests === totalTests) {
    console.log('\n🎉 All fuzzy matching tests passed!');
  } else {
    console.log(`\n⚠️  ${totalTests - passedTests} tests failed - review fuzzy matching logic`);
  }
}

// Run the test
testFuzzyMatching().catch(console.error); 