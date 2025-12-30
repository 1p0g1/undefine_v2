-- Migration: 20251230000002_create_spelling_variants_table
-- Description: Create table for British/American spelling variants
-- Author: AI Assistant
-- Date: 2025-12-30

-- =============================================================================
-- TABLE: spelling_variants
-- =============================================================================
-- Maps alternative spellings to normalized forms.
-- Used for:
-- 1. British → American spelling (e.g., colour → color)
-- 2. Common misspellings
-- 3. Alternative forms

CREATE TABLE IF NOT EXISTS public.spelling_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_word text NOT NULL,           -- The alternative spelling (e.g., "colour")
  normalized_word text NOT NULL,        -- The dictionary form (e.g., "color")
  variant_type text NOT NULL CHECK (variant_type IN ('british', 'american', 'typo', 'alternative')),
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

-- Unique constraint - each variant maps to one normalized form
ALTER TABLE public.spelling_variants
ADD CONSTRAINT spelling_variants_variant_unique UNIQUE (variant_word);

-- Index for fast lookup
CREATE INDEX idx_spelling_variants_variant ON public.spelling_variants(variant_word);
CREATE INDEX idx_spelling_variants_normalized ON public.spelling_variants(normalized_word);

-- =============================================================================
-- SEED DATA: Common British/American Variants
-- =============================================================================

INSERT INTO public.spelling_variants (variant_word, normalized_word, variant_type) VALUES
-- -our / -or
('colour', 'color', 'british'),
('honour', 'honor', 'british'),
('favour', 'favor', 'british'),
('flavour', 'flavor', 'british'),
('behaviour', 'behavior', 'british'),
('labour', 'labor', 'british'),
('neighbour', 'neighbor', 'british'),
('harbour', 'harbor', 'british'),
('humour', 'humor', 'british'),
('vapour', 'vapor', 'british'),
('savour', 'savor', 'british'),
('armour', 'armor', 'british'),
('glamour', 'glamor', 'british'),
('splendour', 'splendor', 'british'),
('rigour', 'rigor', 'british'),
('vigour', 'vigor', 'british'),
('tumour', 'tumor', 'british'),
('odour', 'odor', 'british'),
('rumour', 'rumor', 'british'),
('clamour', 'clamor', 'british'),

-- -ise / -ize
('realise', 'realize', 'british'),
('organise', 'organize', 'british'),
('recognise', 'recognize', 'british'),
('apologise', 'apologize', 'british'),
('categorise', 'categorize', 'british'),
('criticise', 'criticize', 'british'),
('emphasise', 'emphasize', 'british'),
('prioritise', 'prioritize', 'british'),
('specialise', 'specialize', 'british'),
('summarise', 'summarize', 'british'),
('analyse', 'analyze', 'british'),
('paralyse', 'paralyze', 'british'),
('catalyse', 'catalyze', 'british'),

-- -re / -er
('centre', 'center', 'british'),
('theatre', 'theater', 'british'),
('metre', 'meter', 'british'),
('litre', 'liter', 'british'),
('fibre', 'fiber', 'british'),
('calibre', 'caliber', 'british'),
('sabre', 'saber', 'british'),
('lustre', 'luster', 'british'),
('sombre', 'somber', 'british'),
('spectre', 'specter', 'british'),
('meagre', 'meager', 'british'),
('manoeuvre', 'maneuver', 'british'),

-- -ence / -ense
('defence', 'defense', 'british'),
('offence', 'offense', 'british'),
('licence', 'license', 'british'),
('pretence', 'pretense', 'british'),

-- -ogue / -og
('catalogue', 'catalog', 'british'),
('dialogue', 'dialog', 'british'),
('analogue', 'analog', 'british'),
('prologue', 'prolog', 'british'),
('epilogue', 'epilog', 'british'),
('monologue', 'monolog', 'british'),

-- Double letters
('travelling', 'traveling', 'british'),
('traveller', 'traveler', 'british'),
('cancelled', 'canceled', 'british'),
('counsellor', 'counselor', 'british'),
('jewellery', 'jewelry', 'british'),
('marvellous', 'marvelous', 'british'),
('modelling', 'modeling', 'british'),
('labelled', 'labeled', 'british'),
('fuelled', 'fueled', 'british'),

-- -ae / -e
('anaemia', 'anemia', 'british'),
('anaesthetic', 'anesthetic', 'british'),
('encyclopaedia', 'encyclopedia', 'british'),
('paediatric', 'pediatric', 'british'),
('orthopaedic', 'orthopedic', 'british'),
('gynaecology', 'gynecology', 'british'),
('archaeology', 'archeology', 'british'),
('haemorrhage', 'hemorrhage', 'british'),

-- Other common variants
('grey', 'gray', 'british'),
('tyre', 'tire', 'british'),
('kerb', 'curb', 'british'),
('aluminium', 'aluminum', 'british'),
('aeroplane', 'airplane', 'british'),
('cheque', 'check', 'british'),
('draught', 'draft', 'british'),
('gaol', 'jail', 'british'),
('mould', 'mold', 'british'),
('plough', 'plow', 'british'),
('programme', 'program', 'british'),
('pyjamas', 'pajamas', 'british'),
('sceptic', 'skeptic', 'british'),
('storey', 'story', 'british'),
('sulphur', 'sulfur', 'british'),
('whisky', 'whiskey', 'british'),
('woollen', 'woolen', 'british'),
('yoghurt', 'yogurt', 'british'),
('enquiry', 'inquiry', 'british'),
('judgement', 'judgment', 'british'),
('ageing', 'aging', 'british'),
('moustache', 'mustache', 'british'),
('omelette', 'omelet', 'british'),
('mediaeval', 'medieval', 'british'),
('furore', 'furor', 'british')
ON CONFLICT (variant_word) DO NOTHING;

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE public.spelling_variants ENABLE ROW LEVEL SECURITY;

-- Everyone can read
CREATE POLICY "spelling_variants_public_read" ON public.spelling_variants
FOR SELECT TO anon, authenticated, service_role
USING (true);

-- Only service_role can write
CREATE POLICY "spelling_variants_service_role_write" ON public.spelling_variants
FOR INSERT, UPDATE, DELETE TO service_role
USING (true)
WITH CHECK (true);

-- =============================================================================
-- HELPER FUNCTION: Normalize spelling
-- =============================================================================

CREATE OR REPLACE FUNCTION public.normalize_spelling(input_word text)
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    (SELECT normalized_word FROM public.spelling_variants WHERE variant_word = LOWER(input_word) LIMIT 1),
    LOWER(input_word)
  );
$$;

COMMENT ON FUNCTION public.normalize_spelling IS 'Converts British spellings to American, or returns lowercase input if no variant found';

-- =============================================================================
-- VERIFICATION
-- =============================================================================

-- Test the function
SELECT public.normalize_spelling('honour');  -- Should return 'honor'
SELECT public.normalize_spelling('color');   -- Should return 'color' (unchanged)
SELECT public.normalize_spelling('COLOUR');  -- Should return 'color' (case insensitive)

