# Leaderboard System Redesign Proposal
*Created: July 2, 2025*

## 🎯 Executive Summary

The current leaderboard system has several critical issues that need addressing:
1. **Streak tracking is broken** - Players' streaks are resetting incorrectly
2. **Redundant metrics** - Win Rate and Consistency tabs show similar data to Activity/Top 10
3. **Inconsistent data** - Different tabs show conflicting information
4. **Poor user experience** - Confusing navigation between similar metrics

## 🔍 Current Issues Analysis

### 1. Streak Tracking Problems
**Issue**: Beth should have a much longer streak but shows as "Current: 1"
- **Root Cause**: Streak calculation logic may be flawed
- **Impact**: Demotivates consistent players
- **Evidence**: Screenshots show Beth with extensive activity but streak=1

### 2. Redundant Leaderboard Tabs
**Current Tabs:**
- 🏆 **Win Rate** - Shows win percentage (redundant)
- 🎯 **Consistency** - Shows consistency metrics (unclear purpose)
- 🔥 **Streaks** - Shows current/best streaks (useful)
- 📊 **Activity** - Shows games played + win rate (duplicates Win Rate)
- 🏅 **Top 10** - Shows top 10 players (useful)

**Problems:**
- Win Rate tab duplicates Activity tab's win rate column
- Consistency tab purpose is unclear vs other metrics
- Too many tabs create confusion

### 3. Data Inconsistencies
**Observed Issues:**
- Different tabs show different player rankings
- Win rates may not match between tabs
- Activity counts don't align with streak data

## 🎨 Proposed Solution: Simplified 3-Tab System

### **Tab 1: 🏆 Champions** (Replaces Win Rate + Top 10)
**Purpose**: Show the best performing players
**Metrics**: 
- Overall ranking by score/performance
- Win rate percentage
- Total games played
- Best streak achieved

**Sorting**: By overall performance score (combination of win rate, consistency, and activity)

### **Tab 2: 🔥 Streaks** (Keep existing)
**Purpose**: Show current and best streaks
**Metrics**:
- Current streak
- Best streak ever
- Last played date
- Streak status (active/broken)

**Sorting**: By current streak (descending)

### **Tab 3: 📊 Activity** (Enhanced version)
**Purpose**: Show who's most active and engaged
**Metrics**:
- Total games played
- Games this week
- Last played date
- Win rate (secondary metric)

**Sorting**: By total games played (descending)

## 🔧 Technical Implementation Plan

### Phase 1: Fix Streak Tracking
1. **Audit streak calculation logic**
   - Review `player_streaks` table
   - Check streak update triggers
   - Verify date calculations

2. **Implement proper streak tracking**
   ```sql
   -- Example: Fix streak calculation
   UPDATE player_streaks 
   SET current_streak = (
     SELECT COUNT(*) FROM consecutive_wins 
     WHERE player_id = player_streaks.player_id
   );
   ```

3. **Add streak debugging endpoints**
   - `/api/debug/streak/{playerId}` 
   - Show streak history and calculations

### Phase 2: Redesign Leaderboard Components
1. **Create new leaderboard structure**
   ```typescript
   interface LeaderboardTab {
     id: 'champions' | 'streaks' | 'activity';
     name: string;
     icon: string;
     columns: LeaderboardColumn[];
   }
   ```

2. **Implement unified data fetching**
   - Single API endpoint: `/api/leaderboard/unified`
   - Returns all data needed for all tabs
   - Reduces API calls and ensures consistency

3. **Update UI components**
   - Simplify tab navigation
   - Consistent styling across tabs
   - Clear metric explanations

### Phase 3: Data Consistency Fixes
1. **Create unified player stats view**
   ```sql
   CREATE VIEW unified_player_stats AS
   SELECT 
     p.id,
     p.nickname,
     COUNT(gs.id) as total_games,
     COUNT(CASE WHEN gs.is_won THEN 1 END) as games_won,
     ROUND(COUNT(CASE WHEN gs.is_won THEN 1 END)::float / COUNT(gs.id) * 100, 1) as win_rate,
     ps.current_streak,
     ps.best_streak,
     MAX(gs.created_at) as last_played
   FROM players p
   LEFT JOIN game_sessions gs ON p.id = gs.player_id
   LEFT JOIN player_streaks ps ON p.id = ps.player_id
   GROUP BY p.id, p.nickname, ps.current_streak, ps.best_streak;
   ```

2. **Add data validation checks**
   - Automated tests for streak calculations
   - Consistency checks between tables
   - Alert system for data anomalies

## 📊 Success Metrics

### Before (Current Issues)
- ❌ Streak tracking broken
- ❌ 5 confusing tabs
- ❌ Inconsistent data
- ❌ Poor user experience

### After (Target Goals)
- ✅ Accurate streak tracking
- ✅ 3 clear, purposeful tabs
- ✅ Consistent data across all views
- ✅ Intuitive user experience
- ✅ Fast loading times

## 🚀 Implementation Timeline

### Week 1: Investigation & Fixes
- [ ] Audit current streak tracking logic
- [ ] Fix Beth's streak and other broken streaks
- [ ] Create debugging tools

### Week 2: Backend Redesign
- [ ] Create unified leaderboard API
- [ ] Implement new data views
- [ ] Add consistency validation

### Week 3: Frontend Redesign
- [ ] Redesign leaderboard components
- [ ] Implement 3-tab system
- [ ] Update UI/UX

### Week 4: Testing & Polish
- [ ] Comprehensive testing
- [ ] Performance optimization
- [ ] User acceptance testing

## 🎯 Next Steps

1. **Immediate Priority**: Fix streak tracking for Beth and other affected players
2. **Short Term**: Implement unified leaderboard API
3. **Medium Term**: Redesign frontend components
4. **Long Term**: Add advanced analytics and insights

## 📝 Questions for Discussion

1. Should we preserve historical leaderboard data during the redesign?
2. What's the most important metric for the "Champions" tab ranking?
3. Should we add player profiles with detailed statistics?
4. How should we handle tie-breaking in rankings?

---

*This document should be reviewed and approved before implementation begins.* 