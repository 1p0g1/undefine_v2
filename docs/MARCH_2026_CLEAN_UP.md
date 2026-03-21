# March 2026 Clean-Up: Game Logic, Database & Roadmap

> **Last Updated:** 21 March 2026  
> **Branch:** `main`  
> **Purpose:** One-stop reference for understanding the full game, critical logic, Supabase schema, scoring, leaderboards, and planned improvements.

---

## Table of Contents

1. [Recent Changes (March 2026)](#1-recent-changes-march-2026)
2. [Game Flow — What Happens When a Player Plays](#2-game-flow)
3. [Daily Scoring](#3-daily-scoring)
4. [Theme Scoring](#4-theme-scoring)
5. [Supabase Tables (Complete Schema)](#5-supabase-tables)
6. [Leaderboards](#6-leaderboards)
7. [Triggers & Functions](#7-triggers--functions)
8. [Identified Gaps & Inconsistencies](#8-identified-gaps--inconsistencies)
9. [Potential New Leaderboards / Aggregations](#9-potential-new-leaderboards)
10. [Next Steps](#10-next-steps)

---

## 1. Recent Changes (March 2026)

### Dark Mode Fix
- Added `<meta name="color-scheme" content="light only">` to `index.html`
- Added `color-scheme: light only` to CSS `:root`
- Added `@media (prefers-color-scheme: dark)` overrides forcing light colors on body, modals, inputs
- Added `colorScheme: 'light'` to BonusRoundInline container and GameSummaryModal
- **Why:** Android dark mode was inverting colours, making text unreadable

### Theme Scoring — 85% Threshold (was 78%)
- `themeScoringConfig.ts`: `THRESHOLDS.embedding` 0.78 → 0.85, `hybrid.finalMin` 0.78 → 0.85
- `VaultLogo.tsx`: `SCORE_THRESHOLD_GREEN` 80 → 85
- `themeMessages.ts`: `THEME_KEY_SCORE_THRESHOLD_GREEN` 80 → 85
- **Consistent rule:** 85%+ = correct/green, 70-84% = orange, <70% = red

### Theme Feedback Text (Updated, No Emojis)
| Score | Message | Reveals Theme? |
|-------|---------|----------------|
| Exact | `Perfect! The theme is "[theme]"` | Yes |
| 95%+ | `Fair play, that's pretty much "[theme]"` | Yes |
| 90-94% | `So, so close to perfect` | No |
| 85-89% | `You're pretty much right, but not yet perfect` | No |
| 70-84% | `Very, very close...` | No |
| 60-69% | `Fairly warm now` | No |
| 40-59% | `I mean, I guess, sort of?` | No |
| 20-39% | `Hmm, don't think so` | No |
| <20% | `Nope` | No |

### Admin Dashboard — Incomplete Word Flagging
- Weeks API now returns `clueCount` and `missingClues` per word
- WeekCalendar shows red `⚠ X/6` indicator for words with fewer than 6 clues
- Hover tooltip shows exactly which clues are missing

### Bonus Round UX — Dictionary Not Found
- API returns `placement.before` and `placement.after` neighbour words
- Client shows "not in our dictionary (OPTED)" with source link and visual placement

### Pattern Matcher — Hyphenated Words
- New `'hyphenated'` PatternType for themes like `self-[word]`, `[word]-`, `hyphenated words`
- Rule-based matching for relationship phrases ("words with a hyphen", "dashed words")

### Previous Theme Guesses — Fixed Loading Bug
- `theme-history-simple` API now accepts `date` param as fallback (resolves theme server-side)
- Client always calls history endpoint on modal open, no longer depends on `currentTheme`
- Feedback from last guess restored on modal reopen

### Key Text on Homepage
- New text below key: "Do you have the **key to unlock this week's theme**?"
- Glow shimmer effect on "key to unlock this week's theme"

### Admin Theme Lab — Documentation Update
- Three new info panels: Rule-Based Matchers, Scoring Flow, Implementation Status
- Documents all 5 phases of the theme scoring improvement plan

### Mince/Garlic Date Issue
- **Root cause:** Data entry error — dates stored as 2026-04-30 and 2026-05-01 (one month late)
- **Not** a Supabase limit — needs manual date correction in the database

---

## 2. Game Flow

### Complete User Journey (After Winning the Daily Word)

```
1. Player guesses correctly
   └─ API: POST /api/guess → scores + leaderboard_summary updated
   
2. Diamond celebration animation plays
   └─ celebrateDiamond = true (1-2 seconds)
   
3. Bonus Round check
   ├─ IF guesses < 6 → Bonus Round appears inline
   │   └─ Player gets 3 attempts to guess nearby dictionary words
   │   └─ On complete → user clicks Close → POST /api/bonus/finalize-score
   │   └─ bonus_score added to leaderboard_summary
   └─ IF guesses = 6 → Skip to step 4

4. Key appears with text: "Do you have the key to unlock this week's theme?"
   └─ Player clicks key → Theme Guess Modal opens

5. Theme Guess Modal
   ├─ Shows weekly words (Mon-Sun), previous guesses, feedback
   ├─ Player submits guess → POST /api/theme-guess
   │   └─ Scoring: Exact → Pattern → Alias → Semantic (embedding+keywords)
   │   └─ Result stored in theme_attempts
   └─ Player closes modal → triggers daily leaderboard

6. Daily Leaderboard (GameSummaryModal)
   └─ Shows rank, other players, DEFINE boxes, bonus results
   └─ Only opens automatically after theme modal closes
       (via pendingSummaryAfterTheme flag)
```

### Known UX Issue
The daily leaderboard (`GameSummaryModal`) sometimes appears unexpectedly because:
- It can be triggered by `handleCloseThemeModal` even if the user didn't intend to see it
- If the user never opens the theme modal (skips the key), the leaderboard may not appear at all via this path
- The "View Results" button in Settings is the only other way to open it

### Recommendation
Consider adding a more explicit "See Today's Results" button on the main page after game completion, rather than relying on the theme modal close → leaderboard chain.

---

## 3. Daily Scoring

### Formula
```
score = 1000 - (guessesUsed - 1) × 100 + fuzzyBonus × 50 - timePenalty
```

Where:
- **PERFECT_SCORE** = 1000
- **GUESS_PENALTY** = 100 per extra guess (1 guess = no penalty)
- **FUZZY_BONUS** = 50 per fuzzy match
- **TIME_PENALTY** = 1 point per 10 seconds

### Source Files
- Formula: `shared-types/src/scoring.ts` → `calculateScore()`
- Applied: `pages/api/guess.ts` → when game ends

### Daily Leaderboard Ranking Order
1. `guesses_used ASC` — fewer guesses = better
2. `best_time ASC` — faster = better
3. `bonus_score DESC` — higher bonus = better
4. `fuzzy_matches DESC` — more fuzzy matches = better

Enforced by trigger `update_leaderboard_rankings()` on `leaderboard_summary`.

---

## 4. Theme Scoring

### Scoring Flow (Priority Order)
```
1. Exact Match → 100% (case-insensitive string comparison)
2. Pattern Match → 60-100% (rule-based: suffix/prefix/hyphenated/contains)
3. Alias Match → 98% (curated alternative phrasings, ~40+ themes)
4. Semantic Scoring → Embedding + Keywords + Specificity + Negation + Word-Context
   ├─ Embedding similarity (HuggingFace all-MiniLM-L6-v2)
   ├─ Keyword overlap (weighted: exact=1.0, stem=0.9, synonym=0.6, substring=0.3)
   ├─ Specificity/triviality gating (short/vague guess penalty)
   ├─ Negation/qualifier mismatch detection
   └─ Word-context boost (up to +8% from weekly word alignment)
```

### Thresholds (Consistent Across Frontend + Backend)
| Score | Result | Vault Animation | Key Colour |
|-------|--------|----------------|------------|
| 85%+ | Correct | Green unlock | Green |
| 70-84% | Incorrect | Orange shake | Orange |
| <70% | Incorrect | Red shake | Red |

### Weekly Theme Leaderboard Ranking
- **Sort:** `attempt_date ASC, created_at ASC`
- First correct guess wins — Monday solvers rank before Tuesday solvers
- Ties broken by `created_at` (server timestamp)
- **Time displayed:** The `created_at` timestamp from `theme_attempts` (when the guess was submitted)

### Source Files
- Config: `src/utils/themeScoringConfig.ts`
- Scoring engine: `src/utils/themeScoring.ts`
- Pattern matcher: `src/utils/patternThemeMatcher.ts`
- Aliases: `src/utils/themeAliases.ts`
- Theme validation: `src/game/theme.ts`
- Feedback messages: `client/src/utils/themeMessages.ts`

---

## 5. Supabase Tables

### Core Tables

#### `players`
| Column | Type | Purpose |
|--------|------|---------|
| id | TEXT (PK) | Browser-generated UUID |
| display_name | TEXT | Player nickname |
| last_active | TIMESTAMPTZ | Updated on game activity |
| is_anonymous | BOOLEAN | Default true |
| last_nickname_change | TIMESTAMPTZ | Rate-limits name changes |

#### `words`
| Column | Type | Purpose |
|--------|------|---------|
| id | UUID (PK) | Word identifier |
| word | TEXT (unique) | The secret word |
| date | DATE (unique) | Scheduled play date |
| theme | TEXT | Weekly theme connection |
| definition | TEXT | D clue |
| etymology | TEXT | E clue |
| first_letter | TEXT | F clue |
| in_a_sentence | TEXT | I clue |
| number_of_letters | INT | N clue |
| equivalents | TEXT | E2 clue (synonyms) |
| dictionary_id | BIGINT | FK → dictionary for bonus round |
| difficulty | TEXT | Optional difficulty rating |

#### `game_sessions`
| Column | Type | Purpose |
|--------|------|---------|
| id | UUID (PK) | Session identifier |
| player_id | TEXT | FK → players |
| word_id | UUID | FK → words |
| state | TEXT | 'active' or 'completed' |
| start_time | TIMESTAMPTZ | When game began |
| end_time | TIMESTAMPTZ | When game ended |
| guesses | TEXT[] | Array of guess strings |
| guesses_used | INT | Total guesses made |
| is_complete | BOOLEAN | Game finished? |
| is_won | BOOLEAN | Player won? |
| is_archive_play | BOOLEAN | Archive mode game? |
| game_date | DATE | Which day's word |
| bonus_results | JSONB | Bonus round tier results |

#### `scores`
| Column | Type | Purpose |
|--------|------|---------|
| id | UUID (PK) | Score record |
| player_id | TEXT | FK → players |
| word_id | UUID | FK → words |
| game_session_id | UUID | FK → game_sessions |
| score | INT | Final composite score |
| base_score | INT | Starting score (1000) |
| guess_penalty | INT | Points deducted for extra guesses |
| time_penalty | INT | Points deducted for time |
| fuzzy_bonus | INT | Points for fuzzy matches |
| bonus_score | INT | Points from bonus round |
| completion_time_seconds | INT | Seconds to complete |
| guesses_used | INT | Number of guesses |

#### `theme_attempts`
| Column | Type | Purpose |
|--------|------|---------|
| id | UUID (PK) | Attempt record |
| player_id | TEXT | FK → players |
| theme | TEXT | Theme being guessed |
| guess | TEXT | Player's guess |
| is_correct | BOOLEAN | Did it pass 85% threshold? |
| confidence_percentage | INT | Score 0-100 |
| matching_method | TEXT | How the match was determined |
| attempt_date | DATE | When attempt was made |
| week_start | DATE | Monday of the theme week |
| is_archive_attempt | BOOLEAN | Was this an archive play? |
| similarity_score | FLOAT | Raw similarity value |

### Leaderboard Tables

#### `leaderboard_summary`
| Column | Type | Purpose |
|--------|------|---------|
| id | UUID (PK) | Row ID |
| player_id | TEXT | FK → players |
| word_id | UUID | FK → words |
| rank | INT | Calculated rank for this word |
| was_top_10 | BOOLEAN | Finished in top 10? |
| best_time | INT | Completion time (seconds) |
| guesses_used | INT | Guesses to solve |
| date | DATE | Word date |
| bonus_score | INT | Bonus round points |
| fuzzy_matches | INT | Fuzzy match count |

Populated by trigger on `game_sessions`. Ranks recalculated on every change.

#### `daily_leaderboard_snapshots`
Immutable daily snapshots. `final_rankings` is a JSONB array frozen at end of day.

#### `player_streaks`
| Column | Type | Purpose |
|--------|------|---------|
| player_id | TEXT (PK) | FK → players |
| current_streak | INT | Consecutive wins |
| highest_streak | INT | All-time best |
| streak_start_date | DATE | When current streak began |
| last_win_date | DATE | Most recent win |

**Important:** A "win" for streak purposes is `rank = 1` in `leaderboard_summary`, NOT just solving the word.

### Supporting Tables

#### `dictionary`
~174,000 words with `lex_rank` for alphabetical ordering. Used by bonus round.

#### `bonus_round_guesses`
Individual bonus round guesses with `distance`, `tier` (perfect/good/average/miss), linked to `game_sessions`.

#### `trigger_log`
Debug logging for all database triggers.

---

## 6. Leaderboards

### Daily Leaderboard
- **Table:** `leaderboard_summary`
- **Rank order:** guesses_used ASC → best_time ASC → bonus_score DESC → fuzzy_matches DESC
- **API:** `GET /api/leaderboard?date=YYYY-MM-DD` or `GET /api/daily-leaderboard`
- **Snapshots:** Finalized into `daily_leaderboard_snapshots` at end of day

### Weekly Theme Leaderboard
- **Table:** `theme_attempts` (queried dynamically, no dedicated table)
- **Rank order:** attempt_date ASC → created_at ASC (first correct guess wins)
- **API:** `GET /api/leaderboard/theme-weekly`
- **Display:** Rank, Player, Day, Time (HH:MM), Confidence %

### All-Time Leaderboard
- **Tables:** `leaderboard_summary` + `game_sessions` + `player_streaks`
- **API:** `GET /api/leaderboard/all-time`
- **Tabs:** Top by Games (total_games), Top by Streaks (highest_streak)

### Theme All-Time Leaderboard
- **Table:** `theme_attempts`
- **API:** `GET /api/leaderboard/theme-alltime`

---

## 7. Triggers & Functions

| Trigger | Table | When | What |
|---------|-------|------|------|
| `update_player_activity_on_game` | game_sessions | INSERT/UPDATE | Sets `players.last_active` |
| `update_leaderboard_on_game_complete` | game_sessions | UPDATE (is_complete, is_won) | Inserts/updates `leaderboard_summary` |
| `update_rankings_after_leaderboard_change` | leaderboard_summary | INSERT/UPDATE/DELETE | Recalculates `rank` column |
| `trigger_update_streaks` | leaderboard_summary | INSERT/UPDATE | Updates `player_streaks` |

**Guard:** `pg_trigger_depth() > 2` prevents infinite recursion.

---

## 8. Identified Gaps & Inconsistencies

### 1. Snapshot Ranking Order Differs from Live
- **Live leaderboard:** `guesses → time → bonus_score → fuzzy_matches`
- **Finalized snapshots:** `time → guesses` only (ignores bonus_score and fuzzy_matches)
- **Impact:** Historical snapshots can have different rankings than what was shown live
- **Fix:** Update `finalize_daily_leaderboard` function to use same ordering

### 2. `leaderboardRepository.ts` Uses Old Ordering
- Orders by `best_time → guesses_used` (opposite of live)
- May be dead code; main leaderboard API uses `rank` column from trigger
- **Fix:** Verify if this file is used anywhere; if so, update ordering

### 3. Streaks Only Count Rank #1
- A "win" for streak purposes is `rank = 1`, not "solved the word"
- Documented in code but contradicts `GAME_LOGIC_AND_RULES.md` which defines any solver as a winner
- **Impact:** Players who consistently solve but aren't fastest get no streak
- **Decision needed:** Should streaks count all solves or only #1 finishes?

### 4. Theme Leaderboard Time — Misleading for Long Times
- Time shown (e.g. "07:37") is the `created_at` timestamp (HH:MM of day), not elapsed time
- A player who guesses the theme at 7:37 AM on Tuesday shows "07:37"
- This is **not** the time it took them to guess — it's the clock time they submitted
- **Impact:** "7 minutes" on the leaderboard is actually "guessed at 7:XX AM"
- **Fix:** Consider showing day + time-of-day, OR calculate elapsed time from first word completion

### 5. Theme Modal → Leaderboard Chain Can Break
- Daily leaderboard only auto-shows when theme modal closes
- If user never opens theme modal, leaderboard never auto-appears
- If bonus round is active, theme modal doesn't auto-open after it
- **Fix:** Add explicit "See Results" button on main page post-game

### 6. No Perfect Score Tracking for Theme
- Currently no specific tracking for 100% (exact match) theme guesses
- `theme_attempts` stores `confidence_percentage` but nothing distinguishes "perfect"
- **Opportunity:** Add `is_perfect` flag or track in leaderboard for bragging rights

### 7. `user_stats` Table — Legacy/Orphan
- Referenced in old migrations but FKs have been updated to point to `players`
- May still exist in database but is unused by current code
- **Fix:** Verify existence and drop if orphaned

---

## 9. Potential New Leaderboards

### Data We Collect But Don't Currently Aggregate

| Data Point | Source | Potential Use |
|------------|--------|---------------|
| Bonus round performance | `bonus_round_guesses` | Weekly/all-time bonus round leaderboard |
| Fuzzy match count | `scores.fuzzy_bonus` | "Most fuzzy matches" leaderboard |
| Theme guess confidence | `theme_attempts.confidence_percentage` | Average confidence leaderboard |
| First guess accuracy | `game_sessions.guesses[0]` | "Lucky first guess" stats |
| Completion time trends | `scores.completion_time_seconds` | Speed improvement over time |
| Clue usage patterns | `game_sessions.revealed_clues` | "Clue efficiency" metrics |

### Suggested New Leaderboards

1. **Bonus Round Champions** — Weekly/all-time leaderboard of bonus round scores. Data exists in `bonus_round_guesses` and `leaderboard_summary.bonus_score`.

2. **Speed Demons** — Fastest average completion time (min 5 games). Data in `scores.completion_time_seconds`.

3. **Theme Perfectionists** — Players who achieved 95%+ or 100% on theme guesses. Data in `theme_attempts.confidence_percentage`.

4. **Consistency Kings** — Longest streak of top-3 finishes. Can be derived from `leaderboard_summary.rank`.

5. **Weekly Recap** — Aggregate of all 7 daily results for the week (total score, avg guesses, bonus points). Could drive a "Player of the Week" award.

---

## 10. Next Steps

### High Priority
- [ ] Fix Mince/Garlic dates in database (data correction)
- [ ] Fix snapshot ranking order to match live leaderboard
- [ ] Decide on streak definition (rank #1 only vs. all solvers)
- [ ] Add explicit "See Results" button on main page after game completion

### Medium Priority
- [ ] Verify `user_stats` table status — drop if orphaned
- [ ] Verify `leaderboardRepository.ts` usage — update or remove
- [ ] Fix theme leaderboard time display (clock time vs elapsed time ambiguity)
- [ ] Add `is_perfect` tracking for exact match theme guesses
- [ ] Consider bonus round leaderboard

### Low Priority / Future
- [ ] Phase 4: Lightweight LLM Classification (optional, deferred from theme scoring plan)
- [ ] Full dark mode support (currently forcing light; proper dark mode is a larger refactor)
- [ ] Archive mode theme leaderboards
- [ ] Player profile page with historical stats

---

## Key File References

| Area | Files |
|------|-------|
| Daily scoring formula | `shared-types/src/scoring.ts` |
| Score persistence | `pages/api/guess.ts` |
| Theme scoring config | `src/utils/themeScoringConfig.ts` |
| Theme scoring engine | `src/utils/themeScoring.ts` |
| Pattern matcher | `src/utils/patternThemeMatcher.ts` |
| Alias matcher | `src/utils/themeAliases.ts` |
| Theme validation | `src/game/theme.ts` |
| Feedback messages | `client/src/utils/themeMessages.ts` |
| Game flow (client) | `client/src/App.tsx` |
| VaultLogo thresholds | `client/src/components/VaultLogo.tsx` |
| Theme modal | `client/src/components/ThemeGuessModal.tsx` |
| Bonus round | `client/src/components/BonusRoundInline.tsx` |
| Daily leaderboard | `client/src/GameSummaryModal.tsx` |
| Admin calendar | `client/src/admin/components/WeekCalendar.tsx` |
| Leaderboard APIs | `pages/api/leaderboard/*.ts` |
| Supabase migrations | `supabase/migrations/` |
| Ranking trigger | `supabase/migrations/20260214000001_add_bonus_score_to_leaderboard_ranking.sql` |
| Streak trigger | `supabase/migrations/20250702000001_fix_player_streaks_trigger.sql` |
