# Future Features Roadmap

## 🔥 High Priority Issues

### 1. **Streak-Breaking Bug Review** 
**Status**: Needs Investigation  
**Priority**: High  
**Estimated Effort**: 1-2 days

#### **Current Issue**
Based on the migration history, there was a streak calculation bug that was "fixed" in July 2025, but we need to verify the fix is working correctly and hasn't regressed.

#### **Investigation Plan**
1. **Review Current Streak Logic**: Examine the `update_player_streaks()` trigger function
2. **Test Edge Cases**: 
   - Daily consecutive wins vs weekly patterns
   - Timezone handling for streak calculations
   - Gap tolerance (currently 7 days)
3. **Data Validation**: Compare calculated streaks vs displayed streaks
4. **Performance Impact**: Check if trigger is causing database performance issues

#### **Known Historical Issues**
- Original trigger only counted daily consecutive wins
- Weekly game patterns were breaking streaks incorrectly
- Beth's 8-win streak was showing as 1 due to date gap logic

#### **Verification Steps**
```sql
-- Test query to validate current streak calculations
SELECT 
  p.nickname,
  ps.current_streak,
  ps.highest_streak,
  COUNT(CASE WHEN ls.rank = 1 THEN 1 END) as actual_wins
FROM players p
JOIN player_streaks ps ON p.id = ps.player_id  
LEFT JOIN leaderboard_summary ls ON p.id = ls.player_id
GROUP BY p.id, p.nickname, ps.current_streak, ps.highest_streak
HAVING COUNT(CASE WHEN ls.rank = 1 THEN 1 END) != ps.current_streak;
```

---

## 🎯 Theme System Enhancements

### 2. **Fuzzy Theme Matching for Theme Guesses**
**Status**: Proposed  
**Priority**: Medium-High  
**Estimated Effort**: 1-2 days  
**Cost**: **FREE** (no external APIs)

#### **Current Problem**
Theme guessing is too punishing - players need exact matches or predefined synonyms. Current logic in `src/game/theme.ts`:

```typescript
// Current basic fuzzy matching
const themeSynonyms: Record<string, string[]> = {
  'emotions': ['feelings', 'moods', 'sentiments', 'emotions'],
  'space': ['astronomy', 'cosmos', 'universe', 'celestial', 'space'],
  // ... limited predefined synonyms
};
```

#### **Proposed Solutions** (Cost-Free)

##### **Option A: Enhanced String Similarity (Recommended)**
- **Implementation**: Levenshtein distance + phonetic matching
- **Libraries**: Use built-in JavaScript string methods + soundex algorithm
- **Cost**: $0 - Pure algorithmic approach
- **Accuracy**: ~80-85% for typos and close matches

```typescript
// Example implementation
function fuzzyThemeMatch(guess: string, theme: string): boolean {
  // 1. Exact match
  if (normalizeText(guess) === normalizeText(theme)) return true;
  
  // 2. Levenshtein distance (allow 1-2 character differences)
  if (levenshteinDistance(guess, theme) <= 2) return true;
  
  // 3. Phonetic similarity (soundex)
  if (soundex(guess) === soundex(theme)) return true;
  
  // 4. Partial word matching
  if (guess.includes(theme) || theme.includes(guess)) return true;
  
  // 5. Common abbreviations/plurals
  if (handleCommonVariations(guess, theme)) return true;
  
  return false;
}
```

##### **Option B: Expanded Synonym Dictionary**
- **Implementation**: Comprehensive manual synonym mapping
- **Maintenance**: Crowd-sourced from player feedback
- **Cost**: $0 - Community-driven
- **Accuracy**: ~90% for covered terms

##### **Option C: Local NLP Library (Advanced)**
- **Implementation**: Use compromise.js or similar lightweight NLP
- **Features**: Part-of-speech tagging, stemming, synonym detection
- **Cost**: $0 - Open source library (~50KB)
- **Accuracy**: ~85-90%

#### **Recommended Implementation**
Combine Option A + B: Enhanced string similarity with expanded synonyms, plus a feedback system for players to suggest missing synonyms.

---

## 🎮 Multiple Daily Words Feature

### 3. **More Than One Word Per Day**
**Status**: Design Phase  
**Priority**: Medium  
**Estimated Effort**: 2-3 weeks  
**User Demand**: High

#### **Current Limitation**
Players can only complete one word per day, leading to:
- Limited engagement for active players
- No progression options for skilled players
- Missed monetization opportunities

#### **Proposed Solutions**

##### **Option A: Archive Mode** ⭐ **Recommended**
**Description**: Allow players to play previous words they missed

**Features**:
- Calendar view of past words (last 30-90 days)
- Same scoring/leaderboard rules apply
- Progress tracking separate from "daily" games
- Unlocks after completing current day's word

**Benefits**:
- Immediate implementation possible
- Uses existing word database
- No new content creation needed
- Helps new players catch up

**Technical Implementation**:
```typescript
// New API endpoints needed
GET /api/archive/words?from=2025-01-01&to=2025-07-04
POST /api/archive/play/{wordId}
GET /api/archive/progress/{playerId}

// Database changes
ALTER TABLE game_sessions ADD COLUMN is_archive_game BOOLEAN DEFAULT FALSE;
```

##### **Option B: Difficulty Tiers** 
**Description**: Multiple words per day with increasing difficulty

**Features**:
- Easy/Medium/Hard versions of daily theme
- Unlock higher tiers by completing lower ones
- Separate leaderboards per difficulty
- Bonus points for completing all tiers

**Challenges**:
- Requires 3x content creation
- Complex scoring system
- Potential player confusion

##### **Option C: Bonus Rounds**
**Description**: Additional mini-games after completing daily word

**Features**:
- Speed rounds (30 seconds per guess)
- Reverse mode (given definition, guess word)
- Theme-only mode (no individual clues)
- Multiplier scoring for bonus completion

**Benefits**:
- Reuses existing words
- Optional engagement
- Skill-based progression

##### **Option D: Weekly Challenges**
**Description**: Special multi-day word sequences

**Features**:
- 7-word themed sequences
- Progressive difficulty through the week
- Special rewards for completing full sequence
- Story/narrative connecting the words

#### **Recommended Implementation Plan**

**Phase 1: Archive Mode** (2 weeks)
- Implement calendar interface
- Add archive game sessions
- Create progress tracking
- Test with beta users

**Phase 2: Bonus Rounds** (2 weeks)  
- Add speed mode
- Implement reverse mode
- Create scoring multipliers
- A/B test engagement

**Phase 3: Advanced Features** (Future)
- Difficulty tiers
- Weekly challenges
- Social features (sharing archive progress)

#### **Monetization Considerations** 
- Archive mode: Free for 7 days, premium for older
- Bonus rounds: Free daily attempts, premium for unlimited
- Difficulty tiers: Free easy/medium, premium hard
- **All options maintain free core experience**

---

## 🔧 Technical Considerations

### **Database Schema Changes**
```sql
-- Archive game tracking
ALTER TABLE game_sessions ADD COLUMN game_type VARCHAR(20) DEFAULT 'daily';
-- Values: 'daily', 'archive', 'bonus_speed', 'bonus_reverse'

-- Difficulty tracking
ALTER TABLE words ADD COLUMN difficulty_tier INTEGER DEFAULT 1;
-- 1 = Easy, 2 = Medium, 3 = Hard

-- Archive progress
CREATE TABLE archive_progress (
  player_id TEXT REFERENCES players(id),
  words_completed INTEGER DEFAULT 0,
  last_played_date DATE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### **Performance Impact**
- Archive mode: Minimal (reuses existing queries)
- Bonus rounds: Low (additional game sessions)
- Multiple tiers: Medium (3x database reads)

### **Content Requirements**
- Archive mode: ✅ Uses existing content
- Bonus rounds: ✅ Reuses existing words
- Difficulty tiers: ❌ Requires new content creation

---

## 🎯 Implementation Priority

1. **🔥 Streak Bug Review** - Critical system integrity
2. **🎯 Fuzzy Theme Matching** - Immediate UX improvement  
3. **🎮 Archive Mode** - High engagement, low effort
4. **🏃 Bonus Rounds** - Medium engagement, medium effort
5. **📈 Difficulty Tiers** - High effort, requires content team

---

## 📊 Success Metrics

### **Streak Bug Fix**
- Zero false streak breaks
- Accurate streak calculations across all players
- No performance degradation

### **Fuzzy Theme Matching**
- 30% increase in correct theme guesses
- 50% reduction in "close but wrong" complaints
- Maintain theme challenge level

### **Multiple Daily Words**
- 25% increase in daily active users
- 40% increase in session duration
- 60% increase in games played per user per day

---

## 💡 Additional Feature Ideas

### **Quality of Life Improvements**
- **Hint System**: Progressive clues for struggling players
- **Streak Rewards**: Special badges/recognition for long streaks
- **Social Features**: Share progress, compare with friends
- **Accessibility**: Color-blind support, screen reader optimization

### **Engagement Features**
- **Daily Challenges**: Special scoring conditions
- **Seasonal Events**: Holiday-themed word collections
- **Player Profiles**: Statistics, achievements, history
- **Leaderboard Filters**: Weekly, monthly, all-time views

### **Advanced Features**
- **Custom Word Lists**: Player-created themes
- **Multiplayer Mode**: Real-time competitive play
- **Educational Mode**: Vocabulary learning focus
- **API Access**: Third-party integrations

---

**Last Updated**: July 4, 2025  
**Next Review**: July 18, 2025 