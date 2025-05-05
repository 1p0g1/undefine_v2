import React from 'react';
import { DefineBoxes } from './DefineBoxes';

type GuessStatus = 'correct' | 'incorrect' | 'fuzzy' | 'active' | 'empty';
type LeaderboardEntry = {
  rank: number;
  player: string;
  time: string;
  guesses: number;
};

interface ResultCardProps {
  open: boolean;
  onClose: () => void;
  onPlayAgain: () => void;
  guessStatus: GuessStatus[];
  guesses: string[];
  solution: string;
  time: string;
  isWin: boolean;
  leaderboardData: LeaderboardEntry[];
  stats: {
    guessesUsed: number;
    fuzzyMatches: number;
    hintsUsed: number;
  };
}

export function ResultCard({
  open,
  onClose,
  onPlayAgain,
  guessStatus,
  guesses,
  solution,
  time,
  isWin,
  leaderboardData,
  stats,
}: ResultCardProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
      <div
        className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md relative"
        style={{
          fontFamily: 'var(--font-primary)',
          background: 'var(--color-bg)',
          color: 'var(--color-primary)',
        }}
      >
        <button
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-700"
          onClick={onClose}
          style={{ fontFamily: 'var(--font-primary)' }}
        >
          &times;
        </button>
        <div className="mb-4 flex flex-col items-center">
          <DefineBoxes
            gameState={{
              gameId: '',
              guesses: [],
              revealedClues: [],
              clueStatus: {},
              usedHint: false,
              isComplete: true,
              isWon: isWin,
            }}
            revealedClues={[]}
            guessStatus={guessStatus}
          />
          <div className="text-lg font-bold mt-2" style={{ fontFamily: 'var(--font-primary)' }}>
            {isWin ? '🎉 You guessed the word!' : `The word was: ${solution}`}
          </div>
          <div
            className="text-sm mt-1"
            style={{
              fontFamily: 'var(--font-primary)',
              color: 'var(--color-primary)',
              opacity: 0.7,
            }}
          >
            You guessed <span className="font-semibold">{guesses[guesses.length - 1]}</span> in{' '}
            <span className="font-semibold">{time}</span>
          </div>
        </div>
        <div
          className="mb-4 flex justify-between text-sm"
          style={{ fontFamily: 'var(--font-primary)' }}
        >
          <div>
            Guesses: <span className="font-semibold">{stats.guessesUsed}</span>
          </div>
          <div>
            Fuzzy: <span className="font-semibold">{stats.fuzzyMatches}</span>
          </div>
          <div>
            Hints: <span className="font-semibold">{stats.hintsUsed}</span>
          </div>
        </div>
        <div className="mb-4">
          <h3 className="font-semibold mb-2" style={{ fontFamily: 'var(--font-primary)' }}>
            Today's Challenge Results
          </h3>
          <table
            className="w-full text-sm border leaderboard-table"
            style={{ fontFamily: 'var(--font-primary)' }}
          >
            <thead>
              <tr className="bg-gray-100">
                <th className="px-2 py-1">#</th>
                <th className="px-2 py-1">Player</th>
                <th className="px-2 py-1">Time</th>
                <th className="px-2 py-1">Guesses</th>
              </tr>
            </thead>
            <tbody>
              {leaderboardData.map(entry => (
                <tr key={entry.rank} className="text-center">
                  <td>{entry.rank}</td>
                  <td>{entry.player}</td>
                  <td>{entry.time}</td>
                  <td>{entry.guesses}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex justify-center gap-4 mt-4">
          <button
            className="px-4 py-2 rounded"
            style={{
              fontFamily: 'var(--font-primary)',
              background: 'var(--color-primary)',
              color: '#fff',
              boxShadow: '0 1px 4px rgba(26,35,126,0.06)',
            }}
            onClick={onPlayAgain}
          >
            Play Again
          </button>
          <button
            className="px-4 py-2 rounded"
            style={{
              fontFamily: 'var(--font-primary)',
              background: '#f3f4f6',
              color: 'var(--color-primary)',
            }}
          >
            Share
          </button>
        </div>
      </div>
    </div>
  );
}
