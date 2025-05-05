# Backend Interfaces

This document defines the repository interfaces for all database tables in the Un-Define v2 project. These interfaces serve as contracts for implementing repository classes that interact with the Supabase database.

## Repository Interfaces

### WordRepository

```typescript
interface WordRepository {
  /**
   * Get the word of the day
   * @returns Promise<WordEntry> The word of the day
   */
  getWordOfTheDay(): Promise<WordEntry>;

  /**
   * Get a random word for testing
   * @returns Promise<WordEntry> A random word
   */
  getRandomWord(): Promise<WordEntry>;

  /**
   * Get a word by ID
   * @param id The word ID
   * @returns Promise<WordEntry> The word with the specified ID
   */
  getWordById(id: string): Promise<WordEntry>;
}
```

### GameSessionRepository

```typescript
interface GameSessionRepository {
  /**
   * Create a new game session
   * @param word The word to guess
   * @param playerId The player ID
   * @returns Promise<GameSessionEntry> The created game session
   */
  createGameSession(word: WordEntry, playerId: string): Promise<GameSessionEntry>;

  /**
   * Get a game session by ID
   * @param id The game session ID
   * @returns Promise<GameSessionEntry> The game session with the specified ID
   */
  getGameSessionById(id: string): Promise<GameSessionEntry>;

  /**
   * Update a game session
   * @param id The game session ID
   * @param updates The updates to apply
   * @returns Promise<GameSessionEntry> The updated game session
   */
  updateGameSession(id: string, updates: Partial<GameSessionEntry>): Promise<GameSessionEntry>;

  /**
   * Add a guess to a game session
   * @param gameSessionId The game session ID
   * @param guess The guess to add
   * @param isCorrect Whether the guess is correct
   * @returns Promise<GameSessionEntry> The updated game session
   */
  addGuess(gameSessionId: string, guess: string, isCorrect: boolean): Promise<GameSessionEntry>;

  /**
   * Check if a player has already played today
   * @param playerId The player ID
   * @returns Promise<boolean> Whether the player has already played today
   */
  hasPlayedToday(playerId: string): Promise<boolean>;
}
```

### UserStatsRepository

```typescript
interface UserStatsRepository {
  /**
   * Get user stats by player ID
   * @param playerId The player ID
   * @returns Promise<UserStatsEntry> The user stats with the specified player ID
   */
  getUserStats(playerId: string): Promise<UserStatsEntry>;

  /**
   * Create or update user stats
   * @param playerId The player ID
   * @param stats The user stats to create or update
   * @returns Promise<UserStatsEntry> The created or updated user stats
   */
  upsertUserStats(playerId: string, stats: Partial<UserStatsEntry>): Promise<UserStatsEntry>;

  /**
   * Update user stats after a game
   * @param playerId The player ID
   * @param gameResult The game result
   * @returns Promise<UserStatsEntry> The updated user stats
   */
  updateStatsAfterGame(
    playerId: string,
    gameResult: {
      word: string;
      guessesUsed: number;
      wasCorrect: boolean;
      completionTimeSeconds: number;
    }
  ): Promise<UserStatsEntry>;
}
```

### ScoreRepository

```typescript
interface ScoreRepository {
  /**
   * Submit a score
   * @param score The score to submit
   * @returns Promise<ScoreEntry> The submitted score
   */
  submitScore(score: Omit<ScoreEntry, 'id' | 'submitted_at'>): Promise<ScoreEntry>;

  /**
   * Get scores by player ID
   * @param playerId The player ID
   * @returns Promise<ScoreEntry[]> The scores with the specified player ID
   */
  getScoresByPlayerId(playerId: string): Promise<ScoreEntry[]>;

  /**
   * Get leaderboard for a specific word
   * @param word The word
   * @param limit The maximum number of scores to return
   * @returns Promise<ScoreEntry[]> The leaderboard for the specified word
   */
  getLeaderboardForWord(word: string, limit?: number): Promise<ScoreEntry[]>;
}
```

### LeaderboardRepository

```typescript
interface LeaderboardRepository {
  /**
   * Get leaderboard summary for a player
   * @param playerId The player ID
   * @returns Promise<LeaderboardSummaryEntry[]> The leaderboard summary for the specified player
   */
  getLeaderboardSummary(playerId: string): Promise<LeaderboardSummaryEntry[]>;

  /**
   * Update leaderboard summary after a game
   * @param playerId The player ID
   * @param word The word
   * @param rank The player's rank
   * @param wasTop10 Whether the player was in the top 10
   * @param bestTime The player's best time
   * @param guessesUsed The number of guesses used
   * @returns Promise<LeaderboardSummaryEntry> The updated leaderboard summary
   */
  updateLeaderboardSummary(
    playerId: string,
    word: string,
    rank: number,
    wasTop10: boolean,
    bestTime: number,
    guessesUsed: number
  ): Promise<LeaderboardSummaryEntry>;
}
```

## Implementation Notes

- All repository implementations should handle errors appropriately and log them using the logger utility.
- Repository implementations should check if the Supabase client is initialized before making any database calls.
- Repository implementations should use the types defined in `src/types/database.ts`.
- Repository implementations should follow the TypeScript import rules defined in the project.
- Repository implementations should be modular and testable.
- Repository implementations should be performance-conscious and optimize database queries where possible.
