-- Migration: 20250615000001_fix_current_week_theme.sql
-- Description: Fix theme data for current week (June 9-15, 2025) to ensure coral has correct theme
-- Author: AI Assistant
-- Date: 2025-06-15

-- Ensure all words in the current week have the 'language' theme
UPDATE words 
SET theme = 'language'
WHERE date >= '2025-06-09' AND date <= '2025-06-15';

-- Specifically ensure today's word 'coral' has the theme
UPDATE words 
SET theme = 'language'
WHERE word = 'coral' AND date = '2025-06-15';

-- If coral doesn't exist for today, insert it
INSERT INTO words (id, word, definition, date, theme, first_letter, number_of_letters, in_a_sentence, etymology)
SELECT 
  gen_random_uuid(),
  'coral',
  'A hard stony substance secreted by certain marine coelenterates as an external skeleton',
  '2025-06-15',
  'language',
  'c',
  5,
  'The diver marveled at the vibrant coral formations teeming with colorful fish.',
  'From Old French coral (12c.), from Latin corallium, from Greek korallion, perhaps of Semitic origin.'
WHERE NOT EXISTS (
  SELECT 1 FROM words 
  WHERE word = 'coral' AND date = '2025-06-15'
);

-- Ensure we have other themed words for this week
INSERT INTO words (id, word, definition, date, theme, first_letter, number_of_letters, in_a_sentence, etymology)
SELECT 
  gen_random_uuid(),
  word_data.word,
  word_data.definition,
  word_data.date,
  'language',
  word_data.first_letter,
  word_data.number_of_letters,
  word_data.in_a_sentence,
  word_data.etymology
FROM (VALUES
  ('lexicon', 'The vocabulary of a person, language, or branch of knowledge', '2025-06-09', 'l', 7, 'The medical lexicon contains many terms derived from Latin and Greek.', 'From Greek lexikon (biblion) meaning (book) of words.'),
  ('syntax', 'The arrangement of words and phrases to create well-formed sentences', '2025-06-10', 's', 6, 'Understanding syntax is crucial for learning any programming language.', 'From Greek syntaxis meaning arrangement or putting together.'),
  ('phoneme', 'Any of the perceptually distinct units of sound in a language', '2025-06-11', 'p', 7, 'The phoneme /p/ in "pat" differs from /b/ in "bat" only in voicing.', 'From Greek phonema meaning sound or voice.'),
  ('morpheme', 'The smallest grammatical unit in a language', '2025-06-12', 'm', 8, 'The word "unhappiness" contains three morphemes: un-, happy, and -ness.', 'From Greek morphe meaning form or shape.'),
  ('semantics', 'The branch of linguistics concerned with meaning', '2025-06-13', 's', 9, 'Semantics helps us understand how words convey meaning in different contexts.', 'From Greek semantikos meaning significant or having meaning.'),
  ('dialect', 'A particular form of a language specific to a region or group', '2025-06-14', 'd', 7, 'The Scottish dialect includes many words not found in standard English.', 'From Greek dialektos meaning discourse or way of speaking.')
) AS word_data(word, definition, date, first_letter, number_of_letters, in_a_sentence, etymology)
WHERE NOT EXISTS (
  SELECT 1 FROM words w 
  WHERE w.word = word_data.word 
  AND w.date = word_data.date::date
);

-- Add comment to document the theme
COMMENT ON COLUMN words.theme IS 'The weekly theme connecting 7 words. Current week (June 9-15, 2025): language'; 