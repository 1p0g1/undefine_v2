import { Router, Request, Response } from 'express';
import { getWordOfTheDay, getRandomWord } from '../repositories/wordRepository.js';
import {
  createGameSession,
  getActiveSessionForPlayer,
} from '../repositories/gameSessionRepository.js';
import { Errors } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import { WordEntry } from '../types/database.js';

const router = Router();

/**
 * Word response type
 */
interface WordResponse {
  gameId: string;
  clues: {
    D: string;
    E: string[];
    F: string;
    I: string;
    N: number;
    E2: string;
  };
  isTest?: boolean;
}

/**
 * Format word data into the expected API response format
 */
function formatWordResponse(
  word: WordEntry,
  gameId: string,
  devMode: boolean
): WordResponse & { solution?: string } {
  const response: WordResponse & { solution?: string } = {
    gameId,
    clues: {
      D: word.definition,
      E: word.equivalents?.split(',').map(s => s.trim()) || [],
      F: word.first_letter || '',
      I: word.in_a_sentence || '',
      N: word.number_of_letters || 0,
      E2: word.etymology || '',
    },
  };
  // DEV ONLY: include solution in development mode or if ?dev=true
  if (devMode) {
    response.solution = word.word; // DEV ONLY
  }
  return response;
}

// GET /api/word
router.get('/', async (req: Request, res: Response) => {
  try {
    let word = null;
    let gameSession = null;
    // Safe fallback for playerId
    const playerId = (req.headers['player-id'] as string) || req.playerId || 'anonymous';
    if (!playerId) {
      logger.error('Missing playerId');
      return res.status(400).json({
        status: 'error',
        message: 'Player ID is required',
        isOperational: true,
      });
    }
    logger.info('Received /api/word request', { playerId });
    try {
      word = await getWordOfTheDay();
      logger.info('getWordOfTheDay result', { word });
    } catch (err) {
      logger.error('Error fetching word from DB', { error: err });
      return res
        .status(500)
        .json({ error: 'Word fetch failed', details: err instanceof Error ? err.message : err });
    }
    if (!word) {
      logger.error('No word found for today');
      return res.status(404).json({
        status: 'error',
        message: 'No word found for today',
        isOperational: true,
      });
    }
    const devMode = process.env.NODE_ENV !== 'production' || req.query.dev === 'true';
    let existingSession = null;
    try {
      existingSession = await getActiveSessionForPlayer(playerId, word.word);
      logger.info('getActiveSessionForPlayer result', { existingSession });
    } catch (err) {
      logger.error('Error fetching active session', { error: err });
      return res
        .status(500)
        .json({ error: 'Session fetch failed', details: err instanceof Error ? err.message : err });
    }
    if (existingSession) {
      const response = formatWordResponse(word, existingSession.id, devMode);
      logger.info('Returning existing session response', { response });
      res.setHeader('Content-Type', 'application/json');
      return res.status(200).json(response);
    }
    try {
      gameSession = await createGameSession(word.word, playerId);
      logger.info('createGameSession result', { gameSession });
    } catch (err) {
      logger.error('Error creating game session', { error: err });
      return res
        .status(500)
        .json({
          error: 'Game session creation failed',
          details: err instanceof Error ? err.message : err,
        });
    }
    if (!gameSession) {
      logger.error('Failed to create game session');
      return res.status(500).json({
        status: 'error',
        message: 'Failed to create game session',
        isOperational: true,
      });
    }
    const response = formatWordResponse(word, gameSession.id, devMode);
    logger.info('Word fetched successfully', {
      gameId: gameSession.id,
      wordId: word.id,
      playerId,
      response,
    });
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json(response);
  } catch (error) {
    logger.error('Error in /api/word route', { error });
    res.setHeader('Content-Type', 'application/json');
    return res
      .status(500)
      .json({ error: error instanceof Error ? error.message : 'Internal server error' });
  }
});

// GET /api/word/random (dev only)
router.get('/random', async (req: Request, res: Response) => {
  try {
    // Only allow in development
    if (process.env.NODE_ENV === 'production') {
      throw Errors.NotFound('Endpoint not found');
    }

    // Get a random word
    const word = await getRandomWord();

    // Create a new game session
    const gameSession = await createGameSession(word.word, req.playerId);

    // Format and return the response
    const response = formatWordResponse(
      word,
      gameSession.id,
      process.env.NODE_ENV !== 'production'
    );
    response.isTest = true;

    logger.info('Random word fetched successfully', {
      gameId: gameSession.id,
      wordId: word.id,
      isTest: true,
    });

    return res.json(response);
  } catch (error) {
    logger.error('Error in random word route', { error });
    if (error instanceof Error) {
      throw Errors.InternalServer(error.message);
    }
    throw error;
  }
});

export default router;
