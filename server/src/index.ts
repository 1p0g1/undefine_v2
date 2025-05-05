import express, { Request, Response } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import wordRouter from './routes/word.js';
import guessRouter from './routes/guess.js';
import testRouter from './routes/test.js';
import devRoutes from './routes/dev.js';
import { errorHandler } from './utils/errors.js';
import { logger } from './utils/logger.js';
import { validatePlayerId } from './middleware/playerAuth.js';

// Get the directory path for the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables with fallback for Render deployment
try {
  dotenv.config({ path: path.resolve(__dirname, '../../.env') });
  logger.info('Environment loaded', {
    nodeEnv: process.env.NODE_ENV,
    dbProvider: process.env.DB_PROVIDER,
    hasSupabaseUrl: !!process.env.SUPABASE_URL,
    hasSupabaseKey: !!process.env.SUPABASE_ANON_KEY,
  });
} catch (error) {
  logger.error('Failed to load environment', {
    error: error instanceof Error ? error.message : String(error),
  });
  process.exit(1);
}

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// Error handling for uncaught exceptions
process.on('uncaughtException', error => {
  logger.error('Uncaught Exception', {
    error: error instanceof Error ? error.message : String(error),
  });
  process.exit(1);
});

process.on('unhandledRejection', reason => {
  logger.error('Unhandled Rejection', {
    error: reason instanceof Error ? reason.message : String(reason),
  });
  process.exit(1);
});

// Health check - critical for Render deployment
app.get('/api/test', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
// app.use('/api/word', validatePlayerId, wordRouter);
app.use('/api/word', wordRouter);
app.use('/api/guess', validatePlayerId, guessRouter);
app.use('/api', testRouter);
app.use('/api/dev', devRoutes);

// Error handling middleware
app.use(errorHandler);

// Start server - Render will use this port
app.listen(port, () => {
  logger.info(`Server running at http://localhost:${port}`);
});
