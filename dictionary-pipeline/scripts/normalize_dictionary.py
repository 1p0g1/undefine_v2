from __future__ import annotations

import argparse
import csv
import sys
import unicodedata
from dataclasses import dataclass
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

from _common import clean_whitespace, ensure_parent_dir, read_csv_rows, to_bool, write_csv_rows  # noqa: E402


@dataclass(frozen=True)
class NormalizedEntry:
    source_file: str
    entry_index: int
    word: str
    normalized_word: str
    part_of_speech: str
    definition: str
    etymology: str
    first_letter: str
    number_of_letters: int


def normalize_word(raw_word: str) -> str:
    lowered = clean_whitespace(raw_word).lower()
    decomposed = unicodedata.normalize("NFKD", lowered)
    ascii_text = decomposed.encode("ascii", "ignore").decode("ascii")
    # Policy: keep only a-z letters; drop everything else (spaces, hyphens, apostrophes, punctuation, digits).
    letters_only = "".join(ch for ch in ascii_text if "a" <= ch <= "z")
    return letters_only


def pick_better_definition(existing: NormalizedEntry, candidate: NormalizedEntry) -> NormalizedEntry:
    # Prefer whichever has a longer (more informative) definition after trimming.
    if len(candidate.definition.strip()) > len(existing.definition.strip()):
        return candidate
    return existing


def write_collisions_csv(output_path: str | Path, collisions: list[dict[str, str]]) -> None:
    ensure_parent_dir(output_path)
    with open(output_path, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(
            f,
            fieldnames=[
                "normalized_word",
                "kept_word",
                "dropped_word",
                "kept_source_file",
                "dropped_source_file",
                "kept_entry_index",
                "dropped_entry_index",
            ],
        )
        writer.writeheader()
        writer.writerows(collisions)


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description="Normalize dictionary raw CSV for gameplay expectations.")
    parser.add_argument(
        "--input",
        default="dictionary-pipeline/output/dictionary_raw.csv",
        help="Input raw CSV.",
    )
    parser.add_argument(
        "--output",
        default="dictionary-pipeline/output/dictionary_normalized.csv",
        help="Output normalized CSV.",
    )
    parser.add_argument(
        "--dedupe",
        default="true",
        help="If true, dedupe by normalized_word (keep best definition).",
    )
    parser.add_argument(
        "--collisions-output",
        default="dictionary-pipeline/output/reports/normalize_collisions.csv",
        help="Where to write a CSV listing dedupe collisions.",
    )

    args = parser.parse_args(argv)
    do_dedupe = to_bool(args.dedupe)

    raw_rows = read_csv_rows(args.input)

    dropped_empty = 0
    dropped_nonalpha = 0

    normalized_entries: list[NormalizedEntry] = []
    for row in raw_rows:
        source_file = row.get("source_file", "")
        entry_index = int(row.get("entry_index") or "0")
        word = row.get("word", "")
        part_of_speech = row.get("part_of_speech", "")
        definition = row.get("definition", "")

        normalized = normalize_word(word)
        if not normalized:
            dropped_empty += 1
            continue

        if any(ch < "a" or ch > "z" for ch in normalized):
            dropped_nonalpha += 1
            continue

        first_letter = normalized[0]
        number_of_letters = len(normalized)

        normalized_entries.append(
            NormalizedEntry(
                source_file=source_file,
                entry_index=entry_index,
                word=clean_whitespace(word),
                normalized_word=normalized,
                part_of_speech=clean_whitespace(part_of_speech),
                definition=clean_whitespace(definition),
                etymology="",
                first_letter=first_letter,
                number_of_letters=number_of_letters,
            )
        )

    collisions: list[dict[str, str]] = []
    kept_by_normalized: dict[str, NormalizedEntry] = {}

    if do_dedupe:
        for entry in normalized_entries:
            existing = kept_by_normalized.get(entry.normalized_word)
            if existing is None:
                kept_by_normalized[entry.normalized_word] = entry
                continue

            better = pick_better_definition(existing, entry)
            dropped = entry if better is existing else existing
            kept_by_normalized[entry.normalized_word] = better

            collisions.append(
                {
                    "normalized_word": entry.normalized_word,
                    "kept_word": better.word,
                    "dropped_word": dropped.word,
                    "kept_source_file": better.source_file,
                    "dropped_source_file": dropped.source_file,
                    "kept_entry_index": str(better.entry_index),
                    "dropped_entry_index": str(dropped.entry_index),
                }
            )

        final_entries = list(kept_by_normalized.values())
    else:
        final_entries = normalized_entries

    print(f"[normalize_dictionary] Input rows: {len(raw_rows)}")
    print(f"[normalize_dictionary] Output rows: {len(final_entries)}")
    print(f"[normalize_dictionary] Dropped (normalized empty): {dropped_empty}")
    print(f"[normalize_dictionary] Dropped (non-alpha after normalization): {dropped_nonalpha}")
    print(f"[normalize_dictionary] Dedupe enabled: {do_dedupe}")
    if do_dedupe:
        print(f"[normalize_dictionary] Collisions: {len(collisions)}")

    if collisions:
        write_collisions_csv(args.collisions_output, collisions)
        print(f"[normalize_dictionary] Wrote collisions report: {Path(args.collisions_output)}")

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
        ],
        rows=[
            {
                "source_file": e.source_file,
                "entry_index": e.entry_index,
                "word": e.word,
                "normalized_word": e.normalized_word,
                "part_of_speech": e.part_of_speech,
                "definition": e.definition,
                "etymology": e.etymology,
                "first_letter": e.first_letter,
                "number_of_letters": e.number_of_letters,
            }
            for e in final_entries
        ],
    )

    print(f"[normalize_dictionary] Wrote: {Path(args.output)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))


