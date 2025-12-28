-- Migration: 20251228200000_restore_words_dictionary_fk
-- Description: Re-add words.dictionary_id FK to public.dictionary(id) after manual drop
-- Author: AI Assistant
-- Date: 2025-12-28
--
-- CONTEXT:
-- The original FK (words_dictionary_id_fkey) was manually dropped during initial
-- dictionary table setup to allow TRUNCATE operations. This migration restores
-- the FK constraint now that the dictionary table is properly populated.
--
-- PREREQUISITES:
-- 1. dictionary table must be populated with dictionary_final.csv data
-- 2. Any words.dictionary_id values must reference valid dictionary.id rows
--    (or be NULL, which is allowed)
--
-- MANUAL STEPS TAKEN BEFORE THIS MIGRATION (for reference):
-- ALTER TABLE words ALTER COLUMN dictionary_id DROP NOT NULL;
-- UPDATE words SET dictionary_id = NULL WHERE dictionary_id IS NOT NULL;
-- ALTER TABLE words DROP CONSTRAINT words_dictionary_id_fkey;
-- TRUNCATE TABLE dictionary;

DO $$
BEGIN
  -- Only add the FK if it doesn't already exist
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'words_dictionary_id_fkey'
  ) THEN
    ALTER TABLE public.words
    ADD CONSTRAINT words_dictionary_id_fkey
      FOREIGN KEY (dictionary_id)
      REFERENCES public.dictionary(id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- Note: We use ON DELETE SET NULL so that if a dictionary entry is ever removed,
-- the words.dictionary_id is set to NULL rather than causing a FK violation.
-- This is safer for maintenance operations.

