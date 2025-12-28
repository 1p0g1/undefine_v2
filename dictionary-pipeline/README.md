# Dictionary Pipeline (OPTED / Webster 1913) — Offline ETL

This folder contains a **local/offline**, repeatable pipeline to parse the OPTED/Webster 1913 HTML files into a **Supabase-importable CSV** for the `public.dictionary` table.

---

## Why is the `etymology` column empty?

**Webster's 1913 Dictionary** (OPTED source) does not include a separate, structured "etymology" field per entry. The original dictionary _sometimes_ embeds etymological information within the definition text, but it's not consistently formatted or extractable.

This is **expected** — the `etymology` column in the pipeline output is intentionally blank. We enrich it separately using external APIs (see [Etymology Enrichment](#etymology-enrichment-multi-source) below).

**Available enrichment sources:**
- **dictionaryapi.dev** (free): Often missing the `origin` field, but useful when present
- **WordsAPI** (paid, RapidAPI): Better coverage, requires API key
- **Wiktionary** (free fallback): Parses etymology from wiki pages via MediaWiki API

---

## Prerequisites

- Python 3.10+ (macOS/Linux)
- Install dependencies:

```bash
python3 -m pip install -r dictionary-pipeline/requirements.txt
```

## Inputs

Place the OPTED HTML files (e.g. `wb1913_a.html`, `wb1913_b.html`, …) into:

- `dictionary-pipeline/raw/`

You already have these in the repo under `DICTIONARY/v003/` (e.g. `DICTIONARY/v003/wb1913_a.html`). You can either:
- copy them into `dictionary-pipeline/raw/`, or
- run the pipeline directly against `DICTIONARY/v003/wb1913_*.html` via `--input-glob`.

## One-command pipeline

Parse → normalize → rank → (optional enrich) → final:

```bash
python3 dictionary-pipeline/scripts/run_pipeline.py \
  --input-glob "DICTIONARY/v003/wb1913_*.html" \
  --do-enrich false
```

Optional enrichment (offline/admin only; cached; fail-soft):

```bash
python3 dictionary-pipeline/scripts/run_pipeline.py \
  --input-glob "DICTIONARY/v003/wb1913_*.html" \
  --do-enrich true \
  --max-enrich-calls 200
```

## Running each step manually

1) Parse HTML → raw CSV:

```bash
python3 dictionary-pipeline/scripts/parse_opted_html.py \
  --input-glob "DICTIONARY/v003/wb1913_*.html" \
  --output dictionary-pipeline/output/dictionary_raw.csv
```

2) Normalize → normalized CSV:

```bash
python3 dictionary-pipeline/scripts/normalize_dictionary.py \
  --input dictionary-pipeline/output/dictionary_raw.csv \
  --output dictionary-pipeline/output/dictionary_normalized.csv \
  --dedupe true
```

3) Lex rank → ranked CSV:

```bash
python3 dictionary-pipeline/scripts/compute_lex_rank.py \
  --input dictionary-pipeline/output/dictionary_normalized.csv \
  --output dictionary-pipeline/output/dictionary_ranked.csv
```

4) (Optional) Enrich from dictionaryapi.dev (cached, fail-soft):

```bash
python3 dictionary-pipeline/scripts/enrich_dictionaryapi.py \
  --input dictionary-pipeline/output/dictionary_ranked.csv \
  --output dictionary-pipeline/output/dictionary_enriched.csv \
  --cache-dir dictionary-pipeline/output/cache/dictionaryapi \
  --delay-ms 200 \
  --max-calls 200
```

5) Build final import CSV:

```bash
python3 dictionary-pipeline/scripts/build_final_csv.py \
  --input dictionary-pipeline/output/dictionary_ranked.csv \
  --output dictionary-pipeline/output/dictionary_final.csv
```

If you enriched:

```bash
python3 dictionary-pipeline/scripts/build_final_csv.py \
  --input dictionary-pipeline/output/dictionary_enriched.csv \
  --output dictionary-pipeline/output/dictionary_final.csv
```

## Outputs

All generated files go into `dictionary-pipeline/output/`:

- `dictionary_raw.csv`: parsed from HTML; minimal cleanup
- `dictionary_normalized.csv`: normalization + derived fields
- `dictionary_ranked.csv`: deterministic lexicographic ordering (`lex_rank`)
- `dictionary_enriched.csv`: optional offline enrichment fields (e.g. etymology)
- `dictionary_final.csv`: **final import CSV** aligned to intended Supabase schema

## Sanity check

```bash
python3 dictionary-pipeline/scripts/sanity_check_ranked.py \
  --input dictionary-pipeline/output/dictionary_ranked.csv
```

## Next steps (Supabase import — not implemented here)

## Create table + import CSV (Supabase)

This repo stores schema changes as migrations under `supabase/migrations/` (apply via Supabase CLI).

### 1) Apply migrations

```bash
cd /Users/paddy/Documents/undefine_v2
supabase db push
```

### 2) Import `dictionary_final.csv` into `public.dictionary`

The pipeline produces:
- `dictionary-pipeline/output/dictionary_final.csv`

It contains these columns (in order):
- `word, normalized_word, part_of_speech, definition, etymology, first_letter, number_of_letters, lex_rank`

#### Option A: Supabase Dashboard CSV import

- Table: `public.dictionary`
- Map CSV columns to the matching table columns above
- Leave the API enrichment columns (`api_*`) to defaults/nulls

#### Option B: `psql` import via `\copy`

Template (replace `<PATH_TO_CSV>` and `<DATABASE_URL>`):

```bash
psql "<DATABASE_URL>" -c "\\copy public.dictionary(word, normalized_word, part_of_speech, definition, etymology, first_letter, number_of_letters, lex_rank) FROM '<PATH_TO_CSV>' WITH (FORMAT csv, HEADER true)"
```

## Offline/admin enrichment (dictionaryapi.dev → Supabase)

This is **not runtime gameplay**. It’s a local script that:
- selects rows from `public.dictionary` needing enrichment
- uses a local cache under `dictionary-pipeline/output/cache/dictionaryapi/`
- updates `public.dictionary.api_origin/api_payload/api_enrich_status/...`

Required environment variables:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Dry run (default):

```bash
python3 dictionary-pipeline/scripts/enrich_dictionaryapi_supabase.py --limit 200 --status pending --dry-run true
```

Real run:

```bash
python3 dictionary-pipeline/scripts/enrich_dictionaryapi_supabase.py --limit 200 --status pending --dry-run false
```

---

## Etymology Enrichment (Multi-Source)

Since Webster 1913 lacks structured etymology, we provide a separate enrichment script that cascades through multiple sources:

1. **dictionaryapi.dev** (free) — uses `origin` field if present
2. **WordsAPI** (optional, requires `WORDSAPI_KEY` env var) — paid RapidAPI service
3. **Wiktionary** (free fallback) — parses Etymology section via MediaWiki API

### Install additional dependencies

```bash
python3 -m pip install -r dictionary-pipeline/requirements.txt
# Includes: mwparserfromhell (for Wiktionary parsing), requests
```

### Usage (before Supabase import)

Dry run (reports what would be enriched, no output written):

```bash
python3 dictionary-pipeline/scripts/enrich_etymology.py \
  --input dictionary-pipeline/output/dictionary_final.csv \
  --output dictionary-pipeline/output/dictionary_enriched_etymology.csv \
  --max-rows 500 \
  --dry-run true
```

Real run:

```bash
python3 dictionary-pipeline/scripts/enrich_etymology.py \
  --input dictionary-pipeline/output/dictionary_final.csv \
  --output dictionary-pipeline/output/dictionary_enriched_etymology.csv \
  --max-rows 0 \
  --dry-run false
```

### With WordsAPI (optional)

Set the `WORDSAPI_KEY` environment variable (get from RapidAPI):

```bash
export WORDSAPI_KEY="your-rapidapi-key"
python3 dictionary-pipeline/scripts/enrich_etymology.py \
  --input dictionary-pipeline/output/dictionary_final.csv \
  --output dictionary-pipeline/output/dictionary_enriched_etymology.csv \
  --dry-run false
```

### Output

The enriched CSV includes:
- `etymology`: populated text (or empty if not found)
- `etymology_source`: one of `dictionaryapi`, `wordsapi`, `wiktionary`, `not_found`, `existing`, `skipped`

### Caching

All API responses are cached under:
- `dictionary-pipeline/output/cache/etymology/dictionaryapi/<word>.json`
- `dictionary-pipeline/output/cache/etymology/wordsapi/<word>.json`
- `dictionary-pipeline/output/cache/etymology/wiktionary/<word>.json`

Re-running the script will use cached responses (no duplicate API calls).

---

## Known Issues / Manual Steps

### FK Constraint Drop (December 2025)

During initial `dictionary` table population, the following manual steps were required to allow `TRUNCATE`:

```sql
-- Make dictionary_id nullable (if not already)
ALTER TABLE words ALTER COLUMN dictionary_id DROP NOT NULL;

-- Clear references before truncating
UPDATE words SET dictionary_id = NULL WHERE dictionary_id IS NOT NULL;

-- Drop the FK temporarily
ALTER TABLE words DROP CONSTRAINT words_dictionary_id_fkey;

-- Now safe to truncate
TRUNCATE TABLE dictionary;
```

**To restore the FK constraint**, apply the migration:
- `supabase/migrations/20251228200000_restore_words_dictionary_fk.sql`

Or manually:

```sql
ALTER TABLE public.words
ADD CONSTRAINT words_dictionary_id_fkey
  FOREIGN KEY (dictionary_id)
  REFERENCES public.dictionary(id)
  ON DELETE SET NULL;
```

---


