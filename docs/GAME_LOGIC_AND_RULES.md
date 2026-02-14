# Un·Define Game Logic and Rules Documentation

**Date**: February 2026  
**Status**: Comprehensive Reference  
**Purpose**: Single source of truth for game mechanics, win logic, scoring, ranking, and bonus round

---

## 🎮 **CORE GAME MECHANICS**

### **Objective**
Un·Define is a daily word + weekly theme guessing game. Each day has a secret word, the seven words each week are connected by a secret theme. Players must correctly guess the daily word within 6 attempts using revealed clues.

### **Game Flow**
1. **Daily Word**: New word released each day at midnight UTC
2. **Clue Revelation**: Each guess reveals the next clue in fixed order
3. **Win Condition**: Successfully guess the word within 6 attempts
4. **Loss Condition**: Exhaust all 6 guesses without correct answer
5. **Bonus Round**: Players who solve in fewer than 6 guesses unlock the bonus round
6. **Theme Guess**: After completing any daily word, players can guess the weekly theme

### **Clue Sequence** (Fixed Order - D.E.F.I.N.E)
1. **D** - Definition of the word
2. **E** - Equivalents (Synonyms)
3. **F** - First Letter
4. **I** - In a Sentence example
5. **N** - Number of Letters
6. **E** - Etymology (word origin)

---

## 🏆 **WIN/LOSS LOGIC**

### **What Constitutes a "Win"**

**✅ WIN = Successfully guessing the word correctly, regardless of speed or ranking**

#### **Key Principles**
1. **Completion ≠ Automatic Win**: Players can exhaust all 6 guesses and still lose
2. **Ranking ≠ Winning Status**: Ranking only shows relative performance among winners  
3. **Database Implementation**: Only winners appear in `leaderboard_summary` table

#### **Examples**
- **50 players attempt daily word**
- **30 players guess correctly** → 30 WINS (ranked 1-30)
- **20 players don't guess correctly** → 20 LOSSES (no ranking)
- **Player ranked #25** → Still a WIN (just slower than 24 others)

### **Frontend Win Detection**
```typescript
// From GameSummaryModal.tsx
const didWin = playerRank !== null;
const message = didWin 
  ? `Congratulations! You ranked #${playerRank}` 
  : "You didn't rank today. Better luck tomorrow!";
```

---

## 🔑 **THEME KEY & VAULT FLOW**

### **Daily Key Rule**
1. **No Key While Playing**: The key is hidden until the daily word is solved.
2. **Word Win Grants a Key**: After a correct daily word guess, `Key.png` appears between the word reveal and the first hint.
3. **Theme Guess Spends the Key**: Submitting a theme guess updates the key color for that day:
   - **Green** (80%+) / **Orange** (70-79%) / **Red** (<70%)

### **Weekly Vault Rule**
- The vault door reflects the **player’s weekly theme status** and persists across days.
- The **key resets daily**, while the vault remains a weekly summary of theme outcome.

### **Theme Guess + Key Interaction**
- **Theme guess is separate from the word win**.
- The daily key exists only on days the word is solved.
- The vault remains visible regardless of key state.

---

## 📊 **SCORING SYSTEM**

### **Current Formula** (February 2026)
```
Final Score = PERFECT_SCORE - guess_penalty + fuzzy_bonus - time_penalty
```

**Source of truth**: `shared-types/src/scoring.ts`

### **Constants** (`SCORING` object)
- **PERFECT_SCORE**: 1,000
- **GUESS_PENALTY**: 100 per guess after the first
- **FUZZY_BONUS**: 50 points per fuzzy match
- **TIME_PENALTY_PER_10_SECONDS**: 1 point per 10 seconds

### **Base Scores by Guess Number**
- **Guess 1**: 1,000 points (perfect game)
- **Guess 2**: 900 points  
- **Guess 3**: 800 points
- **Guess 4**: 700 points
- **Guess 5**: 600 points
- **Guess 6**: 500 points

### **Bonuses & Penalties**
- **Fuzzy Bonus**: +50 points per fuzzy match (rewards close attempts)
- **Time Penalty**: -1 point per 10 seconds  
- **Hint Penalty**: -200 points if hints used (not currently active)

### **Scoring Examples**
```
Perfect Game: 1 guess, 30s = 1000 - 0 + 0 - 3 = 997 points
Good Game: 2 guesses (1 fuzzy), 30s = 1000 - 100 + 50 - 3 = 947 points  
Average Game: 3 guesses, 60s = 1000 - 200 + 0 - 6 = 794 points
```

### **Fuzzy Matching Logic**
Players get bonus points for "close" guesses that don't match exactly but show understanding.
Uses smart local fuzzy matching (`src/utils/smartLocalFuzzy.ts`) with legacy fallback.

#### **Fuzzy Match Criteria** (legacy fallback, all must be met)
- **Minimum 40% character similarity**
- **At least 2 shared characters**  
- **Length within tolerance**

#### **Examples**
- Target: "DEFINE" → Guess: "REFINE" = ✅ FUZZY (5/6 chars match)
- Target: "DEFINE" → Guess: "DESIGN" = ✅ FUZZY (4/6 chars, D and E match positions)
- Target: "DEFINE" → Guess: "HELLO" = ❌ No fuzzy match

---

## 🎯 **BONUS ROUND**

### **Eligibility**
Players who solve the daily word in **fewer than 6 guesses** unlock the Dictionary Neighbours Bonus Round.

### **How It Works**
1. Player wins in < 6 guesses → Bonus round triggered
2. Player guesses a dictionary neighbour word → API checks `dictionary.lex_rank`
3. Distance calculated (absolute difference in `lex_rank`)
4. Tier assigned based on distance → `bonus_round_guesses` INSERT
5. After all guesses → `finalize-score` calculates total bonus score

### **Scoring Tiers**
| Tier | Max Distance | Points | Display |
|------|-------------|--------|---------|
| **Gold** (perfect) | ≤ 10 words | 100 | 🥇 Gold box |
| **Silver** (good) | ≤ 25 words | 50 | 🥈 Silver box |
| **Bronze** (average) | ≤ 50 words | 25 | 🥉 Bronze box |
| **Miss** | > 50 words | 0 | Gray box |

### **Bonus Score Calculation**
```
bonus_score = SUM(tier_points for each bonus guess)
```
Example: Gold + Silver + Bronze = 100 + 50 + 25 = 175 bonus points

### **Data Storage**
- Individual guesses: `bonus_round_guesses` table (tier, distance, attempt_number)
- Aggregated score: `scores.bonus_score` column
- Ranking data: `leaderboard_summary.bonus_score` column (synced by `finalize-score` API)

### **Source of truth**: 
- Tier definitions: `pages/api/bonus/check-guess.ts`
- Score aggregation: `pages/api/bonus/finalize-score.ts`
- Dictionary: `dictionary` table (~115,000 words, OPTED/Webster's 1913)

---

## 🏅 **LEADERBOARD & RANKING**

### **Daily Leaderboard Logic**
Players ranked by performance among **winners only**.

**Ranking Order (priority):**

| Priority | Factor | Direction | Description |
|----------|--------|-----------|-------------|
| **1st** | Fewer Guesses | ASC | Solve the word in fewer attempts to rank higher |
| **2nd** | Faster Time | ASC | If tied on guesses, faster completion time wins |
| **3rd** | Bonus Round Score | DESC | If tied on guesses + time, higher bonus round score wins |
| **4th** | Fuzzy Matches | DESC | If tied on all above, more fuzzy matches wins |

**Source of truth**: `supabase/migrations/20260214000001_add_bonus_score_to_leaderboard_ranking.sql`

```sql
ORDER BY 
  guesses_used ASC,
  best_time ASC,
  COALESCE(bonus_score, 0) DESC,
  COALESCE(fuzzy_matches, 0) DESC
```

### **Ranking Data Flow**
1. Player wins → `game_sessions` trigger → `leaderboard_summary` INSERT (guesses_used, best_time)
2. Score created → `guess.ts` → updates `leaderboard_summary.fuzzy_matches`
3. Bonus round finishes → `finalize-score.ts` → updates `leaderboard_summary.bonus_score`
4. Any leaderboard_summary change → ranking trigger recalculates all ranks for that word

### **All-Time Statistics**

#### **Win Rate Calculation**
```typescript
// Current Implementation (100% for all players)
win_rate = (entries_in_leaderboard_summary / entries_in_leaderboard_summary) * 100

// Future Implementation (with loss tracking)  
win_rate = (successful_completions / total_attempts) * 100
```

#### **5 All-Time Categories**
1. **🥇 Win Rate** - Percentage of games won (currently 100% for all)
   - **Display Format**: `100% (4/4) • Current: 0` 
   - **"Current" = Current consecutive win streak** (0 means streak is broken)
2. **🎯 Consistency** - Lowest average guesses (minimum 1 win)
3. **🔥 Streaks** - Longest consecutive win streaks
4. **📊 Activity** - Most games played  
5. **🏆 Top 10** - **TOTAL times featured in daily top 10 rankings**

### **Top 10 Logic - STATUS UPDATE**
- **✅ SNAPSHOTS IMPLEMENTED**: End-of-day snapshot system is fully deployed
- **✅ API FIXED**: All-time API now uses snapshot-based `calculateTop10FinishesFromSnapshots()` function
- **✅ USER'S EXPECTATION MET**: Counts "number of times FEATURED in the top 10 of daily rankings"
- **✅ FRONTEND COMPLETE**: Top 10 tab displays data correctly with proper TypeScript interfaces

### **Win Rate Logic - STATUS UPDATE**
- **✅ ACCURATE TRACKING**: Now queries `game_sessions` table for both wins and losses
- **✅ REAL PERCENTAGES**: No longer shows 100% for all players
- **✅ MATT DUB FIX**: His 0% win rate bug is resolved (will show actual percentage)
- **Implementation**: `calculateAllTimeStatsFromSessions()` function tracks:
  - **Wins**: `is_complete = true, is_won = true`
  - **Losses**: `is_complete = true, is_won = false`
  - **Win Rate**: `(wins / total_attempts) * 100`

### **Data Sources Summary**
- **Primary**: `game_sessions` table (tracks wins + losses, all game state)
- **Leaderboard**: `leaderboard_summary` table (winners only, used for ranking display)
- **Scores**: `scores` table (detailed scoring breakdown including fuzzy_bonus, bonus_score)
- **Bonus**: `bonus_round_guesses` table (individual bonus round guess results)

### **Data Flow Triggers**
1. **Game completion** updates `game_sessions`
2. **Trigger 1** (`update_leaderboard_from_game`) populates `leaderboard_summary` (winners only)
3. **Trigger 2** (`update_leaderboard_rankings`) recalculates rankings for all players on that word
4. **Score creation** in `guess.ts` syncs `fuzzy_matches` to `leaderboard_summary`
5. **Bonus finalization** in `finalize-score.ts` syncs `bonus_score` to `leaderboard_summary`
6. **Result**: Real-time leaderboard updates with full tiebreaker data

---

## 💾 **DATABASE IMPLEMENTATION**

### **Core Tables & Relationships**

#### **Game Completion Flow**
```
1. Player starts game → entry created in game_sessions
2. Player makes guesses → guesses recorded in game_sessions  
3. Player wins → triggers fire to populate leaderboard_summary
4. Rankings calculated → all players for that word re-ranked
```

#### **Key Tables**
- **`game_sessions`**: Primary game state tracking (wins + losses)
- **`leaderboard_summary`**: Winners only - ranked with bonus_score + fuzzy_matches
- **`scores`**: Detailed scoring breakdown (base_score, fuzzy_bonus, bonus_score, time_penalty)
- **`bonus_round_guesses`**: Individual bonus round guess results (tier, distance)
- **`player_streaks`**: Win streak tracking
- **`theme_attempts`**: Weekly theme guess tracking

#### **Critical Logic**
```sql
-- Win detection: Any entry in leaderboard_summary = 1 win
SELECT COUNT(*) as total_wins 
FROM leaderboard_summary 
WHERE player_id = 'player-id';

-- Full game history (wins + losses)
SELECT is_won, COUNT(*) 
FROM game_sessions 
WHERE player_id = 'player-id' AND is_complete = true
GROUP BY is_won;
```

---

## 🔮 **IMPLEMENTED FEATURES**

1. **Enhanced Streak System** ✅
2. **All-Time Leaderboard** ✅
3. **End-of-Day Leaderboard Snapshots** ✅
4. **Win Rate Tracking** ✅ (via game_sessions)
5. **Bonus Round** ✅ (Dictionary Neighbours)
6. **Bonus Round as Ranking Tiebreaker** ✅ (bonus_score on leaderboard_summary)
7. **Theme Guessing** ✅ (semantic scoring with HuggingFace API)
8. **Archive Play** ✅ (historical word replays, separate from live stats)

---

## 📦 **BOX COLORS REFERENCE**

### **Game Guess Boxes**
| Color | Status | CSS Background | CSS Border |
|-------|--------|---------------|------------|
| Green | Correct guess | `#4ade80` | `#22c55e` |
| Orange/Yellow | Fuzzy match | `#f4c430` | `#ff9800` |
| Red | Wrong guess | `#ffb3b3` | `#dc2626` |

### **Bonus Round Boxes**
| Color | Tier | CSS Background | CSS Border |
|-------|------|---------------|------------|
| Gold | Perfect (≤10) | `linear-gradient(135deg, #FFD700, #FFA500)` | `#B8860B` |
| Silver | Good (≤25) | `linear-gradient(135deg, #C0C0C0, #A8A8A8)` | `#808080` |
| Bronze | Average (≤50) | `linear-gradient(135deg, #CD7F32, #A05A2C)` | `#8B4513` |

---

## 🎯 **GAME BALANCE PHILOSOPHY**

### **Skill vs. Luck Balance**
- **90% Skill**: Word knowledge, strategic thinking, vocabulary
- **8% Strategy**: Fuzzy match utilization, clue interpretation, bonus round
- **2% Speed**: Time management (minimal penalty)

### **Accessibility Principles**
- **No speed pressure**: Time penalty minimal to encourage thoughtful play
- **Progressive hints**: Clue system helps struggling players
- **Fuzzy rewards**: Partial credit for close attempts
- **Daily reset**: Everyone starts fresh each day

### **Competitive Integrity**
- **Consistent scoring**: Predictable, transparent point system
- **Clear hierarchy**: Better players consistently rank higher (guesses → time → bonus → fuzzy)
- **Merit-based**: Success tied to game knowledge, not luck
- **Fair outcomes**: System rewards strategy over speed

---

## 📋 **CROSS-REFERENCES**

| Topic | Source of Truth |
|-------|----------------|
| Database schema | `docs/DATABASE_ARCHITECTURE.md` |
| Scoring constants | `shared-types/src/scoring.ts` |
| Ranking SQL | `supabase/migrations/20260214000001_add_bonus_score_to_leaderboard_ranking.sql` |
| Bonus round tiers | `pages/api/bonus/check-guess.ts` |
| Bonus score finalization | `pages/api/bonus/finalize-score.ts` |
| Theme scoring | `src/utils/themeScoring.ts` + `src/utils/themeScoringConfig.ts` |
| Fuzzy matching | `src/utils/smartLocalFuzzy.ts` |

---

**Last Updated**: February 2026  
**Status**: ✅ Complete Reference - Single Source of Truth for Game Logic