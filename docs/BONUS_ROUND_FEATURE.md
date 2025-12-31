# Early Finisher Bonus Round

## Overview

Players who solve the daily word in fewer than 6 guesses earn bonus attempts to guess "dictionary neighbours" of today's word. Each unused guess becomes a bonus round opportunity.

## How It Works

### Trigger Condition
- Player wins the game in **fewer than 6 guesses** (before the Etymology clue is revealed)
- Unused guesses convert to bonus round attempts
- Bonus round appears **inline** after "The word was: [X]" message

### Example
If player wins in 3 guesses:
- D clue: Used (guess 1)
- E clue: Used (guess 2)  
- F clue: Used (guess 3) ✓ WIN
- I clue: **Unused** → Bonus attempt 1
- N clue: **Unused** → Bonus attempt 2
- E clue: **Unused** → Bonus attempt 3

### Bonus Round Gameplay

1. After winning early, an inline bonus round UI appears
2. Shows: "Can you guess [Y] words nearby '[WORD]' in the dictionary?"
3. Displays scoring table with tiers
4. Player types guesses one at a time
5. Each guess shows result with medal emoji

### Scoring

| Distance (lex_rank diff) | Tier | Medal |
|--------------------------|------|-------|
| ≤ 10 | Perfect | 🥇 Gold |
| ≤ 20 | Good | 🥈 Silver |
| ≤ 30 | Average | 🥉 Bronze |
| > 30 | Miss | ❌ |

### Edge Cases

- **Word not in dictionary**: "Word not found" - no penalty, player can try again
- **Exact match**: Not allowed (player already guessed today's word)
- **Multiple attempts**: Each unused guess = one bonus attempt (no retries per attempt)

## Technical Implementation

### Database Requirements

The `words` table has a `dictionary_id` FK to `public.dictionary`:
- Added in migration `20251228193010_add_dictionary_id_to_words.sql`
- Admin portal can link words to dictionary entries

### Spelling Normalization (Algorithmic)

The bonus round uses **algorithmic British→American spelling conversion** instead of a static lookup table. This handles ALL words matching common patterns:

| British Pattern | American | Example |
|-----------------|----------|---------|
| -our | -or | colour → color |
| -ise | -ize | realise → realize |
| -yse | -yze | analyse → analyze |
| -re | -er | centre → center |
| -ogue | -og | catalogue → catalog |
| -ae- | -e- | anaemia → anemia |
| -ence | -ense | defence → defense |

This is implemented in `src/utils/spelling.ts`:
- `generateAllLookupVariants(word)` - returns all possible dictionary lookups
- `detectPotentialBritishSpelling(word)` - warns about British spellings

### Fallback Lex Rank Estimation

The bonus round **ALWAYS works**, even if a word isn't in the dictionary:

1. **Best case**: Word found via `dictionary_id` FK
2. **Fallback 1**: Lookup by normalized word (with algorithmic variants)
3. **Fallback 2**: Binary search to estimate position alphabetically

The estimation finds the word's neighbors and uses the midpoint:
```
"forest" not in dictionary
→ Would appear between "foresee" (rank 45231) and "forge" (rank 45245)
→ Estimated rank: 45238
```

This ensures no player is blocked from playing the bonus round.

### API Endpoint

`POST /api/bonus/check-guess`

Request:
```json
{
  "guess": "forest",
  "wordId": "uuid-of-today's-word",
  "playerId": "uuid-of-player",
  "attemptNumber": 1
}
```

Response (success):
```json
{
  "valid": true,
  "guessedWord": "forest",
  "guessLexRank": 45234,
  "targetLexRank": 45240,
  "distance": 6,
  "tier": "perfect",
  "points": 100
}
```

Response (word not found):
```json
{
  "valid": false,
  "error": "word_not_found",
  "message": "Word not in dictionary"
}
```

### Admin Validation Endpoint

`POST /api/admin/dictionary/validate`

Pre-checks a word for bonus round compatibility **before** it becomes the word of the day.

Request:
```json
{
  "word": "colour"
}
```

Response:
```json
{
  "word": "colour",
  "normalized": "colour",
  "foundInDictionary": true,
  "matchedVariant": "color",
  "matchedWord": "Color",
  "lexRank": 22345,
  "warnings": [
    "Potential British spelling detected (-our). American equivalent: \"color\""
  ],
  "potentialBritish": {
    "isBritish": true,
    "pattern": "-our",
    "suggestedAmerican": "color"
  },
  "variantsChecked": ["colour", "color"],
  "nearbyWords": [
    { "word": "Colophon", "lexRank": 22340, "distance": 5 },
    { "word": "Color", "lexRank": 22345, "distance": 0 },
    { "word": "Colorado", "lexRank": 22350, "distance": 5 }
  ],
  "bonusRoundCompatible": true,
  "bonusRoundNote": "✓ Exact match found at rank 22345. Bonus round will work perfectly."
}
```

Use this in the admin dashboard to validate words when creating them.

### Frontend Component

`BonusRoundInline.tsx`:
- Shows remaining bonus attempts
- Input field for word guess
- Visual feedback (gold/silver/bronze/miss)
- Running total of bonus points
- "Skip" option to finish early

### State Management

Add to `GameSessionState`:
```typescript
bonusRound?: {
  attempts: number;        // Total bonus attempts available
  completed: number;       // Attempts used
  results: BonusResult[];  // Results per attempt
  totalPoints: number;     // Accumulated bonus points
};
```

## UI/UX Design

### Entry Point
After winning animation, if guesses < 6:
1. Show "🎉 Bonus Round Unlocked!"
2. Explain the mechanic briefly
3. "Start Bonus Round" or "Skip to Results"

### During Bonus Round
- Display: "Attempt X of Y"
- Show DEFINE boxes with unused ones highlighted
- Input with "Guess" button
- After each guess: Show result with tier badge
- "Continue" to next attempt or "Finish" if done

### Result Display
- Summary of bonus attempts
- Total bonus points earned
- Add to leaderboard display

## Future Enhancements

1. **Hints**: Show first letter of nearby words
2. **Streaks**: Consecutive perfect scores unlock special badges
3. **Weekly Bonus**: Track cumulative bonus points
4. **Leaderboard Integration**: Separate bonus leaderboard

---

*Implemented: December 2024*
*Branch: feature/bonus-round*

