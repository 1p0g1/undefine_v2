from __future__ import annotations

import csv
import glob
import re
import sys
from pathlib import Path
from typing import Iterable


WHITESPACE_RE = re.compile(r"\s+")

# OPTED/Webster definitions can be very large; increase the csv module field limit
# so DictReader can safely read long definition fields without crashing.
csv.field_size_limit(sys.maxsize)


def ensure_dir(path: str | Path) -> None:
    Path(path).mkdir(parents=True, exist_ok=True)


def ensure_parent_dir(file_path: str | Path) -> None:
    Path(file_path).parent.mkdir(parents=True, exist_ok=True)


def clean_whitespace(text: str) -> str:
    return WHITESPACE_RE.sub(" ", text).strip()


def read_csv_rows(csv_path: str | Path) -> list[dict[str, str]]:
    with open(csv_path, "r", encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        return list(reader)


def write_csv_rows(
    csv_path: str | Path, fieldnames: list[str], rows: Iterable[dict[str, object]]
) -> None:
    ensure_parent_dir(csv_path)
    with open(csv_path, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()
        for row in rows:
            writer.writerow({key: "" if row.get(key) is None else row.get(key) for key in fieldnames})


def read_html_text(file_path: str | Path) -> str:
    data = Path(file_path).read_bytes()
    try:
        return data.decode("utf-8")
    except UnicodeDecodeError:
        return data.decode("latin-1")


def sorted_glob(pattern: str) -> list[str]:
    # Deterministic ordering for idempotent outputs.
    return sorted(glob.glob(pattern))


def to_bool(value: str) -> bool:
    return value.strip().lower() in {"1", "true", "t", "yes", "y", "on"}


