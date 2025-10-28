// Test script for contextual theme matching improvements
// Run this to compare old vs new approach

const HF_MODEL = 'sentence-transformers/all-MiniLM-L6-v2';
const OLD_API_URL = `https://api-inference.huggingface.co/models/${HF_MODEL}`;
const NEW_API_URL = `https://router.huggingface.co/hf-inference/models/${HF_MODEL}`;

async function testSemanticSimilarity(text1, text2, apiUrl, apiKey) {
  if (!apiKey) {
    console.error('API Key is required');
    return 0;
  }

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
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
      const errorText = await response.text();
      console.error(`API Error: ${response.status} - ${errorText}`);
      return 0;
    }

    const result = await response.json();
    return result[0] || 0;

  } catch (error) {
    console.error('Semantic similarity error:', error);
    return 0;
  }
}

async function runContextualTests() {
  const apiKey = process.env.HF_API_KEY || 'YOUR_API_KEY_HERE'; // Replace with actual key
  
  console.log('🧪 Testing Contextual Theme Matching Improvements');
  console.log('================================================================================');
  
  const testCases = [
    {
      guess: "changing over time",
      theme: "words changing meaning over time",
      description: "Your example - should improve significantly"
    },
    {
      guess: "autological", 
      theme: "words that describe themselves",
      description: "Previous test case - should maintain high score"
    },
    {
      guess: "evolution",
      theme: "words changing meaning over time", 
      description: "Related concept - should score well"
    },
    {
      guess: "semantic shift",
      theme: "words changing meaning over time",
      description: "Technical term - should score very high"
    }
  ];

  for (const testCase of testCases) {
    console.log(`\n📝 Testing: "${testCase.guess}" → "${testCase.theme}"`);
    console.log(`   Context: ${testCase.description}`);
    
    // Test without context (old approach)
    const oldSimilarity = await testSemanticSimilarity(
      testCase.guess, 
      testCase.theme, 
      NEW_API_URL, 
      apiKey
    );
    
    // Test with context (new approach)
    const contextualGuess = `Answer to "what connects this week's words": ${testCase.guess}`;
    const contextualTheme = `Theme that connects words: ${testCase.theme}`;
    
    const newSimilarity = await testSemanticSimilarity(
      contextualGuess,
      contextualTheme,
      NEW_API_URL,
      apiKey
    );
    
    const oldPercent = Math.round(oldSimilarity * 100);
    const newPercent = Math.round(newSimilarity * 100);
    const improvement = newPercent - oldPercent;
    
    console.log(`   📊 Without context: ${oldPercent}%`);
    console.log(`   🎯 With context:    ${newPercent}%`);
    console.log(`   📈 Improvement:     ${improvement > 0 ? '+' : ''}${improvement}%`);
    
    if (improvement > 0) {
      console.log(`   ✅ IMPROVED by ${improvement} percentage points!`);
    } else if (improvement === 0) {
      console.log(`   ➖ No change`);
    } else {
      console.log(`   ⚠️  Decreased by ${Math.abs(improvement)} percentage points`);
    }
  }

  console.log('\n🏁 Contextual Testing Complete');
  console.log('================================================================================');
  console.log('💡 The contextual approach should improve semantic understanding by:');
  console.log('   • Providing explicit context about the matching task');
  console.log('   • Framing both inputs as theme-related concepts');
  console.log('   • Helping the AI understand the "connection" relationship');
}

// Export for Node.js usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { runContextualTests };
}

// Auto-run if called directly
if (typeof window === 'undefined' && require.main === module) {
  runContextualTests().catch(console.error);
}
