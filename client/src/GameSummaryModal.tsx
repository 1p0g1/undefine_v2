import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { DefineBoxes, GuessStatus } from './components/DefineBoxes';

interface LeaderboardEntry {
  rank: number;
  player: string;
  time: string;
  guesses: number;
  fuzzy: number;
  hints: number;
  isSelf?: boolean;
}

interface GameSummaryModalProps {
  open: boolean;
  onClose: () => void;
  onPlayAgain: () => void;
  leaderboard: LeaderboardEntry[];
  guessStatus: GuessStatus[];
  word: string;
  time: string;
  rank: number;
  guessesUsed: number;
  fuzzyMatches: number;
  hintsUsed: number;
  date: string;
}

export const GameSummaryModal: React.FC<GameSummaryModalProps> = ({
  open,
  onClose,
  onPlayAgain,
  leaderboard,
  guessStatus,
  word,
  time,
  rank,
  guessesUsed,
  fuzzyMatches,
  hintsUsed,
  date,
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

  // Modal content
  const modalContent = (
    <div
      className="gs-modal-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div
        className="gs-modal-sheet animate-modal"
        ref={modalRef}
        tabIndex={-1}
        style={{
          background: 'var(--color-bg)',
          borderRadius: '1.25rem',
          boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
          width: '95vw',
          maxWidth: 420,
          minHeight: '60vh',
          maxHeight: '90vh',
          padding: '1.2rem 0.7rem 1.2rem 0.7rem',
          outline: 'none',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          overflowY: 'auto',
          animation: 'modalFadeIn 0.35s cubic-bezier(.4,1.4,.6,1)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <button
          className="gs-modal-close"
          onClick={onClose}
          aria-label="Close"
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            fontSize: 28,
            background: 'none',
            border: 'none',
            color: 'var(--color-primary)',
            width: 40,
            height: 40,
            borderRadius: 20,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
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
            Today you ranked <span style={{ fontWeight: 700 }}>#{rank}</span>
          </div>
          <div>
            Guesses: <span style={{ fontWeight: 700 }}>{guessesUsed}/6</span>, Fuzzy:{' '}
            <span style={{ fontWeight: 700 }}>{fuzzyMatches}/6</span>
          </div>
        </div>
        <div
          className="gs-modal-table-wrap"
          style={{ width: '100%', overflowX: 'auto', marginBottom: '1.2rem' }}
        >
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
                <th style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid #e5e7eb' }}>
                  Fuzzy
                </th>
                <th style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid #e5e7eb' }}>
                  Hints
                </th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((entry, idx) => (
                <tr
                  key={entry.rank}
                  style={{
                    background: idx % 2 === 1 ? '#f7faff' : undefined,
                    fontWeight: entry.isSelf ? 600 : entry.rank === 1 ? 700 : 400,
                    borderBottom: '1px solid #f0f0f0',
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
                    {entry.player}
                  </td>
                  <td
                    style={{ padding: '0.5rem 0.75rem', textAlign: 'center', verticalAlign: 'top' }}
                  >
                    {entry.time}
                  </td>
                  <td style={{ padding: '0.5rem 0.75rem', verticalAlign: 'top' }}>
                    {entry.guesses}
                  </td>
                  <td style={{ padding: '0.5rem 0.75rem', verticalAlign: 'top' }}>{entry.fuzzy}</td>
                  <td style={{ padding: '0.5rem 0.75rem', verticalAlign: 'top' }}>{entry.hints}</td>
                </tr>
              ))}
            </tbody>
          </table>
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
        <style>{`
          @keyframes modalFadeIn {
            0% { opacity: 0; transform: scale(0.96) translateY(40px); }
            100% { opacity: 1; transform: scale(1) translateY(0); }
          }
          @keyframes fadeIn {
            0% { opacity: 0; }
            100% { opacity: 1; }
          }
          .gs-modal-sheet:focus { outline: 2px solid var(--color-primary); }
          @media (max-width: 600px) {
            .gs-modal-sheet {
              width: 98vw !important;
              max-width: 99vw !important;
              min-height: 80vh !important;
              max-height: 98vh !important;
              border-radius: 1.1rem !important;
              padding: 0.7rem 0.1rem 1rem 0.1rem !important;
            }
            .gs-modal-header { font-size: 1.15rem !important; }
            .gs-modal-actions button { font-size: 15px !important; }
          }
          @media (min-width: 601px) {
            .gs-modal-sheet { font-size: 1.08rem; }
            .gs-modal-table { font-size: 15px !important; }
            .gs-modal-actions button { font-size: 17px !important; }
          }
        `}</style>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
