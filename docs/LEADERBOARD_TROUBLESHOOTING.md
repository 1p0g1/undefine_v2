# Leaderboard System Troubleshooting Guide

## Overview
This guide helps diagnose and resolve common issues with the leaderboard system. The leaderboard data flows through several tables and is managed by database triggers.

## Table Purposes & Data Flow

### 1. Game Sessions (`game_sessions`)
- Primary game state storage
- Records all game attempts
- Key fields: player_id, word_id, guesses, start_time, end_time, is_complete, is_won
- Purpose: Source of truth for game completion data

### 2. Scores (`scores`)
- Detailed scoring information
- Records only completed games
- Key fields: player_id, word_id, guesses_used, completion_time_seconds, score, penalties
- Purpose: Historical record and detailed scoring breakdown

### 3. User Stats (`user_stats`)
- Player statistics aggregation
- Key fields: games_played, games_won, streaks, total_score
- Purpose: Track player performance metrics
- Required for leaderboard foreign key chain

### 4. Leaderboard Summary (`leaderboard_summary`)
- Optimized leaderboard rankings
- Key fields: player_id, word_id, rank, best_time, guesses_used, was_top_10
- Purpose: Fast leaderboard queries
- Automatically updated by triggers

## Data Flow Steps
1. Game Completion:
   ```sql
   UPDATE game_sessions 
   SET is_complete = true, is_won = true, end_time = NOW()
   WHERE id = '[GAME_ID]';
   ```

2. Trigger Updates Leaderboard:
   ```sql
   -- Automatic via update_leaderboard_from_game trigger
   INSERT INTO leaderboard_summary (...) 
   VALUES (...) 
   ON CONFLICT DO UPDATE;
   ```

3. Ranking Recalculation:
   ```sql
   -- Automatic via update_rankings_after_leaderboard_change trigger
   UPDATE leaderboard_summary 
   SET rank = [calculated_rank], was_top_10 = [rank <= 10];
   ```

4. API Updates:
   ```sql
   -- In /api/guess.ts
   INSERT INTO scores (...) VALUES (...);
   UPDATE user_stats SET ...;
   ```

## Trigger Monitoring

### View Trigger Performance
```sql
SELECT * FROM v_trigger_performance
ORDER BY last_execution DESC
LIMIT 5;
```

### Recent Trigger Executions
```sql
SELECT 
    trigger_name,
    operation,
    executed_at,
    EXTRACT(EPOCH FROM execution_time) as execution_time_seconds,
    old_data->>'id' as old_id,
    new_data->>'id' as new_id
FROM trigger_log
ORDER BY executed_at DESC
LIMIT 10;
```

### Failed Trigger Executions
```sql
SELECT *
FROM trigger_log
WHERE execution_time IS NULL
   OR EXTRACT(EPOCH FROM execution_time) > 1 -- Slow executions
ORDER BY executed_at DESC;
```

## Common Issues

### 1. Game Not Appearing on Leaderboard

#### Symptoms
- Game completion successful but not showing in leaderboard
- Player rank returns null
- Leaderboard position incorrect

#### Troubleshooting Steps
1. Check game_sessions:
```sql
SELECT * FROM game_sessions 
WHERE player_id = '[PLAYER_ID]' 
AND word_id = '[WORD_ID]'
AND is_complete = true;
```

2. Verify user_stats entry exists:
```sql
SELECT * FROM user_stats 
WHERE player_id = '[PLAYER_ID]';
```

3. Check leaderboard_summary:
```sql
SELECT * FROM leaderboard_summary 
WHERE player_id = '[PLAYER_ID]' 
AND word_id = '[WORD_ID]';
```

4. Verify trigger execution:
```sql
SELECT * FROM pg_trigger 
WHERE tgname IN (
  'update_leaderboard_on_game_complete',
  'update_rankings_after_leaderboard_change'
);
```

### 2. Incorrect Rankings

#### Symptoms
- Rankings out of order
- Multiple players with same rank
- Missing ranks

#### Troubleshooting Steps
1. Check ranking calculation:
```sql
WITH ranked_entries AS (
  SELECT 
    id,
    player_id,
    word_id,
    best_time,
    guesses_used,
    ROW_NUMBER() OVER (
      PARTITION BY word_id 
      ORDER BY best_time ASC, guesses_used ASC
    ) as calculated_rank
  FROM leaderboard_summary
  WHERE word_id = '[WORD_ID]'
)
SELECT * FROM ranked_entries
WHERE rank != calculated_rank;
```

2. Manually trigger ranking update:
```sql
SELECT update_leaderboard_rankings('[WORD_ID]');
```

### 3. Foreign Key Violations

#### Symptoms
- Error messages about foreign key constraints
- Missing entries in dependent tables

#### Troubleshooting Steps
1. Check for orphaned records:
```sql
SELECT ls.* 
FROM leaderboard_summary ls
LEFT JOIN user_stats us ON ls.player_id = us.player_id
WHERE us.player_id IS NULL;
```

2. Verify player existence:
```sql
SELECT * FROM players 
WHERE id = '[PLAYER_ID]';
```

### 4. Performance Issues

#### Symptoms
- Slow leaderboard queries
- High database load
- Trigger execution delays

#### Troubleshooting Steps
1. Check index usage:
```sql
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
WHERE tablename = 'leaderboard_summary';
```

2. Monitor trigger execution time:
```sql
SELECT 
  trigger_name,
  execution_time,
  executed_at
FROM trigger_log
WHERE table_name = 'leaderboard_summary'
ORDER BY executed_at DESC
LIMIT 10;
```

## Recovery Procedures

### 1. Rebuild Leaderboard
If leaderboard data becomes inconsistent:

```sql
-- Clear existing entries
TRUNCATE TABLE leaderboard_summary;

-- Rebuild from game_sessions
INSERT INTO leaderboard_summary (
  player_id,
  word_id,
  best_time,
  guesses_used,
  date
)
SELECT 
  player_id,
  word_id,
  EXTRACT(EPOCH FROM (end_time - start_time))::INTEGER as best_time,
  array_length(guesses, 1) as guesses_used,
  CURRENT_DATE
FROM game_sessions
WHERE is_complete = true 
AND is_won = true;

-- Update rankings
SELECT update_leaderboard_rankings(word_id)
FROM (SELECT DISTINCT word_id FROM leaderboard_summary) t;
```

### 2. Fix Missing User Stats
If user_stats entries are missing:

```sql
INSERT INTO user_stats (player_id)
SELECT DISTINCT player_id
FROM leaderboard_summary ls
WHERE NOT EXISTS (
  SELECT 1 FROM user_stats us 
  WHERE us.player_id = ls.player_id
);
```

## Monitoring Queries

### 1. Data Consistency Check
```sql
SELECT 
  (SELECT COUNT(*) FROM game_sessions WHERE is_complete AND is_won) as completed_games,
  (SELECT COUNT(*) FROM scores WHERE correct) as score_entries,
  (SELECT COUNT(*) FROM leaderboard_summary) as leaderboard_entries;
```

### 2. Ranking Distribution
```sql
SELECT 
  word_id,
  COUNT(*) as total_entries,
  COUNT(DISTINCT rank) as unique_ranks,
  MIN(best_time) as best_time,
  MAX(best_time) as worst_time
FROM leaderboard_summary
GROUP BY word_id;
```

## Best Practices

1. Always verify foreign key dependencies before operations
2. Use transactions for multi-table updates
3. Monitor trigger execution times
4. Regular validation of ranking consistency
5. Keep indexes maintained and optimized
6. Check trigger logs for execution failures
7. Monitor trigger performance metrics
8. Validate data flow completion

## Contact

For urgent issues:
- Database Team: [CONTACT]
- API Team: [CONTACT]
- Frontend Team: [CONTACT] 