# Theme Guess LLM Code and Prompts

This document outlines the code and prompts used for in-game theme guess semantic scoring.

## Current Production Implementation

**Location:** `src/utils/semanticSimilarity.ts` → `computeThemeSemanticSimilarity()`

**Entry Point:** `src/game/theme.ts` → `isThemeGuessCorrect()` → `matchThemeWithFuzzy()`

### Production Prompt Template

The production code uses **contextual prompting** to improve semantic matching:

```typescript
// From semanticSimilarity.ts:91-106
async function computeThemeSemanticSimilarity(guess: string, theme: string): Promise<number> {
  // Add contextual framing to improve semantic matching
  // Frame BOTH as answers to the same implicit question players are answering
  // This creates symmetric comparison: both are responses to "What connects the words?"
  const contextualGuess = `What connects this week's words? ${guess.toLowerCase().trim()}`;
  const contextualTheme = `What connects this week's words? ${theme.toLowerCase().trim()}`;
  
  // ... API call with contextualGuess and contextualTheme
}
```

### Prompt Example

**Input Theme:** `"Words that are both nouns and verbs"`

**Input Guess:** `"dual part of speech"`

**Actual prompts sent to Hugging Face API:**
```
source_sentence: "What connects this week's words? dual part of speech"
sentences: ["What connects this week's words? words that are both nouns and verbs"]
```

### API Configuration

```typescript
// Model
const HF_MODEL = 'sentence-transformers/all-MiniLM-L6-v2';

// API Endpoint
const HF_API_URL = `https://router.huggingface.co/hf-inference/models/${HF_MODEL}`;

// Threshold (0-1 scale)
const THEME_SIMILARITY_THRESHOLD = 0.78; // 78% minimum for match

// Request format
{
  inputs: {
    source_sentence: contextualGuess,    // "What connects this week's words? {guess}"
    sentences: [contextualTheme]          // ["What connects this week's words? {theme}"]
  }
}
```

### Production Flow

```
Player submits guess
  ↓
pages/api/theme-guess.ts (API endpoint)
  ↓
src/game/theme.ts → isThemeGuessCorrect(guess, theme)
  ↓
src/utils/semanticSimilarity.ts → matchThemeWithFuzzy(guess, theme)
  ↓
src/utils/semanticSimilarity.ts → computeThemeSemanticSimilarity(guess, theme)
  ↓
Hugging Face API (sentence-transformers/all-MiniLM-L6-v2)
  ↓
Returns similarity score (0-1)
  ↓
Check: similarity >= 0.78 → isMatch = true
```

## Advanced Implementation (Available, Not in Production Yet)

**Location:** `src/utils/themeScoring.ts` → `scoreThemeGuess()`

This includes more advanced methods (hybrid, NLI, keywords) but is **not yet called by the production endpoint**.

### Advanced Prompt Templates

```typescript
// From themeScoring.ts:39-45
const DEFAULT_TEMPLATES = {
  theme: "The theme connecting these words is: {theme}",
  guess: "The theme connecting these words is: {guess}",
  contextual_theme: "What connects this week's words? {theme}",
  contextual_guess: "What connects this week's words? {guess}"
};
```

### Advanced Methods Available

1. **Embedding Only** (Default in `testThemeScoring`)
   - Uses same contextual template as production
   - Model: `sentence-transformers/all-MiniLM-L6-v2`
   - Threshold: 0.78

2. **Paraphrase Model**
   - Better for "same meaning" detection
   - Model: `sentence-transformers/paraphrase-MiniLM-L6-v2`
   - Same threshold: 0.78

3. **NLI (Natural Language Inference)**
   - Zero-shot classification
   - Model: `facebook/bart-large-mnli`
   - Format: Premise/Hypothesis framing

4. **Hybrid Approach**
   - Combines embedding + NLI + keywords
   - Currently recommended for production in `scoreThemeGuess()`

5. **Keyword Overlap** (Fast, no API)
   - Extracts keywords from theme/guess
   - Checks overlap percentage
   - Applies penalty for missing key concepts

6. **Length Penalty** (Fast, no API)
   - Penalizes guesses much shorter than theme
   - Max 30% reduction

## Code References

### Production Code Path

1. **API Endpoint:**
   - `pages/api/theme-guess.ts:145` - Calls `isThemeGuessCorrect()`

2. **Core Logic:**
   - `src/game/theme.ts:84-141` - `isThemeGuessCorrect()` function
   - `src/game/theme.ts:243` - Calls `isThemeGuessCorrect()` in `submitThemeAttempt()`

3. **Semantic Similarity:**
   - `src/utils/semanticSimilarity.ts:91-144` - `computeThemeSemanticSimilarity()` with contextual prompts
   - `src/utils/semanticSimilarity.ts:151-192` - `matchThemeWithFuzzy()` wrapper

### Prompt Location

The contextual prompt is hardcoded in:
```typescript
// src/utils/semanticSimilarity.ts:105-106
const contextualGuess = `What connects this week's words? ${guess.toLowerCase().trim()}`;
const contextualTheme = `What connects this week's words? ${theme.toLowerCase().trim()}`;
```

### Model & Threshold Configuration

```typescript
// src/utils/semanticSimilarity.ts:15-19
const HF_MODEL = 'sentence-transformers/all-MiniLM-L6-v2';
const HF_API_URL = `https://router.huggingface.co/hf-inference/models/${HF_MODEL}`;
const THEME_SIMILARITY_THRESHOLD = 0.78; // 78% minimum for match
```

## Example API Request

```json
POST https://router.huggingface.co/hf-inference/models/sentence-transformers/all-MiniLM-L6-v2
Headers:
  Authorization: Bearer {HF_API_KEY}
  Content-Type: application/json

Body:
{
  "inputs": {
    "source_sentence": "What connects this week's words? dual part of speech",
    "sentences": ["What connects this week's words? words that are both nouns and verbs"]
  }
}

Response:
[0.823]  // 82.3% similarity → isMatch = true (82.3% >= 78%)
```

## Notes

- **Current Production:** Uses simple contextual prompting with embedding model only
- **Future:** `themeScoring.ts` has advanced methods (hybrid, NLI, keywords) but isn't called yet
- **Threshold:** 0.78 (78%) is the minimum similarity for a match
- **Cost:** ~$3/month for 1000 users (estimate from code comments)

## Testing

Use the admin Theme Test Lab (`client/src/admin/components/ThemeTestTool.tsx`) to test different methods and prompts without affecting production.