# Un-Define v2 Deployment Context

## 🌐 Production Architecture

This project is deployed as TWO SEPARATE Vercel projects:

1. Frontend (Vite)
   - Deployed at: `undefine-v2-front.vercel.app`
   - Environment Variables:
     * VITE_API_BASE_URL
     * VITE_SUPABASE_ANON_KEY
     * VITE_SUPABASE_URL

2. Backend (Next.js API)
   - Deployed at: `undefine-v2-back.vercel.app`
   - Environment Variables:
     * JWT_SECRET
     * SUPABASE_URL
     * SUPABASE_ANON_KEY
     * DB_PROVIDER
     * SUPABASE_SERVICE_ROLE_KEY

## ⚠️ Critical Rules

1. ALWAYS check this deployment context first
2. NEVER assume local development environment
3. ALWAYS treat these as separate Vercel deployments
4. NEVER mix frontend/backend environment variables
5. ALWAYS use production URLs in configuration
6. NEVER suggest development-only solutions

## 📊 Leaderboard System Architecture

### Data Flow Overview
```
Game Completion → ensurePlayerExists() → updateUserStats() → createScoreEntry() → updateLeaderboardSummary()
                                                                      ↓
Frontend Request → /api/leaderboard → Query leaderboard_summary → Fallback to scores table
```

### Database Tables & Relationships

#### 1. `players` table
- **Purpose**: Master table for all players
- **Key Fields**: `id` (TEXT PRIMARY KEY), `created_at`, `last_active`
- **Populated By**: `ensurePlayerExists()` function (auto-created)

#### 2. `scores` table  
- **Purpose**: Record of every game completion
- **Key Fields**: 
  - `player_id` (TEXT REFERENCES players.id)
  - `word_id` (UUID REFERENCES words.id) 
  - `correct` (BOOLEAN) - whether game was won
  - `score` (INTEGER) - calculated score
  - `completion_time_seconds` (INTEGER)
  - `guesses_used` (INTEGER)
- **Populated By**: `createScoreEntry()` in `/api/guess`
- **Critical**: Only records with `correct = true` are used for leaderboard

#### 3. `leaderboard_summary` table
- **Purpose**: Optimized leaderboard data with rankings
- **Key Fields**:
  - `player_id` (TEXT REFERENCES players.id)
  - `word_id` (UUID REFERENCES words.id)
  - `rank` (INTEGER) - auto-calculated position
  - `was_top_10` (BOOLEAN) - auto-calculated flag
  - `score` (INTEGER)
  - `completion_time_seconds` (INTEGER)
  - `guesses_used` (INTEGER)
- **Populated By**: `updateLeaderboardSummary()` in `/api/guess`
- **Auto-Ranking**: Database trigger recalculates ranks on insert/update

### Ranking Algorithm
1. **Primary Sort**: `score DESC` (higher scores rank better)
2. **Secondary Sort**: `completion_time_seconds ASC` (faster times break ties)
3. **Auto-Update**: Database trigger `update_rankings_after_leaderboard_change` recalculates all ranks when data changes

### API Endpoints

#### GET /api/leaderboard?wordId={id}&playerId={id}
- **Primary Query**: `leaderboard_summary` table (optimized)
- **Fallback Query**: `scores` table where `correct = true` (if summary empty)
- **Returns**: Top 10 entries + current player rank
- **Error Handling**: Graceful fallback mechanism if primary table empty

#### POST /api/guess (triggers leaderboard updates)
- **On Game Win**: Calls complete data flow sequence
- **Scoring**: Calculated by shared-types/scoring.ts
- **Foreign Keys**: Ensures player exists before score/leaderboard inserts

### Troubleshooting Common Issues

#### 1. "Failed to fetch leaderboard" Error
- **Cause**: Database column name mismatch or foreign key constraint failures
- **Check**: Verify `correct` column exists in scores table (not `was_correct`)
- **Check**: Ensure players table populated via `ensurePlayerExists()`

#### 2. Empty leaderboard_summary Table
- **Cause**: `updateLeaderboardSummary()` failing silently due to constraints
- **Check**: Foreign key constraints on `player_id` and `word_id`
- **Fallback**: API automatically queries scores table as backup

#### 3. Missing Console Logs
- **Expected**: "Leaderboard updated successfully" after game completion
- **Missing**: Usually indicates foreign key constraint failure
- **Debug**: Check `[updateLeaderboardSummary]` logs for constraint errors

#### 4. Build Failures
- **Common**: TypeScript type mismatches between shared-types and API types
- **Check**: Ensure `LeaderboardEntry` interfaces match across:
  - `shared-types/src/game.ts` 
  - `types/api.ts`
- **Required Field**: `was_top_10: boolean` in both interfaces

### Database Migrations Status
- **20240321000000**: Creates players table + functions
- **20240515000000**: Adds score fields with `correct` column
- **20240530000002**: Creates leaderboard_summary with auto-ranking

## 📝 Documentation Requirements

1. All documentation must reflect this two-project structure
2. Environment variables must be documented separately for each project
3. Configuration files must be appropriate for their respective projects
4. Build and deployment instructions must be project-specific
5. API documentation must use production URLs 