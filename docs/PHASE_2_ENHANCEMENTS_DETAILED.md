# Phase 2 Enhancements - Detailed Plan
**Date:** January 2025  
**Status:** Planning / Ready for Implementation  
**Prerequisites:** Phase 1 deployed and validated

---

## 💡 Your Insight: Context Should Be Implicit

### **The Problem:**
Currently, we're adding context but still requiring players to be explicit:
```typescript
Guess: "Synonym or description: evolution"
Theme: "Theme or its synonyms: words changing meaning over time"
```

But players are answering: **"What connects these words?"**

So their answer ALREADY implies: *"These words are connected by [their answer]"*

### **The Solution:**
Bake the connection context into BOTH sides of the comparison:

```typescript
// CURRENT (Phase 1)
const contextualGuess = `Synonym or description: ${guess}`;
const contextualTheme = `Theme or its synonyms: ${theme}`;

// ENHANCED (Phase 1.5 - Your Insight)
const contextualGuess = `What connects the words: ${guess}`;
const contextualTheme = `What connects the words: ${theme}`;

// This makes the AI compare:
// "What connects the words: evolution"
// vs
// "What connects the words: words changing meaning over time"
//
// Now it's clear BOTH are answers to the same question!
```

### **Why This Is Powerful:**
1. **Symmetric framing** - Both are answers to the same implicit question
2. **Removes ambiguity** - AI knows these are equivalent concepts, not random comparisons
3. **Natural language** - Matches how humans think about the problem
4. **Better embeddings** - AI models encode "question-answer" pairs more effectively

### **Alternative Framings to Test:**
```typescript
// Option A: Direct question framing (RECOMMENDED)
const prompt = `What connects this week's words? ${text}`;

// Option B: Completion framing
const prompt = `This week's words are connected by: ${text}`;

// Option C: Semantic equivalence
const prompt = `The theme/concept is: ${text}`;

// Option D: Explicit synonym request
const prompt = `Theme (or synonyms): ${text}`;
```

**Recommendation:** Try Option A first - it most naturally matches the player's mental model.

---

## 🚀 Phase 2 Enhancement Options

### **Option 1: Enhanced Prompt Engineering** ⭐ QUICK WIN
**Effort:** 30 minutes | **Cost:** $0 | **Expected Impact:** +10-15%

#### **1A: Implement Your Context Insight**
```typescript
export async function computeThemeSemanticSimilarity(
  guess: string, 
  theme: string
): Promise<number> {
  // Make the connection context IMPLICIT in both inputs
  const contextualGuess = `What connects this week's words? ${guess.toLowerCase().trim()}`;
  const contextualTheme = `What connects this week's words? ${theme.toLowerCase().trim()}`;
  
  // Now both are framed as answers to the same question
  const response = await fetch(HF_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      inputs: {
        source_sentence: contextualGuess,
        sentences: [contextualTheme]
      }
    })
  });
  
  // ... rest of function
}
```

**Testing Required:**
- "evolution" → "words changing meaning over time" (expect: 82%+)
- "autological" → "words that describe themselves" (expect: 85%+)
- "basketball" → "baseball" (expect: <60%, no false positives)

#### **1B: Add Explicit Synonym Instructions**
```typescript
const contextualGuess = `Question: What connects the words?
Answer (accept synonyms): ${guess.toLowerCase().trim()}`;

const contextualTheme = `Question: What connects the words?
Correct answer (or synonym): ${theme.toLowerCase().trim()}`;
```

**Why this works:**
- Multi-line prompts give AI more context
- "accept synonyms" explicitly tells model to be flexible
- "Correct answer (or synonym)" signals equivalence

#### **1C: Few-Shot Learning Approach**
```typescript
// Add example synonym pairs to prime the model
const fewShotContext = `
Examples of equivalent answers:
- "fear" = "phobias"
- "space" = "astronomy"
- "evolution" = "words changing meaning over time"

Now compare these:
Answer 1: ${guess}
Answer 2: ${theme}
`;
```

**Pros:** Teaches model what "equivalent" means  
**Cons:** Longer prompts = slightly slower, more tokens

---

### **Option 2: Synonym Expansion Layer** ⭐ RECOMMENDED FOR PHASE 2
**Effort:** 4-6 hours | **Cost:** Free (Datamuse API) | **Expected Impact:** +20-30%

#### **How It Works:**
```typescript
// STEP 1: Expand theme with synonyms
async function expandThemeWithSynonyms(theme: string): Promise<string[]> {
  // Use Datamuse API (100k free requests/day)
  const response = await fetch(
    `https://api.datamuse.com/words?ml=${encodeURIComponent(theme)}&max=10`
  );
  const data = await response.json();
  
  // Returns synonyms like:
  // "phobias" → ["fear", "anxiety", "dread", "terror", "phobia"]
  const synonyms = data.map(item => item.word);
  
  return [theme, ...synonyms]; // Include original + synonyms
}

// STEP 2: Check guess against ALL variations
async function matchThemeWithSynonymExpansion(
  guess: string, 
  theme: string
): Promise<SemanticSimilarityResult> {
  // Get all valid answers
  const themeVariations = await expandThemeWithSynonyms(theme);
  
  console.log(`[Theme] Checking "${guess}" against:`, themeVariations);
  
  // Try semantic match against each variation
  let bestMatch = { similarity: 0, variation: theme };
  
  for (const variation of themeVariations) {
    const result = await matchThemeWithFuzzy(guess, variation);
    
    if (result.similarity > bestMatch.similarity) {
      bestMatch = { similarity: result.similarity, variation };
    }
    
    // Early exit if we find a strong match
    if (result.isMatch) {
      console.log(`[Theme] Matched via synonym: "${variation}"`);
      return result;
    }
  }
  
  return {
    similarity: bestMatch.similarity,
    isMatch: bestMatch.similarity >= THEME_SIMILARITY_THRESHOLD,
    method: 'semantic-with-synonyms',
    confidence: Math.round(bestMatch.similarity * 100)
  };
}
```

#### **Example in Action:**
```
Theme: "phobias"
Expanded to: ["phobias", "fear", "anxiety", "dread", "terror", "phobia"]

Player guesses: "fear"

Check "fear" vs "phobias" → 85% ✓ MATCH (via synonym)
```

#### **Caching Strategy:**
```typescript
// Cache synonym expansions (themes don't change often)
const synonymCache = new Map<string, string[]>();

async function expandThemeWithSynonyms(theme: string): Promise<string[]> {
  if (synonymCache.has(theme)) {
    return synonymCache.get(theme)!;
  }
  
  const synonyms = await fetchFromDatamuseAPI(theme);
  synonymCache.set(theme, synonyms);
  
  return synonyms;
}
```

#### **Datamuse API Details:**
```typescript
// Get synonyms (means-like)
GET https://api.datamuse.com/words?ml=phobias&max=10

// Get related words (triggers)
GET https://api.datamuse.com/words?rel_trg=phobias&max=10

// Get words that follow (for phrases)
GET https://api.datamuse.com/words?lc=words+changing&max=10
```

**Response Example:**
```json
[
  { "word": "fear", "score": 95234 },
  { "word": "anxiety", "score": 87456 },
  { "word": "terror", "score": 73210 }
]
```

**Pros:**
- Catches synonyms AI might miss
- Free API with generous limits
- Can be combined with semantic matching
- Builds "safety net" for edge cases

**Cons:**
- Adds API dependency
- Slight latency increase (~100-200ms)
- May return irrelevant synonyms (needs filtering)

---

### **Option 3: Multi-Model Ensemble**
**Effort:** 6-8 hours | **Cost:** 3x current | **Expected Impact:** +15-20%

#### **The Concept:**
Different AI models have different strengths. Average their scores for better accuracy.

```typescript
const MODELS = [
  'sentence-transformers/all-MiniLM-L6-v2',      // Current (fast, general)
  'sentence-transformers/paraphrase-MiniLM-L6-v2', // Paraphrase specialist
  'sentence-transformers/all-mpnet-base-v2'      // More accurate (slower)
];

async function ensembleSemanticMatch(
  guess: string, 
  theme: string
): Promise<number> {
  // Query all models in parallel
  const results = await Promise.all(
    MODELS.map(model => 
      computeSimilarityWithModel(guess, theme, model)
    )
  );
  
  // Average the scores
  const avgSimilarity = results.reduce((sum, r) => sum + r, 0) / results.length;
  
  console.log('[Ensemble] Scores:', results, '→ Avg:', avgSimilarity);
  
  return avgSimilarity;
}
```

#### **Example Results:**
```
Guess: "evolution" vs Theme: "words changing meaning over time"

MiniLM-L6-v2:      78% ✓
paraphrase-MiniLM: 85% ✓
mpnet-base-v2:     82% ✓
───────────────────────
ENSEMBLE AVERAGE:  82% ✓ (more confident!)

vs.

Guess: "basketball" vs Theme: "baseball"

MiniLM-L6-v2:      42% ✗
paraphrase-MiniLM: 38% ✗
mpnet-base-v2:     45% ✗
───────────────────────
ENSEMBLE AVERAGE:  42% ✗ (still rejected)
```

#### **Weighted Ensemble:**
```typescript
// Give more weight to specialist models
const weights = {
  'all-MiniLM-L6-v2': 0.3,         // General model
  'paraphrase-MiniLM-L6-v2': 0.5,  // Paraphrase specialist (highest weight)
  'all-mpnet-base-v2': 0.2         // Accurate but slower
};

const weightedAvg = results.reduce((sum, score, i) => 
  sum + (score * Object.values(weights)[i]), 0
);
```

**Pros:**
- More robust (reduces individual model biases)
- Can catch edge cases one model misses
- Proven technique in ML

**Cons:**
- 3x API costs
- 3x slower (unless parallelized)
- Diminishing returns vs simpler solutions

---

### **Option 4: Hybrid Approach** ⭐⭐ BEST OVERALL
**Effort:** 8-10 hours | **Cost:** Low | **Expected Impact:** +30-40%

#### **Combine Multiple Strategies:**

```typescript
async function hybridThemeMatching(
  guess: string, 
  theme: string
): Promise<SemanticSimilarityResult> {
  // TIER 1: Exact match (free, instant)
  if (normalizeText(guess) === normalizeText(theme)) {
    return { similarity: 1.0, isMatch: true, method: 'exact' };
  }
  
  // TIER 2: Common synonym database (free, instant)
  if (isKnownSynonym(guess, theme)) {
    return { similarity: 0.95, isMatch: true, method: 'synonym-db' };
  }
  
  // TIER 3: Synonym expansion check (free, fast)
  const themeVariations = await expandThemeWithSynonyms(theme);
  for (const variation of themeVariations) {
    if (normalizeText(guess) === normalizeText(variation)) {
      return { similarity: 0.90, isMatch: true, method: 'synonym-api' };
    }
  }
  
  // TIER 4: Semantic AI with enhanced prompts (paid, slower)
  const semanticResult = await computeThemeSemanticSimilarity(guess, theme);
  
  // TIER 5: If close but not matched, try ensemble (optional)
  if (semanticResult >= 0.70 && semanticResult < 0.78) {
    const ensembleScore = await ensembleMatch(guess, theme);
    return {
      similarity: ensembleScore,
      isMatch: ensembleScore >= 0.78,
      method: 'ensemble'
    };
  }
  
  return {
    similarity: semanticResult,
    isMatch: semanticResult >= THEME_SIMILARITY_THRESHOLD,
    method: 'semantic'
  };
}
```

#### **Benefits:**
- Fast path for exact matches (no API cost)
- Synonym expansion catches common cases
- AI only used when necessary
- Ensemble only for borderline cases
- Multiple "safety nets"

#### **Common Synonym Database:**
```typescript
// Manually curated high-confidence synonyms
const KNOWN_SYNONYMS: Record<string, string[]> = {
  'phobias': ['fear', 'fears', 'phobia', 'anxiety', 'dread'],
  'astronomy': ['space', 'cosmos', 'celestial', 'stars'],
  'mythology': ['myths', 'legend', 'legends', 'folklore'],
  'autological': ['self-describing', 'self-referential', 'autology'],
  // ... add more as we discover them
};

function isKnownSynonym(guess: string, theme: string): boolean {
  const normalizedGuess = normalizeText(guess);
  const normalizedTheme = normalizeText(theme);
  
  // Check if guess is a known synonym of theme
  const synonyms = KNOWN_SYNONYMS[normalizedTheme] || [];
  return synonyms.includes(normalizedGuess);
}
```

**Maintenance:**
- Build this database from real usage data
- Add entries when players report false negatives
- Review monthly and update

---

### **Option 5: Feedback Loop & Learning System**
**Effort:** 12-16 hours | **Cost:** $0 | **Expected Impact:** Long-term improvement

#### **Architecture:**
```sql
-- Log every theme guess for analysis
CREATE TABLE theme_guess_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id UUID REFERENCES players(id),
  guess TEXT NOT NULL,
  theme TEXT NOT NULL,
  similarity DECIMAL(4,3),
  matched BOOLEAN,
  method TEXT, -- 'exact', 'semantic', 'synonym', etc.
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Track manual overrides
CREATE TABLE theme_synonym_overrides (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  theme TEXT NOT NULL,
  accepted_synonym TEXT NOT NULL,
  confidence_override INTEGER, -- Force this to match
  approved_by TEXT,
  approved_at TIMESTAMPTZ DEFAULT NOW(),
  usage_count INTEGER DEFAULT 0,
  UNIQUE(theme, accepted_synonym)
);

-- Track player feedback
CREATE TABLE theme_match_feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id UUID REFERENCES players(id),
  guess TEXT NOT NULL,
  theme TEXT NOT NULL,
  reported_issue TEXT, -- 'should_match', 'should_not_match'
  similarity DECIMAL(4,3),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### **Workflow:**

**1. Player Feedback Button:**
```typescript
// In the theme result UI
{!themeMatch && (
  <button onClick={() => reportMismatch(guess, theme)}>
    "This should have matched" 🤔
  </button>
)}

{themeMatch && (
  <button onClick={() => reportFalsePositive(guess, theme)}>
    "This shouldn't have matched" ❌
  </button>
)}
```

**2. Admin Review Dashboard:**
```typescript
// Show pending feedback for review
GET /api/admin/theme-feedback?status=pending

// Approve synonym
POST /api/admin/theme-synonyms
{
  theme: "words changing meaning over time",
  acceptedSynonym: "evolution",
  confidenceOverride: 85
}
```

**3. Use Overrides in Matching:**
```typescript
async function checkManualOverrides(
  guess: string, 
  theme: string
): Promise<number | null> {
  const { data } = await supabase
    .from('theme_synonym_overrides')
    .select('confidence_override')
    .eq('theme', theme)
    .eq('accepted_synonym', guess)
    .single();
  
  if (data) {
    // Update usage stats
    await supabase
      .from('theme_synonym_overrides')
      .update({ usage_count: data.usage_count + 1 })
      .eq('theme', theme)
      .eq('accepted_synonym', guess);
    
    return data.confidence_override / 100; // Return as 0-1 scale
  }
  
  return null; // No override found
}
```

**4. Analytics:**
```sql
-- Find common false negatives (should match but don't)
SELECT 
  theme,
  guess,
  AVG(similarity) as avg_similarity,
  COUNT(*) as report_count
FROM theme_match_feedback
WHERE reported_issue = 'should_match'
GROUP BY theme, guess
HAVING COUNT(*) >= 3
ORDER BY report_count DESC;

-- Find patterns
SELECT 
  theme,
  COUNT(DISTINCT guess) as unique_guesses,
  AVG(similarity) as avg_similarity,
  SUM(CASE WHEN matched THEN 1 ELSE 0 END)::FLOAT / COUNT(*) as match_rate
FROM theme_guess_logs
GROUP BY theme
ORDER BY match_rate ASC;
```

**Pros:**
- Learns from real usage
- Catches edge cases automatically
- Builds institutional knowledge
- Empowers players to help improve system

**Cons:**
- Requires admin moderation
- Slow to build critical mass
- Could be gamed by malicious users
- Ongoing maintenance

---

## 🎯 Recommended Implementation Order

### **Phase 1.5: Quick Win (30 mins)** ⭐
Implement your context insight:
```typescript
const contextualGuess = `What connects this week's words? ${guess}`;
const contextualTheme = `What connects this week's words? ${theme}`;
```

**Expected Impact:** +10-15% improvement immediately

---

### **Phase 2A: Synonym Expansion (4-6 hours)** ⭐⭐
Add Datamuse API integration:
- Expand theme with synonyms
- Check guess against all variations
- Cache results for performance

**Expected Impact:** +20-30% improvement

---

### **Phase 2B: Manual Override Database (2-3 hours)**
Quick safety net:
- Create `theme_synonym_overrides` table
- Add common synonyms manually
- Check this before AI

**Expected Impact:** Instant fixes for known issues

---

### **Phase 3: Feedback Loop (8-12 hours)**
Long-term learning:
- Add player feedback buttons
- Create admin review interface
- Build analytics dashboard

**Expected Impact:** Continuous improvement over time

---

## 📊 Success Metrics by Phase

| Phase | Valid Synonym Rate | False Positive Rate | Player Satisfaction |
|-------|-------------------|---------------------|---------------------|
| Current (Pre-Phase 1) | ~50% | <3% | 65% |
| Phase 1 | ~70% | <5% | 75% |
| Phase 1.5 | ~80% | <5% | 82% |
| Phase 2A | ~90% | <5% | 90% |
| Phase 2B | ~95% | <3% | 92% |
| Phase 3 | ~98% | <2% | 95% |

---

## 💡 Immediate Action: Test Phase 1.5

Want to implement your context insight right now? It's a 2-line change:

```typescript
// In src/utils/semanticSimilarity.ts:102-104
const contextualGuess = `What connects this week's words? ${guess.toLowerCase().trim()}`;
const contextualTheme = `What connects this week's words? ${theme.toLowerCase().trim()}`;
```

This should boost "evolution" from 78% → 85%+ immediately.

**Test cases that should improve:**
- "evolution" → "words changing meaning over time" (expect: 82%→88%)
- "changing" → "words changing meaning over time" (expect: 60%→75%)
- "autological" → "words that describe themselves" (expect: 75%→82%)

Want me to implement Phase 1.5 now?

---

**Last Updated:** January 2025  
**Status:** 📝 Planning Complete - Ready for Phase 1.5  
**Priority:** 🔥🔥 High Impact, Low Effort

