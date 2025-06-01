# Un-Define v2 Deployment Context

# ⚡️ Leaderboard Data Flow & Best Practice (June 2025)

**This project is now striving for a best-practice, fully documented leaderboard data flow.**
- See implementation-plan.mdc Phase 7 for audit and documentation tasks.
- All documentation and troubleshooting will be updated as part of this phase.

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
- **Key Fields**: `id` (TEXT PRIMARY KEY), `created_at`, `last_active`, `display_name`
- **Populated By**: `ensurePlayerExists()` function (auto-created)

#### 2. `user_stats` table
- **Purpose**: Player statistics and streaks
- **Key Fields**: 
  - `player_id` (TEXT PRIMARY KEY REFERENCES players.id)
  - `current_streak`, `longest_streak`, `best_rank`, `top_10_count`
- **Critical**: Required foreign key dependency for leaderboard_summary

#### 3. `scores` table  
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

#### 4. `leaderboard_summary` table ⚠️ UPDATED SCHEMA
- **Purpose**: Optimized leaderboard data with rankings
- **Key Fields**:
  - `player_id` (TEXT REFERENCES user_stats.player_id) ⚠️ Foreign key to user_stats, not players
  - `word_id` (UUID REFERENCES words.id)
  - `rank` (INTEGER) - auto-calculated position
  - `was_top_10` (BOOLEAN) - auto-calculated flag
  - `best_time` (INTEGER) ⚠️ NOT completion_time_seconds
  - `guesses_used` (INTEGER)
  - `date` (DATE) - for daily filtering
- **Populated By**: `updateLeaderboardSummary()` in `/api/guess`
- **❌ REMOVED**: `score` column does not exist in actual schema
- **Auto-Ranking**: Database trigger recalculates ranks on insert/update
- **Best Practice (June 2025):**
  - All leaderboard entries are populated from real game completions via `/api/guess.ts`.
  - Foreign key chain is always maintained: `players` → `user_stats` → `leaderboard_summary`.
  - See implementation-plan.mdc Phase 7 for audit and troubleshooting tasks.

### Ranking Algorithm ⚠️ UPDATED
1. **Primary Sort**: `best_time ASC` (faster times rank better)
2. **Secondary Sort**: `guesses_used ASC` (fewer guesses break ties)
3. **Auto-Update**: Database trigger `update_rankings_after_leaderboard_change` recalculates all ranks when data changes

### API Endpoints

#### GET /api/leaderboard?wordId={id}&playerId={id}
- **Primary Query**: `leaderboard_summary` table (optimized)
- **Date Filtering**: Filters by `date = CURRENT_DATE` for daily leaderboards
- **Fallback Query**: `scores` table where `correct = true` (if summary empty)
- **Returns**: Top 10 entries + current player rank
- **Error Handling**: Graceful fallback mechanism if primary table empty
- **Player Names**: Joins with players table for display_name

#### POST /api/guess (triggers leaderboard updates) ⚠️ UPDATED
- **On Game Win**: Calls complete data flow sequence
- **Scoring**: Calculated by shared-types/scoring.ts
- **Foreign Keys**: Ensures both players AND user_stats entries exist before leaderboard insert
- **Column Mapping**: Uses `best_time` not `completion_time_seconds` for leaderboard_summary

### Fixed Issues (May 2025)

#### 1. Schema Mismatch Fixed
- **Problem**: `updateLeaderboardSummary()` using wrong column names
- **Solution**: Updated to use `best_time` instead of `completion_time_seconds`
- **Solution**: Removed references to non-existent `score` column in leaderboard_summary
- **Solution**: Added proper foreign key dependency on user_stats

#### 2. Foreign Key Constraints Fixed
- **Problem**: leaderboard_summary inserts failing due to missing user_stats entries
- **Solution**: `updateLeaderboardSummary()` now ensures user_stats entry exists first
- **Chain**: players → user_stats → leaderboard_summary (proper dependency order)

#### 3. Date Filtering Added
- **Problem**: Leaderboards showing entries from all dates
- **Solution**: Added `date` field population and filtering by CURRENT_DATE

### Troubleshooting Common Issues

#### 1. "Failed to fetch leaderboard" Error
- **Cause**: Database column name mismatch or foreign key constraint failures
- **Check**: Verify `correct` column exists in scores table (not `was_correct`)
- **Check**: Ensure players table populated via `ensurePlayerExists()`
- **Check**: Verify user_stats entries exist for leaderboard players

#### 2. Empty leaderboard_summary Table
- **Cause**: `updateLeaderboardSummary()` failing silently due to constraints
- **Check**: Foreign key constraints on `player_id` → user_stats.player_id
- **Check**: Column name mismatches (best_time vs completion_time_seconds)
- **Fallback**: API automatically queries scores table as backup

#### 3. Real Completions Not Appearing
- **Cause**: Fixed in May 2025 - schema mismatch prevented real game data from populating
- **Expected**: After fix, new completions should appear immediately in leaderboard
- **Debug**: Use `/api/debug-player?playerId={id}` to check player's game data

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
- **20241201000001**: Fixes foreign key constraints and populates test data
- **May 2025**: Updated API functions to match actual ERD schema

## 📝 Documentation Requirements

1. All documentation must reflect this two-project structure
2. Environment variables must be documented separately for each project
3. Configuration files must be appropriate for their respective projects
4. Build and deployment instructions must be project-specific
5. API documentation must use production URLs

## 🎮 **PLANNED: Nickname System (December 2024)**

### **Overview**
Following successful leaderboard system deployment, implement dual-interface nickname customization:
- **Settings Button**: Always-available ⚙️ icon for nickname management
- **First-Game Prompt**: Automatic nickname suggestion after initial game completion

### **Supabase Infrastructure Impact**

#### **Existing Schema Support** ✅
- `players.display_name TEXT` column already exists
- Leaderboard queries already JOIN with players table
- No new migrations required for basic functionality

#### **New Database Functions Required**:
```sql
-- Enhanced player creation with optional display name
CREATE OR REPLACE FUNCTION ensure_player_exists(p_id TEXT, p_display_name TEXT DEFAULT NULL)
RETURNS TEXT AS $$
BEGIN
  INSERT INTO players (id, display_name) 
  VALUES (p_id, p_display_name)
  ON CONFLICT (id) DO UPDATE SET 
    last_active = NOW(),
    display_name = COALESCE(EXCLUDED.display_name, players.display_name);
  RETURN p_id;
END;
$$ LANGUAGE plpgsql;

-- Nickname update with validation
CREATE OR REPLACE FUNCTION update_player_display_name(p_id TEXT, p_display_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  IF LENGTH(TRIM(p_display_name)) = 0 OR LENGTH(p_display_name) > 20 THEN
    RETURN FALSE;
  END IF;
  
  UPDATE players 
  SET display_name = TRIM(p_display_name), last_active = NOW()
  WHERE id = p_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;
```

#### **API Endpoint Addition**:
- **New Route**: `POST /api/player/nickname`
- **Table Modified**: `players.display_name`
- **Validation**: 20 char limit, no empty strings, basic profanity filter
- **Rate Limiting**: 1 change per hour per player

#### **Performance Considerations**:
- Existing leaderboard JOINs already optimized ✅
- No additional database round trips required ✅
- Consider `display_name` index for future search features
- Rate limiting prevents abuse

### **Implementation Dependencies**:
- Leaderboard system operational ✅ (December 2024)
- Player management system stable ✅ (March 2024)
- Database trigger system working ✅ (December 2024)

### **Database Query Changes**:
- Leaderboard queries unchanged (already JOIN players) ✅
- New UPDATE operations on nickname changes
- Enhanced player creation with optional display_name
- Validation logic in database functions 