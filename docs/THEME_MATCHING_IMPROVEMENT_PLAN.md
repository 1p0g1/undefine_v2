# Theme Matching Improvement Plan
**Date:** January 2025  
**Issue:** Theme guesses that are synonyms aren't registering as correct answers  
**Current System:** AI semantic similarity with 85% threshold + contextual prompting

---

## 🔍 Current System Analysis

### Architecture
```
User Guess → matchThemeWithFuzzy() → computeThemeSemanticSimilarity() → HuggingFace API
```

### Current Implementation
1. **Exact Match Check** (Free, Instant)
   - Case-insensitive string comparison
   - Returns 100% confidence immediately
   
2. **AI Semantic Similarity** (HuggingFace API, ~$0.0001/request)
   - Model: `sentence-transformers/all-MiniLM-L6-v2`
   - Threshold: **85%** (`THEME_SIMILARITY_THRESHOLD = 0.85`)
   - Contextual Prompting:
     ```javascript
     Guess: "Answer to 'what connects this week's words': {guess}"
     Theme: "Theme that connects words: {theme}"
     ```

### Known Issues
- ✅ Contextual prompting helped (implemented)
- ❌ True synonyms still scoring below 85%
- ❌ Examples from testing:
  - "autological" → "words that describe themselves": **75%** (should be ~90%+)
  - "changing over time" → "words changing meaning over time": **59%** (should be ~80%+)

---

## 🎯 Proposed Solutions (Tiered Approach)

### **Option 1: Enhanced Contextual Prompting** ⭐ RECOMMENDED
**Effort:** Low | **Cost:** $0 | **Impact:** Medium-High

**Changes:**
```typescript
// BEFORE (Current)
const contextualGuess = `Answer to "what connects this week's words": ${guess}`;
const contextualTheme = `Theme that connects words: ${theme}`;

// AFTER (Improved)
const contextualGuess = `Synonym or description: ${guess}`;
const contextualTheme = `Theme or its synonyms: ${theme}`;

// OR Alternative framing:
const contextualGuess = `Related concept: ${guess}`;
const contextualTheme = `Main theme: ${theme}`;
```

**Rationale:**
- Explicitly prime the AI to recognize synonyms
- "Synonym or description" signals to the model that equivalents are valid
- More direct than "what connects words" framing

**Testing Required:**
Run against known synonym pairs:
- "boozing" ↔ "drinking alcohol"
- "legends" ↔ "mythology"  
- "autological" ↔ "words that describe themselves"
- "evolution" ↔ "words changing meaning over time"

---

### **Option 2: Lower Threshold with Confidence Tiers** ⭐ RECOMMENDED
**Effort:** Low | **Cost:** $0 | **Impact:** High

**Changes:**
```typescript
// BEFORE
const THEME_SIMILARITY_THRESHOLD = 0.85; // 85% required for "correct"

// AFTER - Tiered approach
const THEME_THRESHOLDS = {
  PERFECT: 1.0,    // 100% - Gold color
  CORRECT: 0.78,   // 78%+ - Green (was 85%)
  CLOSE: 0.70,     // 70-77% - Orange
  WRONG: 0.0       // <70% - Red
};
```

**Rationale:**
- Current 85% threshold is too strict for synonyms
- Our testing showed valid synonyms scoring 75-82%
- Lowering to 78% captures more true positives while avoiding false positives
- Maintains the confidence tier system (gold/green/orange/red)

**Risk Mitigation:**
- Test against non-synonym pairs to ensure we don't accept wrong answers
- Examples to test: "basketball" vs "baseball" (should be <70%)

---

### **Option 3: Synonym Expansion Layer** 
**Effort:** Medium | **Cost:** $0 | **Impact:** High

**Add a pre-processing step:**
```typescript
async function expandThemeWithSynonyms(theme: string): Promise<string[]> {
  // Use a free synonym API or local thesaurus
  // Examples:
  // - Datamuse API (free, 100k requests/day): https://www.datamuse.com/api/
  // - Local dictionary: node-thesaurus package
  
  const synonyms = await getSynonyms(theme);
  return [theme, ...synonyms];
}

// Then check guess against ALL variations
async function matchThemeWithSynonyms(guess: string, theme: string) {
  const themeVariations = await expandThemeWithSynonyms(theme);
  
  for (const variation of themeVariations) {
    const result = await matchThemeWithFuzzy(guess, variation);
    if (result.isMatch) return result; // Accept if ANY variation matches
  }
  
  return { isMatch: false, confidence: 0, method: 'semantic' };
}
```

**Rationale:**
- Creates a "safety net" for common synonyms
- Checks user's guess against multiple valid answers
- Catches synonyms that AI might miss

**Challenges:**
- Requires external API or local dictionary
- May produce false positives for polysemous words
- Adds latency (multiple API calls)

---

### **Option 4: Multi-Model Ensemble** 
**Effort:** High | **Cost:** Medium | **Impact:** Medium

**Use multiple AI models and average their scores:**
```typescript
const models = [
  'sentence-transformers/all-MiniLM-L6-v2',     // Current (fast, general)
  'sentence-transformers/all-mpnet-base-v2',    // More accurate (tested previously)
  'sentence-transformers/paraphrase-MiniLM-L6-v2' // Paraphrase specialist
];

async function ensembleSemanticMatch(guess: string, theme: string) {
  const results = await Promise.all(
    models.map(model => computeSimilarity(guess, theme, model))
  );
  
  const avgSimilarity = results.reduce((sum, r) => sum + r, 0) / results.length;
  return avgSimilarity;
}
```

**Rationale:**
- Different models have different strengths
- Averaging reduces individual model biases
- Previously tested `paraphrase-MiniLM-L6-v2` performed well

**Challenges:**
- 3x API costs
- 3x latency (unless parallelized)
- Diminishing returns vs. threshold adjustment

---

### **Option 5: Feedback Loop & Manual Override Database**
**Effort:** High | **Cost:** $0 | **Impact:** Long-term

**Create a learning system:**
```sql
-- New table: theme_synonym_overrides
CREATE TABLE theme_synonym_overrides (
  id UUID PRIMARY KEY,
  theme TEXT NOT NULL,
  accepted_synonym TEXT NOT NULL,
  confidence_override INTEGER, -- Force this confidence %
  created_at TIMESTAMPTZ DEFAULT NOW(),
  approved_by TEXT, -- Admin who approved it
  usage_count INTEGER DEFAULT 0
);
```

**Workflow:**
1. Players submit feedback: "My guess '{X}' should match theme '{Y}'"
2. Admin reviews and approves valid synonyms
3. System checks override database before AI
4. Track usage to identify common pain points

**Rationale:**
- Captures real-world usage patterns
- Allows manual curation of edge cases
- Builds institutional knowledge over time

---

## 📊 Recommended Implementation Path

### **Phase 1: Quick Wins** (Implement Immediately)
1. **Enhanced Contextual Prompting** (Option 1)
   - Update prompts to explicitly mention synonyms
   - Test with 10-15 known synonym pairs
   - Deploy to `theme-improvements` branch
   - **ETA:** 1-2 hours

2. **Lower Threshold to 78%** (Option 2)
   - Adjust `THEME_SIMILARITY_THRESHOLD` from 0.85 → 0.78
   - Test against known false positives ("basketball" vs "baseball")
   - Verify gold/green/orange/red tiers still work correctly
   - **ETA:** 30 minutes

### **Phase 2: Enhanced Matching** (If Phase 1 insufficient)
3. **Synonym Expansion Layer** (Option 3)
   - Integrate Datamuse API or local thesaurus
   - Implement caching to reduce API calls
   - Add admin UI to review/approve synonyms
   - **ETA:** 4-6 hours

### **Phase 3: Long-term Optimization** (Future)
4. **Feedback Loop System** (Option 5)
   - Add "Report incorrect match" button
   - Create admin dashboard for review
   - Build synonym override database
   - **ETA:** 8-12 hours (full implementation)

---

## 🧪 Testing Strategy

### Test Cases (Must Pass)
```javascript
// TRUE POSITIVES (should all be ≥78%)
const validSynonyms = [
  { guess: "boozing", theme: "drinking alcohol", expectedMin: 85 },
  { guess: "legends", theme: "mythology", expectedMin: 80 },
  { guess: "autological", theme: "words that describe themselves", expectedMin: 80 },
  { guess: "evolution", theme: "words changing meaning over time", expectedMin: 75 },
  { guess: "fear", theme: "phobias", expectedMin: 85 },
  { guess: "space", theme: "astronomy", expectedMin: 80 },
];

// FALSE POSITIVES (should all be <70%)
const invalidMatches = [
  { guess: "basketball", theme: "baseball", expectedMax: 50 },
  { guess: "guitar", theme: "elephant", expectedMax: 20 },
  { guess: "fruit", theme: "words changing meaning over time", expectedMax: 30 },
  { guess: "changer", theme: "fear", expectedMax: 20 },
];
```

### Metrics to Track
- **True Positive Rate:** % of valid synonyms that match (target: >90%)
- **False Positive Rate:** % of invalid guesses that match (target: <5%)
- **Average Confidence for Synonyms:** (target: 80-90%)
- **Player Satisfaction:** Monitor support requests about theme matching

---

## 💡 Additional Prompt Engineering Ideas

### A. Explicit Synonym Instruction
```typescript
const contextualGuess = `
  User's answer (could be a synonym or paraphrase): "${guess}"
`;
const contextualTheme = `
  Correct answer (accept synonyms and related terms): "${theme}"
`;
```

### B. Question Framing
```typescript
const contextualGuess = `
  Q: What theme connects the words?
  A: ${guess}
`;
const contextualTheme = `
  Correct answer (or any synonym): ${theme}
`;
```

### C. Similarity Boosting
```typescript
// Add "similarity boost" words to both inputs
const contextualGuess = `
  Concept: ${guess} (synonym, equivalent, similar to)
`;
const contextualTheme = `
  Theme: ${theme} (or related terms like: ${guess})
`;
```

---

## 🎯 Success Criteria

### Phase 1 Success (Quick Wins)
- [ ] "autological" → "words that describe themselves" scores ≥80%
- [ ] "changing over time" → "words changing meaning over time" scores ≥75%
- [ ] "boozing" → "drinking alcohol" scores ≥85%
- [ ] "basketball" → "baseball" scores <70% (no false positives)
- [ ] No increase in player complaints about theme matching

### Phase 2 Success (Enhanced Matching)
- [ ] 95% of true synonyms accepted
- [ ] <2% false positive rate
- [ ] Average synonym confidence: 82%+
- [ ] Player satisfaction increase (measured by fewer support tickets)

---

## 🔧 Implementation Notes

### Files to Modify
1. **`src/utils/semanticSimilarity.ts`**
   - Update `computeThemeSemanticSimilarity()` prompts
   - Adjust `THEME_SIMILARITY_THRESHOLD`
   - Add synonym expansion if implementing Option 3

2. **`src/game/theme.ts`**
   - Update `isThemeGuessCorrect()` documentation
   - Add override database check if implementing Option 5

3. **Testing Scripts**
   - Create `scripts/test-theme-synonyms.js` for automated testing
   - Update `scripts/test-contextual-theme-matching.js` with new test cases

### Environment Variables (if using external APIs)
```env
# For Datamuse API (if implementing synonym expansion)
DATAMUSE_API_URL=https://api.datamuse.com/words
DATAMUSE_RATE_LIMIT=100000  # Free tier limit
```

---

## 📝 Rollout Plan

1. **Test in Development**
   - Run automated test suite
   - Manual testing with 20+ synonym pairs
   
2. **Deploy to `theme-improvements` Branch**
   - Monitor preview environment logs
   - Collect 10-20 real user attempts
   
3. **A/B Test (Optional)**
   - 50% users get new threshold
   - 50% users get old threshold
   - Compare satisfaction/completion rates
   
4. **Merge to Main**
   - Full rollout after validation
   - Monitor for 48 hours
   - Prepare rollback plan if issues arise

---

## 🚀 Quick Start (Phase 1 Implementation)

```bash
# 1. Update prompts and threshold
# Edit: src/utils/semanticSimilarity.ts

# 2. Run tests
node scripts/test-theme-synonyms.js

# 3. Deploy to feature branch
git checkout theme-improvements
git add src/utils/semanticSimilarity.ts
git commit -m "feat: improve theme matching for synonyms"
git push origin theme-improvements

# 4. Monitor and validate
# Check console logs for similarity scores
# Test 10+ real theme guesses in preview
```

---

**Last Updated:** January 2025  
**Status:** 🟡 Awaiting Implementation  
**Priority:** 🔥 High (User-facing issue affecting gameplay)



