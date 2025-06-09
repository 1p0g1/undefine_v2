# Un·Define Game Logic and Rules Documentation

**Date**: December 2024  
**Status**: Comprehensive Reference  
**Purpose**: Single source of truth for game mechanics, win logic, scoring, and future enhancements

---

## 🎮 **CORE GAME MECHANICS**

### **Objective**
Players must correctly guess the daily word within 6 attempts using revealed clues.

### **Game Flow**
1. **Daily Word**: New word released each day at midnight UTC
2. **Clue Revelation**: Each incorrect guess reveals the next clue in sequence
3. **Win Condition**: Successfully guess the word within 6 attempts
4. **Loss Condition**: Exhaust all 6 guesses without correct answer

### **Clue Sequence** (Fixed Order)
1. **Definition** (D) - Word definition
2. **Equivalents** (E) - Synonyms or related terms  
3. **First Letter** (F) - First letter of the word
4. **In a Sentence** (I) - Example usage in context
5. **Number of Letters** (N) - Word length
6. **Etymology** (E2) - Word origin and history

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

## 📊 **SCORING SYSTEM**

### **Current Formula** (December 2024)
```
Final Score = base_score_for_guess + fuzzy_bonus - time_penalty - hint_penalty
```

### **Base Scores by Guess Number**
- **Guess 1**: 1,000 points (perfect game)
- **Guess 2**: 900 points  
- **Guess 3**: 800 points
- **Guess 4**: 700 points
- **Guess 5**: 600 points
- **Guess 6**: 500 points

### **Bonuses & Penalties**
- **Fuzzy Bonus**: +25 points per fuzzy match (rewards close attempts)
- **Time Penalty**: -1 point per 10 seconds  
- **Hint Penalty**: -200 points if hints used (future feature)

### **Scoring Examples**
```
Perfect Game: 1 guess, 30s = 1000 + 0 - 3 = 997 points
Good Game: 2 guesses (1 fuzzy), 30s = 900 + 25 - 3 = 922 points  
Average Game: 3 guesses, 60s = 800 + 0 - 6 = 794 points
```

### **Fuzzy Matching Logic**
Players get bonus points for "close" guesses that don't match exactly but show understanding:

#### **Fuzzy Match Criteria** (All must be met)
- **Minimum 40% character similarity**
- **At least 2 shared characters**  
- **At least 1 character in correct position**
- **Length within 50% tolerance**

#### **Examples**
- Target: "DEFINE" → Guess: "REFINE" = ✅ FUZZY (5/6 chars match)
- Target: "DEFINE" → Guess: "DESIGN" = ✅ FUZZY (4/6 chars, D and E match positions)
- Target: "DEFINE" → Guess: "HELLO" = ❌ No fuzzy match

---

## 🏅 **LEADERBOARD & RANKING**

### **Daily Leaderboard Logic**
Players ranked by performance among **winners only**:

1. **Final Score** (primary factor - higher is better)
2. **Completion Time** (tiebreaker - faster is better)  
3. **Guess Count** (secondary tiebreaker - fewer is better)

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
- **Current Method**: `game_sessions` table (✅ Complete - tracks wins + losses)
- **Legacy Method**: `leaderboard_summary` table (❌ Deprecated - wins only)

### **Data Flow Triggers**
1. **Game completion** updates `game_sessions`
2. **Trigger 1** populates `leaderboard_summary` (winners only)
3. **Trigger 2** recalculates rankings for all players on that word
4. **Result**: Real-time leaderboard updates

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
- **`game_sessions`**: Primary game state tracking
- **`leaderboard_summary`**: Winners only (successful completions)
- **`scores`**: Detailed scoring information  
- **`user_stats`**: Aggregate player statistics
- **`player_streaks`**: Win streak tracking

#### **Critical Logic**
```sql
-- Win detection: Any entry in leaderboard_summary = 1 win
SELECT COUNT(*) as total_wins 
FROM leaderboard_summary 
WHERE player_id = 'player-id';

-- Loss tracking: Currently not implemented
-- Would need separate table or game_sessions tracking
```

### **Data Flow Triggers**
1. **Game completion** updates `game_sessions`
2. **Trigger 1** populates `leaderboard_summary` (winners only)
3. **Trigger 2** recalculates rankings for all players on that word
4. **Result**: Real-time leaderboard updates

---

## 🔮 **FUTURE ENHANCEMENTS**

### **Approved for Implementation**
1. **Enhanced Streak System** ✅ (Completed)
2. **All-Time Leaderboard** ✅ (Completed)  
3. **Performance Optimizations** (In Progress)

### **Under Consideration**
1. **True Win Rate Tracking**
   - Track unsuccessful attempts separately
   - Calculate meaningful win rates (not 100%)
   - Add loss statistics to player profiles

2. **Multiple Game Modes**
   - Daily Challenge (current)
   - Practice Mode (replay old words)
   - Hard Mode (fewer clues)
   - Speed Mode (time pressure)

3. **Achievement System**
   - Streak milestones (7-day, 30-day, 100-day)
   - Score achievements (perfect games, high scores)
   - Discovery achievements (first player to guess)

4. **Advanced Statistics**
   - Personal analytics dashboard
   - Word difficulty ratings
   - Performance trends over time
   - Category-specific statistics

### **Technical Improvements Needed**
1. **End-of-Day Leaderboard Snapshots**
   - Preserve historical leaderboard states
   - Fix `was_top_10` inconsistency issues
   - Enable "leaderboard at time X" queries

2. **Loss Attempt Tracking**  
   - Track games where players don't guess correctly
   - Enable true win rate calculations
   - Add comprehensive game statistics

3. **Enhanced Fuzzy Logic**
   - Smarter similarity algorithms
   - Category-aware fuzzy matching
   - User-customizable fuzzy sensitivity

---

## 🎯 **GAME BALANCE PHILOSOPHY**

### **Skill vs. Luck Balance**
- **90% Skill**: Word knowledge, strategic thinking, vocabulary
- **8% Strategy**: Fuzzy match utilization, clue interpretation  
- **2% Speed**: Time management (minimal penalty)

### **Accessibility Principles**
- **No speed pressure**: Time penalty minimal to encourage thoughtful play
- **Progressive hints**: Clue system helps struggling players
- **Fuzzy rewards**: Partial credit for close attempts
- **Daily reset**: Everyone starts fresh each day

### **Competitive Integrity**
- **Consistent scoring**: Predictable, transparent point system
- **Clear hierarchy**: Better players consistently rank higher
- **Merit-based**: Success tied to game knowledge, not luck
- **Fair outcomes**: System rewards strategy over speed

---

## 🚨 **KNOWN ISSUES & LIMITATIONS**

### **Current System Limitations**
1. **100% Win Rates**: Only winners tracked, creating false statistics
2. **Real-time Top 10**: `was_top_10` changes throughout day
3. **No Loss Data**: Cannot calculate true win percentages
4. **Past Leaderboard Changes**: Historical rankings not preserved

### **Data Consistency Issues**
1. **Trigger Dependencies**: Foreign key relationships can cause failures
2. **Player Name Lookup**: Separate queries required (no direct FK)
3. **Streak Calculation**: Requires careful date handling across timezones

### **Performance Considerations**
1. **Ranking Recalculation**: Happens on every game completion
2. **All-Player Updates**: `was_top_10` updates affect entire word's players
3. **API Query Complexity**: Multiple table queries for statistics

---

## 📋 **DEVELOPMENT GUIDELINES**

### **When Adding New Features**
1. **Check Implementation Plan**: Follow `implementation-plan.mdc` process
2. **Maintain Data Consistency**: Ensure triggers and tables stay aligned
3. **Preserve Win Logic**: Don't change core win/loss definitions without discussion
4. **Test Edge Cases**: Consider timezone, tie-breaker, and performance scenarios

### **Code Quality Standards**
1. **Type Safety**: Full TypeScript coverage
2. **Error Handling**: Robust error recovery mechanisms  
3. **Documentation**: Update this document for logic changes
4. **Testing**: Include unit tests for scoring and ranking logic

### **Future Compatibility**
- **Schema Evolution**: Plan for additional game modes
- **Backwards Compatibility**: Preserve existing player statistics
- **Migration Strategy**: Document any breaking changes to logic
- **API Versioning**: Consider versioning for major logic changes

---

**Last Updated**: December 2024  
**Next Review**: When implementing loss tracking or game mode expansion  
**Status**: ✅ Complete Reference - Ready for Development 