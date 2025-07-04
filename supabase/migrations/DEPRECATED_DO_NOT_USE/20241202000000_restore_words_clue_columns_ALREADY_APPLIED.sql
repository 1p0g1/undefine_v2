-- Migration: 20241202000000_restore_words_clue_columns.sql
-- Description: Restore missing clue-related columns and created_at to the words table
--              to align with the documented schema in docs/database_schema.md.
-- Author: AI Assistant
-- Date: 2024-12-02

ALTER TABLE words
  ADD COLUMN IF NOT EXISTS etymology TEXT,
  ADD COLUMN IF NOT EXISTS first_letter TEXT,
  ADD COLUMN IF NOT EXISTS in_a_sentence TEXT,
  ADD COLUMN IF NOT EXISTS number_of_letters INTEGER,
  ADD COLUMN IF NOT EXISTS equivalents TEXT,
  ADD COLUMN IF NOT EXISTS difficulty TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Additionally, ensure indexes from the original schema doc are present
CREATE INDEX IF NOT EXISTS idx_words_word ON words(word);
CREATE INDEX IF NOT EXISTS idx_words_date ON words(date);

COMMENT ON COLUMN words.definition IS 'The definition of the word, serves as the D in D.E.F.I.N.E. clues.';
COMMENT ON COLUMN words.etymology IS 'The etymology of the word, serves as the E in D.E.F.I.N.E. clues.';
COMMENT ON COLUMN words.first_letter IS 'The first letter of the word, can serve as the F in D.E.F.I.N.E. clues.';
COMMENT ON COLUMN words.in_a_sentence IS 'An example sentence using the word, serves as the I in D.E.F.I.N.E. clues.';
COMMENT ON COLUMN words.number_of_letters IS 'The number of letters in the word, serves as the N in D.E.F.I.N.E. clues.';
COMMENT ON COLUMN words.equivalents IS 'Synonyms or equivalent phrases for the word, can serve as the second E in D.E.F.I.N.E. clues.';
COMMENT ON COLUMN words.difficulty IS 'The difficulty level of the word (e.g., Easy, Medium, Hard).';
COMMENT ON COLUMN words.created_at IS 'Timestamp of when the word was added.'; 