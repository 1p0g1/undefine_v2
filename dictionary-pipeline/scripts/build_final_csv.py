from __future__ import annotations

import argparse
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

from _common import clean_whitespace, read_csv_rows, write_csv_rows  # noqa: E402


FINAL_COLUMNS = [
    "word",
    "normalized_word",
    "part_of_speech",
    "definition",
    "etymology",
    "first_letter",
    "number_of_letters",
    "lex_rank",
]


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description="Build final Supabase import CSV for dictionary entries.")
    parser.add_argument(
        "--input",
        default="dictionary-pipeline/output/dictionary_ranked.csv",
        help="Input ranked or enriched CSV.",
    )
    parser.add_argument(
        "--output",
        default="dictionary-pipeline/output/dictionary_final.csv",
        help="Output final CSV.",
    )
    args = parser.parse_args(argv)

    rows = read_csv_rows(args.input)
    final_rows: list[dict[str, object]] = []

    for row in rows:
        final_rows.append(
            {
                "word": clean_whitespace(row.get("word", "")),
                "normalized_word": clean_whitespace(row.get("normalized_word", "")),
                "part_of_speech": clean_whitespace(row.get("part_of_speech", "")),
                "definition": clean_whitespace(row.get("definition", "")),
                "etymology": clean_whitespace(row.get("etymology", "")),
                "first_letter": clean_whitespace(row.get("first_letter", "")),
                "number_of_letters": int(row.get("number_of_letters") or "0"),
                "lex_rank": int(row.get("lex_rank") or "0"),
            }
        )

    print(f"[build_final_csv] Input rows: {len(rows)}")
    print(f"[build_final_csv] Output rows: {len(final_rows)}")

    write_csv_rows(args.output, fieldnames=FINAL_COLUMNS, rows=final_rows)
    print(f"[build_final_csv] Wrote: {Path(args.output)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))


