# Theme Scoring Improvement Roadmap

## Current State Analysis

### What's Working
- **Embedding similarity** (sentence-transformers/all-MiniLM-L6-v2): Good at capturing semantic similarity
  - "Groups of animals" ↔ "plural for animals" = 89% ✓
  - "Groups of animals" ↔ "can be used to describe animals" = 93% ✓
  - Fast (92-137ms per request)
  - Cheap (~$0.0001/request via HuggingFace Inference API)

### What's Problematic
1. **False Positives (embedding):**
   - "Groups of animals" ↔ "animal kingdom" = 88% ✗ (should be lower)
   - Embeddings capture *relatedness* not *equivalence*
   - Words that share topic but have different meanings score too high

2. **NLI Issues (facebook/bart-large-mnli):**
   - Zero-shot classification doesn't work well for paraphrase detection
   - "plural for animals" vs "groups of animals" = 0% entailment ✗ (should be high)
   - The model checks "is X a label for Y?" not "do X and Y mean the same thing?"

3. **Hybrid Approach Pitfalls:**
   - NLI's low scores drag down good embedding matches
   - The `contradiction_override` strategy is too aggressive
   - Weights (60% embedding, 40% NLI) don't account for NLI's unreliability

---

## Improvement Roadmap

### Phase 1: Quick Wins (Low Cost, High Impact)

#### 1.1 Remove NLI from Production
- **Problem:** NLI is giving false negatives and adding latency
- **Solution:** Use embedding-only for now
- **Effort:** 1 hour
- **Impact:** Stop penalizing good guesses

#### 1.2 Add Keyword Overlap Check
- **Problem:** "animal kingdom" scores high because embeddings see "animal" 
- **Solution:** Add explicit check for key term overlap
- **Approach:**
  ```
  // Extract key nouns from theme and guess
  themeWords = extractKeywords("Groups of animals") → ["groups", "animals"]
  guessWords = extractKeywords("animal kingdom") → ["animal", "kingdom"]
  
  // Check if guess captures the RELATIONSHIP not just TOPIC
  // "groups" ≠ "kingdom" → lower score
  ```
- **Effort:** 2-3 hours
- **Impact:** Reduce false positives by ~30%

#### 1.3 Length-Based Penalty
- **Problem:** Very short guesses can score high ("animals" vs "groups of animals")
- **Solution:** Penalize guesses that are much shorter than the theme
- **Effort:** 30 minutes
- **Impact:** Encourage specific answers

### Phase 2: Medium-Term Improvements

#### 2.1 Paraphrase Detection Model
- **Problem:** Embeddings don't distinguish paraphrases from related concepts
- **Solution:** Use a dedicated paraphrase model like `sentence-transformers/paraphrase-MiniLM-L6-v2`
- **API:** Same HuggingFace format, just different model
- **Cost:** Same as current (~$0.0001/request)
- **Effort:** 2-3 hours
- **Impact:** Better precision on "same meaning" detection

#### 2.2 Negation and Qualifier Handling
- **Problem:** "not animals" would score high for "animals"
- **Solution:** Detect negation words and adjust accordingly
- **Effort:** 1-2 hours
- **Impact:** Prevent gaming and edge cases

#### 2.3 Theme-Specific Keyword Extraction
- **Problem:** Some themes are about *properties* ("Words that are both nouns and verbs")
- **Solution:** For property-based themes, extract the property and check if guess mentions it
- **Example:**
  ```
  Theme: "Words that are both nouns and verbs"
  Property: "noun AND verb" or "dual part of speech"
  
  Guess: "begin with b" → no mention of parts of speech → fail
  Guess: "can be used as verb and noun" → mentions both → pass
  ```
- **Effort:** 4-5 hours
- **Impact:** Much better handling of abstract/grammatical themes

### Phase 3: Advanced Improvements (If Needed)

#### 3.1 Custom Fine-Tuned Model
- **Problem:** Off-the-shelf models don't understand "theme guessing" context
- **Solution:** Fine-tune a small model on Un·Define theme/guess pairs
- **Data needed:** ~500-1000 labeled pairs
- **Cost:** One-time ~$50-100 for fine-tuning, then same inference cost
- **Effort:** 1-2 weeks
- **Impact:** Highest accuracy, but requires data collection

#### 3.2 Multi-Model Ensemble
- **Problem:** Single model has blind spots
- **Solution:** Combine multiple models with learned weights
- **Models:**
  - Embedding similarity
  - Paraphrase detection
  - Keyword overlap
  - (Optional) LLM judge for edge cases
- **Effort:** 1 week
- **Impact:** Most robust, but higher cost/latency

#### 3.3 LLM-Based Judge (Expensive)
- **Problem:** Edge cases need reasoning
- **Solution:** Use GPT-4/Claude for ambiguous cases only
- **Approach:**
  ```
  If embedding_score between 0.65 and 0.85:
    ask_llm("Does '{guess}' mean the same as '{theme}'?")
  ```
- **Cost:** ~$0.01-0.05 per edge case
- **Effort:** 3-4 hours
- **Impact:** Very high accuracy for borderline cases

---

## Recommended Implementation Order

### Immediate (This Week)
1. ✅ Keep embedding as primary scorer
2. ✅ Add keyword overlap check to reduce false positives
3. ✅ Disable NLI in production (keep in test lab for comparison)

### Near-Term (2-3 Weeks)
4. Switch to paraphrase-specific model
5. Add property/qualifier detection for abstract themes
6. Build labeled test dataset from real attempts

### Future (When Needed)
7. Consider fine-tuning or LLM judge for edge cases

---

## Test Cases for Validation

```typescript
const TEST_THEMES = [
  {
    theme: "Groups of animals",
    good: ["collective nouns for animals", "plural for animals", "animal group names", "what you call a bunch of animals"],
    bad: ["animals", "animal kingdom", "zoo animals", "farm animals", "wildlife"]
  },
  {
    theme: "Words that are both nouns and verbs",
    good: ["dual part of speech", "can be noun and verb", "function as noun or verb", "grammatically versatile"],
    bad: ["begin with b", "short words", "common words", "English words"]
  },
  {
    theme: "Things you find at the beach",
    good: ["beach items", "seaside objects", "things by the ocean", "coastal finds"],
    bad: ["summer", "vacation", "hot weather", "relaxation"]
  }
];
```

---

## Cost Analysis

| Approach | Cost/Request | Accuracy (Est.) | Latency |
|----------|-------------|-----------------|---------|
| Embedding only | $0.0001 | 70% | 100ms |
| Embedding + Keywords | $0.0001 | 80% | 110ms |
| Paraphrase model | $0.0001 | 85% | 100ms |
| Ensemble (2 models) | $0.0002 | 88% | 150ms |
| LLM edge cases | $0.0003* | 92% | 200ms |

*Assumes LLM only used for 20% of borderline cases

---

## Next Steps

1. [ ] Implement keyword overlap check
2. [ ] Test paraphrase-MiniLM model in Theme Lab
3. [ ] Collect 50+ labeled theme/guess pairs for validation
4. [ ] Decide on Phase 2 scope based on real-world accuracy
