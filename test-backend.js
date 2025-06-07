// Test script for BACKEND deployment (Next.js API)
// UPDATE THIS URL with your actual backend deployment URL
const BACKEND_URL = 'https://undefine-v2-back-3our4b7oo-paddys-projects-82cb6057.vercel.app';
const TEST_WORD_ID = 'fef9bd6d-00de-4124-8784-cac5c36ac4c6';

async function testBackend() {
  console.log('🚀 TESTING BACKEND DEPLOYMENT\n');
  console.log(`📍 Backend URL: ${BACKEND_URL}\n`);

  // Test 1: Enhanced API 
  console.log('1️⃣ Testing enhanced leaderboard API...');
  try {
    const response = await fetch(`${BACKEND_URL}/api/leaderboard?wordId=${TEST_WORD_ID}`);
    
    if (response.headers.get('content-type')?.includes('application/json')) {
      const data = await response.json();
      console.log('✅ Enhanced API working!');
      console.log(`   - Leaderboard entries: ${data.leaderboard?.length || 0}`);
      console.log(`   - Total entries: ${data.totalEntries || 0}`);
    } else {
      console.log('⚠️  API returning non-JSON:', response.status);
    }
  } catch (error) {
    console.log('❌ API test failed:', error.message);
  }

  // Test 2: Admin finalization
  console.log('\n2️⃣ Testing admin finalization...');
  try {
    const response = await fetch(`${BACKEND_URL}/api/admin/finalize-daily-leaderboard`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ autoFinalize: true })
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Admin endpoint working!');
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
    const response = await fetch(`${BACKEND_URL}/api/leaderboard?wordId=${TEST_WORD_ID}&date=2024-12-01`);
    
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

  // Test 4: Cron security
  console.log('\n4️⃣ Testing cron security...');
  try {
    const response = await fetch(`${BACKEND_URL}/api/cron/finalize-daily-leaderboards`, {
      method: 'POST'
    });

    if (response.status === 401) {
      console.log('✅ Cron security working - rejects unauthorized requests');
    } else {
      console.log(`⚠️  Cron security issue - returned ${response.status}`);
    }
  } catch (error) {
    console.log('❌ Cron test failed:', error.message);
  }

  console.log('\n' + '='.repeat(60));
  console.log('🎉 BACKEND TEST COMPLETE');
  console.log('='.repeat(60));
}

testBackend().catch(console.error); 