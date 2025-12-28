from __future__ import annotations

import argparse
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

from bs4 import BeautifulSoup
from bs4.element import NavigableString, Tag

SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

from _common import clean_whitespace, read_html_text, sorted_glob, write_csv_rows  # noqa: E402


@dataclass(frozen=True)
class RawDictionaryEntry:
    source_file: str
    entry_index: int
    word: str
    part_of_speech: str
    definition: str


def _extract_definition_text(p: Tag, b_tag: Tag | None, i_tag: Tag | None) -> str:
    parts: list[str] = []
    for child in p.children:
        if b_tag is not None and child is b_tag:
            continue
        if i_tag is not None and child is i_tag:
            continue
        if isinstance(child, NavigableString):
            parts.append(str(child))
        elif isinstance(child, Tag):
            parts.append(child.get_text(" ", strip=False))

    text = clean_whitespace(" ".join(parts))
    # OPTED structure commonly includes "(<I>...</I>)" immediately after the headword.
    # Remove the leading parenthesized segment (POS wrapper) from the definition text.
    if text.startswith("("):
        close_idx = text.find(")")
        if close_idx != -1 and close_idx < 64:
            text = clean_whitespace(text[close_idx + 1 :])
    return text


def parse_opted_html_file(file_path: str) -> list[RawDictionaryEntry]:
    html = read_html_text(file_path)
    soup = BeautifulSoup(html, "html.parser")

    entries: list[RawDictionaryEntry] = []
    p_tags = soup.find_all("p")
    entry_index = 0

    for p in p_tags:
        b_tag = p.find("b")
        if not b_tag:
            continue

        headword = clean_whitespace(b_tag.get_text(" ", strip=True))
        if not headword:
            continue

        i_tag = p.find("i")
        pos = ""
        if i_tag:
            pos = clean_whitespace(i_tag.get_text(" ", strip=True))

        definition = _extract_definition_text(p, b_tag=b_tag, i_tag=i_tag)
        if not definition:
            # Keep the row for visibility; blank definition is still a valid parse outcome.
            definition = ""

        entry_index += 1
        entries.append(
            RawDictionaryEntry(
                source_file=str(file_path),
                entry_index=entry_index,
                word=headword,
                part_of_speech=pos,
                definition=definition,
            )
        )

    return entries


def parse_opted_html_many(file_paths: Iterable[str]) -> list[RawDictionaryEntry]:
    all_entries: list[RawDictionaryEntry] = []
    total_files = 0
    for file_path in file_paths:
        total_files += 1
        all_entries.extend(parse_opted_html_file(file_path))

    print(f"[parse_opted_html] Files parsed: {total_files}")
    print(f"[parse_opted_html] Rows extracted: {len(all_entries)}")
    return all_entries


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description="Parse OPTED/Webster 1913 HTML into a raw CSV.")
    parser.add_argument("--input", help="Path to one OPTED HTML file.")
    parser.add_argument("--input-glob", help='Glob for many HTML files, e.g. "DICTIONARY/v003/wb1913_*.html".')
    parser.add_argument(
        "--output",
        default="dictionary-pipeline/output/dictionary_raw.csv",
        help="Output CSV path.",
    )

    args = parser.parse_args(argv)

    if not args.input and not args.input_glob:
        args.input_glob = "dictionary-pipeline/raw/*.html"

    file_paths: list[str] = []
    if args.input:
        file_paths = [args.input]
    else:
        file_paths = sorted_glob(args.input_glob)

    if not file_paths:
        print("[parse_opted_html] No input files found.", file=sys.stderr)
        return 2

    entries = parse_opted_html_many(file_paths)

    write_csv_rows(
        args.output,
        fieldnames=["source_file", "entry_index", "word", "part_of_speech", "definition"],
        rows=[
            {
                "source_file": e.source_file,
                "entry_index": e.entry_index,
                "word": e.word,
                "part_of_speech": e.part_of_speech,
                "definition": e.definition,
            }
            for e in entries
        ],
    )

    print(f"[parse_opted_html] Wrote: {Path(args.output)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))


