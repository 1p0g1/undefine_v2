# Theme Scoring Improvement Roadmap

## Theme Scoring Architecture

### What is the Weekly Theme Guess?

Un·Define presents a daily word puzzle. Each week, the 7 daily words share a common theme (e.g., "Words that are both nouns and verbs"). Players can attempt to guess the theme once they've solved a daily word. The theme guess is scored using AI-powered semantic similarity to determine how closely the player's guess matches the actual theme.

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        THEME SCORING MODULE                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────┐                                                   │
│  │ User Input  │ ← Theme + Guess (RAW)                             │
│  └──────┬──────┘                                                   │
│         │                                                          │
│         ▼                                                          │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │           INPUT PREPARATION (prepareThemeScoringInputs)     │   │
│  │   • RAW: theme + guess (unchanged)                          │   │
│  │   • PROCESSED: templates applied + optional weekly words    │   │
│  │   • NLI: premise/hypothesis formatted                       │   │
│  └──────────────────────────┬──────────────────────────────────┘   │
│                             │                                       │
│         ┌───────────────────┼───────────────────┐                   │
│         ▼                   ▼                   ▼                   │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────────┐        │
│  │   SIGNALS    │   │   SIGNALS    │   │     SIGNALS      │        │
│  │   (RAW)      │   │ (PROCESSED)  │   │      (NLI)       │        │
│  ├──────────────┤   ├──────────────┤   ├──────────────────┤        │
│  │ • Keywords   │   │ • Embedding  │   │ • Bidirectional  │        │
│  │ • Negation   │   │ • Paraphrase │   │   Entailment     │        │
│  │ • Specificity│   │              │   │ • Contradiction  │        │
│  └──────┬───────┘   └──────┬───────┘   └────────┬─────────┘        │
│         │                  │                    │                   │
│         └──────────────────┼────────────────────┘                   │
│                            ▼                                        │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                   POLICY (Hybrid Decision)                  │   │
│  │   • Contradiction override (fail if NLI says contradiction) │   │
│  │   • Strong entailment gate (pass if high NLI + embedding)   │   │
│  │   • Keyword mismatch penalty                                │   │
│  │   • Negation/qualifier mismatch penalty                     │   │
│  │   • Triviality gating (short + low keyword = penalty)       │   │
│  │   • Final weighted score                                    │   │
│  └──────────────────────────┬──────────────────────────────────┘   │
│                             ▼                                       │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │              RESULT (isMatch, score, details)               │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Why RAW vs PROCESSED Inputs?

| Input Type | Used For | Why |
|------------|----------|-----|
| **RAW** | Keyword overlap, negation detection, specificity | Templates would pollute keyword signals (e.g., "connecting these words" adds noise) |
| **PROCESSED** | Embedding similarity, paraphrase similarity | Templates add context that improves semantic matching |
| **NLI** | Entailment/contradiction detection | Uses specific premise/hypothesis formatting for MNLI models |

### How to Interpret Admin Lab Debug Outputs

| Section | What It Shows | What to Look For |
|---------|---------------|------------------|
| **Embedding Score** | Cosine similarity (0-1) | >0.78 = strong semantic match |
| **NLI Scores** | Forward/reverse entailment, contradiction, neutral | High entailment (>0.7) = logically implies. High contradiction (>0.8) = auto-fail |
| **Keyword Analysis** | Extracted keywords, matched keywords, overlap % | <50% overlap + high embedding = suspicious false positive |
| **Negation/Qualifier** | Detected patterns in theme vs guess | Mismatch = 60% penalty applied |
| **Specificity** | Content token counts, triviality flag | Short guess + trivial + low overlap = penalized |

---

## Current Stack Analysis

| Component | Role | Notes |
|-----------|------|-------|
| **Embedding model** (`sentence-transformers/all-MiniLM-L6-v2`) | Produces 384-dimensional sentence embeddings, computes cosine similarity | Fast (~100ms), inexpensive. Good for general semantic similarity. |
| **Paraphrase model** (`sentence-transformers/paraphrase-MiniLM-L6-v2`) | Same architecture but fine-tuned on paraphrase data | Better for equivalence detection. Available in Admin Lab. |
| **NLI model** (`valhalla/distilbart-mnli-12-1`) | True 3-way MNLI classification (entailment/neutral/contradiction) | Bidirectional equivalence scoring. Smaller/faster than bart-large-mnli. |
| **NLI fallback** (`facebook/bart-large-mnli`) | Original BART MNLI model | Available as selectable option in Admin Lab. |
| **Scoring logic** | Signals → Policy architecture with config-driven thresholds | Centralized in `THEME_SCORING_CONFIG.ts` |

---

## Implementation Status Summary

### ✅ COMPLETED (Phase 1 & 2)

| Feature | Status | Location |
|---------|--------|----------|
| Remove NLI from default production | ✅ Done | `semanticSimilarity.ts` uses embedding only |
| Keyword overlap checking | ✅ Done | `themeScoring.ts` |
| Length-based penalty | ✅ Replaced | Now "triviality-gated specificity" |
| Threshold tuning | ✅ Done | Centralized in config |
| Admin lab for testing | ✅ Done | `ThemeTestTool.tsx` |
| **True 3-way NLI** | ✅ Done | `computeNLITriplet`, `computeNLIBidirectional` |
| **Raw vs Processed split** | ✅ Done | `prepareThemeScoringInputs` helper |
| **Centralized config** | ✅ Done | `themeScoringConfig.ts` |
| **Network hardening** | ✅ Done | `fetchWithRetry` with bounded retries |
| **Weighted keyword matching** | ✅ Done | exact=1.0, stem=0.9, synonym=0.6, substring=0.3 |
| **Negation with regex** | ✅ Done | Word boundaries `\bnot\b` etc |
| **Triviality-gated specificity** | ✅ Done | Only penalizes trivial + low-overlap guesses |
| **Signals + Policy refactor** | ✅ Done | Clear separation in `testThemeScoring` |
| **Synonym dictionary** | ✅ Done | Tightened synonyms in config |

### ⏳ TODO (Phase 2 Remaining & Phase 3)

| Feature | Status | Notes |
|---------|--------|-------|
| Test paraphrase model in production | ⏳ Ready | Available, needs A/B testing |
| Theme-specific property extraction | ⏳ TODO | Parse "both X and Y" patterns |
| Labeled dataset collection | ⏳ TODO | Target: 50-100 pairs |
| Custom model training | ⏳ Future | Only if accuracy still insufficient |

---

## Phase 1 – Quick Wins ✅ COMPLETED

### 1.1 Remove NLI from Production
**Status: ✅ Done**

Production uses `embeddingOnly` method by default. NLI kept only for admin testing/analysis.

### 1.2 Keyword Overlap Check
**Status: ✅ Done (with improvements)**

Now uses weighted matching:
- **Exact match**: 1.0 weight
- **Stem match**: 0.9 weight (e.g., "group" ↔ "groups")
- **Synonym match**: 0.6 weight (e.g., "group" ↔ "collective")
- **Substring match**: 0.3 weight (e.g., "animal" in "animals")

**Implementation** (`themeScoring.ts`):
```typescript
const { matchingWeights } = cfg.keywords;
// weights: { exact: 1.0, stem: 0.9, synonym: 0.6, substring: 0.3 }

// Scoring logic:
let score = 0;
if (exactMatch) score = matchingWeights.exact;
else if (stemMatch) score = matchingWeights.stem;
else if (synonymMatch) score = matchingWeights.synonym;
else if (substringMatch) score = matchingWeights.substring;
```

### 1.3 Triviality-Gated Specificity (Replaced Length Penalty)
**Status: ✅ Done**

Old approach: Penalize short guesses based on word count ratio.

New approach: Only penalize if guess is:
1. **Trivial** (≤2 content tokens after removing stop words), AND
2. **Missing key concepts** (keyword overlap < 50%)

```typescript
function computeSpecificityAdjustment(rawTheme, rawGuess, cfg, keywordOverlap) {
  const guessContentTokens = countContentTokens(rawGuess);
  const isTrivial = guessContentTokens <= cfg.specificity.trivialGuessMaxContentTokens;
  
  // Only penalize trivial guesses that miss keywords
  if (isTrivial && keywordOverlap < cfg.specificity.applyPenaltyOnlyIfOverlapBelow) {
    return { penalty: cfg.specificity.maxPenalty, reason: "Trivial guess missing key concepts" };
  }
  return { penalty: 0 };
}
```

### 1.4 Threshold Tuning
**Status: ✅ Done**

All thresholds centralized in `themeScoringConfig.ts`:
```typescript
thresholds: {
  embedding: 0.78,
  paraphrase: 0.78,
  nliEntailmentMin: 0.75,
  nliContradictionMax: 0.25,
  hybridFinalMin: 0.65,
}
```

---

## Phase 2 – Medium-Term Improvements

### 2.1 Paraphrase-Specific Embedding Model
**Status: ✅ Available for testing**

`paraphrase-MiniLM-L6-v2` available in Admin Lab. Same cost/latency as standard model.

### 2.2 Negation and Qualifier Detection
**Status: ✅ IMPLEMENTED**

Uses regex word boundaries for accurate detection:

```typescript
negation: {
  negationRegexes: [
    '\\bnot\\b', '\\bwithout\\b', '\\bnever\\b', '\\bno\\b', 
    '\\bnone\\b', '\\bneither\\b', '\\bnor\\b', '\\bnon-'
  ],
  qualifierRegexes: [
    '\\bbegin(?:s|ning)?\\s+with\\b', '\\bstart(?:s|ing)?\\s+with\\b',
    '\\bcontain(?:s|ing)?\\s+the\\s+letter\\b', '\\bend(?:s|ing)?\\s+(?:in|with)\\b',
    '\\brhyme(?:s)?\\s+with\\b', '\\bsound(?:s)?\\s+like\\b'
  ],
}
```

**Policy**: 60% penalty if theme has negation/qualifier but guess doesn't (or vice versa).

### 2.3 Theme-Specific Keyword Extraction
**Status: ⏳ TODO**

For property-based themes (e.g., "Words that are both nouns and verbs"), parse to identify required properties.

### 2.4 Synonym Dictionary
**Status: ✅ IMPLEMENTED**

Tightened synonym groups to reduce false positives:

```typescript
synonymMap: {
  'group': ['plural', 'collective', 'collection', 'set', 'bunch'],
  'plural': ['group', 'collective', 'multiple'],
  'animal': ['creature', 'beast', 'fauna'],
  'noun': ['substantive', 'naming'],
  'verb': ['action', 'doing'],
  'dual': ['both', 'double', 'two', 'multiple'],
  // ... etc
}
```

Removed overly broad synonyms (e.g., "wildlife" removed from "animal" synonyms).

### 2.5 Labeled Dataset Collection
**Status: ⏳ TODO**

Target: 50-100 pairs minimum for validation and future fine-tuning.

---

## True 3-Way NLI Implementation ✅ COMPLETED

### Model Choice

| Model | Role | Notes |
|-------|------|-------|
| `valhalla/distilbart-mnli-12-1` | **Default** | Smaller, faster MNLI model |
| `facebook/bart-large-mnli` | **Fallback** | Original, selectable in Admin Lab |

### API Call Structure

Uses proper `text + text_pair` format for MNLI sequence classification:

```typescript
const response = await fetchWithRetry(
  `${HF_API_BASE}/${model}`,
  {
    inputs: {
      text: premise,      // "The theme connecting these words is: {theme}"
      text_pair: hypothesis  // "The theme connecting these words is: {guess}"
    }
  },
  networkConfig,
  model
);
```

### Robust Label Mapping

Handles both explicit labels and LABEL_N format:

```typescript
function mapNLILabel(label: string): 'entailment' | 'neutral' | 'contradiction' {
  const upper = label.toUpperCase();
  if (upper.includes('ENTAIL') || upper === 'LABEL_2') return 'entailment';
  if (upper.includes('CONTRA') || upper === 'LABEL_0') return 'contradiction';
  return 'neutral';
}
```

### Bidirectional Equivalence

For semantic equivalence (not just one-way entailment), scores both directions:

```typescript
async function computeNLIBidirectional(themeProcessed, guessProcessed, cfg) {
  const forward = await computeNLITriplet(themeProcessed, guessProcessed, model);
  const reverse = await computeNLITriplet(guessProcessed, themeProcessed, model);
  
  return {
    entailment: (forward.entailment + reverse.entailment) / 2,
    contradiction: Math.max(forward.contradiction, reverse.contradiction),
    neutral: (forward.neutral + reverse.neutral) / 2,
    forwardDetail: forward,
    reverseDetail: reverse
  };
}
```

---

## Network Hardening ✅ COMPLETED

### fetchWithRetry Implementation

Bounded loop retry with exponential backoff + jitter + timeout:

```typescript
async function fetchWithRetry(url, payload, cfg, modelName) {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < cfg.maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), cfg.timeoutMs);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      
      clearTimeout(timeout);
      
      if (response.ok) return await response.json();
      
      if (cfg.retryOnStatuses.includes(response.status)) {
        // Exponential backoff with jitter
        const delay = Math.min(
          cfg.baseDelayMs * Math.pow(2, attempt) + Math.random() * cfg.jitterMs,
          cfg.maxDelayMs
        );
        await sleep(delay);
        continue;
      }
      
      throw new Error(`HTTP ${response.status}`);
    } catch (err) {
      lastError = err;
      if (attempt === cfg.maxRetries - 1) throw lastError;
    }
  }
  throw lastError;
}
```

### Configuration

```typescript
network: {
  timeoutMs: 5000,
  maxRetries: 3,
  baseDelayMs: 500,
  maxDelayMs: 3000,
  jitterMs: 200,
  retryOnStatuses: [502, 503, 504],
}
```

---

## Signals + Policy Architecture ✅ COMPLETED

### Signal Computation (Independent)

```typescript
// RAW signals (no template pollution)
const keywordResult = computeKeywordOverlap(raw.theme, raw.guess, cfg);
const negationResult = detectNegationOrQualifier(raw.theme, raw.guess, cfg);
const specificityResult = computeSpecificityAdjustment(raw.theme, raw.guess, cfg, keywordResult.overlap);

// PROCESSED signals (templates add context)
const embeddingScore = await computeEmbeddingSimilarity(processed.guess, processed.theme, cfg);
const paraphraseScore = await computeParaphraseSimilarity(processed.guess, processed.theme, cfg);

// NLI signals (premise/hypothesis format)
const nliResult = await computeNLIBidirectional(nli.premise, nli.hypothesis, cfg);
```

### Policy Application (Config-Driven)

```typescript
// 1. Contradiction override - auto-fail
if (nliResult.contradiction >= cfg.policy.contradictionOverride) {
  return { isMatch: false, reason: "NLI contradiction override" };
}

// 2. Strong entailment gate - auto-pass
if (nliResult.entailment >= cfg.policy.strongEntailmentMin && 
    embeddingScore >= cfg.policy.embeddingMinForStrongEntailment &&
    keywordResult.overlap >= cfg.policy.keywordMinForStrongEntailment) {
  return { isMatch: true, reason: "Strong entailment with supporting signals" };
}

// 3. Apply penalties
let score = embeddingScore * cfg.weights.embeddingWeight + 
            nliResult.entailment * cfg.weights.nliWeight;

if (negationResult.shouldPenalise) {
  score *= (1 - cfg.policy.negationMismatchPenalty);
}

if (keywordResult.overlap < cfg.policy.keywordMismatchPenaltyThreshold && 
    embeddingScore > 0.7) {
  score *= 0.8; // Penalize high embedding with low keyword overlap
}

score *= (1 - specificityResult.penalty);

// 4. Final threshold
return { isMatch: score >= cfg.thresholds.hybridFinalMin, score };
```

---

## Centralized Configuration ✅ COMPLETED

All scoring parameters in `src/utils/themeScoringConfig.ts`:

```typescript
export const DEFAULT_THEME_SCORING_CONFIG: ThemeScoringConfig = {
  configVersion: '1.0.0',
  
  models: {
    embeddingModel: 'sentence-transformers/all-MiniLM-L6-v2',
    paraphraseModel: 'sentence-transformers/paraphrase-MiniLM-L6-v2',
    nliModelDefault: 'valhalla/distilbart-mnli-12-1',
    nliModelOptions: ['valhalla/distilbart-mnli-12-1', 'facebook/bart-large-mnli'],
  },
  
  thresholds: { /* ... */ },
  weights: { /* ... */ },
  policy: { /* ... */ },
  network: { /* ... */ },
  keywords: { /* ... */ },
  specificity: { /* ... */ },
  negation: { /* ... */ },
  templates: { /* ... */ },
};
```

Benefits:
- **Version tracking**: `configVersion` for reproducibility
- **Type safety**: Zod schema validation
- **Future-proof**: Easy to add DB overrides or A/B testing

---

## Admin Lab Testing Methods

The Theme Test Lab (`client/src/admin/components/ThemeTestTool.tsx`) supports:

| Method | Description | Uses RAW/PROCESSED |
|--------|-------------|-------------------|
| `embedding` | Standard similarity | PROCESSED |
| `paraphrase` | Paraphrase-tuned model | PROCESSED |
| `nli` | True 3-way NLI | NLI (premise/hypothesis) |
| `keywords` | Weighted keyword overlap | RAW |
| `negation` | Negation/qualifier detection | RAW |
| `specificity` | Triviality-gated penalty | RAW |
| `hybrid` | All signals + policy | ALL |
| `embeddingOnly` | Embedding + keywords + length | PROCESSED + RAW |

### Debug Output Sections

- **Embedding Score**: Cosine similarity from embedding model
- **NLI Scores**: Forward/reverse entailment, contradiction, neutral triplets
- **Keyword Analysis**: Keywords extracted, matched, overlap %, match details (type + weight)
- **Negation/Qualifier**: Detected patterns, mismatch penalty
- **Specificity**: Content token counts, triviality flag, penalty applied
- **Raw vs Processed**: Shows both input forms for debugging

---

## Test Cases

### Good Guesses (should pass)
```
Theme: "Words that are both nouns and verbs"
✅ "can be used as a noun and a verb"
✅ "dual part of speech"
✅ "function as both noun and verb"
✅ "words with multiple grammatical roles"
```

### Bad Guesses (should fail)
```
Theme: "Words that are both nouns and verbs"
❌ "begin with b" (qualifier mismatch + low keyword overlap)
❌ "short words" (wrong attribute)
❌ "common words" (too vague, trivial)
❌ "English words" (too broad)
```

### Animal Groups Edge Cases
```
Theme: "Words that describe animal groups"
✅ "collective nouns for animals" (strong keyword overlap)
✅ "animal group names" (paraphrase)
✅ "terms for groups of animals" (paraphrase)
⚠️ "animal plurals" (close, but not exact - keyword "group" missing)
❌ "animal kingdom" (taxonomy, missing "group" keyword)
❌ "types of animals" (no grouping concept)
```

---

## Cost Analysis

| Method | API Calls | Latency | Cost per Request |
|--------|-----------|---------|------------------|
| Keywords only | 0 | ~1ms | $0 |
| Specificity only | 0 | ~1ms | $0 |
| Negation only | 0 | ~1ms | $0 |
| Embedding | 1 | ~100ms | ~$0.0001 |
| Paraphrase | 1 | ~100ms | ~$0.0001 |
| NLI (bidirectional) | 2 | ~200ms | ~$0.0002 |
| Hybrid (all signals) | 4 | ~400ms | ~$0.0004 |
| **EmbeddingOnly (Production)** | 1 | ~100ms | **~$0.0001** |

**Estimated monthly cost:** ~$3-5 for 1000 users

---

## Phase 3 – Custom Model Training (Future)

Only proceed if current accuracy is insufficient after Phase 2 improvements.

### Prerequisites
1. Labeled dataset of 50-100 theme/guess pairs
2. Validation results showing consistent failure patterns
3. Cost-benefit analysis (training vs. rule improvements)

### Training Approach
```python
from sentence_transformers import SentenceTransformer, InputExample, losses

model = SentenceTransformer('sentence-transformers/paraphrase-MiniLM-L6-v2')
train_examples = [InputExample(texts=[theme, guess], label=score) for ...]
model.fit(train_objectives=[(DataLoader(train_examples), losses.CosineSimilarityLoss(model))])
model.save("./custom_theme_model")
```

**Cost:** Free (local or Colab)
**Time:** Minutes on GPU, ~1 hour on CPU

---

## SQL Queries for Theme Attempts

### Query attempts by date range (using attempt_date)
```sql
SELECT * FROM theme_attempts 
WHERE attempt_date >= '2025-01-01' AND attempt_date <= '2025-01-31'
ORDER BY attempt_date DESC;
```

### Query attempts by created_at timestamp
```sql
SELECT * FROM theme_attempts 
WHERE created_at >= '2025-01-01 00:00:00' AND created_at < '2025-02-01 00:00:00'
ORDER BY created_at DESC;
```

### Get theme attempt stats for a specific week
```sql
SELECT 
  t.theme_text,
  COUNT(*) as total_attempts,
  COUNT(CASE WHEN ta.is_correct THEN 1 END) as correct_attempts,
  AVG(ta.confidence_percentage) as avg_confidence
FROM theme_attempts ta
JOIN themes t ON ta.theme_id = t.id
WHERE t.week_start_date = '2025-01-13'
GROUP BY t.theme_text;
```
