-- Migration: 20251228193010_add_dictionary_id_to_words
-- Description: Add words.dictionary_id FK to public.dictionary(id) (no backfill)
-- Author: AI Assistant
-- Date: 2025-12-28

ALTER TABLE public.words
ADD COLUMN IF NOT EXISTS dictionary_id BIGINT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'words_dictionary_id_fkey'
  ) THEN
    ALTER TABLE public.words
    ADD CONSTRAINT words_dictionary_id_fkey
      FOREIGN KEY (dictionary_id)
      REFERENCES public.dictionary(id);
  END IF;
END $$;


