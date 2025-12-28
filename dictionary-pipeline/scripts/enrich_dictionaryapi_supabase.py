from __future__ import annotations

import argparse
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

from _common import ensure_dir, to_bool  # noqa: E402


@dataclass(frozen=True)
class DictionaryRow:
    id: int
    normalized_word: str
    api_enrich_status: str


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def require_env(name: str) -> str:
    value = os.getenv(name, "").strip()
    if not value:
        raise RuntimeError(f"Missing required env var: {name}")
    return value


def supabase_rest_url(supabase_url: str, path: str) -> str:
    return supabase_url.rstrip("/") + path


def supabase_request(
    supabase_url: str,
    service_role_key: str,
    method: str,
    path: str,
    query: dict[str, str] | None = None,
    json_body: object | None = None,
    timeout_seconds: int = 30,
) -> tuple[int, object | None]:
    url = supabase_rest_url(supabase_url, path)
    if query:
        url = url + "?" + urllib.parse.urlencode(query, safe="(),.*=:'")

    headers = {
        "apikey": service_role_key,
        "Authorization": f"Bearer {service_role_key}",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }

    data = None
    if json_body is not None:
        data = json.dumps(json_body).encode("utf-8")

    req = urllib.request.Request(url, method=method, headers=headers, data=data)
    try:
        with urllib.request.urlopen(req, timeout=timeout_seconds) as resp:
            status = int(getattr(resp, "status", 200))
            body = resp.read()
            if not body:
                return status, None
            return status, json.loads(body.decode("utf-8"))
    except urllib.error.HTTPError as e:
        status = int(getattr(e, "code", 0) or 0)
        try:
            body = e.read()
            if body:
                return status, json.loads(body.decode("utf-8"))
        except Exception:
            pass
        return status, None


def cache_path(cache_dir: Path, normalized_word: str) -> Path:
    safe = "".join(ch for ch in normalized_word if ch.isalnum() or ch in {"_", "-"})
    if not safe:
        safe = "empty"
    return cache_dir / f"{safe}.json"


def fetch_dictionaryapi(normalized_word: str) -> tuple[int, object | None, str | None]:
    url = f"https://api.dictionaryapi.dev/api/v2/entries/en/{normalized_word}"
    req = urllib.request.Request(url, headers={"User-Agent": "undefine-dictionary-enrichment/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            status = int(getattr(resp, "status", 200))
            body = resp.read().decode("utf-8")
            return status, json.loads(body), None
    except urllib.error.HTTPError as e:
        status = int(getattr(e, "code", 0) or 0)
        try:
            body = e.read().decode("utf-8")
            payload = json.loads(body) if body else None
            return status, payload, None
        except Exception as parse_error:
            return status, None, f"HTTPError {status} (failed to parse body): {parse_error}"
    except Exception as e:
        return 0, None, str(e)


def extract_origin(payload: object | None) -> str | None:
    if payload is None:
        return None
    if isinstance(payload, list) and payload:
        first = payload[0]
        if isinstance(first, dict):
            origin = first.get("origin")
            return origin.strip() if isinstance(origin, str) and origin.strip() else None
    if isinstance(payload, dict):
        origin = payload.get("origin")
        return origin.strip() if isinstance(origin, str) and origin.strip() else None
    return None


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description="Offline/admin enrichment of public.dictionary via dictionaryapi.dev.")
    parser.add_argument("--limit", default="200", help="Max rows to process.")
    parser.add_argument("--status", default="pending", choices=["pending", "error"], help="Which status to fetch.")
    parser.add_argument("--dry-run", default="true", help="If true, do not write to Supabase.")
    parser.add_argument("--sleep-ms", default="150", help="Delay between requests.")
    parser.add_argument(
        "--cache-dir",
        default="dictionary-pipeline/output/cache/dictionaryapi",
        help="Local cache directory for dictionaryapi responses.",
    )
    parser.add_argument("--refresh", default="false", help="If true, ignore cache and re-fetch from API.")
    args = parser.parse_args(argv)

    limit = int(args.limit)
    dry_run = to_bool(args.dry_run)
    sleep_ms = int(args.sleep_ms)
    refresh = to_bool(args.refresh)

    try:
        supabase_url = require_env("SUPABASE_URL")
        service_role_key = require_env("SUPABASE_SERVICE_ROLE_KEY")
    except RuntimeError as e:
        print(f"[enrich_dictionaryapi_supabase] {e}", file=sys.stderr)
        return 2

    cache_dir = Path(args.cache_dir)
    ensure_dir(cache_dir)

    status, rows_payload = supabase_request(
        supabase_url=supabase_url,
        service_role_key=service_role_key,
        method="GET",
        path="/rest/v1/dictionary",
        query={
            "select": "id,normalized_word,api_enrich_status",
            "api_enrich_status": f"eq.{args.status}",
            "order": "id.asc",
            "limit": str(limit),
        },
    )

    if status >= 400:
        print(f"[enrich_dictionaryapi_supabase] Failed to fetch rows (status={status})", file=sys.stderr)
        return 1

    if not isinstance(rows_payload, list):
        print("[enrich_dictionaryapi_supabase] Unexpected response shape when fetching rows", file=sys.stderr)
        return 1

    rows: list[DictionaryRow] = []
    for item in rows_payload:
        if not isinstance(item, dict):
            continue
        try:
            rows.append(
                DictionaryRow(
                    id=int(item["id"]),
                    normalized_word=str(item["normalized_word"]),
                    api_enrich_status=str(item.get("api_enrich_status") or ""),
                )
            )
        except Exception:
            continue

    processed = 0
    ok_count = 0
    not_found_count = 0
    error_count = 0

    for row in rows:
        processed += 1
        normalized_word = row.normalized_word.strip()
        if not normalized_word:
            error_count += 1
            continue

        payload = None
        api_status = 0
        error_message = None

        cache_file = cache_path(cache_dir, normalized_word)
        if cache_file.exists() and not refresh:
            try:
                payload = json.loads(cache_file.read_text(encoding="utf-8"))
                api_status = 200
            except Exception as e:
                payload = None
                error_message = f"cache read error: {e}"
        if payload is None:
            api_status, payload, error_message = fetch_dictionaryapi(normalized_word)
            try:
                cache_file.write_text(json.dumps(payload), encoding="utf-8")
            except Exception:
                pass
            time.sleep(max(0, sleep_ms) / 1000.0)

        now_iso = utc_now_iso()

        if api_status == 200 and isinstance(payload, list):
            origin = extract_origin(payload)
            update = {
                "api_origin": origin,
                "api_payload": payload,
                "api_enrich_status": "ok",
                "api_last_enriched_at": now_iso,
                "api_enrich_error": None,
                "updated_at": now_iso,
            }
            ok_count += 1
        elif api_status == 404:
            update = {
                "api_origin": None,
                "api_payload": payload,
                "api_enrich_status": "not_found",
                "api_last_enriched_at": now_iso,
                "api_enrich_error": "not found",
                "updated_at": now_iso,
            }
            not_found_count += 1
        else:
            update = {
                "api_origin": None,
                "api_payload": payload,
                "api_enrich_status": "error",
                "api_last_enriched_at": now_iso,
                "api_enrich_error": error_message or f"api_status={api_status}",
                "updated_at": now_iso,
            }
            error_count += 1

        if dry_run:
            print(f"[dry-run] id={row.id} word={normalized_word} -> {update['api_enrich_status']}")
            continue

        patch_status, _ = supabase_request(
            supabase_url=supabase_url,
            service_role_key=service_role_key,
            method="PATCH",
            path="/rest/v1/dictionary",
            query={"id": f"eq.{row.id}"},
            json_body=update,
        )
        if patch_status >= 400:
            print(
                f"[enrich_dictionaryapi_supabase] Failed to update id={row.id} (status={patch_status})",
                file=sys.stderr,
            )

    print("[enrich_dictionaryapi_supabase] Summary:")
    print(f"- processed: {processed}")
    print(f"- ok: {ok_count}")
    print(f"- not_found: {not_found_count}")
    print(f"- error: {error_count}")
    print(f"- dry_run: {dry_run}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))


