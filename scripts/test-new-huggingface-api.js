/**
 * Test script for new Hugging Face Inference Providers API
 * 
 * This script tests the migration from:
 * OLD: https://api-inference.huggingface.co/models/...
 * NEW: https://router.huggingface.co/hf-inference/models/...
 * 
 * Run with: node scripts/test-new-huggingface-api.js
 */

const fetch = require('node-fetch');

const HF_MODEL = 'sentence-transformers/all-MiniLM-L6-v2';
const OLD_API_URL = `https://api-inference.huggingface.co/models/${HF_MODEL}`;
const NEW_API_URL = `https://router.huggingface.co/hf-inference/models/${HF_MODEL}`;

// Test cases for theme matching
const TEST_CASES = [
  // High similarity cases (should be >85%)
  { text1: 'autological', text2: 'words that describe themselves', expected: 'high' },
  { text1: 'drinking alcohol', text2: 'boozing', expected: 'high' },
  { text1: 'mythology', text2: 'legends', expected: 'high' },
  
  // Medium similarity cases (should be 70-85%)
  { text1: 'basketball', text2: 'baseball', expected: 'medium' },
  { text1: 'space', text2: 'astronomy', expected: 'medium' },
  
  // Low similarity cases (should be <70%)
  { text1: 'fear', text2: 'changer', expected: 'low' },
  { text1: 'guitar', text2: 'elephant', expected: 'low' }
];

async function testApiEndpoint(apiUrl, label) {
  console.log(`\n🧪 Testing ${label}: ${apiUrl}`);
  console.log('=' .repeat(80));
  
  const results = [];
  
  for (const testCase of TEST_CASES) {
    try {
      const startTime = Date.now();
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.HF_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: {
            source_sentence: testCase.text1.toLowerCase().trim(),
            sentences: [testCase.text2.toLowerCase().trim()]
          }
        })
      });
      
      const responseTime = Date.now() - startTime;
      
      if (!response.ok) {
        console.log(`❌ "${testCase.text1}" → "${testCase.text2}": HTTP ${response.status}`);
        if (response.status === 503) {
          console.log('   Model loading, this is expected for the first request...');
        }
        continue;
      }
      
      const result = await response.json();
      const similarity = result[0] || 0;
      const percentage = Math.round(similarity * 100);
      
      // Determine if result matches expected range
      let status = '✅';
      if (testCase.expected === 'high' && percentage < 85) status = '⚠️';
      if (testCase.expected === 'medium' && (percentage < 70 || percentage >= 85)) status = '⚠️';
      if (testCase.expected === 'low' && percentage >= 70) status = '⚠️';
      
      console.log(`${status} "${testCase.text1}" → "${testCase.text2}": ${percentage}% (${responseTime}ms)`);
      
      results.push({
        ...testCase,
        similarity: percentage,
        responseTime,
        status: status === '✅' ? 'pass' : 'warning'
      });
      
    } catch (error) {
      console.log(`❌ "${testCase.text1}" → "${testCase.text2}": ERROR - ${error.message}`);
      results.push({
        ...testCase,
        error: error.message,
        status: 'error'
      });
    }
    
    // Small delay between requests to be respectful
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  return results;
}

async function runComparison() {
  console.log('🚀 Hugging Face API Migration Test');
  console.log('Testing migration from deprecated api-inference to new hf-inference endpoint');
  
  if (!process.env.HF_API_KEY) {
    console.error('❌ HF_API_KEY environment variable not set');
    console.log('Please set your Hugging Face API key in .env file');
    process.exit(1);
  }
  
  // Test new API (primary)
  const newResults = await testApiEndpoint(NEW_API_URL, 'NEW API (Inference Providers)');
  
  // Test old API (for comparison, if still working)
  console.log('\n⏳ Testing old API for comparison (may fail if deprecated)...');
  const oldResults = await testApiEndpoint(OLD_API_URL, 'OLD API (Deprecated)');
  
  // Summary
  console.log('\n📊 SUMMARY');
  console.log('=' .repeat(80));
  
  const newPassed = newResults.filter(r => r.status === 'pass').length;
  const newWarnings = newResults.filter(r => r.status === 'warning').length;
  const newErrors = newResults.filter(r => r.status === 'error').length;
  
  console.log(`NEW API Results: ${newPassed} passed, ${newWarnings} warnings, ${newErrors} errors`);
  
  if (oldResults.length > 0) {
    const oldPassed = oldResults.filter(r => r.status === 'pass').length;
    const oldWarnings = oldResults.filter(r => r.status === 'warning').length;
    const oldErrors = oldResults.filter(r => r.status === 'error').length;
    
    console.log(`OLD API Results: ${oldPassed} passed, ${oldWarnings} warnings, ${oldErrors} errors`);
  }
  
  // Recommendations
  console.log('\n💡 RECOMMENDATIONS');
  console.log('=' .repeat(80));
  
  if (newErrors === 0) {
    console.log('✅ NEW API is working correctly - safe to deploy');
  } else {
    console.log('⚠️  NEW API has errors - investigate before deploying');
  }
  
  if (newWarnings > 0) {
    console.log('⚠️  Some similarity scores may need threshold adjustments');
  }
  
  console.log('\n🔧 Next steps:');
  console.log('1. Update semanticSimilarity.ts with new API URL');
  console.log('2. Test theme guessing in development environment');
  console.log('3. Monitor API response times and accuracy');
  console.log('4. Deploy to production when confident');
}

// Run the test
runComparison().catch(console.error);
