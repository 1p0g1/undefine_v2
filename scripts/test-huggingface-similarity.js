#!/usr/bin/env node
/**
 * Hugging Face Semantic Similarity Test Script
 * 
 * This script tests different models and thresholds for fuzzy matching
 * in Un•Define's theme and word guessing features.
 * 
 * Usage:
 *   1. Set HF_API_KEY environment variable
 *   2. Run: node scripts/test-huggingface-similarity.js
 */

const HF_API_KEY = process.env.HF_API_KEY;

if (!HF_API_KEY) {
  console.error('❌ Error: HF_API_KEY environment variable not set');
  console.log('   Get your API key from: https://huggingface.co/settings/tokens');
  console.log('   Then run: HF_API_KEY=your_key_here node scripts/test-huggingface-similarity.js');
  process.exit(1);
}

// Models to test
const MODELS = {
  'all-MiniLM-L6-v2': 'sentence-transformers/all-MiniLM-L6-v2',
  'paraphrase-MiniLM-L6-v2': 'sentence-transformers/paraphrase-MiniLM-L6-v2',
  'all-mpnet-base-v2': 'sentence-transformers/all-mpnet-base-v2'
};

// Test cases for theme matching
const THEME_TEST_CASES = [
  // High similarity expected (should match)
  { guess: 'boozing', theme: 'drinking alcohol', expected: 'HIGH', description: 'Colloquial synonym' },
  { guess: 'mythology', theme: 'legends', expected: 'HIGH', description: 'Conceptual similarity' },
  { guess: 'space', theme: 'cosmos', expected: 'HIGH', description: 'Domain synonym' },
  { guess: 'emotions', theme: 'feelings', expected: 'HIGH', description: 'Direct synonym' },
  { guess: 'cars', theme: 'transportation', expected: 'HIGH', description: 'Category member' },
  { guess: 'books', theme: 'literature', expected: 'HIGH', description: 'Domain synonym' },
  
  // Medium similarity (edge cases)
  { guess: 'happy', theme: 'emotions', expected: 'MED', description: 'Specific to general' },
  { guess: 'alcohol', theme: 'drinking alcohol', expected: 'MED', description: 'Partial match' },
  { guess: 'stories', theme: 'literature', expected: 'MED', description: 'Related concept' },
  
  // Low similarity (should NOT match)
  { guess: 'random', theme: 'drinking alcohol', expected: 'LOW', description: 'Unrelated' },
  { guess: 'hello', theme: 'emotions', expected: 'LOW', description: 'Unrelated' },
  { guess: 'numbers', theme: 'literature', expected: 'LOW', description: 'Different domain' }
];

// Test cases for word matching (typos and variations)
const WORD_TEST_CASES = [
  // High similarity (obvious typos)
  { guess: 'DEFIEN', word: 'DEFINE', expected: 'HIGH', description: 'Letter swap' },
  { guess: 'DEVINE', word: 'DEFINE', expected: 'HIGH', description: 'Letter substitution' },
  { guess: 'DEFIN', word: 'DEFINE', expected: 'HIGH', description: 'Missing letter' },
  
  // Medium similarity (similar words)
  { guess: 'REFINE', word: 'DEFINE', expected: 'MED', description: 'Similar word' },
  { guess: 'DESIGN', word: 'DEFINE', expected: 'MED', description: 'Some similarity' },
  { guess: 'DEFEND', word: 'DEFINE', expected: 'MED', description: 'Partial match' },
  
  // Low similarity (different words)
  { guess: 'HELLO', word: 'DEFINE', expected: 'LOW', description: 'Different word' },
  { guess: 'FINISH', word: 'DEFINE', expected: 'LOW', description: 'Unrelated' },
  { guess: 'ZEBRA', word: 'DEFINE', expected: 'LOW', description: 'Completely different' }
];

/**
 * Test semantic similarity with a specific model
 */
async function testSemanticSimilarity(modelName, text1, text2) {
  const apiUrl = `https://api-inference.huggingface.co/models/${modelName}`;
  
  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${HF_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: {
          source_sentence: text1.toLowerCase().trim(),
          sentences: [text2.toLowerCase().trim()]
        }
      })
    });
    
    if (!response.ok) {
      if (response.status === 503) {
        return { error: 'Model loading (try again in 30 seconds)' };
      }
      return { error: `API Error: ${response.status}` };
    }
    
    const result = await response.json();
    return { similarity: result[0] || 0 };
    
  } catch (error) {
    return { error: error.message };
  }
}

/**
 * Simple string similarity for comparison
 */
function stringSimilarity(str1, str2) {
  const len1 = str1.length;
  const len2 = str2.length;
  
  if (len1 === 0) return len2 === 0 ? 1 : 0;
  if (len2 === 0) return 0;
  
  // Levenshtein distance
  const matrix = Array(len1 + 1).fill(null).map(() => Array(len2 + 1).fill(null));
  
  for (let i = 0; i <= len1; i++) matrix[i][0] = i;
  for (let j = 0; j <= len2; j++) matrix[0][j] = j;
  
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  
  const distance = matrix[len1][len2];
  return 1 - distance / Math.max(len1, len2);
}

/**
 * Test a single model with all test cases
 */
async function testModel(modelKey, modelName, testCases, testType) {
  console.log(`\n🧪 Testing ${modelKey} for ${testType} matching:`);
  console.log(`Model: ${modelName}`);
  console.log('─'.repeat(80));
  
  const results = [];
  
  for (const testCase of testCases) {
    const { guess, theme, word, expected, description } = testCase;
    const target = theme || word;
    
    // Test AI similarity
    const aiResult = await testSemanticSimilarity(modelName, guess, target);
    
    // Test string similarity for comparison
    const stringScore = stringSimilarity(guess.toLowerCase(), target.toLowerCase());
    
    if (aiResult.error) {
      console.log(`❌ "${guess}" → "${target}": ${aiResult.error}`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      continue;
    }
    
    const aiScore = aiResult.similarity;
    const aiPercentage = Math.round(aiScore * 100);
    const stringPercentage = Math.round(stringScore * 100);
    
    // Determine thresholds
    const themeThreshold = 0.85;
    const wordThreshold = 0.75;
    const threshold = testType === 'theme' ? themeThreshold : wordThreshold;
    
    const aiMatch = aiScore >= threshold;
    const stringMatch = stringScore >= threshold;
    
    // Color coding
    const expectedHigh = expected === 'HIGH';
    const aiCorrect = (aiMatch && expectedHigh) || (!aiMatch && !expectedHigh);
    const stringCorrect = (stringMatch && expectedHigh) || (!stringMatch && !expectedHigh);
    
    const aiIcon = aiCorrect ? '✅' : '❌';
    const stringIcon = stringCorrect ? '✅' : '❌';
    
    console.log(`${aiIcon} "${guess}" → "${target}"`);
    console.log(`   AI: ${aiPercentage}% ${aiMatch ? '(MATCH)' : '(no match)'}`);
    console.log(`   String: ${stringPercentage}% ${stringMatch ? '(MATCH)' : '(no match)'}`);
    console.log(`   Expected: ${expected} | ${description}`);
    console.log('');
    
    results.push({
      guess,
      target,
      expected,
      aiScore,
      stringScore,
      aiCorrect,
      stringCorrect
    });
    
    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Calculate accuracy
  const aiAccuracy = results.filter(r => r.aiCorrect).length / results.length * 100;
  const stringAccuracy = results.filter(r => r.stringCorrect).length / results.length * 100;
  
  console.log(`📊 Model ${modelKey} Results:`);
  console.log(`   AI Accuracy: ${aiAccuracy.toFixed(1)}%`);
  console.log(`   String Accuracy: ${stringAccuracy.toFixed(1)}%`);
  console.log(`   AI Advantage: ${(aiAccuracy - stringAccuracy).toFixed(1)}%`);
  
  return { modelKey, aiAccuracy, stringAccuracy, results };
}

/**
 * Main test function
 */
async function runTests() {
  console.log('🚀 Un•Define Hugging Face Semantic Similarity Testing');
  console.log('');
  console.log('This script tests different models for:');
  console.log('1. Theme fuzzy matching (e.g., "boozing" → "drinking alcohol")');
  console.log('2. Word fuzzy matching (e.g., "DEFIEN" → "DEFINE")');
  console.log('');
  console.log('⏳ Testing may take 5-10 minutes due to API rate limits...');
  
  const allResults = [];
  
  // Test theme matching
  console.log('\n🎯 THEME MATCHING TESTS');
  console.log('Testing semantic similarity for weekly theme guesses');
  
  for (const [modelKey, modelName] of Object.entries(MODELS)) {
    const results = await testModel(modelKey, modelName, THEME_TEST_CASES, 'theme');
    allResults.push({ ...results, testType: 'theme' });
  }
  
  // Test word matching
  console.log('\n🔤 WORD MATCHING TESTS');
  console.log('Testing similarity for individual word guesses (typos)');
  
  for (const [modelKey, modelName] of Object.entries(MODELS)) {
    const results = await testModel(modelKey, modelName, WORD_TEST_CASES, 'word');
    allResults.push({ ...results, testType: 'word' });
  }
  
  // Final summary
  console.log('\n📋 FINAL SUMMARY');
  console.log('═'.repeat(80));
  
  console.log('\n🎯 Theme Matching Results:');
  const themeResults = allResults.filter(r => r.testType === 'theme');
  themeResults.forEach(r => {
    console.log(`   ${r.modelKey}: ${r.aiAccuracy.toFixed(1)}% accuracy`);
  });
  
  console.log('\n🔤 Word Matching Results:');
  const wordResults = allResults.filter(r => r.testType === 'word');
  wordResults.forEach(r => {
    console.log(`   ${r.modelKey}: ${r.aiAccuracy.toFixed(1)}% accuracy`);
  });
  
  // Recommendations
  const bestTheme = themeResults.reduce((best, current) => 
    current.aiAccuracy > best.aiAccuracy ? current : best
  );
  const bestWord = wordResults.reduce((best, current) => 
    current.aiAccuracy > best.aiAccuracy ? current : best
  );
  
  console.log('\n🏆 RECOMMENDATIONS:');
  console.log(`   Best for theme matching: ${bestTheme.modelKey} (${bestTheme.aiAccuracy.toFixed(1)}%)`);
  console.log(`   Best for word matching: ${bestWord.modelKey} (${bestWord.aiAccuracy.toFixed(1)}%)`);
  
  // Cost estimate
  console.log('\n💰 COST ESTIMATES (1,000 users):');
  console.log('   Theme matching: 4,000 requests/month → FREE');
  console.log('   Word matching: 600,000 requests/month → $57/month');
  console.log('   Hybrid word: 180,000 requests/month → $15/month');
  
  console.log('\n✅ Testing complete! Update your documentation with these results.');
}

// Run the tests
runTests().catch(console.error); 