#!/usr/bin/env python3
"""
Upload dictionary_final.csv to Supabase via REST API.
Uses service role key for admin access.

Usage:
  export SUPABASE_URL="https://eaclljwvsicezmkjnlbm.supabase.co"
  export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
  python upload_to_supabase.py
"""

import csv
import json
import os
import sys
import time
from pathlib import Path

# Try to import requests, provide install hint if missing
try:
    import requests
except ImportError:
    print("Missing 'requests' library. Install with: pip install requests")
    sys.exit(1)

# Increase CSV field size limit for large definitions
csv.field_size_limit(sys.maxsize)

# Configuration
BATCH_SIZE = 500  # Rows per API call (Supabase has limits)
DELAY_BETWEEN_BATCHES = 0.5  # seconds

def get_env_or_exit(var_name: str) -> str:
    """Get environment variable or exit with error."""
    value = os.environ.get(var_name)
    if not value:
        print(f"ERROR: {var_name} environment variable not set")
        print(f"  export {var_name}='your-value'")
        sys.exit(1)
    return value

def upload_batch(supabase_url: str, service_key: str, rows: list[dict], batch_num: int) -> bool:
    """Upload a batch of rows to Supabase dictionary table."""
    url = f"{supabase_url}/rest/v1/dictionary"
    headers = {
        "apikey": service_key,
        "Authorization": f"Bearer {service_key}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal"  # Don't return inserted rows (faster)
    }
    
    try:
        response = requests.post(url, headers=headers, json=rows, timeout=60)
        
        if response.status_code in (200, 201):
            return True
        else:
            print(f"  ERROR batch {batch_num}: HTTP {response.status_code}")
            print(f"  Response: {response.text[:500]}")
            return False
            
    except requests.exceptions.RequestException as e:
        print(f"  ERROR batch {batch_num}: {e}")
        return False

def main():
    # Get credentials from environment
    supabase_url = get_env_or_exit("SUPABASE_URL")
    service_key = get_env_or_exit("SUPABASE_SERVICE_ROLE_KEY")
    
    # Find the CSV file
    script_dir = Path(__file__).parent
    csv_path = script_dir.parent / "output" / "dictionary_final_fixed.csv"
    
    if not csv_path.exists():
        # Fall back to original if fixed doesn't exist
        csv_path = script_dir.parent / "output" / "dictionary_final.csv"
    
    if not csv_path.exists():
        print(f"ERROR: CSV file not found at {csv_path}")
        sys.exit(1)
    
    print(f"Reading {csv_path}...")
    
    # Read all rows
    rows = []
    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            # Map CSV columns to database columns
            db_row = {
                "word": row.get("word", ""),
                "normalized_word": row.get("normalized_word", ""),
                "part_of_speech": row.get("part_of_speech") or None,
                "definition": row.get("definition") or None,
                "etymology": row.get("etymology") or None,
                "first_letter": row.get("first_letter", ""),
                "number_of_letters": int(row.get("number_of_letters", 0)),
                "lex_rank": int(row.get("lex_rank", 0)),
            }
            rows.append(db_row)
    
    total_rows = len(rows)
    print(f"Loaded {total_rows} rows")
    
    # Upload in batches
    total_batches = (total_rows + BATCH_SIZE - 1) // BATCH_SIZE
    successful = 0
    failed_batches = []
    
    print(f"Uploading in {total_batches} batches of {BATCH_SIZE}...")
    print()
    
    for batch_num in range(total_batches):
        start_idx = batch_num * BATCH_SIZE
        end_idx = min(start_idx + BATCH_SIZE, total_rows)
        batch = rows[start_idx:end_idx]
        
        first_word = batch[0]["word"] if batch else "?"
        last_word = batch[-1]["word"] if batch else "?"
        
        progress = (batch_num + 1) / total_batches * 100
        print(f"Batch {batch_num + 1}/{total_batches} ({progress:.1f}%): {first_word} → {last_word}...", end=" ", flush=True)
        
        if upload_batch(supabase_url, service_key, batch, batch_num + 1):
            successful += len(batch)
            print("✓")
        else:
            failed_batches.append((batch_num + 1, first_word, last_word))
            print("✗")
        
        # Small delay to avoid rate limiting
        if batch_num < total_batches - 1:
            time.sleep(DELAY_BETWEEN_BATCHES)
    
    # Summary
    print()
    print("=" * 50)
    print(f"Upload complete!")
    print(f"  Successful: {successful}/{total_rows} rows")
    print(f"  Failed batches: {len(failed_batches)}")
    
    if failed_batches:
        print()
        print("Failed batches:")
        for batch_num, first, last in failed_batches:
            print(f"  Batch {batch_num}: {first} → {last}")
        print()
        print("You can retry by re-running the script (duplicates will error)")

if __name__ == "__main__":
    main()

