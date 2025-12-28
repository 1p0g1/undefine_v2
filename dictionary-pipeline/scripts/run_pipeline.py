from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path


def run(cmd: list[str]) -> None:
    print(f"[run_pipeline] Running: {' '.join(cmd)}")
    subprocess.check_call(cmd)


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description="Run the full OPTED dictionary pipeline.")
    parser.add_argument(
        "--input-glob",
        default="dictionary-pipeline/raw/*.html",
        help='Glob for OPTED HTML inputs, e.g. "DICTIONARY/v003/wb1913_*.html".',
    )
    parser.add_argument("--do-enrich", default="false", help="If true, run offline enrichment step.")
    parser.add_argument("--max-enrich-calls", default="0", help="Max enrichment API calls (0 = unlimited).")
    args = parser.parse_args(argv)

    root = Path(__file__).resolve().parent

    raw_csv = "dictionary-pipeline/output/dictionary_raw.csv"
    normalized_csv = "dictionary-pipeline/output/dictionary_normalized.csv"
    ranked_csv = "dictionary-pipeline/output/dictionary_ranked.csv"
    enriched_csv = "dictionary-pipeline/output/dictionary_enriched.csv"
    final_csv = "dictionary-pipeline/output/dictionary_final.csv"

    parse_script = str(root / "parse_opted_html.py")
    normalize_script = str(root / "normalize_dictionary.py")
    rank_script = str(root / "compute_lex_rank.py")
    enrich_script = str(root / "enrich_dictionaryapi.py")
    final_script = str(root / "build_final_csv.py")

    run([sys.executable, parse_script, "--input-glob", args.input_glob, "--output", raw_csv])
    run([sys.executable, normalize_script, "--input", raw_csv, "--output", normalized_csv, "--dedupe", "true"])
    run([sys.executable, rank_script, "--input", normalized_csv, "--output", ranked_csv])

    do_enrich = str(args.do_enrich).strip().lower() in {"1", "true", "t", "yes", "y", "on"}
    if do_enrich:
        run(
            [
                sys.executable,
                enrich_script,
                "--input",
                ranked_csv,
                "--output",
                enriched_csv,
                "--max-calls",
                str(args.max_enrich_calls),
            ]
        )
        run([sys.executable, final_script, "--input", enriched_csv, "--output", final_csv])
    else:
        run([sys.executable, final_script, "--input", ranked_csv, "--output", final_csv])

    print(f"[run_pipeline] Done. Final CSV: {final_csv}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))


