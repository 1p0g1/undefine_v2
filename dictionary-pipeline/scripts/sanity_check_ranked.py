from __future__ import annotations

import argparse
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

from _common import read_csv_rows  # noqa: E402


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description="Quick sanity checks for ranked dictionary CSV.")
    parser.add_argument(
        "--input",
        default="dictionary-pipeline/output/dictionary_ranked.csv",
        help="Ranked CSV to validate.",
    )
    args = parser.parse_args(argv)

    rows = read_csv_rows(args.input)
    if not rows:
        print("[sanity_check_ranked] No rows found.", file=sys.stderr)
        return 2

    seen_ranks: set[int] = set()
    last_word = None
    errors: list[str] = []

    for idx, row in enumerate(rows, start=1):
        normalized = (row.get("normalized_word") or "").strip()
        first_letter = (row.get("first_letter") or "").strip()
        number_of_letters = int(row.get("number_of_letters") or "0")
        lex_rank = int(row.get("lex_rank") or "0")

        if not normalized:
            errors.append(f"row {idx}: normalized_word empty")
        if normalized and any(ch < "a" or ch > "z" for ch in normalized):
            errors.append(f"row {idx}: normalized_word contains non [a-z]: {normalized!r}")
        if normalized and first_letter != normalized[0]:
            errors.append(f"row {idx}: first_letter mismatch: {first_letter!r} vs {normalized[0]!r}")
        if normalized and number_of_letters != len(normalized):
            errors.append(
                f"row {idx}: number_of_letters mismatch: {number_of_letters} vs {len(normalized)}"
            )

        if lex_rank in seen_ranks:
            errors.append(f"row {idx}: duplicate lex_rank: {lex_rank}")
        seen_ranks.add(lex_rank)

        if last_word is not None and normalized and normalized < last_word:
            errors.append(f"row {idx}: ordering violation: {normalized!r} < {last_word!r}")
        if normalized:
            last_word = normalized

    expected_max = len(rows)
    if seen_ranks != set(range(1, expected_max + 1)):
        errors.append("[sanity_check_ranked] lex_rank is not a contiguous 1..N set")

    if errors:
        print("[sanity_check_ranked] FAILED:")
        for e in errors[:50]:
            print(f"- {e}")
        if len(errors) > 50:
            print(f"... {len(errors) - 50} more")
        return 1

    print(f"[sanity_check_ranked] OK ({len(rows)} rows)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))


