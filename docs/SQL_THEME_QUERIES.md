# Theme Attempts SQL Queries

Useful queries for analyzing theme guess data.

## Query by Date Range

### Using `attempt_date` (DATE column, simpler)

```sql
-- Get all theme attempts between dates (inclusive)
SELECT 
  id,
  player_id,
  theme,
  guess,
  is_correct,
  similarity_score,
  confidence_percentage,
  matching_method,
  attempt_date,
  created_at
FROM theme_attempts
WHERE attempt_date BETWEEN '2025-01-13' AND '2025-01-19'
ORDER BY attempt_date DESC, created_at DESC;

-- Count attempts by theme in date range
SELECT 
  theme,
  COUNT(*) as total_attempts,
  SUM(CASE WHEN is_correct THEN 1 ELSE 0 END) as correct_guesses,
  ROUND(AVG(confidence_percentage), 1) as avg_confidence
FROM theme_attempts
WHERE attempt_date BETWEEN '2025-01-13' AND '2025-01-19'
GROUP BY theme
ORDER BY total_attempts DESC;
```

### Using `created_at` (TIMESTAMPTZ, for precise timing)

```sql
-- Get attempts within a UTC timestamp window
SELECT 
  id,
  player_id,
  theme,
  guess,
  is_correct,
  confidence_percentage,
  created_at
FROM theme_attempts
WHERE created_at >= '2025-01-13T00:00:00Z' 
  AND created_at < '2025-01-20T00:00:00Z'
ORDER BY created_at DESC;

-- Get attempts from the last 7 days
SELECT *
FROM theme_attempts
WHERE created_at >= NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;
```

## Similarity Score Analysis

```sql
-- Distribution of similarity scores for a specific theme
SELECT 
  CASE 
    WHEN confidence_percentage >= 78 THEN '78-100 (pass)'
    WHEN confidence_percentage >= 60 THEN '60-77 (close)'
    WHEN confidence_percentage >= 40 THEN '40-59 (medium)'
    ELSE '0-39 (low)'
  END as score_bucket,
  COUNT(*) as count,
  ROUND(AVG(confidence_percentage), 1) as avg_score
FROM theme_attempts
WHERE theme = 'Words That Are Both Nouns and Verbs'
GROUP BY score_bucket
ORDER BY score_bucket;

-- Find false positives (high confidence but wrong)
SELECT 
  theme,
  guess,
  confidence_percentage,
  attempt_date
FROM theme_attempts
WHERE is_correct = false 
  AND confidence_percentage >= 70
ORDER BY confidence_percentage DESC
LIMIT 50;

-- Find near-misses (should have passed?)
SELECT 
  theme,
  guess,
  confidence_percentage,
  attempt_date
FROM theme_attempts
WHERE is_correct = false 
  AND confidence_percentage BETWEEN 65 AND 77
ORDER BY confidence_percentage DESC;
```

## Player Analytics

```sql
-- Players with most theme attempts this week
SELECT 
  player_id,
  COUNT(*) as attempts,
  SUM(CASE WHEN is_correct THEN 1 ELSE 0 END) as correct,
  ROUND(AVG(confidence_percentage), 1) as avg_confidence
FROM theme_attempts
WHERE week_start = '2025-01-13'  -- Monday of the week
GROUP BY player_id
ORDER BY attempts DESC
LIMIT 20;

-- Most common wrong guesses for a theme
SELECT 
  guess,
  COUNT(*) as times_guessed,
  ROUND(AVG(confidence_percentage), 1) as avg_score
FROM theme_attempts
WHERE theme = 'Words That Are Both Nouns and Verbs'
  AND is_correct = false
GROUP BY guess
ORDER BY times_guessed DESC
LIMIT 20;
```

## Database Security Notes

The following views have been converted to SECURITY INVOKER (per Supabase Security Advisor):

```sql
-- Applied 2025-01-17
ALTER VIEW public.v_trigger_performance SET (security_invoker = true);
ALTER VIEW public.player_archive_stats SET (security_invoker = true);
```

This ensures these views execute with the permissions of the calling user, not the view creator.
