# Early Finisher Bonus Round

## Overview

Players who solve the daily word in fewer than 6 guesses earn bonus attempts to guess "dictionary neighbours" of today's word. Each unused guess becomes a bonus round opportunity.

## How It Works

### Trigger Condition
- Player wins the game in **fewer than 6 guesses** (before the Etymology clue is revealed)
- Unused guesses convert to bonus round attempts

### Example
If player wins in 3 guesses:
- D clue: Used (guess 1)
- E clue: Used (guess 2)  
- F clue: Used (guess 3) ✓ WIN
- I clue: **Unused** → Bonus attempt 1
- N clue: **Unused** → Bonus attempt 2
- E clue: **Unused** → Bonus attempt 3

### Bonus Round Gameplay

1. Player is shown: "Guess a word close to [WORD] in the dictionary"
2. Player types a word guess
3. System checks `lex_rank` distance between:
   - The guessed word's `lex_rank` in `public.dictionary`
   - Today's word's `lex_rank` (looked up via `words.dictionary_id` FK)

### Scoring

| Distance (lex_rank diff) | Tier | Color | Points |
|--------------------------|------|-------|--------|
| ≤ 10 | Perfect | 🥇 Gold | 100 |
| ≤ 20 | Good | 🥈 Silver | 50 |
| ≤ 30 | Average | 🥉 Bronze | 25 |
| > 30 | Miss | Gray | 0 |

### Edge Cases

- **Word not in dictionary**: "Word not found" - no penalty, player can try again
- **Exact match**: Not allowed (player already guessed today's word)
- **Multiple attempts**: Each unused guess = one bonus attempt (no retries per attempt)

## Technical Implementation

### Database Requirements

The `words` table needs a `dictionary_id` FK to `public.dictionary`:
- This was added in migration `20251228193010_add_dictionary_id_to_words.sql`
- Admin portal can link words to dictionary entries

If `dictionary_id` is not set for today's word, fall back to:
1. Lookup by exact normalized word match
2. If still not found, bonus round is skipped

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

### Frontend Component

`BonusRoundModal.tsx`:
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

