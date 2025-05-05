import { Router, Request, Response } from 'express';
import { getGameSessionById, addGuess } from '../repositories/gameSessionRepository.js';
import { Errors } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import { insertScore } from '../repositories/scoresRepository.js';
import { getUserStats, updateUserStats } from '../repositories/userStatsRepository.js';

const router = Router();

/**
 * Normalize text for comparison
 * Removes diacritics, spaces, and converts to lowercase
 */
function normalizeText(text: string): string {
  return text.trim().toLowerCase().replace(/[​-‍]/g, '');
}

/**
 * Guess request type
 */
interface GuessRequest {
  gameId: string;
  guess: string;
}

/**
 * Guess response type
 */
interface GuessResponse {
  isCorrect: boolean;
  guess: string;
  isFuzzy: boolean;
  fuzzyPositions: number[];
  gameOver: boolean;
  revealedClues: string[];
}

// POST /api/guess
router.post('/', async (req: Request, res: Response) => {
  try {
    logger.info('POST /api/guess payload', { body: req.body, playerId: req.playerId });
    const { gameId, guess } = req.body as GuessRequest;

    // Validate request body
    if (!gameId) {
      logger.warn('Missing gameId in guess submission');
      return res.status(400).json({ error: 'Missing gameId' });
    }
    if (!guess) {
      logger.warn('Missing guess in guess submission');
      return res.status(400).json({ error: 'Missing guess' });
    }
    if (!req.playerId) {
      logger.warn('Missing playerId in guess submission');
      return res.status(400).json({ error: 'Missing playerId' });
    }

    // Get the game session
    const gameSession = await getGameSessionById(gameId);

    // Verify the game session belongs to this player
    if (gameSession.player_id !== req.playerId) {
      throw Errors.Forbidden('Game session does not belong to this player');
    }

    // Check if game is already complete
    if (gameSession.is_complete) {
      throw Errors.BadRequest('Game is already complete');
    }

    // Normalize both the guess and the word for comparison
    const normalizedGuess = normalizeText(guess);
    const normalizedWord = normalizeText(gameSession.word);

    // Check if the guess is correct
    const isCorrect = normalizedGuess === normalizedWord;

    // Calculate fuzzy match positions (for partial matches)
    const fuzzyPositions = [];
    const guessChars = normalizedGuess.split('');
    const wordChars = normalizedWord.split('');
    for (let i = 0; i < guessChars.length; i++) {
      if (guessChars[i] === wordChars[i]) {
        fuzzyPositions.push(i);
      }
    }

    // Update game session with the new guess
    const updatedSession = await addGuess(gameId, guess, isCorrect);

    // Determine which clues should be revealed based on guess count
    const clueOrder = ['D', 'E', 'F', 'I', 'N', 'E2'];
    const revealedClues = clueOrder.slice(0, updatedSession.guesses.length);

    // Check if the game is over (correct guess or max guesses used)
    const gameOver = isCorrect || updatedSession.guesses.length >= 6;

    // Finalise game session: insert score and update user_stats if game is complete
    if (gameOver && updatedSession.is_complete) {
      // Calculate completion time in seconds
      const startTime = new Date(updatedSession.start_time).getTime();
      const endTime = new Date(updatedSession.end_time ?? new Date()).getTime();
      const completion_time_seconds = Math.floor((endTime - startTime) / 1000);
      // Insert score
      await insertScore({
        player_id: updatedSession.player_id,
        word: updatedSession.word,
        guesses_used: updatedSession.guesses.length,
        completion_time_seconds,
        was_correct: updatedSession.is_won,
        nickname: null,
        submitted_at: new Date().toISOString(),
      });
      // Update user_stats
      const stats = await getUserStats(updatedSession.player_id);
      const games_played = (stats?.games_played ?? 0) + 1;
      const games_won = (stats?.games_won ?? 0) + (updatedSession.is_won ? 1 : 0);
      const current_streak = updatedSession.is_won ? (stats?.current_streak ?? 0) + 1 : 0;
      const longest_streak = Math.max(stats?.longest_streak ?? 0, current_streak);
      const average_guesses =
        stats && stats.games_played > 0
          ? (stats.average_guesses * stats.games_played + updatedSession.guesses.length) /
            games_played
          : updatedSession.guesses.length;
      const average_completion_time =
        stats && stats.games_played > 0
          ? (stats.average_completion_time * stats.games_played + completion_time_seconds) /
            games_played
          : completion_time_seconds;
      await updateUserStats(updatedSession.player_id, {
        games_played,
        games_won,
        current_streak,
        longest_streak,
        average_guesses,
        average_completion_time,
        last_played_word: updatedSession.word,
        updated_at: new Date().toISOString(),
      });
    }

    const response: GuessResponse = {
      isCorrect,
      guess,
      isFuzzy: fuzzyPositions.length > 0,
      fuzzyPositions,
      gameOver,
      revealedClues,
    };

    logger.info('Guess processed', {
      gameId,
      isCorrect,
      guessCount: updatedSession.guesses.length,
      gameOver,
    });

    return res.json(response);
  } catch (error) {
    logger.error('Error in guess route', { error });
    if (error instanceof Error) {
      throw Errors.InternalServer(error.message);
    }
    return res.status(500).json({ error: 'Unexpected error' });
  }
});

export default router;
