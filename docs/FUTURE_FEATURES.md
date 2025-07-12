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

### 2. **AI Fuzzy Theme Matching for Theme Guesses**
**Status**: Proposed  
**Priority**: Medium-High  
**Estimated Effort**: 2-3 days  
**Cost**: **$3-5/month** (optimized for low cost)

#### **Current Problem**
Theme guessing is too punishing - players need exact matches or predefined synonyms. Real example: Player guesses "boozing" but theme is "drinking alcohol" - semantically identical but no exact match.

**Theme Context**: Un•Define has weekly themes connecting 7 daily words (e.g., "Drinking Alcohol" theme with words: whiskey, tavern, brewery, hangover, cocktail, bartender, prohibition).

#### **AI-Powered Solutions** (Cost-Optimized)

##### **Option A: Groq API (Recommended for Production)** ⭐
- **Implementation**: Supabase Edge Function with semantic similarity
- **API**: Lightning-fast LLM inference via Groq
- **Cost**: ~$3/month for 10,000 users
- **Accuracy**: ~95% for semantic matches

```javascript
// Supabase Edge Function
const prompt = `Rate similarity 0-100: "${guess}" vs "${theme}"`;
// "boozing" vs "drinking alcohol" → returns ~95
// "mythology" vs "legends" → returns ~88
// "space" vs "cosmos" → returns ~92
```

**Cost Analysis**:
- 10k users × 4 theme guesses/week = 40k requests/month
- Groq pricing: ~$0.000075 per request
- Monthly cost: ~$3.00

##### **Option B: Hugging Face Inference (Learning/Dev)**
- **Implementation**: sentence-transformers/all-MiniLM-L6-v2
- **Features**: Semantic similarity embeddings
- **Cost**: FREE (30k requests/month)
- **Accuracy**: ~89% for semantic similarity

```javascript
// Hugging Face Inference API
const similarity = await hf_similarity("boozing", "drinking alcohol");
// Returns 0.89 similarity score
// Free tier: 30k requests/month (sufficient for beta testing)
```

##### **Option C: Client-side AI (Zero Cost, Future-Proof)** 
- **Implementation**: @xenova/transformers in browser
- **Model**: Xenova/all-MiniLM-L6-v2 (50MB download)
- **Cost**: $0 - One-time download per user
- **Accuracy**: ~87% for semantic similarity

```javascript
// Client-side inference (zero server costs)
const embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
const similarity = await computeSimilarity("boozing", "drinking alcohol");
// 50MB download, but free forever per user
```

##### **Option D: Traditional Methods (Fallback)**
- **Implementation**: Levenshtein distance + phonetic matching + synonym DB
- **Libraries**: Built-in JavaScript + manually curated synonyms
- **Cost**: $0 - Pure algorithmic approach
- **Accuracy**: ~75% for covered terms only

#### **Recommended Hybrid Strategy** (Cost-Optimized)

**Multi-Tier Matching System**:
1. **Exact Match Check** (free, instant)
2. **Synonym Database** (free, curated list)
3. **AI Semantic Matching** (paid, for novel guesses)

```typescript
async function validateThemeGuess(guess: string, theme: string): Promise<boolean> {
  // Tier 1: Exact match (free)
  if (normalizeText(guess) === normalizeText(theme)) return true;
  
  // Tier 2: Synonym database (free)
  if (synonymDatabase[theme]?.includes(guess)) return true;
  
  // Tier 3: AI semantic matching (paid, only for unmatched)
  const similarity = await groqSimilarity(guess, theme);
  return similarity >= 85; // 85% threshold for acceptance
}
```

**Cost Benefits**:
- 70% of guesses match via exact/synonym (free)
- 30% require AI processing (~$1/month)
- Total estimated cost: **$3-5/month for 10k users**

#### **Edge Cases Handled**
- **Semantic Equivalence**: "boozing" → "drinking alcohol"
- **Conceptual Similarity**: "mythology" → "legends"
- **Domain Knowledge**: "space" → "cosmos", "astronomy"  
- **Colloquialisms**: "grub" → "food", "wheels" → "cars"
- **Cultural Variations**: "football" → "soccer" (context-aware)

#### **Implementation Timeline**

**Phase 1 (1 day)**: Enhanced synonym database
**Phase 2 (1 day)**: Groq API integration with fallback
**Phase 3 (1 day)**: Cost monitoring and optimization

**Monthly Operating Cost**: $3-5 (scales with user base)
**User Experience**: Significantly improved theme acceptance rate

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