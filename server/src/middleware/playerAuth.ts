import { Request, Response, NextFunction } from 'express';
import { Errors } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

/**
 * Middleware to validate player ID in request headers
 */
export function validatePlayerId(req: Request, _res: Response, next: NextFunction) {
  try {
    const playerId = req.headers['x-player-id'];

    logger.info('Validating player ID', {
      playerId,
      headerKeys: Object.keys(req.headers),
    });

    if (!playerId || typeof playerId !== 'string') {
      logger.warn('Missing or invalid player ID in request');
      throw Errors.BadRequest('Player ID is required');
    }

    // Allow any non-empty string as player ID in development
    if (process.env.NODE_ENV === 'development') {
      if (playerId.trim().length === 0) {
        logger.warn('Empty player ID provided');
        throw Errors.BadRequest('Player ID cannot be empty');
      }
      req.playerId = playerId;
      return next();
    }

    // In production, enforce UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(playerId)) {
      logger.warn('Invalid player ID format in production', { playerId });
      throw Errors.BadRequest('Invalid player ID format');
    }

    // Store validated player ID in request
    req.playerId = playerId;
    next();
  } catch (error) {
    next(error);
  }
}

// Extend Express Request type to include playerId
declare global {
  namespace Express {
    interface Request {
      playerId: string;
    }
  }
}
