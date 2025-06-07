// Test script for DEVELOPMENT BRANCH preview deployment
const PREVIEW_URL = 'https://undefine-v2-front-git-development-1p0g1.vercel.app';
const TEST_WORD_ID = 'fef9bd6d-00de-4124-8784-cac5c36ac4c6';

async function testPreview() {
  console.log('🚀 TESTING DEVELOPMENT BRANCH PREVIEW\n');
  console.log(`📍 Preview URL: ${PREVIEW_URL}\n`);

  // Test 1: Enhanced API 
  console.log('1️⃣ Testing enhanced API on preview...');
  try {
    const response = await fetch(`${PREVIEW_URL}/api/leaderboard?wordId=${TEST_WORD_ID}`);
    
    if (response.headers.get('content-type')?.includes('application/json')) {
      const data = await response.json();
      console.log('✅ Enhanced API working on preview!');
      console.log(`   - Response type: JSON`);
      console.log(`   - Leaderboard entries: ${data.leaderboard?.length || 0}`);
    } else {
      console.log('⚠️  Still returning HTML - check preview URL');
    }
  } catch (error) {
    console.log('❌ Preview API test failed:', error.message);
  }

  // Test 2: Admin finalization
  console.log('\n2️⃣ Testing admin finalization...');
  try {
    const response = await fetch(`${PREVIEW_URL}/api/admin/finalize-daily-leaderboard`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ autoFinalize: true })
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Admin endpoint working!');
      console.log(`   - Status: ${response.status}`);
      console.log(`   - Processed: ${data.stats?.totalProcessed || 0} snapshots`);
    } else {
      console.log(`⚠️  Admin response: ${response.status}`);
    }
  } catch (error) {
    console.log('❌ Admin test failed:', error.message);
  }

  // Test 3: Historical date
  console.log('\n3️⃣ Testing historical date parameter...');
  try {
    const response = await fetch(`${PREVIEW_URL}/api/leaderboard?wordId=${TEST_WORD_ID}&date=2024-12-01`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Historical queries working!');
      console.log(`   - Historical entries: ${data.leaderboard?.length || 0}`);
    } else {
      console.log(`⚠️  Historical query failed: ${response.status}`);
    }
  } catch (error) {
    console.log('❌ Historical test failed:', error.message);
  }

  console.log('\n' + '='.repeat(60));
  console.log('🎉 PREVIEW DEPLOYMENT TEST COMPLETE');
  console.log('='.repeat(60));
  console.log('💡 If tests pass, your snapshot system is fully deployed!');
  console.log('💡 Ready to merge development → main for production');
}

testPreview().catch(console.error); 