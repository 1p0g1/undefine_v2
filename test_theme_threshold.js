#!/usr/bin/env node

/**
 * Theme Threshold Testing Script
 * 
 * Simple, focused testing to find the optimal similarity threshold
 * for theme matching that prevents inappropriate matches while
 * preserving valid semantic similarity.
 * 
 * Run with: node test_theme_threshold.js [threshold]
 * Example: node test_theme_threshold.js 0.85
 */

// Mock the semantic similarity function for testing different thresholds
const mockSemanticSimilarities = {
  // The problematic case that needs to be fixed
  'basketball|baseball': 0.75,
  'baseball|basketball': 0.75,
  
  // Other potentially problematic cross-matches
  'football|basketball': 0.68,
  'tennis|soccer': 0.62,
  'hockey|baseball': 0.58,
  
  // Valid semantic matches that should still work
  'boozing|drinking alcohol': 0.92,
  'drinking alcohol|boozing': 0.92,
  'mythology|legends': 0.88,
  'legends|mythology': 0.88,
  'emotions|feelings': 0.94,
  'feelings|emotions': 0.94,
  'space|cosmos': 0.91,
  'cosmos|space': 0.91,
  
  // Category matches that should work
  'basketball|sports': 0.82,
  'sports|basketball': 0.82,
  'apple|food': 0.79,
  'food|apple': 0.79,
  
  // Edge cases - borderline matches
  'happy|emotions': 0.76,
  'car|transportation': 0.85,
  'book|literature': 0.89,
  
  // Clear rejections
  'random|drinking alcohol': 0.23,
  'hello|emotions': 0.18,
  'numbers|literature': 0.31
};

function getMockSimilarity(guess, theme) {
  const key1 = `${guess.toLowerCase()}|${theme.toLowerCase()}`;
  const key2 = `${theme.toLowerCase()}|${guess.toLowerCase()}`;
  return mockSemanticSimilarities[key1] || mockSemanticSimilarities[key2] || 0.0;
}

const TEST_CASES = [
  // PRIMARY ISSUE: Sports cross-matching
  { 
    guess: 'basketball', 
    theme: 'baseball', 
    category: 'PROBLEMATIC CROSS-MATCH',
    expectedResult: 'REJECT',
    priority: 'HIGH'
  },
  { 
    guess: 'football', 
    theme: 'basketball', 
    category: 'PROBLEMATIC CROSS-MATCH',
    expectedResult: 'REJECT',
    priority: 'HIGH' 
  },
  { 
    guess: 'tennis', 
    theme: 'soccer', 
    category: 'PROBLEMATIC CROSS-MATCH',
    expectedResult: 'REJECT',
    priority: 'MEDIUM'
  },
  
  // VALID SEMANTIC MATCHES - should still work
  { 
    guess: 'boozing', 
    theme: 'drinking alcohol', 
    category: 'VALID SEMANTIC',
    expectedResult: 'ACCEPT',
    priority: 'HIGH'
  },
  { 
    guess: 'mythology', 
    theme: 'legends', 
    category: 'VALID SEMANTIC',
    expectedResult: 'ACCEPT',
    priority: 'HIGH'
  },
  { 
    guess: 'emotions', 
    theme: 'feelings', 
    category: 'VALID SEMANTIC',
    expectedResult: 'ACCEPT',
    priority: 'HIGH'
  },
  { 
    guess: 'space', 
    theme: 'cosmos', 
    category: 'VALID SEMANTIC',
    expectedResult: 'ACCEPT',
    priority: 'HIGH'
  },
  
  // CATEGORY MATCHES - borderline, depends on threshold
  { 
    guess: 'basketball', 
    theme: 'sports', 
    category: 'CATEGORY MATCH',
    expectedResult: 'BORDERLINE',
    priority: 'MEDIUM'
  },
  { 
    guess: 'car', 
    theme: 'transportation', 
    category: 'CATEGORY MATCH',
    expectedResult: 'BORDERLINE',
    priority: 'MEDIUM'
  },
  { 
    guess: 'book', 
    theme: 'literature', 
    category: 'CATEGORY MATCH',
    expectedResult: 'BORDERLINE',
    priority: 'MEDIUM'
  },
  
  // CLEAR REJECTIONS - should always fail
  { 
    guess: 'random', 
    theme: 'drinking alcohol', 
    category: 'CLEAR REJECTION',
    expectedResult: 'REJECT',
    priority: 'LOW'
  }
];

async function testThreshold(threshold = 0.90) {
  console.log(`🧪 Testing Theme Matching with ${Math.round(threshold * 100)}% Threshold`);
  console.log('=' .repeat(70));
  
  const results = {
    highPriorityPassed: 0,
    highPriorityTotal: 0,
    totalPassed: 0,
    totalTests: TEST_CASES.length,
    problematicFixed: 0,
    problematicTotal: 0,
    validPreserved: 0,
    validTotal: 0
  };
  
  for (const testCase of TEST_CASES) {
    const similarity = getMockSimilarity(testCase.guess, testCase.theme);
    const wouldMatch = similarity >= threshold;
    
    // Determine if this result is correct
    let isCorrect = false;
    if (testCase.expectedResult === 'ACCEPT') {
      isCorrect = wouldMatch;
    } else if (testCase.expectedResult === 'REJECT') {
      isCorrect = !wouldMatch;
    } else if (testCase.expectedResult === 'BORDERLINE') {
      // Borderline cases are acceptable either way
      isCorrect = true;
    }
    
    // Track specific categories
    if (testCase.category === 'PROBLEMATIC CROSS-MATCH') {
      results.problematicTotal++;
      if (!wouldMatch) results.problematicFixed++;
    }
    if (testCase.category === 'VALID SEMANTIC') {
      results.validTotal++;
      if (wouldMatch) results.validPreserved++;
    }
    if (testCase.priority === 'HIGH') {
      results.highPriorityTotal++;
      if (isCorrect) results.highPriorityPassed++;
    }
    
    if (isCorrect) results.totalPassed++;
    
    // Display result
    const status = isCorrect ? '✅' : '❌';
    const matchStatus = wouldMatch ? 'MATCH' : 'REJECT';
    const sim = Math.round(similarity * 100);
    
    console.log(`${status} ${matchStatus} (${sim}%) | "${testCase.guess}" vs "${testCase.theme}"`);
    console.log(`   Category: ${testCase.category} | Priority: ${testCase.priority} | Expected: ${testCase.expectedResult}`);
    console.log('');
  }
  
  // Summary
  console.log('=' .repeat(70));
  console.log('📊 THRESHOLD ANALYSIS SUMMARY:');
  console.log(`🎯 Overall Score: ${results.totalPassed}/${results.totalTests} (${Math.round(results.totalPassed/results.totalTests*100)}%)`);
  console.log(`⚡ High Priority: ${results.highPriorityPassed}/${results.highPriorityTotal} (${Math.round(results.highPriorityPassed/results.highPriorityTotal*100)}%)`);
  console.log(`🚫 Problematic Fixed: ${results.problematicFixed}/${results.problematicTotal} (${Math.round(results.problematicFixed/results.problematicTotal*100)}%)`);
  console.log(`✅ Valid Preserved: ${results.validPreserved}/${results.validTotal} (${Math.round(results.validPreserved/results.validTotal*100)}%)`);
  console.log('');
  
  // Key insight
  const basketballBaseballFixed = getMockSimilarity('basketball', 'baseball') < threshold;
  console.log(`🏀⚾ Basketball/Baseball Issue: ${basketballBaseballFixed ? 'FIXED ✅' : 'NOT FIXED ❌'}`);
  console.log(`    Basketball vs Baseball similarity: ${Math.round(getMockSimilarity('basketball', 'baseball') * 100)}%`);
  console.log(`    Threshold: ${Math.round(threshold * 100)}% → ${basketballBaseballFixed ? 'REJECTED' : 'ACCEPTED'}`);
  
  // Recommendation
  console.log('');
  if (results.problematicFixed === results.problematicTotal && results.validPreserved >= results.validTotal * 0.75) {
    console.log('🎉 RECOMMENDATION: This threshold looks good!');
    console.log('   ✅ All problematic matches fixed');
    console.log('   ✅ Most valid matches preserved');
  } else if (results.problematicFixed < results.problematicTotal) {
    console.log('⚠️  RECOMMENDATION: Threshold too low');
    console.log('   ❌ Some problematic matches still accepted');
    console.log('   💡 Try a higher threshold (e.g., +5%)');
  } else {
    console.log('⚠️  RECOMMENDATION: Threshold might be too high');
    console.log('   ❌ Too many valid matches rejected');
    console.log('   💡 Try a slightly lower threshold (e.g., -2%)');
  }
  
  return results;
}

// Test multiple thresholds if run directly
async function runThresholdComparison() {
  const thresholds = [0.80, 0.85, 0.90, 0.95];
  
  console.log('🔬 THRESHOLD COMPARISON ANALYSIS');
  console.log('=' .repeat(70));
  console.log('Testing multiple thresholds to find optimal value...\n');
  
  const comparisonResults = [];
  
  for (const threshold of thresholds) {
    console.log(`\n${'='.repeat(20)} ${Math.round(threshold * 100)}% THRESHOLD ${'='.repeat(20)}`);
    const result = await testThreshold(threshold);
    comparisonResults.push({
      threshold,
      score: result.totalPassed / result.totalTests,
      problematicFixed: result.problematicFixed === result.problematicTotal,
      validPreserved: result.validPreserved / result.validTotal
    });
  }
  
  // Find best threshold
  console.log('\n\n🏆 THRESHOLD COMPARISON SUMMARY:');
  console.log('=' .repeat(70));
  
  for (const result of comparisonResults) {
    const score = Math.round(result.score * 100);
    const valid = Math.round(result.validPreserved * 100);
    const status = result.problematicFixed ? '✅' : '❌';
    
    console.log(`${status} ${Math.round(result.threshold * 100)}%: Overall ${score}% | Valid Preserved ${valid}%`);
  }
  
  // Recommendation
  const recommended = comparisonResults.find(r => r.problematicFixed && r.validPreserved >= 0.75) || 
                     comparisonResults.find(r => r.problematicFixed) ||
                     comparisonResults[comparisonResults.length - 1];
  
  console.log(`\n🎯 RECOMMENDED THRESHOLD: ${Math.round(recommended.threshold * 100)}%`);
  console.log(`   Basketball/Baseball fixed: ${recommended.problematicFixed ? 'YES' : 'NO'}`);
  console.log(`   Valid matches preserved: ${Math.round(recommended.validPreserved * 100)}%`);
}

if (require.main === module) {
  const threshold = process.argv[2] ? parseFloat(process.argv[2]) : null;
  
  if (threshold) {
    testThreshold(threshold).catch(console.error);
  } else {
    runThresholdComparison().catch(console.error);
  }
}

module.exports = { testThreshold, TEST_CASES }; 