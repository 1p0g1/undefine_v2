# 🏆 Ranking Algorithm Update - January 2025

## Overview
Updated the daily leaderboard ranking algorithm to prioritize:
1. **Fewer Guesses** (ASC) - Primary ranking factor
2. **Faster Time** (ASC) - Secondary factor when guesses are tied  
3. **More Fuzzy Matches** (DESC) - Tertiary factor when guesses and time are tied

## What Changed
- **Before**: Ranking was based on time first, then guesses
- **After**: Ranking prioritizes efficiency (fewer attempts) over speed, with fuzzy matches as a final tiebreaker

## Manual Application Steps

### 1. Apply the Migration in Supabase
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the contents of `supabase/migrations/20250125000008_update_ranking_algorithm.sql`
4. Click **Run** to execute the migration

### 2. Verify the Changes
Run this query to check the new ranking order:
```sql
SELECT 
  player_id,
  guesses_used,
  best_time,
  fuzzy_bonus,
  rank,
  date_key
FROM leaderboard_summary 
WHERE date_key = CURRENT_DATE::text
  AND is_won = true
ORDER BY rank ASC
LIMIT 10;
```

### 3. Test with Sample Data
You can test the new ranking logic with this query:
```sql
-- Simulate ranking for a specific date
SELECT 
  player_id,
  guesses_used,
  best_time,
  fuzzy_bonus,
  ROW_NUMBER() OVER (
    ORDER BY 
      guesses_used ASC,
      best_time ASC, 
      fuzzy_bonus DESC
  ) as new_rank
FROM leaderboard_summary 
WHERE date_key = '2025-01-25'  -- Replace with actual date
  AND is_won = true
ORDER BY new_rank ASC;
```

## Impact
- Players who solve the word in fewer attempts will now rank higher
- Time is still important but secondary to efficiency
- Fuzzy matches provide a final tiebreaker for very close performances
- All existing leaderboard data will be recalculated with the new algorithm

## Rollback Plan
If needed, the previous ranking logic can be restored by:
1. Reverting the trigger function to use `best_time ASC, guesses_used ASC`
2. Recalculating all rankings with the old algorithm

## Files Modified
- `supabase/migrations/20250125000008_update_ranking_algorithm.sql` - Database migration
- `client/src/App.tsx` - Added scoring explanation to "How to Play" modal
- `vercel_alignment.md` - Updated documentation to reflect new ranking order
