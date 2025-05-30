import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { DefineBoxes, GuessStatus } from './components/DefineBoxes';
import { LeaderboardEntry } from './api/types';

interface GameSummaryModalProps {
  open: boolean;
  onClose: () => void;
  onPlayAgain: () => void;
  leaderboard: LeaderboardEntry[];
  playerRank: number | null;
  guessStatus: GuessStatus[];
  word: string;
  time: string;
  guessesUsed: number;
  fuzzyMatches: number;
  hintsUsed: number;
  date: string;
  isLoading?: boolean;
  error?: string;
  score?: {
    baseScore: number;
    guessPenalty: number;
    timePenalty: number;
    hintPenalty: number;
    score: number;
  };
}

export const GameSummaryModal: React.FC<GameSummaryModalProps> = ({
  open,
  onClose,
  onPlayAgain,
  leaderboard,
  playerRank,
  guessStatus,
  word,
  time,
  guessesUsed,
  fuzzyMatches,
  hintsUsed,
  date,
  isLoading = false,
  error,
  score,
}) => {
  const [copied, setCopied] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    // Focus trap
    if (modalRef.current) modalRef.current.focus();
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const handleCopy = () => {
    const summary = `UN·DEFINE ${date}\n${guessStatus.map(s => (s === 'correct' ? '🟩' : s === 'incorrect' ? '🟥' : s === 'fuzzy' ? '🟧' : '⬜')).join('')}\n${time}\nwww.undefine.io`;
    navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
  };

  const handleShare = () => {
    const shareText = `I ranked #${playerRank || '?'} in today's Un·Define!\n${guessStatus.map(s => (s === 'correct' ? '🟩' : s === 'incorrect' ? '🟥' : s === 'fuzzy' ? '🟧' : '⬜')).join('')}\n${time}\nwww.undefine.io`;
    navigator.clipboard.writeText(shareText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50"
      onClick={onClose}
    >
      <div
        ref={modalRef}
        className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md relative"
        style={{
          fontFamily: 'var(--font-primary)',
          background: 'var(--color-bg)',
          color: 'var(--color-primary)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <button
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-700"
          onClick={onClose}
          style={{ fontFamily: 'var(--font-primary)' }}
        >
          &times;
        </button>
        <div
          style={{
            fontFamily: 'var(--font-primary)',
            fontWeight: 700,
            fontSize: '1.45rem',
            textAlign: 'center',
            marginBottom: '1rem',
            color: 'var(--color-primary)',
          }}
        >
          Today's Results
        </div>
        <div
          className="gs-modal-define-row"
          style={{
            margin: '0 0 1.1rem 0',
            width: '100%',
            display: 'flex',
            justifyContent: 'center',
            paddingTop: 10,
          }}
        >
          <div style={{ transform: 'scale(0.78)', display: 'flex', gap: '0.22rem' }}>
            <DefineBoxes
              gameState={{
                gameId: '',
                wordId: '',
                guesses: [],
                revealedClues: [],
                clueStatus: {},
                usedHint: false,
                isComplete: true,
                isWon: true,
              }}
              revealedClues={[]}
              guessStatus={guessStatus}
            />
          </div>
        </div>
        <div
          style={{
            textAlign: 'center',
            fontSize: 16,
            marginBottom: '1.1rem',
            fontFamily: 'var(--font-primary)',
            color: 'var(--color-primary)',
            fontWeight: 600,
          }}
        >
          <div style={{ marginBottom: 2 }}>
            Today you ranked <span style={{ fontWeight: 700 }}>#{playerRank || '?'}</span>
          </div>
          <div>
            Guesses: <span style={{ fontWeight: 700 }}>{guessesUsed}/6</span>, Fuzzy:{' '}
            <span style={{ fontWeight: 700 }}>{fuzzyMatches}/6</span>
          </div>
          {score && (
            <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#f3f4f6', borderRadius: '0.5rem' }}>
              <div style={{ fontWeight: 700, marginBottom: '0.5rem' }}>Score Breakdown</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.5rem', fontSize: '0.9rem' }}>
                <div>Base Score:</div>
                <div>{score.baseScore}</div>
                <div>Guess Penalty:</div>
                <div style={{ color: '#ef4444' }}>-{score.guessPenalty}</div>
                <div>Time Penalty:</div>
                <div style={{ color: '#ef4444' }}>-{score.timePenalty}</div>
                <div>Hint Penalty:</div>
                <div style={{ color: '#ef4444' }}>-{score.hintPenalty}</div>
                <div style={{ fontWeight: 700 }}>Final Score:</div>
                <div style={{ fontWeight: 700 }}>{score.score}</div>
              </div>
            </div>
          )}
        </div>
        <div
          className="gs-modal-table-wrap"
          style={{ width: '100%', overflowX: 'auto', marginBottom: '1.2rem' }}
        >
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <div className="loading-spinner" style={{ marginBottom: '1rem' }} />
              Loading leaderboard...
            </div>
          ) : error ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#ef4444' }}>
              {error}
            </div>
          ) : leaderboard.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              No entries yet. Be the first to complete today's word!
            </div>
          ) : (
          <table
            className="gs-modal-table"
            style={{
              width: '100%',
              fontFamily: 'var(--font-primary)',
              fontSize: 13,
              borderCollapse: 'separate',
              borderSpacing: 0,
              textAlign: 'left',
            }}
          >
            <thead>
              <tr style={{ background: '#f3f4f6' }}>
                <th style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid #e5e7eb' }}>
                  Rank
                </th>
                <th style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid #e5e7eb' }}>
                  Player
                </th>
                <th
                  style={{
                    padding: '0.5rem 0.75rem',
                    borderBottom: '1px solid #e5e7eb',
                    textAlign: 'center',
                  }}
                >
                  Time
                </th>
                <th style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid #e5e7eb' }}>
                  Guesses
                </th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((entry, idx) => (
                <tr
                    key={entry.id}
                  style={{
                    background: idx % 2 === 1 ? '#f7faff' : undefined,
                      fontWeight: entry.is_current_player ? 600 : entry.rank === 1 ? 700 : 400,
                    borderBottom: '1px solid #f0f0f0',
                      animation: entry.is_current_player ? 'highlightRow 1s ease-out' : undefined,
                  }}
                >
                  <td style={{ padding: '0.5rem 0.75rem', verticalAlign: 'top' }}>
                    <span
                      style={{
                        fontSize: 15,
                        marginRight: 4,
                        verticalAlign: 'top',
                        display: 'inline-block',
                      }}
                    >
                      {entry.rank === 1
                        ? '🥇'
                        : entry.rank === 2
                          ? '🥈'
                          : entry.rank === 3
                            ? '🥉'
                            : entry.rank}
                    </span>
                  </td>
                  <td style={{ padding: '0.5rem 0.75rem', verticalAlign: 'top' }}>
                      {entry.player_name}
                  </td>
                  <td
                    style={{ padding: '0.5rem 0.75rem', textAlign: 'center', verticalAlign: 'top' }}
                  >
                      {formatTime(entry.completion_time_seconds)}
                  </td>
                  <td style={{ padding: '0.5rem 0.75rem', verticalAlign: 'top' }}>
                      {entry.guesses_used}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          )}
        </div>
        <div
          className="gs-modal-actions"
          style={{
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
            marginTop: 8,
            animation: 'fadeIn 0.5s',
          }}
        >
          <button
            className="gs-modal-share"
            onClick={handleShare}
            style={{
              width: '100%',
              minHeight: 48,
              fontSize: 16,
              fontFamily: 'var(--font-primary)',
              background: '#fff',
              color: 'var(--color-primary)',
              border: '2px solid var(--color-primary)',
              borderRadius: 10,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              fontWeight: 700,
            }}
          >
            <span role="img" aria-label="Share" style={{ fontSize: 18 }}>
              📢
            </span>{' '}
            Share Your Rank
          </button>
          <button
            className="gs-modal-copy"
            onClick={handleCopy}
            style={{
              width: '100%',
              minHeight: 48,
              fontSize: 16,
              fontFamily: 'var(--font-primary)',
              background: 'var(--color-primary)',
              color: '#fff',
              border: 'none',
              borderRadius: 10,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              fontWeight: 700,
            }}
          >
            <span role="img" aria-label="Copy" style={{ fontSize: 18 }}>
              📋
            </span>{' '}
            {copied ? 'Copied!' : 'Copy'}
          </button>
          <button
            className="gs-modal-play"
            onClick={onPlayAgain}
            style={{
              width: '100%',
              minHeight: 48,
              fontSize: 16,
              fontFamily: 'var(--font-primary)',
              background: '#fff',
              color: 'var(--color-primary)',
              border: '2px solid var(--color-primary)',
              borderRadius: 10,
              cursor: 'pointer',
              fontWeight: 700,
            }}
          >
            Play Again
          </button>
        </div>
        </div>
        <style>{`
        @keyframes highlightRow {
          0% { background-color: rgba(26, 35, 126, 0.1); }
          100% { background-color: transparent; }
          }
          @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
          }
        .loading-spinner {
          width: 24px;
          height: 24px;
          border: 3px solid #f3f4f6;
          border-top-color: var(--color-primary);
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
          }
        `}</style>
    </div>,
    document.body
  );
};
