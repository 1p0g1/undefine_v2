#!/usr/bin/env node

/**
 * Syncs environment variables between .env files and Vercel projects
 * Used for both frontend and backend deployments
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Project configuration
const PROJECTS = {
  frontend: {
    name: 'undefine-v2-front',
    envFile: path.join(__dirname, '../client/.env'),
    prefix: 'VITE_'
  },
  backend: {
    name: 'undefine-v2-back',
    envFile: path.join(__dirname, '../.env'),
    excludePrefix: 'VITE_'
  }
};

function loadEnvFile(filePath) {
  try {
    return dotenv.parse(fs.readFileSync(filePath));
  } catch (err) {
    console.error(`Error loading ${filePath}:`, err.message);
    return {};
  }
}

function syncProject(project) {
  console.log(`\nSyncing ${project.name}...`);
  
  const env = loadEnvFile(project.envFile);
  
  for (const [key, value] of Object.entries(env)) {
    // Skip variables based on prefix rules
    if (project.prefix && !key.startsWith(project.prefix)) continue;
    if (project.excludePrefix && key.startsWith(project.excludePrefix)) continue;
    
    try {
      // Use Vercel CLI to set environment variables
      execSync(`vercel env add ${key} ${project.name}`, {
        input: value,
        stdio: 'inherit'
      });
      console.log(`✅ Set ${key}`);
    } catch (err) {
      console.error(`❌ Failed to set ${key}:`, err.message);
    }
  }
}

// Main execution
console.log('🔄 Syncing environment variables to Vercel...');

for (const project of Object.values(PROJECTS)) {
  syncProject(project);
}

console.log('\n✨ Environment sync complete!'); 