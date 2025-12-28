-- Migration: 20251228193000_create_dictionary_table
-- Description: Create public.dictionary table for canonical lexicographic inventory + offline enrichment fields
-- Author: AI Assistant
-- Date: 2025-12-28

-- Create dictionary table (separate from words; words will later reference it via FK)
CREATE TABLE IF NOT EXISTS public.dictionary (
  id BIGSERIAL PRIMARY KEY,
  word TEXT NOT NULL,
  normalized_word TEXT NOT NULL,
  part_of_speech TEXT,
  definition TEXT,
  etymology TEXT,
  first_letter TEXT NOT NULL,
  number_of_letters INT NOT NULL,
  lex_rank INT NOT NULL,
  api_origin TEXT,
  api_payload JSONB,
  api_enrich_status TEXT NOT NULL DEFAULT 'pending',
  api_last_enriched_at TIMESTAMPTZ,
  api_enrich_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes / constraints
CREATE UNIQUE INDEX IF NOT EXISTS dictionary_lex_rank_unique ON public.dictionary(lex_rank);
CREATE INDEX IF NOT EXISTS dictionary_normalized_word_idx ON public.dictionary(normalized_word);
CREATE INDEX IF NOT EXISTS dictionary_word_idx ON public.dictionary(word);

-- RLS:
-- dictionary is accessed via server routes; no client direct reads by default
ALTER TABLE public.dictionary ENABLE ROW LEVEL SECURITY;


