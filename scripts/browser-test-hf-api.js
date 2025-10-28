/**
 * Browser Console Test for New Hugging Face API
 * 
 * Copy and paste this into your browser console to test the new API
 * Make sure to replace 'YOUR_HF_API_KEY' with your actual key
 * 
 * Usage:
 * 1. Open browser console (F12)
 * 2. Paste this code
 * 3. Replace the API key
 * 4. Run: testHuggingFaceAPI()
 */

async function testHuggingFaceAPI() {
  const HF_API_KEY = 'YOUR_HF_API_KEY'; // Replace with your actual key
  const HF_MODEL = 'sentence-transformers/all-MiniLM-L6-v2';
  
  // Test both old and new endpoints
  const OLD_API_URL = `https://api-inference.huggingface.co/models/${HF_MODEL}`;
  const NEW_API_URL = `https://router.huggingface.co/hf-inference/models/${HF_MODEL}`;
  
  const testCase = {
    text1: 'autological',
    text2: 'words that describe themselves'
  };
  
  console.log('🧪 Testing Hugging Face API Migration');
  console.log('Test case:', testCase);
  
  // Test function
  async function testEndpoint(url, label) {
    try {
      console.log(`\n${label}: ${url}`);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${HF_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: {
            source_sentence: testCase.text1.toLowerCase().trim(),
            sentences: [testCase.text2.toLowerCase().trim()]
          }
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ ${label} failed:`, response.status, errorText);
        return null;
      }
      
      const result = await response.json();
      const similarity = result[0] || 0;
      const percentage = Math.round(similarity * 100);
      
      console.log(`✅ ${label} success:`, `${percentage}%`);
      return similarity;
      
    } catch (error) {
      console.error(`❌ ${label} error:`, error);
      return null;
    }
  }
  
  // Test both endpoints
  const oldResult = await testEndpoint(OLD_API_URL, 'OLD API (Deprecated)');
  await new Promise(resolve => setTimeout(resolve, 1000)); // Small delay
  const newResult = await testEndpoint(NEW_API_URL, 'NEW API (Inference Providers)');
  
  // Summary
  console.log('\n📊 RESULTS:');
  if (oldResult !== null) {
    console.log(`Old API: ${Math.round(oldResult * 100)}%`);
  }
  if (newResult !== null) {
    console.log(`New API: ${Math.round(newResult * 100)}%`);
  }
  
  if (newResult !== null) {
    console.log('✅ New API is working! Safe to migrate.');
  } else {
    console.log('❌ New API failed. Check API key and endpoint.');
  }
}

console.log('Hugging Face API Test loaded. Run testHuggingFaceAPI() to start.');
