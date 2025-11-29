#!/usr/bin/env node
/**
 * Test script for validating theme synonym matching improvements
 * 
 * Phase 1 Changes:
 * - Enhanced contextual prompting (synonym-aware)
 * - Lowered threshold from 85% to 78%
 * 
 * Tests:
 * - Valid synonyms (should score ≥78%)
 * - Invalid matches (should score <70%)
 * - Edge cases (borderline matches)
 */

const { matchThemeWithFuzzy } = require('../src/utils/semanticSimilarity.ts');

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
};

// Test cases
const testCases = {
  validSynonyms: [
    { 
      guess: "boozing", 
      theme: "drinking alcohol", 
      expectedMin: 80,
      description: "Single-word synonym for phrase"
    },
    { 
      guess: "legends", 
      theme: "mythology", 
      expectedMin: 75,
      description: "Related concept synonym"
    },
    { 
      guess: "autological", 
      theme: "words that describe themselves", 
      expectedMin: 75,
      description: "Technical term for descriptive phrase"
    },
    { 
      guess: "evolution", 
      theme: "words changing meaning over time", 
      expectedMin: 70,
      description: "Concept name for process description"
    },
    { 
      guess: "fear", 
      theme: "phobias", 
      expectedMin: 85,
      description: "Root concept for specialized term"
    },
    { 
      guess: "space", 
      theme: "astronomy", 
      expectedMin: 80,
      description: "Related field synonym"
    },
    { 
      guess: "changing over time", 
      theme: "words changing meaning over time", 
      expectedMin: 75,
      description: "Partial match with extra context"
    },
    { 
      guess: "words evolving", 
      theme: "words changing meaning over time", 
      expectedMin: 80,
      description: "Paraphrase with similar structure"
    },
    { 
      guess: "semantic shift", 
      theme: "words changing meaning over time", 
      expectedMin: 75,
      description: "Technical term for concept"
    },
    { 
      guess: "self-describing words", 
      theme: "words that describe themselves", 
      expectedMin: 85,
      description: "Direct paraphrase"
    }
  ],
  
  invalidMatches: [
    { 
      guess: "basketball", 
      theme: "baseball", 
      expectedMax: 60,
      description: "Similar sports (should not match)"
    },
    { 
      guess: "guitar", 
      theme: "elephant", 
      expectedMax: 20,
      description: "Completely unrelated words"
    },
    { 
      guess: "fruit", 
      theme: "words changing meaning over time", 
      expectedMax: 30,
      description: "Random word vs specific theme"
    },
    { 
      guess: "changer", 
      theme: "fear", 
      expectedMax: 25,
      description: "Word fragment vs unrelated concept"
    },
    { 
      guess: "music", 
      theme: "astronomy", 
      expectedMax: 30,
      description: "Different unrelated fields"
    }
  ],
  
  edgeCases: [
    { 
      guess: "phobia", 
      theme: "fear", 
      expectedRange: [60, 85],
      description: "Related but not exact synonym (borderline)"
    },
    { 
      guess: "space exploration", 
      theme: "astronomy", 
      expectedRange: [70, 90],
      description: "More specific than theme"
    },
    { 
      guess: "words", 
      theme: "words changing meaning over time", 
      expectedRange: [40, 70],
      description: "Partial match - key word only"
    }
  ]
};

// Test statistics
let stats = {
  validSynonyms: { passed: 0, failed: 0, tests: [] },
  invalidMatches: { passed: 0, failed: 0, tests: [] },
  edgeCases: { passed: 0, failed: 0, tests: [] }
};

/**
 * Run a single test case
 */
async function runTest(testCase, category) {
  try {
    const result = await matchThemeWithFuzzy(testCase.guess, testCase.theme);
    const score = Math.round(result.similarity * 100);
    
    let passed = false;
    let expectedText = '';
    
    if (category === 'validSynonyms') {
      passed = score >= testCase.expectedMin;
      expectedText = `≥${testCase.expectedMin}%`;
    } else if (category === 'invalidMatches') {
      passed = score < testCase.expectedMax;
      expectedText = `<${testCase.expectedMax}%`;
    } else if (category === 'edgeCases') {
      passed = score >= testCase.expectedRange[0] && score <= testCase.expectedRange[1];
      expectedText = `${testCase.expectedRange[0]}-${testCase.expectedRange[1]}%`;
    }
    
    const statusIcon = passed ? '✓' : '✗';
    const statusColor = passed ? colors.green : colors.red;
    
    console.log(`  ${statusColor}${statusIcon}${colors.reset} "${testCase.guess}" → "${testCase.theme}"`);
    console.log(`    ${colors.gray}Score: ${score}% | Expected: ${expectedText} | ${testCase.description}${colors.reset}`);
    
    stats[category].tests.push({
      ...testCase,
      score,
      passed,
      result
    });
    
    if (passed) {
      stats[category].passed++;
    } else {
      stats[category].failed++;
    }
    
    return { passed, score, result };
    
  } catch (error) {
    console.log(`  ${colors.red}✗ ERROR${colors.reset} "${testCase.guess}" → "${testCase.theme}"`);
    console.log(`    ${colors.red}${error.message}${colors.reset}`);
    stats[category].failed++;
    return { passed: false, error };
  }
}

/**
 * Print section header
 */
function printHeader(title) {
  console.log(`\n${colors.cyan}${'='.repeat(80)}${colors.reset}`);
  console.log(`${colors.cyan}${title}${colors.reset}`);
  console.log(`${colors.cyan}${'='.repeat(80)}${colors.reset}\n`);
}

/**
 * Print test results summary
 */
function printSummary() {
  console.log(`\n${colors.blue}${'='.repeat(80)}${colors.reset}`);
  console.log(`${colors.blue}TEST SUMMARY${colors.reset}`);
  console.log(`${colors.blue}${'='.repeat(80)}${colors.reset}\n`);
  
  const categories = ['validSynonyms', 'invalidMatches', 'edgeCases'];
  const categoryNames = {
    validSynonyms: 'Valid Synonyms (True Positives)',
    invalidMatches: 'Invalid Matches (True Negatives)',
    edgeCases: 'Edge Cases (Borderline)'
  };
  
  let totalPassed = 0;
  let totalFailed = 0;
  
  categories.forEach(category => {
    const { passed, failed } = stats[category];
    const total = passed + failed;
    const percentage = total > 0 ? Math.round((passed / total) * 100) : 0;
    const statusColor = percentage >= 80 ? colors.green : percentage >= 60 ? colors.yellow : colors.red;
    
    console.log(`${categoryNames[category]}:`);
    console.log(`  ${statusColor}${passed}/${total} passed (${percentage}%)${colors.reset}\n`);
    
    totalPassed += passed;
    totalFailed += failed;
  });
  
  const totalTests = totalPassed + totalFailed;
  const overallPercentage = totalTests > 0 ? Math.round((totalPassed / totalTests) * 100) : 0;
  const overallColor = overallPercentage >= 80 ? colors.green : overallPercentage >= 60 ? colors.yellow : colors.red;
  
  console.log(`${colors.blue}Overall:${colors.reset}`);
  console.log(`  ${overallColor}${totalPassed}/${totalTests} passed (${overallPercentage}%)${colors.reset}\n`);
  
  // Print recommendations
  console.log(`${colors.blue}${'='.repeat(80)}${colors.reset}`);
  console.log(`${colors.blue}RECOMMENDATIONS${colors.reset}`);
  console.log(`${colors.blue}${'='.repeat(80)}${colors.reset}\n`);
  
  if (overallPercentage >= 90) {
    console.log(`${colors.green}✓ Excellent! Phase 1 changes are working well.${colors.reset}`);
    console.log(`  Ready to deploy to theme-improvements branch.\n`);
  } else if (overallPercentage >= 80) {
    console.log(`${colors.yellow}⚠ Good, but some edge cases need attention.${colors.reset}`);
    console.log(`  Review failed tests and consider threshold adjustment.\n`);
  } else if (overallPercentage >= 60) {
    console.log(`${colors.yellow}⚠ Moderate improvement. May need Phase 2 enhancements.${colors.reset}`);
    console.log(`  Consider synonym expansion layer or multi-model approach.\n`);
  } else {
    console.log(`${colors.red}✗ Phase 1 changes insufficient. Implement Phase 2.${colors.reset}`);
    console.log(`  Recommend synonym expansion or manual override database.\n`);
  }
  
  // Specific recommendations based on category performance
  if (stats.validSynonyms.passed / (stats.validSynonyms.passed + stats.validSynonyms.failed) < 0.8) {
    console.log(`${colors.yellow}⚠ Valid synonyms not matching well enough.${colors.reset}`);
    console.log(`  Consider lowering threshold further (78% → 75%) or enhancing prompts.\n`);
  }
  
  if (stats.invalidMatches.passed / (stats.invalidMatches.passed + stats.invalidMatches.failed) < 0.9) {
    console.log(`${colors.red}✗ Warning: False positives detected!${colors.reset}`);
    console.log(`  Threshold may be too low. Review failed invalid matches.\n`);
  }
  
  // Print detailed failures
  const failures = [];
  categories.forEach(category => {
    stats[category].tests.forEach(test => {
      if (!test.passed) {
        failures.push({ category, test });
      }
    });
  });
  
  if (failures.length > 0) {
    console.log(`${colors.red}${'='.repeat(80)}${colors.reset}`);
    console.log(`${colors.red}FAILED TESTS (${failures.length})${colors.reset}`);
    console.log(`${colors.red}${'='.repeat(80)}${colors.reset}\n`);
    
    failures.forEach(({ category, test }) => {
      console.log(`${colors.red}✗${colors.reset} [${categoryNames[category]}]`);
      console.log(`  Guess: "${test.guess}" → Theme: "${test.theme}"`);
      console.log(`  Score: ${test.score}% | ${test.description}`);
      
      if (category === 'validSynonyms') {
        console.log(`  ${colors.red}Expected: ≥${test.expectedMin}% (too low!)${colors.reset}\n`);
      } else if (category === 'invalidMatches') {
        console.log(`  ${colors.red}Expected: <${test.expectedMax}% (false positive!)${colors.reset}\n`);
      } else {
        console.log(`  ${colors.red}Expected: ${test.expectedRange[0]}-${test.expectedRange[1]}%${colors.reset}\n`);
      }
    });
  }
}

/**
 * Main test runner
 */
async function runAllTests() {
  console.log(`${colors.cyan}╔${'═'.repeat(78)}╗${colors.reset}`);
  console.log(`${colors.cyan}║${' '.repeat(20)}THEME SYNONYM MATCHING TEST SUITE${' '.repeat(24)}║${colors.reset}`);
  console.log(`${colors.cyan}╚${'═'.repeat(78)}╝${colors.reset}`);
  console.log(`\n${colors.gray}Phase 1 Changes:${colors.reset}`);
  console.log(`${colors.gray}  • Enhanced contextual prompting (synonym-aware)${colors.reset}`);
  console.log(`${colors.gray}  • Lowered threshold: 85% → 78%${colors.reset}`);
  console.log(`${colors.gray}  • Date: ${new Date().toLocaleString()}${colors.reset}`);
  
  // Test valid synonyms
  printHeader('TEST CATEGORY 1: Valid Synonyms (Should Match)');
  for (const testCase of testCases.validSynonyms) {
    await runTest(testCase, 'validSynonyms');
  }
  
  // Test invalid matches
  printHeader('TEST CATEGORY 2: Invalid Matches (Should NOT Match)');
  for (const testCase of testCases.invalidMatches) {
    await runTest(testCase, 'invalidMatches');
  }
  
  // Test edge cases
  printHeader('TEST CATEGORY 3: Edge Cases (Borderline)');
  for (const testCase of testCases.edgeCases) {
    await runTest(testCase, 'edgeCases');
  }
  
  // Print summary
  printSummary();
}

// Run tests
console.log(`${colors.gray}Initializing test suite...${colors.reset}\n`);
runAllTests().catch(error => {
  console.error(`${colors.red}Fatal error running tests:${colors.reset}`, error);
  process.exit(1);
});

