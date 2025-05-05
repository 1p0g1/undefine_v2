/**
 * Error handling utility for Un-Define v2
 */

import { logger } from './logger.js';
import { Request, Response, NextFunction } from 'express';

// Custom error class for API errors
export class ApiError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Error handler for API routes
export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  logger.error('Error occurred', { error: err.message, stack: err.stack });

  if (err instanceof ApiError) {
    res.status(err.statusCode).json({
      status: 'error',
      message: err.message,
      isOperational: err.isOperational,
    });
  } else {
    // For unknown errors, return a generic message
    res.status(500).json({
      status: 'error',
      message: 'An unexpected error occurred',
    });
  }
};

// Common error types
export const Errors = {
  BadRequest: (message: string) => new ApiError(message, 400),
  Unauthorized: (message: string) => new ApiError(message, 401),
  Forbidden: (message: string) => new ApiError(message, 403),
  NotFound: (message: string) => new ApiError(message, 404),
  Conflict: (message: string) => new ApiError(message, 409),
  InternalServer: (message: string) => new ApiError(message, 500),
  ServiceUnavailable: (message: string) => new ApiError(message, 503),
};
