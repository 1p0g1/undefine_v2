# Theme Leaderboard: Production-First + Preview-Fallback

## Goal
Keep a single production-focused API base URL (VITE_API_BASE_URL) while allowing preview branches to work without manual config.

## Pattern
1. Prefer the backend base URL set via `VITE_API_BASE_URL`.
2. If a request fails due to network/404 in preview (route not yet available on backend for this branch), automatically retry the exact same path against the current origin (`window.location.origin`).
3. No hardcoded domains. Production behavior remains unchanged.

## Client Helper
We added `fetchWithPreviewFallback(path, options)` in `client/src/utils/apiHelpers.ts`.
- First tries `${VITE_API_BASE_URL}${path}`.
- On network/404 error, retries `${window.location.origin}${path}`.
- Uses `safeFetch`/`safeJsonParse` for strict JSON handling.

## Usage
Replace direct fetches with:
```ts
import { fetchWithPreviewFallback } from '../utils/apiHelpers';

// Weekly
const weekParam = new Date().toISOString().slice(0,10);
const weekly = await fetchWithPreviewFallback(`/api/leaderboard/theme?week_key=${encodeURIComponent(weekParam)}&min_attempts=1`);

// All-time
const allTime = await fetchWithPreviewFallback(`/api/leaderboard/theme?view=all_time&min_attempts=1`);
```

This is live in `AllTimeLeaderboard.tsx` for both the Theme Leaderboard and the all‑time stats.

## Backend
- Route: `/api/leaderboard/theme` supports
  - Weekly: `?week_key=YYYY-MM-DD` (server derives ISO week)
  - All-time: `?view=all_time`
- Data source: `theme_attempts` (stores `similarity_percent`, `week_key`)

## Migration
Run (already applied):
- `supabase/migrations/20250710000001_add_similarity_columns_to_theme_attempts.sql`
Adds columns + indexes and backfills.

## Notion Snippet (copy/paste)
- Keep VITE_API_BASE_URL for production.
- Client uses fetchWithPreviewFallback(path):
  - Try backend first.
  - On 404/network in preview → retry same path on current origin.
- No hardcoded domains. Works for both Weekly and All-time Theme Leaderboards.
- Backend route: `/api/leaderboard/theme`.
- Data stored in `theme_attempts` with `similarity_percent` and `week_key`. 