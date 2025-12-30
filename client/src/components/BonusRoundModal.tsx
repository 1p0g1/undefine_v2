/**
 * BonusRoundModal.tsx
 * 
 * Early Finisher Bonus Round - guess dictionary neighbours of today's word.
 * Triggered when player wins in fewer than 6 guesses.
 */

import React, { useState, useCallback } from 'react';
import { getApiBaseUrl } from '../utils/apiHelpers';

// Types
export interface BonusResult {
  attemptNumber: number;
  guess: string;
  valid: boolean;
  tier?: 'perfect' | 'good' | 'average' | 'miss';
  points?: number;
  distance?: number;
  color?: string;
  error?: string;
  message?: string;
}

interface BonusRoundModalProps {
  isOpen: boolean;
  wordId: string;
  playerId: string;
  targetWord: string;
  totalAttempts: number; // Number of unused guesses (e.g., won in 3 = 3 bonus attempts)
  onComplete: (results: BonusResult[], totalPoints: number) => void;
  onSkip: () => void;
}

// Tier styling
const TIER_STYLES: Record<string, { bg: string; border: string; text: string; emoji: string; label: string }> = {
  perfect: {
    bg: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
    border: '#FFD700',
    text: '#000',
    emoji: '🥇',
    label: 'PERFECT!'
  },
  good: {
    bg: 'linear-gradient(135deg, #C0C0C0 0%, #A8A8A8 100%)',
    border: '#C0C0C0',
    text: '#000',
    emoji: '🥈',
    label: 'GOOD!'
  },
  average: {
    bg: 'linear-gradient(135deg, #CD7F32 0%, #A05A2C 100%)',
    border: '#CD7F32',
    text: '#fff',
    emoji: '🥉',
    label: 'AVERAGE'
  },
  miss: {
    bg: 'linear-gradient(135deg, #666 0%, #444 100%)',
    border: '#666',
    text: '#fff',
    emoji: '❌',
    label: 'MISS'
  }
};

// DEFINE letters for visual display
const DEFINE_LETTERS = ['D', 'E', 'F', 'I', 'N', 'E'];

export const BonusRoundModal: React.FC<BonusRoundModalProps> = ({
  isOpen,
  wordId,
  playerId,
  targetWord,
  totalAttempts,
  onComplete,
  onSkip
}) => {
  const [currentAttempt, setCurrentAttempt] = useState(1);
  const [guess, setGuess] = useState('');
  const [results, setResults] = useState<BonusResult[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastResult, setLastResult] = useState<BonusResult | null>(null);
  const [showResult, setShowResult] = useState(false);

  const totalPoints = results.reduce((sum, r) => sum + (r.points || 0), 0);
  const isComplete = currentAttempt > totalAttempts;

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guess.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setShowResult(false);

    try {
      const baseUrl = getApiBaseUrl();
      const response = await fetch(`${baseUrl}/api/bonus/check-guess`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guess: guess.trim(),
          wordId,
          playerId,
          attemptNumber: currentAttempt
        })
      });

      const data = await response.json();

      const result: BonusResult = {
        attemptNumber: currentAttempt,
        guess: guess.trim(),
        valid: data.valid,
        tier: data.tier,
        points: data.points || 0,
        distance: data.distance,
        color: data.color,
        error: data.error,
        message: data.message
      };

      // If word not found, allow retry (don't advance attempt)
      if (data.error === 'word_not_found' || data.error === 'same_word') {
        setLastResult(result);
        setShowResult(true);
        setGuess('');
        setIsSubmitting(false);
        return;
      }

      // Valid attempt - record and advance
      setResults(prev => [...prev, result]);
      setLastResult(result);
      setShowResult(true);
      setGuess('');

      // Auto-advance after showing result
      setTimeout(() => {
        setCurrentAttempt(prev => prev + 1);
        setShowResult(false);
        setLastResult(null);
      }, 2000);

    } catch (error) {
      console.error('[BonusRound] Error submitting guess:', error);
      setLastResult({
        attemptNumber: currentAttempt,
        guess: guess.trim(),
        valid: false,
        error: 'network_error',
        message: 'Failed to check guess. Please try again.'
      });
      setShowResult(true);
    } finally {
      setIsSubmitting(false);
    }
  }, [guess, wordId, playerId, currentAttempt, isSubmitting]);

  const handleFinish = useCallback(() => {
    onComplete(results, totalPoints);
  }, [results, totalPoints, onComplete]);

  if (!isOpen) return null;

  // Calculate which DEFINE boxes are "used" vs "bonus"
  const guessesUsed = 6 - totalAttempts;

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        {/* Header */}
        <div style={styles.header}>
          <h2 style={styles.title}>🎯 Bonus Round!</h2>
          <p style={styles.subtitle}>
            Guess words close to <strong>{targetWord}</strong> in the dictionary
          </p>
        </div>

        {/* DEFINE boxes visualization */}
        <div style={styles.defineRow}>
          {DEFINE_LETTERS.map((letter, idx) => {
            const isUsed = idx < guessesUsed;
            const isCurrent = idx === guessesUsed + (currentAttempt - 1);
            const isBonus = idx >= guessesUsed && idx < guessesUsed + totalAttempts;
            const bonusIdx = idx - guessesUsed;
            const result = results[bonusIdx];

            let boxStyle = { ...styles.defineBox };
            if (isUsed) {
              boxStyle = { ...boxStyle, ...styles.defineBoxUsed };
            } else if (result) {
              const tierStyle = TIER_STYLES[result.tier || 'miss'];
              boxStyle = { ...boxStyle, background: tierStyle.bg, borderColor: tierStyle.border, color: tierStyle.text };
            } else if (isCurrent) {
              boxStyle = { ...boxStyle, ...styles.defineBoxCurrent };
            } else if (isBonus) {
              boxStyle = { ...boxStyle, ...styles.defineBoxBonus };
            }

            return (
              <div key={idx} style={boxStyle}>
                {result ? TIER_STYLES[result.tier || 'miss'].emoji : letter}
              </div>
            );
          })}
        </div>

        {/* Progress */}
        <div style={styles.progress}>
          {isComplete ? (
            <span style={styles.progressComplete}>All attempts complete!</span>
          ) : (
            <span>Attempt {currentAttempt} of {totalAttempts}</span>
          )}
          <span style={styles.points}>{totalPoints} pts</span>
        </div>

        {/* Result display */}
        {showResult && lastResult && (
          <div style={{
            ...styles.resultCard,
            background: lastResult.valid 
              ? TIER_STYLES[lastResult.tier || 'miss'].bg 
              : '#ff4444',
            borderColor: lastResult.valid 
              ? TIER_STYLES[lastResult.tier || 'miss'].border 
              : '#ff4444'
          }}>
            {lastResult.valid ? (
              <>
                <div style={styles.resultEmoji}>
                  {TIER_STYLES[lastResult.tier || 'miss'].emoji}
                </div>
                <div style={styles.resultText}>
                  <strong>{TIER_STYLES[lastResult.tier || 'miss'].label}</strong>
                  <span style={styles.resultDetail}>
                    "{lastResult.guess}" is {lastResult.distance} words away
                  </span>
                  <span style={styles.resultPoints}>+{lastResult.points} pts</span>
                </div>
              </>
            ) : (
              <div style={styles.resultText}>
                <span style={styles.resultError}>{lastResult.message}</span>
              </div>
            )}
          </div>
        )}

        {/* Input form */}
        {!isComplete && !showResult && (
          <form onSubmit={handleSubmit} style={styles.form}>
            <input
              type="text"
              value={guess}
              onChange={(e) => setGuess(e.target.value)}
              placeholder="Enter a word..."
              style={styles.input}
              autoFocus
              disabled={isSubmitting}
            />
            <button
              type="submit"
              style={styles.submitButton}
              disabled={!guess.trim() || isSubmitting}
            >
              {isSubmitting ? '...' : 'Guess'}
            </button>
          </form>
        )}

        {/* Hint */}
        {!isComplete && !showResult && (
          <p style={styles.hint}>
            💡 Try guessing words alphabetically close to "{targetWord}"
          </p>
        )}

        {/* Actions */}
        <div style={styles.actions}>
          {isComplete ? (
            <button onClick={handleFinish} style={styles.finishButton}>
              See Results →
            </button>
          ) : (
            <button onClick={onSkip} style={styles.skipButton}>
              Skip Bonus Round
            </button>
          )}
        </div>

        {/* Results summary */}
        {results.length > 0 && (
          <div style={styles.summary}>
            <div style={styles.summaryTitle}>Results</div>
            {results.map((r, idx) => (
              <div key={idx} style={styles.summaryRow}>
                <span style={styles.summaryEmoji}>
                  {TIER_STYLES[r.tier || 'miss'].emoji}
                </span>
                <span style={styles.summaryWord}>{r.guess}</span>
                <span style={styles.summaryDistance}>{r.distance} away</span>
                <span style={styles.summaryPoints}>+{r.points}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '1rem',
  },
  modal: {
    background: '#1a1a2e',
    borderRadius: '16px',
    padding: '2rem',
    maxWidth: '480px',
    width: '100%',
    maxHeight: '90vh',
    overflow: 'auto',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
  },
  header: {
    textAlign: 'center',
    marginBottom: '1.5rem',
  },
  title: {
    fontSize: '1.75rem',
    fontWeight: 700,
    color: '#FFD700',
    margin: 0,
  },
  subtitle: {
    fontSize: '1rem',
    color: '#aaa',
    marginTop: '0.5rem',
  },
  defineRow: {
    display: 'flex',
    justifyContent: 'center',
    gap: '8px',
    marginBottom: '1.5rem',
  },
  defineBox: {
    width: '44px',
    height: '44px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.25rem',
    fontWeight: 700,
    border: '2px solid #333',
    background: '#2a2a3e',
    color: '#666',
    transition: 'all 0.3s ease',
  },
  defineBoxUsed: {
    background: '#333',
    borderColor: '#444',
    color: '#555',
  },
  defineBoxCurrent: {
    background: '#16213e',
    borderColor: '#FFD700',
    color: '#FFD700',
    boxShadow: '0 0 20px rgba(255, 215, 0, 0.3)',
  },
  defineBoxBonus: {
    background: '#2a2a3e',
    borderColor: '#555',
    color: '#888',
  },
  progress: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem',
    color: '#888',
    fontSize: '0.9rem',
  },
  progressComplete: {
    color: '#4CAF50',
    fontWeight: 600,
  },
  points: {
    fontWeight: 700,
    color: '#FFD700',
    fontSize: '1.1rem',
  },
  resultCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '1rem',
    borderRadius: '12px',
    marginBottom: '1rem',
    border: '2px solid',
  },
  resultEmoji: {
    fontSize: '2.5rem',
  },
  resultText: {
    display: 'flex',
    flexDirection: 'column',
    color: '#000',
  },
  resultDetail: {
    fontSize: '0.9rem',
    opacity: 0.8,
  },
  resultPoints: {
    fontWeight: 700,
    fontSize: '1.1rem',
    marginTop: '0.25rem',
  },
  resultError: {
    color: '#fff',
    fontSize: '0.95rem',
  },
  form: {
    display: 'flex',
    gap: '0.75rem',
    marginBottom: '1rem',
  },
  input: {
    flex: 1,
    padding: '0.875rem 1rem',
    fontSize: '1rem',
    border: '2px solid #333',
    borderRadius: '8px',
    background: '#2a2a3e',
    color: '#fff',
    outline: 'none',
  },
  submitButton: {
    padding: '0.875rem 1.5rem',
    fontSize: '1rem',
    fontWeight: 600,
    background: '#FFD700',
    color: '#000',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  hint: {
    fontSize: '0.85rem',
    color: '#666',
    textAlign: 'center',
    marginBottom: '1rem',
  },
  actions: {
    display: 'flex',
    justifyContent: 'center',
    marginTop: '1rem',
  },
  finishButton: {
    padding: '1rem 2rem',
    fontSize: '1rem',
    fontWeight: 600,
    background: 'linear-gradient(135deg, #4CAF50 0%, #388E3C 100%)',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  skipButton: {
    padding: '0.75rem 1.5rem',
    fontSize: '0.9rem',
    background: 'transparent',
    color: '#666',
    border: '1px solid #444',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  summary: {
    marginTop: '1.5rem',
    padding: '1rem',
    background: '#16213e',
    borderRadius: '8px',
  },
  summaryTitle: {
    fontSize: '0.85rem',
    color: '#666',
    marginBottom: '0.75rem',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  summaryRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.5rem 0',
    borderBottom: '1px solid #2a2a3e',
  },
  summaryEmoji: {
    fontSize: '1.25rem',
  },
  summaryWord: {
    flex: 1,
    color: '#fff',
    fontWeight: 500,
  },
  summaryDistance: {
    color: '#888',
    fontSize: '0.85rem',
  },
  summaryPoints: {
    color: '#FFD700',
    fontWeight: 600,
  },
};

export default BonusRoundModal;

