-- Add themed words for current week (December 16-22, 2024) for testing
-- This allows the Theme of the Week feature to work with current dates

-- Update some existing words to have themes and be in current week
UPDATE words 
SET theme = 'emotions', date = '2024-12-16'
WHERE word IN ('elated', 'morose', 'serene') AND date < '2024-12-16';

UPDATE words 
SET theme = 'emotions', date = '2024-12-17' 
WHERE word IN ('jovial', 'somber', 'placid') AND date < '2024-12-17';

UPDATE words 
SET theme = 'emotions', date = '2024-12-18'
WHERE word IN ('euphoric', 'melancholy', 'tranquil') AND date < '2024-12-18';

-- If those words don't exist, insert new ones
INSERT INTO words (id, word, definition, date, theme) 
SELECT 
  gen_random_uuid(),
  word_data.word,
  word_data.definition,
  word_data.date,
  'emotions'
FROM (VALUES
  ('elated', 'Feeling or expressing great happiness and triumph', '2024-12-16'),
  ('morose', 'Bad-tempered and sulky; gloomy', '2024-12-17'),
  ('serene', 'Calm, peaceful, and untroubled', '2024-12-18'),
  ('jovial', 'Cheerful and friendly', '2024-12-19'),
  ('somber', 'Dark or dull in color or tone; grave', '2024-12-20'),
  ('placid', 'Not easily upset or excited; calm and peaceful', '2024-12-21'),
  ('euphoric', 'Characterized by or feeling intense excitement and happiness', '2024-12-22')
) AS word_data(word, definition, date)
WHERE NOT EXISTS (
  SELECT 1 FROM words w 
  WHERE w.word = word_data.word 
  AND w.date >= '2024-12-16' 
  AND w.date <= '2024-12-22'
);

-- Ensure we have at least one themed word for today (2024-12-16)
INSERT INTO words (id, word, definition, date, theme)
SELECT 
  gen_random_uuid(),
  'blissful',
  'Extremely happy; full of joy',
  '2024-12-16',
  'emotions'
WHERE NOT EXISTS (
  SELECT 1 FROM words 
  WHERE date = '2024-12-16' 
  AND theme IS NOT NULL
); 