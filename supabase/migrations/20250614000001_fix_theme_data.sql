-- Migration: 20250614000001_fix_theme_data.sql
-- Description: Fix theme data for June 9-15, 2025 to have a consistent theme
-- Author: AI Assistant
-- Date: 2025-06-14

-- First, update all words in the current week to have the 'language' theme
UPDATE words 
SET theme = 'language'
WHERE date >= '2025-06-09' AND date <= '2025-06-15'
  AND theme = 'theme';

-- Remove any other themes for this week to ensure consistency
UPDATE words
SET theme = 'language'
WHERE date >= '2025-06-09' AND date <= '2025-06-15'
  AND theme != 'language';

-- Add comments to document the theme change
COMMENT ON COLUMN words.theme IS 'The weekly theme connecting 7 words. One theme per week (Monday-Sunday).'; 