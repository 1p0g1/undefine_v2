// Quick test script for immediate system validation
// Run this to check current deployment status

const BASE_URL = 'https://undefine-v2-front.vercel.app';
const TEST_WORD_ID = 'fef9bd6d-00de-4124-8784-cac5c36ac4c6'; // Real word ID from your data

async function quickTest() {
  console.log('🚀 QUICK SYSTEM STATUS CHECK\n');

  // Test 1: Check if enhanced API is deployed
  console.log('1️⃣ Testing API deployment...');
  try {
    const response = await fetch(`${BASE_URL}/api/leaderboard?wordId=${TEST_WORD_ID}`);
    
    if (response.headers.get('content-type')?.includes('application/json')) {
      const data = await response.json();
      console.log('✅ Enhanced API is deployed!');
      console.log(`   - Leaderboard entries: ${data.leaderboard?.length || 0}`);
      console.log(`   - Total entries: ${data.totalEntries || 0}`);
    } else {
      console.log('⚠️  API returning HTML - enhanced version not deployed yet');
    }
  } catch (error) {
    console.log('❌ API test failed:', error.message);
  }

  // Test 2: Check if migration is applied
  console.log('\n2️⃣ Testing migration status...');
  try {
    const response = await fetch(`${BASE_URL}/api/admin/finalize-daily-leaderboard`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ autoFinalize: true })
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Migration applied - snapshot system functions exist!');
      console.log(`   - Processed: ${data.stats?.totalProcessed || 0} snapshots`);
    } else if (response.status === 500) {
      console.log('⚠️  Migration not applied - snapshot functions missing');
      console.log('   Next step: Apply the migration to create database objects');
    } else {
      console.log(`⚠️  Unexpected response: ${response.status}`);
    }
  } catch (error) {
    console.log('❌ Migration test failed:', error.message);
  }

  // Test 3: Check cron security
  console.log('\n3️⃣ Testing cron security...');
  try {
    const response = await fetch(`${BASE_URL}/api/cron/finalize-daily-leaderboards`, {
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

  // Test 4: Test historical date parameter
  console.log('\n4️⃣ Testing historical date parameter...');
  try {
    const response = await fetch(`${BASE_URL}/api/leaderboard?wordId=${TEST_WORD_ID}&date=2024-12-01`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Historical date parameter works!');
      console.log(`   - Historical entries: ${data.leaderboard?.length || 0}`);
    } else {
      console.log(`⚠️  Historical query failed: ${response.status}`);
    }
  } catch (error) {
    console.log('❌ Historical test failed:', error.message);
  }

  console.log('\n' + '='.repeat(50));
  console.log('📋 QUICK SUMMARY');
  console.log('='.repeat(50));
  console.log('✅ = Working correctly');
  console.log('⚠️  = Needs attention');  
  console.log('❌ = Error occurred');
  console.log('\n💡 For complete testing, run:');
  console.log('   node docs/TESTING_GUIDE_SNAPSHOT_SYSTEM.md');
}

quickTest().catch(console.error); 