# Theme Logic & Documentation Map

**Purpose:** Single reference for all theme-related code and docs. Use this to find duplication, inconsistency, and to rethink scoring (e.g. "toilet" 49% vs "Shakespeare").

**No code was changed.** This is a locate-and-describe audit only.

---

## 1. End-to-end flow (production)

```
User submits guess (ThemeGuessModal)
  → POST /api/theme-guess { player_id, guess, gameId }
  → theme-guess.ts: getThemeForDate(themeContextDate) → currentTheme
  → theme-guess.ts: isThemeGuessCorrect(guess, currentTheme)
       → src/game/theme.ts
  → theme.ts: normalizeText exact match? → { isCorrect: true, method: 'exact' }
  → else: dynamic import('../utils/semanticSimilarity')
  → semanticSimilarity.matchThemeWithFuzzy(guess, theme)
       → themeScoring.testThemeScoring(guess, theme, { methods: ['embedding','keywords','length','embeddingOnly'] })
  → themeScoring uses: themeScoringConfig (HF_API_BASE, MODELS, THRESHOLDS, WEIGHTS, TEMPLATES, SYNONYMS, SPECIFICITY)
  → HuggingFace: sentence-transformers/all-MiniLM-L6-v2 (embedding)
  → Result: hybrid.finalScore, hybrid.isMatch (or embedding fallback)
  → theme.ts returns { isCorrect, method, confidence, similarity }
  → theme-guess.ts: submitThemeAttempt(...), response with fuzzyMatch
```

So **production scoring path** is:

- **Entry:** `pages/api/theme-guess.ts` → `src/game/theme.ts` → `isThemeGuessCorrect()`
- **Scoring:** `src/utils/semanticSimilarity.ts` → `matchThemeWithFuzzy()` → `src/utils/themeScoring.ts` → `testThemeScoring(..., { methods: ['embedding','keywords','length','embeddingOnly'] })`
- **Config:** `src/utils/themeScoringConfig.ts` (thresholds, models, templates, synonyms, specificity)

---

## 2. Where the score comes from (why "toilet" can be 49% vs "Shakespeare")

- **Exact match:** `normalizeText(guess) === normalizeText(theme)` → 100%, no API.
- **Otherwise:** `matchThemeWithFuzzy()` runs **embeddingOnly**:
  - **Embedding:** Same HuggingFace model for both strings. API returns a **cosine similarity 0–1**. That is the raw semantic score. Unrelated phrases (e.g. "toilet" vs "Shakespeare") often still get **0.3–0.6** because the model embeds everything in the same space; 49% is plausible for unrelated concepts.
  - **Keywords:** `computeKeywordOverlap(themeRaw, guessRaw)` – weighted overlap (exact/stem/synonym/substring). For "toilet" vs "Shakespeare" overlap is ~0 → penalty.
  - **Specificity:** Short/trivial guesses can get a penalty.
  - **Negation/qualifier:** Mismatches add penalty.
- **Final score:** Embedding score with penalties applied; **match** = `finalScore >= THRESHOLDS.embedding` (0.78). So 49% would correctly **not** be a match; the problem is that **showing 49%** for clearly wrong guesses is confusing and suggests the system is “considering” wrong answers too much.

So the issue isn’t that 49% is accepted as correct; it’s that **any two short phrases get a non-zero similarity**, and we have no explicit “semantic unrelated” gate. Rethinking themes could include: stronger keyword/semantic gates, or a separate “relevance” check so clearly unrelated pairs are capped or rejected earlier.

---

## 3. Theme-related code (by file)

| File | Role |
|------|------|
| **src/game/theme.ts** | getThemeForDate, getWordsForTheme, **isThemeGuessCorrect** (orchestrates exact + matchThemeWithFuzzy, legacy fallback), isThemeGuessCorrectLegacy, submitThemeAttempt, getThemeProgress, getPlayerWeeklyThemedWords, getWeeklyThemeSolversCount, getAllWeeklyThemedWords, etc. |
| **src/utils/themeScoring.ts** | **testThemeScoring** (embedding, NLI, hybrid, keywords, specificity, negation), computeEmbeddingSimilarity, computeParaphraseSimilarity, computeNLITriplet, computeKeywordOverlap, computeSpecificityAdjustment, **scoreThemeGuess** (hybrid production-style; not used by theme-guess API), prepareThemeScoringInputs |
| **src/utils/themeScoringConfig.ts** | HF_API_BASE, MODELS (embedding, paraphrase, nli), THRESHOLDS (embedding 0.78, nli, hybrid, keywords), WEIGHTS, NETWORK, SPECIFICITY, TEMPLATES (contextual + NLI), SYNONYMS |
| **src/utils/semanticSimilarity.ts** | **matchThemeWithFuzzy** (exact + testThemeScoring embeddingOnly), computeSemanticSimilarity (raw embedding for other use) |
| **src/utils/text.ts** | normalizeText (used for exact theme match) |
| **pages/api/theme-guess.ts** | POST handler: getThemeForDate, **isThemeGuessCorrect**, submitThemeAttempt, getThemeProgress, getAllWeeklyThemedWords (Sunday revelation) |
| **pages/api/theme-status.ts** | GET: getThemeForDate, getThemeProgress, getPlayerWeeklyThemedWords, isThemeGuessCorrect (for progress), getWeeklyThemeSolversCount (stats_only) |
| **pages/api/leaderboard/theme-weekly.ts** | GET: words by week → theme, theme_attempts by theme + is_correct, dedupe by player, totalPlayers |
| **pages/api/leaderboard/theme-alltime.ts** | All-time theme leaderboard |
| **pages/api/admin/theme-test.ts** | Admin: **testThemeScoring** with multiple methods (embedding, nli, hybrid, keywords, etc.) – full lab, not just embeddingOnly |
| **client/src/api/client.ts** | getWeeklyThemeSolvers (now from theme-weekly), theme status/guess API calls |
| **client/src/utils/themeMessages.ts** | getThemeKeyImage, feedback copy for score ranges |
| **client/src/components/ThemeGuessModal.tsx** | UI: submit guess, show history, key image, weekly words |
| **client/src/components/VaultLogo.tsx** | Vault + “Theme Locked/Unlocked” tooltip |
| **client/src/components/UnPrefix.tsx** | Un diamond + tooltip |
| **client/src/components/WeeklyThemeLeaderboard.tsx** | Uses /api/leaderboard/theme-weekly |
| **client/src/components/AllTimeThemeLeaderboard.tsx** | Uses theme-alltime |
| **shared-types/src/theme.ts** | Shared theme types if any |

---

## 4. Duplication and inconsistency

- **Two “production” scoring entry points:**
  - **theme-guess API** uses: `isThemeGuessCorrect` → `matchThemeWithFuzzy` → `testThemeScoring` with **embeddingOnly** (no NLI).
  - **themeScoring.scoreThemeGuess** uses **hybrid** (embedding + NLI). It is **not** used by the theme-guess API. So production and `scoreThemeGuess()` are not the same.
- **Admin theme-test** uses `testThemeScoring` with **multiple methods** (e.g. hybrid, nli, keywords). So admin lab can show different results from production (embeddingOnly).
- **Threshold docs vs code:**
  - THEME_MATCHING_IMPROVEMENT_PLAN.md says threshold **85%**.
  - themeScoringConfig.ts and THEME_SCORING_SINGLE_SOURCE_OF_TRUTH.md say **78%**.
  - THEME_GUESS_COLOR_SYSTEM.md: green 85%+, orange 70–85%, red &lt;70% (UI only; match threshold is 78% in code).
- **Synonym lists:** In themeScoring.ts, `KEYWORD_SYNONYMS` (local) and in themeScoringConfig.ts `SYNONYMS` (exported). Both used in keyword matching; risk of drift.
- **“Single source of truth”:** THEME_SCORING_SINGLE_SOURCE_OF_TRUTH.md describes 78% and embedding; it does not describe embeddingOnly vs hybrid or that production uses embeddingOnly only.

---

## 5. Theme-related documentation (all)

| Document | What it describes |
|----------|--------------------|
| **docs/THEME_SCORING_SINGLE_SOURCE_OF_TRUTH.md** | 78% threshold, embedding, color bands, known limits (e.g. etymology vs Greek Words), code refs |
| **docs/THEME_MATCHING_IMPROVEMENT_PLAN.md** | Older plan; 85% threshold, contextual prompting ideas, tiered thresholds |
| **docs/THEME_OF_THE_WEEK_IMPLEMENTATION.md** | Feature spec, DB (theme_attempts), core theme.ts functions, API, UI |
| **docs/THEME_GUESS_COLOR_SYSTEM.md** | UI colors: 85%+ green, 70–85% orange, &lt;70% red |
| **docs/THEME_SCORING_IMPROVEMENT_ROADMAP.md** | Design/improvement roadmap for scoring |
| **docs/THEME_GUESS_LLM_CODE_AND_PROMPTS.md** | LLM/prompt references if any |
| **docs/THEME_SIMILARITY_TRACKING_IMPLEMENTATION.md** | Tracking of similarity over time |
| **docs/THEME_API_ROUTING_ISSUE.md** | API routing / debugging |
| **docs/UN_THEME_TRACKING_SYSTEM.md** | Un diamond / vault and theme state |
| **docs/VAULT_LOGO_ANIMATION_SYSTEM.md** | Vault animation and theme state |
| **docs/GAME_LOGIC_AND_RULES.md** | Game rules; references theme/key/vault flow |
| **docs/ARCHITECTURE.md** | High-level architecture; theme mentioned |
| **docs/DATABASE_ARCHITECTURE.md** | DB layout; theme_attempts, words.theme |
| **docs/SQL_THEME_QUERIES.md** | SQL examples for theme data |
| **THEME_LEADERBOARD_DEPLOY_CHECKLIST.md** | Deploy checklist for theme leaderboard |
| **DEPLOYMENT_READY_THEME_IMPROVEMENTS.md** | Theme-related deployment notes |

---

## 6. Summary: uniformity and “toilet” vs “Shakespeare”

- **Production path is:** theme-guess API → `isThemeGuessCorrect` → `matchThemeWithFuzzy` → `testThemeScoring` **embeddingOnly** (embedding + keywords + specificity + negation). **No NLI** in production.
- **78%** in code (themeScoringConfig) is the match threshold; **85%** in some docs and in UI green band is inconsistent.
- **49% for “toilet” vs “Shakespeare”** is the raw (or penalty-adjusted) embedding similarity. Embedding models give non-zero similarity to almost any two texts; we only reject by threshold (78%). There is no explicit “semantic unrelated” or “relevance” layer, so bad guesses can still show mid-range percentages.
- **Duplication:** Two scoring entry points (embeddingOnly in production vs scoreThemeGuess hybrid), two synonym sources, and several docs that disagree with code or each other on thresholds and flow.

To **rethink themes** you could:

1. **Single scoring path:** Either make production use the same method as admin (e.g. hybrid) or document that production is embeddingOnly by design.
2. **One doc as truth:** Extend THEME_SCORING_SINGLE_SOURCE_OF_TRUTH.md to describe embeddingOnly vs hybrid, and to list all theme docs (this map).
3. **Threshold and UI:** Align 78% vs 85% (match threshold vs “green” band) in one place and in docs.
4. **Reduce misleading scores:** Add a stronger keyword/semantic gate or a separate “unrelated” check so pairs like toilet/Shakespeare get a low cap or explicit “no match” instead of 49%.
5. **Synonyms:** Single synonym list (e.g. only themeScoringConfig.SYNONYMS) and use it everywhere.

This file is the **map**; no code or other docs were modified.
