# Theme Scoring Improvement Plan

**Last Updated:** 2026-03-12  
**Status:** Active  
**Single Source of Truth for theme scoring roadmap**

---

## Current Architecture

```
Player guess → isThemeGuessCorrect(guess, theme, words)
  ├─ 1. Exact match (instant, free)
  ├─ 2. Pattern match (instant, free)
  ├─ 3. Alias match (instant, free)
  └─ 4. Semantic scoring (HuggingFace API)
       ├─ Embedding similarity (sentence-transformers/all-MiniLM-L6-v2)
       ├─ Keyword overlap (weighted: exact/stem/synonym/substring)
       ├─ Specificity/triviality gating
       ├─ Negation/qualifier detection
       ├─ Word-context boost (guess vs weekly words centroid) ← NEW (Phase 3)
       └─ EmbeddingOnly mode (production default, no NLI)
```

**Key files:**
| File | Role |
|------|------|
| `src/game/theme.ts` | Entry point: `isThemeGuessCorrect()` |
| `src/utils/patternThemeMatcher.ts` | Pattern theme detection + rule-based matching |
| `src/utils/themeAliases.ts` | Curated alias dictionary for descriptive themes |
| `src/utils/themeScoring.ts` | Semantic scoring engine (embedding + keywords + penalties) |
| `src/utils/themeScoringConfig.ts` | Centralised configuration (thresholds, weights, synonyms) |
| `src/utils/semanticSimilarity.ts` | Thin wrapper delegating to themeScoring.ts |
| `pages/api/admin/theme-test.ts` | Admin Theme Lab API |

---

## Theme Classification

Based on analysis of all 43 themes in the database, themes fall into 4 distinct categories that require different matching strategies:

### Type A: Simple Category (semantic works well)
Themes that name a straightforward topic. Embedding similarity handles these.

| Theme | Words | Matching strategy |
|-------|-------|-------------------|
| Weather | Fog, Frost, Rain, Snow... | Semantic |
| Animals | Badger, Crane, Duck... | Semantic |
| Shakespeare | bard, globe, hamlet... | Semantic |
| Peter Pan | crocodile, fairy, fly... | Semantic |
| Periodic table | carbon, hydrogen, iron... | Semantic |
| Clothing, Baseball, Fishing, Guitar, Keyboard, etc. | ... | Semantic |

**Status:** Working well. Occasionally false-positive for unrelated words with high embedding similarity (e.g. "toilet" → 49% against "Shakespeare" — addressed by keyword mismatch penalties).

### Type B: Descriptive Phrase (needs synonym expansion)
Themes that describe a linguistic property of the words. Players often paraphrase these differently.

| Theme | Example good guesses | Challenge |
|-------|---------------------|-----------|
| Words That Are Both Nouns and Verbs | "dual purpose words", "nouns and verbs" | Paraphrase detection |
| Words Where Stress Changes Meaning | "heteronyms", "stress patterns" | Technical vocabulary |
| Words With Silent Letters | "silent letters", "unpronounced letters" | Synonym needed |
| Back-Formations | "back-formed words", "reverse derivation" | Obscure concept |
| collective nouns for animal groups | "animal group names", "collective nouns" | Partial match |

**Status:** ✅ Phase 2 done. 30+ themes have curated aliases in `themeAliases.ts`. Embedding handles remaining paraphrases.

### Type C: Structural/Pattern (needs pattern matcher)
Themes where the connection is a morphological pattern, not a semantic concept.

| Theme | Pattern type | Core word | Status |
|-------|-------------|-----------|--------|
| `____fish` (planned) | suffix | fish | ✅ Phase 1 DONE |
| `re____` (planned) | prefix | re | ✅ Phase 1 DONE |
| word contains vegetable | contains | vegetable | ✅ Phase 1 DONE |
| Words With Hidden Animals | contains | animals | ✅ Phase 1 DONE |

**Status:** Phase 1 complete. Pattern matcher (`patternThemeMatcher.ts`) handles suffix, prefix, and contains patterns with flexible phrase matching. Zero API calls.

### Type D: Cultural Reference (mostly working)
Themes referencing specific cultural domains.

| Theme | Challenge |
|-------|-----------|
| kpop/fandom culture | "k-pop" vs "kpop" normalisation |
| spaghetti bolognese | Specific recipe name |
| ireland | Lowercase inconsistency |

**Status:** Generally works via semantic similarity. Minor normalisation issues.

---

## Implementation Phases

### Phase 1: Pattern Theme Matcher ✅ DONE
**Files:** `src/utils/patternThemeMatcher.ts`, `src/game/theme.ts`, `pages/api/admin/theme-test.ts`

- Auto-detect pattern themes from theme text (underscores, "contains", "hidden")
- Rule-based matching: pattern notation, core word, relationship phrases, descriptive phrases
- Category rejection: "types of fish" ≠ "____fish" pattern
- 70 unit tests passing
- Integrated into production scoring flow (runs before semantic scoring)
- Integrated into admin Theme Lab API (shows pattern detection in debug output)

### Phase 2: Synonym & Alias Expansion ✅ DONE
**Files:** `src/utils/themeAliases.ts`, `src/game/theme.ts`, `pages/api/admin/theme-test.ts`

- Curated alias dictionary covering 30+ themes across all categories
- O(1) case-insensitive lookup, no API calls
- 98% confidence for alias matches (just below exact match at 100%)
- Integrated into production scoring flow (runs after pattern match, before semantic scoring)
- Integrated into admin Theme Lab API (shows alias match in debug output)
- 13 unit tests passing (`src/utils/__tests__/themeAliases.test.ts`)
- Aliases cover: language/etymology themes, wordplay themes, cultural themes, thematic categories

**Data science opportunity:** Use embeddings to auto-suggest aliases for new themes by finding the nearest neighbours of the theme text in a pre-computed embedding space. Admins approve/reject suggestions in the Theme Wizard.

### Phase 3: Word-Aware Contextual Scoring ✅ DONE
**Files:** `src/utils/themeScoring.ts`, `src/game/theme.ts`, `src/utils/semanticSimilarity.ts`, `pages/api/admin/theme-test.ts`

- Weekly words joined into a single sentence and embedded as a "centroid"
- Guess embedding compared against word centroid (1 additional API call)
- Additive boost applied when similarity > 45%: up to +8% max
- Boost ONLY applied when no penalty is active (negation/keyword mismatch)
- Integrated into production scoring flow via `submitThemeAttempt()` → `isThemeGuessCorrect()`
- Integrated into admin Theme Lab API and UI (shows word-context panel)
- Scoring chain: weekly words fetched from DB → passed through `isThemeGuessCorrect(words)` → `matchThemeWithFuzzy(words)` → `testThemeScoring(words)` → `computeWordContextSimilarity()`

**Data science**: This IS the centroid approach — the embedding model naturally averages the token embeddings of the joined words, creating an effective centroid representation. The boost formula: `max(0, (sim - 0.45)) * (0.08 / 0.55)` capped at 8%.

### Phase 4: Lightweight LLM Classification (Optional)
**Goal:** Handle edge cases where rule-based and embedding methods fail.

**Approach:**
1. Use a small, fast classification model (e.g., DistilBERT fine-tuned on theme-guess pairs)
2. Only invoke when confidence from other methods is ambiguous (e.g., 60-80% range)
3. Binary classifier: "Is this guess describing the same theme?" 

**Trade-offs:**
- Pro: Catches nuanced paraphrases that embeddings miss
- Con: Adds latency (~200ms), requires model hosting or API calls
- Recommendation: Phase 4 is optional — only implement if Phase 2+3 leave significant gaps

### Phase 5: Feedback Loop & Auto-Calibration
**Goal:** Use actual player guess data to improve scoring over time.

**Approach:**
1. Track all theme attempts with similarity scores (already captured in `theme_attempts` table)
2. Identify "near-miss" guesses (high confidence but rejected) → candidates for alias expansion
3. Admin dashboard widget showing most common rejected guesses per theme
4. Auto-suggest threshold adjustments based on acceptance/rejection patterns

---

## Test Matrix

All themes should be tested against these guess categories:

| Guess type | Expected for Type A | Expected for Type B | Expected for Type C |
|-----------|-------|-------|-------|
| Exact match | ✅ 100% | ✅ 100% | ✅ 100% |
| Paraphrase | ✅ ≥78% | ⚠️ Varies | N/A |
| Core word | N/A | ⚠️ May miss | ✅ ≥95% |
| Relationship phrase | N/A | N/A | ✅ ≥85% |
| Unrelated word | ❌ <50% | ❌ <50% | ❌ 0% |
| Category description | ❌ <60% | ❌ Varies | ❌ 0% |

---

## Cross-References

| Document | Content |
|----------|---------|
| `docs/THEME_SCORING_SINGLE_SOURCE_OF_TRUTH.md` | Scoring config reference |
| `docs/GAME_LOGIC_AND_RULES.md` | Overall game rules |
| `docs/DATABASE_ARCHITECTURE.md` | Database schema |
| `src/utils/__tests__/patternThemeMatcher.test.ts` | Pattern matcher unit tests |
| `src/utils/__tests__/themeAliases.test.ts` | Alias matcher unit tests |
