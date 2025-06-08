# Un·Define Win Logic Definition

## 🏆 **What Constitutes a "Win"**

**WIN = Successfully guessing/completing the word, regardless of ranking or speed**

### **Key Principles**

1. **Completion = Win**: If a player successfully guesses the word, they "win" that day's game
2. **Ranking ≠ Winning**: Ranking only shows relative performance among winners
3. **All Ranked Players Won**: Anyone appearing in `leaderboard_summary` completed the word

### **Examples**

**Scenario**: 50 players attempt today's word, 25 succeed in guessing it

- **Winners**: All 25 players who guessed correctly (ranks 1-25)
- **Losers**: 25 players who didn't guess correctly (no ranking entry)
- **1st Place**: Fastest/most efficient winner (still just 1 win, like everyone else)

## 📊 **Data Implementation**

### **Database Logic**
```sql
-- WIN COUNT: Any entry in leaderboard_summary = 1 win
SELECT COUNT(*) as total_wins 
FROM leaderboard_summary 
WHERE player_id = 'some-player-id';

-- LOSS COUNT: Would need to be tracked separately 
-- (currently not implemented - only wins are recorded)
```

### **API Logic** 
```typescript
// CORRECT: All leaderboard entries are wins
const wins = games; // All games in leaderboard_summary

// INCORRECT: Only first place counts as win  
const wins = games.filter(g => g.rank === 1); // ❌ Wrong approach
```

## 🎯 **All-Time Statistics Impact**

### **Win Rate Calculation**
```
Win Rate = (Total Completions / Total Attempts) × 100

Where:
- Total Completions = Entries in leaderboard_summary
- Total Attempts = Would need separate tracking (not currently implemented)
```

### **Current Limitation** 
Since we only track successful completions, **current win rate = 100%** for all players in our system.

To implement true win rates, we'd need to track unsuccessful attempts separately.

## 🔄 **Consistency Across Tables**

### **leaderboard_summary**
- Every entry = 1 win (player completed the word)
- `rank` = Speed/efficiency ranking among winners
- `was_top_10` = Fastest 10 winners that day

### **user_stats** 
- `games_won` should match count of `leaderboard_summary` entries
- `games_played` would ideally include unsuccessful attempts (not currently tracked)

### **player_streaks**
- Consecutive days of word completion
- Should align with `leaderboard_summary` entries

## 🚨 **Previous Bug Fixed**

**Issue**: All-time leaderboard was only counting `rank = 1` as wins
**Fix**: Updated to count all `leaderboard_summary` entries as wins  
**Result**: Matt Dub now correctly shows 4 wins instead of 0

## 💭 **Future Considerations**

1. **Track Unsuccessful Attempts**: To enable true win rate calculations
2. **Distinguish Game Types**: Different win definitions for different game modes
3. **Partial Credit**: Whether partial solutions count as wins

---

**Decision Date**: December 2024  
**Status**: ✅ Implemented in all-time leaderboard API  
**Next Review**: When implementing attempt tracking 