-- Check theme attempts data with similarity scores for color-coding analysis
-- Usage: Run these queries in your Supabase SQL editor

-- 1. Overview of theme attempts with similarity data
SELECT 
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
ORDER BY created_at DESC 
LIMIT 50;

-- 2. Analyze similarity score distribution for color-coding ranges
SELECT 
    CASE 
        WHEN confidence_percentage IS NULL THEN 'No Score'
        WHEN confidence_percentage <= 50 THEN 'Red (≤50%)'
        WHEN confidence_percentage <= 70 THEN 'Orange (51-70%)'
        WHEN confidence_percentage > 70 THEN 'Green (>70%)'
    END as color_category,
    COUNT(*) as count,
    AVG(confidence_percentage) as avg_confidence,
    MIN(confidence_percentage) as min_confidence,
    MAX(confidence_percentage) as max_confidence
FROM theme_attempts 
WHERE confidence_percentage IS NOT NULL
GROUP BY 
    CASE 
        WHEN confidence_percentage IS NULL THEN 'No Score'
        WHEN confidence_percentage <= 50 THEN 'Red (≤50%)'
        WHEN confidence_percentage <= 70 THEN 'Orange (51-70%)'
        WHEN confidence_percentage > 70 THEN 'Green (>70%)'
    END
ORDER BY avg_confidence DESC;

-- 3. Check specific examples for each color category
-- Red examples (≤50%)
SELECT 'RED (≤50%)' as category, theme, guess, confidence_percentage, matching_method, is_correct
FROM theme_attempts 
WHERE confidence_percentage <= 50 AND confidence_percentage IS NOT NULL
ORDER BY confidence_percentage DESC
LIMIT 10;

-- Orange examples (51-70%)
SELECT 'ORANGE (51-70%)' as category, theme, guess, confidence_percentage, matching_method, is_correct
FROM theme_attempts 
WHERE confidence_percentage > 50 AND confidence_percentage <= 70
ORDER BY confidence_percentage DESC
LIMIT 10;

-- Green examples (>70%)
SELECT 'GREEN (>70%)' as category, theme, guess, confidence_percentage, matching_method, is_correct
FROM theme_attempts 
WHERE confidence_percentage > 70 AND is_correct = false
ORDER BY confidence_percentage DESC
LIMIT 10;

-- 4. Check correct answers (should all be green)
SELECT 'CORRECT ANSWERS' as category, theme, guess, confidence_percentage, matching_method, is_correct
FROM theme_attempts 
WHERE is_correct = true
ORDER BY confidence_percentage DESC
LIMIT 10;

-- 5. Analyze matching methods by confidence ranges
SELECT 
    matching_method,
    COUNT(*) as total_attempts,
    AVG(confidence_percentage) as avg_confidence,
    COUNT(CASE WHEN confidence_percentage <= 50 THEN 1 END) as red_count,
    COUNT(CASE WHEN confidence_percentage > 50 AND confidence_percentage <= 70 THEN 1 END) as orange_count,
    COUNT(CASE WHEN confidence_percentage > 70 THEN 1 END) as green_count
FROM theme_attempts 
WHERE confidence_percentage IS NOT NULL
GROUP BY matching_method
ORDER BY avg_confidence DESC;

-- 6. Recent theme attempts for testing (last 7 days)
SELECT 
    theme,
    guess,
    confidence_percentage,
    matching_method,
    is_correct,
    CASE 
        WHEN is_correct = true THEN 'GREEN (Correct)'
        WHEN confidence_percentage <= 50 THEN 'RED (≤50%)'
        WHEN confidence_percentage <= 70 THEN 'ORANGE (51-70%)'
        WHEN confidence_percentage > 70 THEN 'GREEN (>70%)'
        ELSE 'UNKNOWN'
    END as proposed_color,
    attempt_date
FROM theme_attempts 
WHERE attempt_date >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY attempt_date DESC, confidence_percentage DESC; 