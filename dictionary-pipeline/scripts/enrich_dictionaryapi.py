from __future__ import annotations

import argparse
import json
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

from _common import ensure_dir, read_csv_rows, to_bool, write_csv_rows  # noqa: E402


def _cache_path(cache_dir: Path, normalized_word: str) -> Path:
    safe = "".join(ch for ch in normalized_word if ch.isalnum() or ch in {"_", "-"})
    if not safe:
        safe = "empty"
    return cache_dir / f"{safe}.json"


def _fetch_dictionaryapi(normalized_word: str) -> dict | list | None:
    url = f"https://api.dictionaryapi.dev/api/v2/entries/en/{normalized_word}"
    req = urllib.request.Request(url, headers={"User-Agent": "undefine-dictionary-pipeline/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            body = resp.read().decode("utf-8")
            return json.loads(body)
    except urllib.error.HTTPError as e:
        # 404 is common (word missing); fail-soft.
        try:
            _ = e.read()
        except Exception:
            pass
        return None
    except Exception:
        return None


def _extract_origin(payload: object) -> str:
    if not payload:
        return ""
    if isinstance(payload, list) and payload:
        first = payload[0]
        if isinstance(first, dict):
            origin = first.get("origin")
            return origin.strip() if isinstance(origin, str) else ""
    if isinstance(payload, dict):
        origin = payload.get("origin")
        return origin.strip() if isinstance(origin, str) else ""
    return ""


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(
        description="Offline enrichment via dictionaryapi.dev (cached, fail-soft)."
    )
    parser.add_argument(
        "--input",
        default="dictionary-pipeline/output/dictionary_ranked.csv",
        help="Input ranked CSV.",
    )
    parser.add_argument(
        "--output",
        default="dictionary-pipeline/output/dictionary_enriched.csv",
        help="Output enriched CSV.",
    )
    parser.add_argument(
        "--cache-dir",
        default="dictionary-pipeline/output/cache/dictionaryapi",
        help="Directory for cached API responses (json files).",
    )
    parser.add_argument("--delay-ms", default="200", help="Delay between API calls in ms.")
    parser.add_argument(
        "--max-calls",
        default="0",
        help="Max API calls for a run (0 means unlimited). Useful for testing.",
    )
    parser.add_argument(
        "--force-refresh",
        default="false",
        help="If true, ignore cache and refetch (not recommended).",
    )

    args = parser.parse_args(argv)

    delay_ms = int(args.delay_ms)
    max_calls = int(args.max_calls)
    force_refresh = to_bool(args.force_refresh)

    cache_dir = Path(args.cache_dir)
    ensure_dir(cache_dir)

    rows = read_csv_rows(args.input)

    api_calls = 0
    cache_hits = 0
    cache_misses = 0
    enriched_count = 0

    enriched_rows: list[dict[str, object]] = []

    for row in rows:
        normalized_word = row.get("normalized_word", "").strip()
        etymology = (row.get("etymology") or "").strip()

        if not normalized_word or etymology:
            enriched_rows.append(row)
            continue

        cache_path = _cache_path(cache_dir, normalized_word)
        payload = None

        if cache_path.exists() and not force_refresh:
            try:
                payload = json.loads(cache_path.read_text(encoding="utf-8"))
                cache_hits += 1
            except Exception:
                payload = None

        if payload is None:
            if max_calls and api_calls >= max_calls:
                enriched_rows.append(row)
                continue

            cache_misses += 1
            payload = _fetch_dictionaryapi(normalized_word)
            api_calls += 1

            try:
                cache_path.write_text(json.dumps(payload), encoding="utf-8")
            except Exception:
                pass

            time.sleep(max(0, delay_ms) / 1000.0)

        origin = _extract_origin(payload)
        if origin:
            row = {**row, "etymology": origin}
            enriched_count += 1

        enriched_rows.append(row)

    print(f"[enrich_dictionaryapi] Input rows: {len(rows)}")
    print(f"[enrich_dictionaryapi] Cache hits: {cache_hits}")
    print(f"[enrich_dictionaryapi] Cache misses: {cache_misses}")
    print(f"[enrich_dictionaryapi] API calls: {api_calls}")
    print(f"[enrich_dictionaryapi] Rows enriched (etymology filled): {enriched_count}")

    write_csv_rows(
        args.output,
        fieldnames=list(rows[0].keys()) if rows else [],
        rows=enriched_rows,
    )

    print(f"[enrich_dictionaryapi] Wrote: {Path(args.output)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))


