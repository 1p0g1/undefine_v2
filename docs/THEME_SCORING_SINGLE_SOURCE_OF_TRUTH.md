# Theme Scoring - Single Source of Truth

**Last Updated:** March 2026
**Status:** Active

## Overview

This document is the authoritative reference for how theme guesses are scored in Un·Define. All other theme-related documentation should be considered supplementary.

## Scoring Architecture

### Primary Scoring Method: Embedding Similarity

The theme scoring uses **semantic embedding similarity** via the `sentence-transformers/all-MiniLM-L6-v2` model from HuggingFace.

```
Score = Embedding Similarity (0-100%)
Match = Score >= 78%
```

### Configuration Location

All scoring parameters are centralized in:
- **`src/utils/themeScoringConfig.ts`** - Thresholds, weights, synonyms
- **`src/utils/themeScoring.ts`** - Scoring logic
- **`src/utils/semanticSimilarity.ts`** - API wrapper

### Key Thresholds

| Parameter | Value | Purpose |
|-----------|-------|---------|
| `THRESHOLDS.embedding` | 0.78 (78%) | Minimum score to be considered a "match" |
| `THRESHOLDS.hybrid.finalMin` | 0.78 (78%) | Final hybrid score minimum |
| `THRESHOLDS.keywords.overlapMin` | 0.4 (40%) | Keyword overlap minimum |

### Color Coding (UI Display)

| Score Range | Color | Key Image |
|-------------|-------|-----------|
| 85%+ or correct | Green | `GreenKey.png` |
| 70-84% | Orange | `OrangeKey.png` |
| <70% | Red | `RedKey.png` |
| Not guessed | Default | `Key.png` |

## Scoring Flow

```
1. User submits guess
2. Exact match check (100% if identical)
3. Pattern theme detection (____fish, re____, "word contains X")
   - Rule-based, instant, zero API calls
   - Accepts: core word, pattern notation, relationship phrases
   - Returns result immediately if theme is a pattern type
4. Alias match (curated synonyms for 30+ themes)
   - Case-insensitive O(1) lookup, zero API calls
   - 98% confidence (just below exact match)
   - e.g. "silent letters" matches "Words With Silent Letters"
5. Semantic similarity via HuggingFace API (for non-pattern themes)
   - Guess and theme are embedded
   - Cosine similarity computed
   - Result: 0.0 to 1.0 (displayed as 0-100%)
5. Final score determines UI feedback
```

## Known Limitations

### Indirect Relationships Score Low

**Example Case: "etymology" vs "Greek Words" = 29%**

The embedding model measures **semantic equivalence**, not **conceptual relationships**.

- "etymology" = the study of word origins
- "Greek Words" = words from the Greek language

These are *related* concepts but not *equivalent* meanings:
- Etymology covers ALL language origins, not just Greek
- The embedding model doesn't recognize "etymology → Greek" as a strong connection

**Better Guesses for "Greek Words" theme:**
- "Greek origins" (would score ~75-85%)
- "Words from Greek" (would score ~90%+)
- "Hellenic vocabulary" (would score ~70-80%)
- "Greek roots" (would score ~70-80%)

### How to Improve Scores

1. **Be Specific**: Match the theme's specificity level
2. **Use Similar Phrasing**: The model rewards similar constructions
3. **Avoid Abstractions**: "etymology" is abstract; "Greek words" is concrete

## Supporting Signals (Not Primary)

The system also checks:

1. **Keyword Overlap**: Word-level matching with stemming and synonyms
2. **Negation Detection**: Catches "not X" vs "X" mismatches
3. **Specificity Gating**: Penalizes very short/vague guesses

## Code References

- **Main Entry Point**: `src/game/theme.ts` → `isThemeGuessCorrect()`
- **Pattern Matcher**: `src/utils/patternThemeMatcher.ts` → `tryPatternMatch()`
- **Alias Matcher**: `src/utils/themeAliases.ts` → `tryAliasMatch()`
- **Scoring Logic**: `src/utils/themeScoring.ts` → `testThemeScoring()`
- **API Wrapper**: `src/utils/semanticSimilarity.ts` → `matchThemeWithFuzzy()`
- **Config**: `src/utils/themeScoringConfig.ts`
- **Tests**: `src/utils/__tests__/patternThemeMatcher.test.ts`, `src/utils/__tests__/themeAliases.test.ts`

## Related Documentation

- `THEME_SCORING_IMPROVEMENT_PLAN.md` - **5-phase roadmap** (pattern matcher, synonym expansion, word-aware scoring, LLM classification, feedback loop)
- `THEME_GUESS_COLOR_SYSTEM.md` - UI color logic

## Changelog

- **Mar 2026**: Phase 2 — Alias matcher (`themeAliases.ts`) with 30+ themes and 13 unit tests
- **Mar 2026**: Phase 1 — Pattern theme matcher (`patternThemeMatcher.ts`) — handles `____fish`, `re____`, `word contains X` themes with rule-based matching
- **Feb 2026**: Created single source of truth document
- **Feb 2026**: Documented "etymology vs Greek Words" case as known limitation
- **Feb 2026**: Added Greek/Hellenic and Latin/Roman synonyms to improve matching
  - "hellenic" ↔ "greek" ↔ "grecian" now recognized as synonyms
  - "etymology" ↔ "origin" ↔ "root" now connected
