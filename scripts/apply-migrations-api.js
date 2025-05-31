const fs = require('fs');
const path = require('path');
const https = require('https');

const SUPABASE_PROJECT_ID = 'eaclljwvsicezmkjnlbm';
const SUPABASE_ACCESS_TOKEN = 'sbp_6a90116b3ce8f57d273f157b6c2945473c1484ee';

// Read migration files
const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations');
const migrationFiles = fs.readdirSync(migrationsDir)
  .filter(file => file.endsWith('.sql'))
  .sort();

// Function to make API request
function makeRequest(sql) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.supabase.com',
      path: `/v1/projects/${SUPABASE_PROJECT_ID}/database/query`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ACCESS_TOKEN}`
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(data);
        } else {
          reject(new Error(`API request failed with status ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.write(JSON.stringify({ query: sql }));
    req.end();
  });
}

// Function to check if migration has been applied
async function checkMigrationStatus(file) {
  try {
    // Create schema_migrations table if it doesn't exist
    await makeRequest(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version text PRIMARY KEY,
        applied_at timestamp with time zone DEFAULT now()
      );
    `);

    const checkQuery = `
      SELECT EXISTS (
        SELECT 1 
        FROM schema_migrations 
        WHERE version = '${path.basename(file, '.sql')}'
      );
    `;

    const migrationResult = await makeRequest(checkQuery);
    return JSON.parse(migrationResult)[0]?.exists || false;
  } catch (error) {
    if (error.message.includes('schema_migrations')) {
      return false;
    }
    throw error;
  }
}

// Function to extract function names from SQL
function extractFunctionNames(sql) {
  const createFunctionMatches = sql.match(/CREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+([^\s(]+)/gi) || [];
  return createFunctionMatches.map(match => {
    const name = match.split(/\s+/).pop();
    return name.includes('.') ? name.split('.').pop() : name;
  });
}

// Function to extract function parameters from SQL
function extractFunctionParameters(sql, functionName) {
  const regex = new RegExp(`CREATE\\s+(?:OR\\s+REPLACE\\s+)?FUNCTION\\s+${functionName}\\s*\\(([^)]+)\\)`, 'i');
  const match = sql.match(regex);
  if (!match) return '';
  
  // Extract parameter types only, ignoring parameter names and default values
  const params = match[1].split(',').map(param => {
    const parts = param.trim().split(/\s+/);
    // Get the type, which is usually the last part before any DEFAULT or =
    const type = parts.find(p => /^[A-Za-z_]+$/.test(p)) || parts[parts.length - 1];
    return type.toUpperCase();
  });
  
  return params.join(',');
}

// Function to get existing function signatures
async function getExistingFunctionSignatures(functionName) {
  try {
    const result = await makeRequest(`
      SELECT pg_get_function_identity_arguments(p.oid) as args
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public'
      AND p.proname = '${functionName}';
    `);
    
    const signatures = JSON.parse(result);
    return signatures.map(sig => sig.args.split(',').map(arg => arg.trim()).join(','));
  } catch (error) {
    console.log(`Note: Could not get signatures for ${functionName}: ${error.message}`);
    return [];
  }
}

// Apply migrations
async function applyMigrations() {
  for (const file of migrationFiles) {
    console.log(`Checking migration: ${file}`);
    
    try {
      const isApplied = await checkMigrationStatus(file);
      
      if (isApplied) {
        console.log(`⏭️  Skipping already applied migration: ${file}`);
        continue;
      }

      console.log(`Applying migration: ${file}`);
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      
      // Extract function names and try to drop them first
      const functionNames = extractFunctionNames(sql);
      for (const funcName of functionNames) {
        try {
          const signatures = await getExistingFunctionSignatures(funcName);
          for (const signature of signatures) {
            await makeRequest(`DROP FUNCTION IF EXISTS ${funcName}(${signature});`);
            console.log(`Dropped function: ${funcName}(${signature})`);
          }
        } catch (error) {
          console.log(`Note: Could not drop function ${funcName}: ${error.message}`);
        }
      }

      try {
        await makeRequest(sql);
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log(`⏭️  Objects already exist in migration: ${file}`);
          continue;
        }
        throw error;
      }
      
      // Record migration as applied
      await makeRequest(`
        INSERT INTO schema_migrations (version) 
        VALUES ('${path.basename(file, '.sql')}')
        ON CONFLICT (version) DO NOTHING;
      `);
      
      console.log(`✅ Successfully applied migration: ${file}`);
    } catch (error) {
      console.error(`❌ Failed to apply migration ${file}:`, error.message);
      process.exit(1);
    }
  }
  
  console.log('✅ All migrations applied successfully');
}

applyMigrations(); 