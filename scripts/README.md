# Utility Scripts

This directory contains development and maintenance scripts for the Un-Define v2 project.

Last Updated: May 2025
Reference: cursor_project_rules/scripts.md

## Status Overview
✅ All core scripts validated
✅ Dependencies documented
✅ Integration tests passing

## Prerequisites
Reference: cursor_project_rules/dependencies.md

Required dependencies (not in main app):
- ✅ `dotenv` — environment sync
- ✅ `@supabase/supabase-js` — database operations

```bash
npm install --save-dev dotenv @supabase/supabase-js
```

## Available Scripts
Reference: cursor_project_rules/script_usage.md

### Development (✅ Active)
- `dev.sh` — Start backend only
- `setup-testing-mode.sh` — Set testing flags

### Database (✅ Active)
Reference: cursor_project_rules/db_management.md
- `apply-migrations.sh` — Apply Supabase migrations
- `test-db-client.ts` — Test Supabase connection
- `manage_words.sh` — Seed and import word data

### Deployment (✅ Active)
Reference: cursor_project_rules/deployment.md
- `sync-vercel-env.js` — Sync environment variables
  - ✅ Frontend variables (undefine-v2-front)
  - ✅ Backend variables (undefine-v2-back)
  - ✅ VITE_ prefix handling
  - Requirements:
    - ✅ Vercel CLI
    - ✅ dotenv package
    - ✅ Valid .env files

## Usage
Reference: cursor_project_rules/script_execution.md

Run all scripts from project root:

```bash
# Start backend in dev mode
./scripts/dev.sh

# Apply database migrations
./scripts/apply-migrations.sh

# Import new words
./scripts/manage_words.sh

# Sync environment variables
./scripts/sync-vercel-env.js
```

## Script Development
Reference: cursor_project_rules/script_development.md

1. ✅ Create script in this directory
2. ✅ Set permissions: `chmod +x script.sh`
3. ✅ Update this README
4. ✅ Add dependencies to Prerequisites
5. ✅ Update package.json if needed

---
## Completion Status (May 2025)
Reference: cursor_project_rules/completion_criteria.md
✅ All scripts operational
✅ Dependencies verified
✅ Integration tests passing
