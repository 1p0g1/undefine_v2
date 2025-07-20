#!/usr/bin/env node

/**
 * Test Domain Exclusion Fix for Theme Matching
 * 
 * This script tests the improved semantic similarity system that prevents
 * inappropriate cross-domain matches like "basketball" vs "baseball".
 * 
 * Run with: node test_domain_exclusion_fix.js
 */

const { matchThemeWithFuzzy } = require('./src/utils/semanticSimilarity');

// Test cases that should be REJECTED (domain exclusions)
const REJECTION_TEST_CASES = [
  // Sports conflicts (the main issue)
  { guess: 'basketball', theme: 'baseball', reason: 'Different sports' },
  { guess: 'football', theme: 'tennis', reason: 'Different sports' },
  { guess: 'soccer', theme: 'hockey', reason: 'Different sports' },
  
  // Food conflicts  
  { guess: 'apple', theme: 'chicken', reason: 'Fruit vs meat' },
  { guess: 'broccoli', theme: 'salmon', reason: 'Vegetable vs fish' },
  { guess: 'banana', theme: 'carrot', reason: 'Fruit vs vegetable' },
  
  // Color conflicts
  { guess: 'red', theme: 'blue', reason: 'Different colors' },
  { guess: 'green', theme: 'purple', reason: 'Different colors' },
  
  // Animal conflicts
  { guess: 'dog', theme: 'eagle', reason: 'Mammal vs bird' },
  { guess: 'salmon', theme: 'lion', reason: 'Fish vs mammal' },
  
  // Instrument conflicts
  { guess: 'piano', theme: 'guitar', reason: 'Different instruments' }
];

// Test cases that should be ACCEPTED (valid matches)
const ACCEPTANCE_TEST_CASES = [
  // Category matches
  { guess: 'basketball', theme: 'sports', reason: 'Specific sport to general category' },
  { guess: 'sports', theme: 'basketball', reason: 'General category to specific sport' },
  { guess: 'apple', theme: 'food', reason: 'Specific food to general category' },
  
  // Semantic matches
  { guess: 'boozing', theme: 'drinking alcohol', reason: 'Valid semantic similarity' },
  { guess: 'mythology', theme: 'legends', reason: 'Valid semantic similarity' },
  { guess: 'emotions', theme: 'feelings', reason: 'Valid synonyms' },
  
  // Same domain matches
  { guess: 'apple', theme: 'orange', reason: 'Both fruits - should use AI similarity' },
  { guess: 'dog', theme: 'cat', reason: 'Both mammals - should use AI similarity' }
];

async function runTests() {
  console.log('🧪 Testing Domain Exclusion Fix for Theme Matching\n');
  console.log('=' .repeat(60));
  
  let rejectionPassed = 0;
  let rejectionTotal = REJECTION_TEST_CASES.length;
  
  console.log('\n📛 TESTING REJECTIONS (These should all be rejected):');
  console.log('-'.repeat(50));
  
  for (const testCase of REJECTION_TEST_CASES) {
    try {
      const result = await matchThemeWithFuzzy(testCase.guess, testCase.theme);
      const shouldReject = !result.isMatch;
      
      console.log(`${shouldReject ? '✅' : '❌'} "${testCase.guess}" vs "${testCase.theme}"`);
      console.log(`   Reason: ${testCase.reason}`);
      console.log(`   Result: ${result.isMatch ? 'MATCH' : 'NO MATCH'} (${result.confidence}%)`);
      console.log(`   Method: ${result.method}${result.error ? ', ' + result.error : ''}`);
      console.log('');
      
      if (shouldReject) rejectionPassed++;
    } catch (error) {
      console.log(`❌ "${testCase.guess}" vs "${testCase.theme}" - ERROR: ${error.message}`);
    }
  }
  
  let acceptancePassed = 0;
  let acceptanceTotal = ACCEPTANCE_TEST_CASES.length;
  
  console.log('\n✅ TESTING ACCEPTANCES (These should be accepted or evaluated by AI):');
  console.log('-'.repeat(50));
  
  for (const testCase of ACCEPTANCE_TEST_CASES) {
    try {
      const result = await matchThemeWithFuzzy(testCase.guess, testCase.theme);
      const shouldAcceptOrEvaluate = result.isMatch || (result.method === 'semantic' && result.confidence > 0);
      
      console.log(`${shouldAcceptOrEvaluate ? '✅' : '❌'} "${testCase.guess}" vs "${testCase.theme}"`);
      console.log(`   Reason: ${testCase.reason}`);
      console.log(`   Result: ${result.isMatch ? 'MATCH' : 'NO MATCH'} (${result.confidence}%)`);
      console.log(`   Method: ${result.method}`);
      console.log('');
      
      if (shouldAcceptOrEvaluate) acceptancePassed++;
    } catch (error) {
      console.log(`❌ "${testCase.guess}" vs "${testCase.theme}" - ERROR: ${error.message}`);
    }
  }
  
  // Summary
  console.log('=' .repeat(60));
  console.log('📊 TEST SUMMARY:');
  console.log(`📛 Rejections: ${rejectionPassed}/${rejectionTotal} (${Math.round(rejectionPassed/rejectionTotal*100)}%)`);
  console.log(`✅ Acceptances: ${acceptancePassed}/${acceptanceTotal} (${Math.round(acceptancePassed/acceptanceTotal*100)}%)`);
  console.log(`🎯 Overall: ${rejectionPassed + acceptancePassed}/${rejectionTotal + acceptanceTotal} (${Math.round((rejectionPassed + acceptancePassed)/(rejectionTotal + acceptanceTotal)*100)}%)`);
  
  if (rejectionPassed === rejectionTotal && acceptancePassed >= Math.floor(acceptanceTotal * 0.8)) {
    console.log('\n🎉 DOMAIN EXCLUSION FIX WORKING CORRECTLY!');
    console.log('   ✅ All inappropriate matches rejected');
    console.log('   ✅ Most appropriate matches accepted or properly evaluated');
  } else {
    console.log('\n⚠️  DOMAIN EXCLUSION NEEDS ADJUSTMENT');
    console.log(`   ${rejectionPassed < rejectionTotal ? '❌ Some inappropriate matches still accepted' : '✅ All inappropriate matches rejected'}`);
    console.log(`   ${acceptancePassed < Math.floor(acceptanceTotal * 0.8) ? '❌ Too many appropriate matches rejected' : '✅ Most appropriate matches handled correctly'}`);
  }
}

if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { runTests }; 