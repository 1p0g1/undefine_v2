from __future__ import annotations

import argparse
import sys
from dataclasses import dataclass
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

from _common import read_csv_rows, write_csv_rows  # noqa: E402


@dataclass(frozen=True)
class RankedEntry:
    source_file: str
    entry_index: int
    word: str
    normalized_word: str
    part_of_speech: str
    definition: str
    etymology: str
    first_letter: str
    number_of_letters: int
    lex_rank: int


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description="Compute deterministic lexicographic ranks for dictionary entries.")
    parser.add_argument(
        "--input",
        default="dictionary-pipeline/output/dictionary_normalized.csv",
        help="Input normalized CSV.",
    )
    parser.add_argument(
        "--output",
        default="dictionary-pipeline/output/dictionary_ranked.csv",
        help="Output ranked CSV.",
    )
    args = parser.parse_args(argv)

    rows = read_csv_rows(args.input)

    def sort_key(row: dict[str, str]) -> tuple:
        normalized = row.get("normalized_word", "")
        word = row.get("word", "")
        source_file = row.get("source_file", "")
        entry_index = int(row.get("entry_index") or "0")
        return (normalized, word, source_file, entry_index)

    rows_sorted = sorted(rows, key=sort_key)

    ranked_rows: list[dict[str, object]] = []
    for idx, row in enumerate(rows_sorted, start=1):
        ranked_rows.append({**row, "lex_rank": idx})

    print(f"[compute_lex_rank] Input rows: {len(rows)}")
    print(f"[compute_lex_rank] Output rows: {len(ranked_rows)}")
    print(f"[compute_lex_rank] lex_rank range: 1..{len(ranked_rows)}")

    write_csv_rows(
        args.output,
        fieldnames=[
            "source_file",
            "entry_index",
            "word",
            "normalized_word",
            "part_of_speech",
            "definition",
            "etymology",
            "first_letter",
            "number_of_letters",
            "lex_rank",
        ],
        rows=ranked_rows,
    )

    print(f"[compute_lex_rank] Wrote: {Path(args.output)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))


