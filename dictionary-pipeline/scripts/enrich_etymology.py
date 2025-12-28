#!/usr/bin/env python3
"""
enrich_etymology.py

Enrich dictionary CSV with etymology data from multiple sources:
1. dictionaryapi.dev (free, but often missing 'origin')
2. WordsAPI (optional, requires WORDSAPI_KEY env var)
3. Wiktionary (free fallback via MediaWiki API)

Caches all API responses locally to avoid repeated calls.

Usage:
    python3 dictionary-pipeline/scripts/enrich_etymology.py \
        --input dictionary-pipeline/output/dictionary_final.csv \
        --output dictionary-pipeline/output/dictionary_enriched_etymology.csv \
        --max-rows 500 \
        --dry-run false
"""

from __future__ import annotations

import argparse
import csv
import json
import os
import re
import sys
import time
from pathlib import Path
from typing import Optional, Tuple

# Add parent dir for _common imports
sys.path.insert(0, str(Path(__file__).parent))
from _common import ensure_dir, read_csv_rows, write_csv_rows

# Optional: mwparserfromhell for Wiktionary parsing
try:
    import mwparserfromhell
    HAS_MWPARSER = True
except ImportError:
    HAS_MWPARSER = False
    print("[enrich_etymology] Warning: mwparserfromhell not installed; Wiktionary fallback disabled")

try:
    import requests
    HAS_REQUESTS = True
except ImportError:
    HAS_REQUESTS = False
    print("[enrich_etymology] Warning: requests not installed; all API calls disabled")

# ============================================================================
# Configuration
# ============================================================================

DEFAULT_CACHE_DIR = "dictionary-pipeline/output/cache/etymology"
DICTIONARYAPI_URL = "https://api.dictionaryapi.dev/api/v2/entries/en/{word}"
WORDSAPI_URL = "https://wordsapiv1.p.rapidapi.com/words/{word}"
WIKTIONARY_API_URL = "https://en.wiktionary.org/w/api.php"

# User-Agent for Wiktionary (required by their policy)
WIKTIONARY_USER_AGENT = "UnDefine-DictionaryPipeline/1.0 (https://github.com/undefine; etymology enrichment bot)"

# Rate limiting (be polite to free APIs)
DEFAULT_SLEEP_MS = 200


# ============================================================================
# Cache helpers
# ============================================================================

def get_cache_path(cache_dir: str, source: str, word: str) -> Path:
    """Return cache file path for a word from a specific source."""
    safe_word = re.sub(r'[^\w\-]', '_', word.lower())
    return Path(cache_dir) / source / f"{safe_word}.json"


def load_from_cache(cache_dir: str, source: str, word: str) -> Optional[dict]:
    """Load cached response if exists."""
    path = get_cache_path(cache_dir, source, word)
    if path.exists():
        try:
            return json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            return None
    return None


def save_to_cache(cache_dir: str, source: str, word: str, data: dict) -> None:
    """Save response to cache."""
    path = get_cache_path(cache_dir, source, word)
    ensure_dir(path.parent)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


# ============================================================================
# Source: dictionaryapi.dev
# ============================================================================

def fetch_dictionaryapi(word: str, cache_dir: str, sleep_ms: int) -> Tuple[Optional[str], dict]:
    """
    Try dictionaryapi.dev for etymology (stored in 'origin' field).
    Returns (etymology_text_or_None, raw_response_dict).
    """
    if not HAS_REQUESTS:
        return None, {"error": "requests not installed"}
    
    cached = load_from_cache(cache_dir, "dictionaryapi", word)
    if cached is not None:
        origin = None
        if isinstance(cached, list) and len(cached) > 0:
            origin = cached[0].get("origin")
        return origin, cached
    
    try:
        time.sleep(sleep_ms / 1000.0)
        url = DICTIONARYAPI_URL.format(word=word)
        resp = requests.get(url, timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            save_to_cache(cache_dir, "dictionaryapi", word, data)
            origin = None
            if isinstance(data, list) and len(data) > 0:
                origin = data[0].get("origin")
            return origin, data
        elif resp.status_code == 404:
            save_to_cache(cache_dir, "dictionaryapi", word, {"status": 404, "word": word})
            return None, {"status": 404}
        else:
            return None, {"status": resp.status_code}
    except Exception as e:
        return None, {"error": str(e)}


# ============================================================================
# Source: WordsAPI (optional, requires API key)
# ============================================================================

def fetch_wordsapi(word: str, api_key: str, cache_dir: str, sleep_ms: int) -> Tuple[Optional[str], dict]:
    """
    Try WordsAPI for etymology (check 'etymology' or 'origin' fields).
    Requires WORDSAPI_KEY env var (RapidAPI key).
    Returns (etymology_text_or_None, raw_response_dict).
    """
    if not HAS_REQUESTS:
        return None, {"error": "requests not installed"}
    if not api_key:
        return None, {"error": "no API key"}
    
    cached = load_from_cache(cache_dir, "wordsapi", word)
    if cached is not None:
        etym = cached.get("etymology") or cached.get("origin")
        return etym, cached
    
    try:
        time.sleep(sleep_ms / 1000.0)
        url = WORDSAPI_URL.format(word=word)
        headers = {
            "X-RapidAPI-Key": api_key,
            "X-RapidAPI-Host": "wordsapiv1.p.rapidapi.com"
        }
        resp = requests.get(url, headers=headers, timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            save_to_cache(cache_dir, "wordsapi", word, data)
            etym = data.get("etymology") or data.get("origin")
            return etym, data
        elif resp.status_code == 404:
            save_to_cache(cache_dir, "wordsapi", word, {"status": 404, "word": word})
            return None, {"status": 404}
        else:
            return None, {"status": resp.status_code}
    except Exception as e:
        return None, {"error": str(e)}


# ============================================================================
# Source: Wiktionary (free fallback via MediaWiki API)
# ============================================================================

def fetch_wiktionary(word: str, cache_dir: str, sleep_ms: int) -> Tuple[Optional[str], dict]:
    """
    Try Wiktionary for etymology via MediaWiki API.
    Parses the 'Etymology' section from the wikitext.
    Returns (etymology_text_or_None, raw_response_dict).
    """
    if not HAS_REQUESTS:
        return None, {"error": "requests not installed"}
    if not HAS_MWPARSER:
        return None, {"error": "mwparserfromhell not installed"}
    
    cached = load_from_cache(cache_dir, "wiktionary", word)
    if cached is not None:
        return cached.get("etymology_parsed"), cached
    
    try:
        time.sleep(sleep_ms / 1000.0)
        params = {
            "action": "query",
            "titles": word,
            "prop": "revisions",
            "rvprop": "content",
            "rvslots": "main",
            "format": "json",
            "redirects": 1
        }
        headers = {"User-Agent": WIKTIONARY_USER_AGENT}
        resp = requests.get(WIKTIONARY_API_URL, params=params, headers=headers, timeout=15)
        if resp.status_code != 200:
            return None, {"status": resp.status_code}
        
        data = resp.json()
        pages = data.get("query", {}).get("pages", {})
        
        for page_id, page in pages.items():
            if page_id == "-1":
                # Page not found
                save_to_cache(cache_dir, "wiktionary", word, {"status": 404, "word": word})
                return None, {"status": 404}
            
            revisions = page.get("revisions", [])
            if not revisions:
                continue
            
            content = revisions[0].get("slots", {}).get("main", {}).get("*", "")
            if not content:
                content = revisions[0].get("*", "")
            
            etymology = parse_wiktionary_etymology(content)
            result = {
                "word": word,
                "etymology_parsed": etymology,
                "raw_length": len(content)
            }
            save_to_cache(cache_dir, "wiktionary", word, result)
            return etymology, result
        
        save_to_cache(cache_dir, "wiktionary", word, {"status": 404, "word": word})
        return None, {"status": 404}
    
    except Exception as e:
        return None, {"error": str(e)}


def parse_wiktionary_etymology(wikitext: str) -> Optional[str]:
    """
    Parse the Etymology section from Wiktionary wikitext.
    Returns plain text or None if not found.
    """
    if not HAS_MWPARSER:
        return None
    
    try:
        parsed = mwparserfromhell.parse(wikitext)
        
        # Find English section first
        in_english = False
        in_etymology = False
        etymology_parts = []
        
        for node in parsed.nodes:
            text = str(node)
            
            # Check for English section header
            if "==English==" in text:
                in_english = True
                continue
            
            # Check for other language section (exit English)
            if in_english and re.match(r"^==\s*[^=]+\s*==$", text.strip()) and "English" not in text:
                break
            
            # Check for Etymology section header within English
            if in_english:
                if re.match(r"^===\s*Etymology", text, re.IGNORECASE):
                    in_etymology = True
                    continue
                elif re.match(r"^===", text) and in_etymology:
                    # Next section, stop collecting
                    break
                
                if in_etymology:
                    etymology_parts.append(text)
        
        if etymology_parts:
            # Clean up the etymology text
            raw = "".join(etymology_parts)
            # Strip wiki markup using mwparserfromhell
            clean = mwparserfromhell.parse(raw).strip_code()
            # Collapse whitespace
            clean = re.sub(r'\s+', ' ', clean).strip()
            # Truncate if too long (Wiktionary etymologies can be verbose)
            if len(clean) > 1000:
                clean = clean[:997] + "..."
            return clean if clean else None
        
        return None
    
    except Exception:
        return None


# ============================================================================
# Main enrichment logic
# ============================================================================

def enrich_word_etymology(
    word: str,
    normalized_word: str,
    cache_dir: str,
    sleep_ms: int,
    wordsapi_key: Optional[str] = None
) -> Tuple[Optional[str], str]:
    """
    Try to find etymology for a word from multiple sources.
    Returns (etymology_text, source_name).
    Source names: "dictionaryapi", "wordsapi", "wiktionary", "not_found"
    """
    # 1. Try dictionaryapi.dev first (free)
    etym, _ = fetch_dictionaryapi(normalized_word, cache_dir, sleep_ms)
    if etym:
        return etym, "dictionaryapi"
    
    # 2. Try WordsAPI if key provided
    if wordsapi_key:
        etym, _ = fetch_wordsapi(normalized_word, wordsapi_key, cache_dir, sleep_ms)
        if etym:
            return etym, "wordsapi"
    
    # 3. Try Wiktionary fallback
    etym, _ = fetch_wiktionary(normalized_word, cache_dir, sleep_ms)
    if etym:
        return etym, "wiktionary"
    
    return None, "not_found"


def main():
    parser = argparse.ArgumentParser(description="Enrich dictionary CSV with etymology from multiple APIs")
    parser.add_argument("--input", required=True, help="Input CSV (dictionary_final.csv)")
    parser.add_argument("--output", required=True, help="Output CSV with etymology enriched")
    parser.add_argument("--cache-dir", default=DEFAULT_CACHE_DIR, help="Cache directory for API responses")
    parser.add_argument("--max-rows", type=int, default=0, help="Max rows to process (0 = all)")
    parser.add_argument("--sleep-ms", type=int, default=DEFAULT_SLEEP_MS, help="Delay between API calls (ms)")
    parser.add_argument("--dry-run", default="true", help="If true, don't write output (just report)")
    parser.add_argument("--skip-existing", default="true", help="Skip rows that already have etymology")
    args = parser.parse_args()
    
    dry_run = args.dry_run.lower() in ("true", "1", "yes")
    skip_existing = args.skip_existing.lower() in ("true", "1", "yes")
    
    # Check for optional WordsAPI key
    wordsapi_key = os.environ.get("WORDSAPI_KEY")
    if wordsapi_key:
        print(f"[enrich_etymology] WordsAPI key detected, will use as secondary source")
    else:
        print(f"[enrich_etymology] No WORDSAPI_KEY env var; skipping WordsAPI")
    
    # Ensure cache dir exists
    ensure_dir(args.cache_dir)
    ensure_dir(Path(args.cache_dir) / "dictionaryapi")
    ensure_dir(Path(args.cache_dir) / "wordsapi")
    ensure_dir(Path(args.cache_dir) / "wiktionary")
    
    # Read input
    print(f"[enrich_etymology] Reading: {args.input}")
    rows = read_csv_rows(args.input)
    print(f"[enrich_etymology] Input rows: {len(rows)}")
    
    # Stats
    stats = {
        "already_has_etymology": 0,
        "dictionaryapi": 0,
        "wordsapi": 0,
        "wiktionary": 0,
        "not_found": 0,
        "processed": 0
    }
    
    # Process rows
    output_rows = []
    max_rows = args.max_rows if args.max_rows > 0 else len(rows)
    
    for i, row in enumerate(rows):
        if i >= max_rows:
            break
        
        word = row.get("word", "")
        normalized = row.get("normalized_word", "")
        existing_etymology = row.get("etymology", "").strip()
        
        # Preserve existing etymology if skip_existing
        if skip_existing and existing_etymology:
            output_row = dict(row)
            output_row["etymology_source"] = "existing"
            output_rows.append(output_row)
            stats["already_has_etymology"] += 1
            continue
        
        # Enrich
        etymology, source = enrich_word_etymology(
            word=word,
            normalized_word=normalized,
            cache_dir=args.cache_dir,
            sleep_ms=args.sleep_ms,
            wordsapi_key=wordsapi_key
        )
        
        output_row = dict(row)
        output_row["etymology"] = etymology or ""
        output_row["etymology_source"] = source
        output_rows.append(output_row)
        
        stats[source] += 1
        stats["processed"] += 1
        
        # Progress
        if (i + 1) % 50 == 0:
            print(f"[enrich_etymology] Processed {i + 1}/{max_rows}...")
    
    # Append remaining rows (if max_rows < total)
    if args.max_rows > 0 and args.max_rows < len(rows):
        for row in rows[args.max_rows:]:
            output_row = dict(row)
            output_row["etymology_source"] = "skipped"
            output_rows.append(output_row)
    
    # Summary
    print(f"\n[enrich_etymology] === Summary ===")
    print(f"  Total rows: {len(rows)}")
    print(f"  Processed: {stats['processed']}")
    print(f"  Already had etymology: {stats['already_has_etymology']}")
    print(f"  Enriched from dictionaryapi.dev: {stats['dictionaryapi']}")
    print(f"  Enriched from WordsAPI: {stats['wordsapi']}")
    print(f"  Enriched from Wiktionary: {stats['wiktionary']}")
    print(f"  Not found (no source): {stats['not_found']}")
    
    if dry_run:
        print(f"\n[enrich_etymology] DRY RUN - no output written")
    else:
        # Determine fieldnames (add etymology_source if not present)
        fieldnames = list(rows[0].keys()) if rows else []
        if "etymology_source" not in fieldnames:
            fieldnames.append("etymology_source")
        
        write_csv_rows(args.output, fieldnames, output_rows)
        print(f"\n[enrich_etymology] Wrote: {args.output}")


if __name__ == "__main__":
    main()

