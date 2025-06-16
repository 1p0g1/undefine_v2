-- Add themed words for current week (June 17-23, 2024) for testing
-- This allows the Theme of the Week feature to work with current dates

-- Update some existing words to have themes and be in current week
UPDATE words 
SET theme = 'nature', date = '2024-06-17'
WHERE word IN ('forest', 'meadow', 'stream') AND date < '2024-06-17';

UPDATE words 
SET theme = 'nature', date = '2024-06-18' 
WHERE word IN ('valley', 'canyon', 'river') AND date < '2024-06-18';

UPDATE words 
SET theme = 'nature', date = '2024-06-19'
WHERE word IN ('mountain', 'glacier', 'desert') AND date < '2024-06-19';

-- If those words don't exist, insert new ones
INSERT INTO words (id, word, definition, date, theme) 
SELECT 
  gen_random_uuid(),
  word_data.word,
  word_data.definition,
  word_data.date,
  'nature'
FROM (VALUES
  ('forest', 'A large area covered chiefly with trees and undergrowth', '2024-06-17'),
  ('meadow', 'A piece of grassland, especially one used for hay', '2024-06-17'),
  ('stream', 'A small, narrow river', '2024-06-18'),
  ('valley', 'A low area of land between hills or mountains', '2024-06-18'),
  ('canyon', 'A deep gorge, typically one with a river flowing through it', '2024-06-19'),
  ('river', 'A large natural stream of water flowing in a channel to the sea', '2024-06-19'),
  ('mountain', 'A large natural elevation of the earth''s surface', '2024-06-20')
) AS word_data(word, definition, date)
WHERE NOT EXISTS (
  SELECT 1 FROM words w 
  WHERE w.word = word_data.word 
  AND w.date >= '2024-06-17' 
  AND w.date <= '2024-06-23'
);

-- Ensure we have at least one themed word for today (2024-06-17)
INSERT INTO words (id, word, definition, date, theme)
SELECT 
  gen_random_uuid(),
  'lake',
  'A large body of water surrounded by land',
  '2024-06-17',
  'nature'
WHERE NOT EXISTS (
  SELECT 1 FROM words 
  WHERE date = '2024-06-17' 
  AND theme IS NOT NULL
); 