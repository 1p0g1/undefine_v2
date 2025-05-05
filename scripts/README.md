# Utility Scripts

This directory contains development and maintenance scripts for the Un-Define v2 project.

## Available Scripts

### Development

- `dev.sh` - Start backend only
- `setup-testing-mode.sh` - Set testing flags

### Database

- `apply-migrations.sh` - Apply Supabase migrations
- `test-db-client.ts` - Test Supabase connection
- `manage_words.sh` - Seed and import word data

### Deployment

- `sync-render-env.js` - Push env vars to Render

## Usage

All scripts should be run from the project root:

```bash
# Start backend in dev mode
./scripts/dev.sh

# Apply database migrations
./scripts/apply-migrations.sh

# Import new words
./scripts/manage_words.sh
```

## Adding New Scripts

1. Create the script in this directory
2. Make it executable: `chmod +x script.sh`
3. Document it in this README
4. Add any dependencies to the root package.json
