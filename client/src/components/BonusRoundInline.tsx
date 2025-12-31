/**
 * BonusRoundInline.tsx
 * 
 * Inline bonus round UI - shows after winning early (<6 guesses).
 * Allows player to guess dictionary neighbours of today's word.
 */

import React, { useState, useCallback } from 'react';
import { getApiBaseUrl } from '../utils/apiHelpers';

export interface BonusGuessResult {
  guess: string;
  valid: boolean;
  tier?: 'perfect' | 'good' | 'average' | 'miss';
  distance?: number;
  error?: string;
  message?: string;
}

interface BonusRoundInlineProps {
  wordId: string;
  playerId: string;
  targetWord: string;
  remainingAttempts: number; // Number of unused guesses
  gameSessionId?: string; // For persisting guesses to database
  onComplete?: (results: BonusGuessResult[]) => void;
}

// Tier display info
const TIER_INFO: Record<string, { emoji: string; label: string; color: string; bg: string }> = {
  perfect: { emoji: '🥇', label: 'Gold', color: '#B8860B', bg: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)' },
  good: { emoji: '🥈', label: 'Silver', color: '#6B7280', bg: 'linear-gradient(135deg, #C0C0C0 0%, #A8A8A8 100%)' },
  average: { emoji: '🥉', label: 'Bronze', color: '#92400E', bg: 'linear-gradient(135deg, #CD7F32 0%, #A05A2C 100%)' },
  miss: { emoji: '❌', label: 'Miss', color: '#666', bg: '#f3f4f6' }
};

export const BonusRoundInline: React.FC<BonusRoundInlineProps> = ({
  wordId,
  playerId,
  targetWord,
  remainingAttempts,
  gameSessionId,
  onComplete
}) => {
  const [currentAttempt, setCurrentAttempt] = useState(0);
  const [guess, setGuess] = useState('');
  const [results, setResults] = useState<BonusGuessResult[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showNearbyWords, setShowNearbyWords] = useState(false);
  const [nearbyWords, setNearbyWords] = useState<{ above: string[]; below: string[] } | null>(null);
  const [loadingNearby, setLoadingNearby] = useState(false);
  const [userFinished, setUserFinished] = useState(false); // User clicked continue

  const isComplete = currentAttempt >= remainingAttempts;

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guess.trim() || isSubmitting || isComplete) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const baseUrl = getApiBaseUrl();
      const response = await fetch(`${baseUrl}/api/bonus/check-guess`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guess: guess.trim(),
          wordId,
          playerId,
          attemptNumber: currentAttempt + 1,
          gameSessionId
        })
      });

      const data = await response.json();

      // If word not found or same word, show error but don't advance
      if (data.error === 'word_not_found') {
        setErrorMessage('Word not in dictionary. Try another!');
        setGuess('');
        setIsSubmitting(false);
        return;
      }
      
      if (data.error === 'same_word') {
        setErrorMessage("That's today's word! Try a nearby word.");
        setGuess('');
        setIsSubmitting(false);
        return;
      }

      if (data.error === 'target_not_found') {
        setErrorMessage('Bonus round unavailable for this word.');
        setIsSubmitting(false);
        return;
      }

      // Valid guess - record result
      const result: BonusGuessResult = {
        guess: guess.trim(),
        valid: data.valid,
        tier: data.tier,
        distance: data.distance,
        error: data.error,
        message: data.message
      };

      setResults(prev => [...prev, result]);
      setCurrentAttempt(prev => prev + 1);
      setGuess('');

      // Don't auto-complete - let user review results and click continue

    } catch (error) {
      console.error('[BonusRound] Error:', error);
      setErrorMessage('Failed to check guess. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [guess, wordId, playerId, currentAttempt, remainingAttempts, isSubmitting, isComplete, results, onComplete]);

  const handleSkip = useCallback(() => {
    setUserFinished(true);
    if (onComplete) {
      onComplete(results);
    }
  }, [results, onComplete]);

  const handleContinue = useCallback(() => {
    setUserFinished(true);
    if (onComplete) {
      onComplete(results);
    }
  }, [results, onComplete]);

  const fetchNearbyWords = useCallback(async () => {
    if (nearbyWords || loadingNearby) return;
    
    setLoadingNearby(true);
    try {
      const baseUrl = getApiBaseUrl();
      const response = await fetch(`${baseUrl}/api/bonus/nearby-words?wordId=${wordId}`);
      const data = await response.json();
      
      if (data.above && data.below) {
        setNearbyWords({ above: data.above, below: data.below });
        setShowNearbyWords(true);
      }
    } catch (error) {
      console.error('[BonusRound] Error fetching nearby words:', error);
    } finally {
      setLoadingNearby(false);
    }
  }, [wordId, nearbyWords, loadingNearby]);

  if (remainingAttempts <= 0) return null;

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <span style={styles.emoji}>🎯</span>
        <span style={styles.title}>Bonus Round!</span>
      </div>

      {/* Explanation */}
      <div style={styles.explanation}>
        Can you guess <strong>{remainingAttempts - currentAttempt}</strong> word{remainingAttempts - currentAttempt !== 1 ? 's' : ''} nearby "<strong>{targetWord}</strong>" in the dictionary?
      </div>

      {/* Scoring table */}
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Distance</th>
            <th style={styles.th}>Tier</th>
            <th style={styles.th}>Medal</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={styles.td}>≤ 10</td>
            <td style={styles.td}>Perfect</td>
            <td style={styles.td}>🥇 Gold</td>
          </tr>
          <tr>
            <td style={styles.td}>≤ 20</td>
            <td style={styles.td}>Good</td>
            <td style={styles.td}>🥈 Silver</td>
          </tr>
          <tr>
            <td style={styles.td}>≤ 30</td>
            <td style={styles.td}>Average</td>
            <td style={styles.td}>🥉 Bronze</td>
          </tr>
          <tr>
            <td style={styles.td}>&gt; 30</td>
            <td style={styles.td}>Miss</td>
            <td style={styles.td}>❌</td>
          </tr>
        </tbody>
      </table>

      {/* Results list */}
      {results.length > 0 && (
        <div style={styles.results}>
          {results.map((r, idx) => {
            const tier = TIER_INFO[r.tier || 'miss'];
            return (
              <div key={idx} style={{ ...styles.resultRow, background: tier.bg }}>
                <span style={styles.resultEmoji}>{tier.emoji}</span>
                <span style={styles.resultWord}>{r.guess}</span>
                <span style={styles.resultDistance}>{r.distance} away</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Input or completion */}
      {!isComplete && !userFinished ? (
        <>
          <form onSubmit={handleSubmit} style={styles.form}>
            <input
              type="text"
              value={guess}
              onChange={(e) => setGuess(e.target.value)}
              placeholder={`Guess ${currentAttempt + 1} of ${remainingAttempts}`}
              style={styles.input}
              disabled={isSubmitting}
              autoFocus
            />
            <button
              type="submit"
              style={styles.button}
              disabled={!guess.trim() || isSubmitting}
            >
              {isSubmitting ? '...' : 'Go'}
            </button>
          </form>
          {errorMessage && (
            <div style={styles.error}>{errorMessage}</div>
          )}
          <button onClick={handleSkip} style={styles.skipButton}>
            Skip Bonus Round
          </button>
        </>
      ) : !userFinished ? (
        // Complete state - show results and action buttons
        <div style={styles.completeSection}>
          {/* Summary */}
          <div style={styles.summaryBox}>
            <div style={styles.summaryTitle}>🎯 Your Results</div>
            <div style={styles.summaryStats}>
              <span style={styles.statGold}>🥇 {results.filter(r => r.tier === 'perfect').length}</span>
              <span style={styles.statSilver}>🥈 {results.filter(r => r.tier === 'good').length}</span>
              <span style={styles.statBronze}>🥉 {results.filter(r => r.tier === 'average').length}</span>
              <span style={styles.statMiss}>❌ {results.filter(r => r.tier === 'miss').length}</span>
            </div>
          </div>

          {/* Nearby words toggle */}
          <button 
            onClick={fetchNearbyWords} 
            style={styles.nearbyButton}
            disabled={loadingNearby}
          >
            {loadingNearby ? '🔍 Loading...' : showNearbyWords ? '📖 Hide Nearby Words' : '📖 Show Nearby Words (Answers)'}
          </button>

          {/* Nearby words display */}
          {showNearbyWords && nearbyWords && (
            <div style={styles.nearbySection}>
              <div style={styles.nearbyColumn}>
                <div style={styles.nearbyHeader}>⬆️ Words Above</div>
                {nearbyWords.above.map((word, idx) => (
                  <div key={`above-${idx}`} style={styles.nearbyWord}>
                    <span style={styles.nearbyRank}>-{nearbyWords.above.length - idx}</span>
                    <span>{word}</span>
                  </div>
                ))}
              </div>
              <div style={styles.nearbyCenter}>
                <div style={styles.targetWordLabel}>Today's Word</div>
                <div style={styles.targetWordBox}>{targetWord}</div>
              </div>
              <div style={styles.nearbyColumn}>
                <div style={styles.nearbyHeader}>⬇️ Words Below</div>
                {nearbyWords.below.map((word, idx) => (
                  <div key={`below-${idx}`} style={styles.nearbyWord}>
                    <span style={styles.nearbyRank}>+{idx + 1}</span>
                    <span>{word}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Continue button */}
          <button onClick={handleContinue} style={styles.continueButton}>
            📊 Continue to Results
          </button>
        </div>
      ) : null}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    background: 'linear-gradient(135deg, #fefce8 0%, #fef3c7 100%)',
    border: '2px solid #fbbf24',
    borderRadius: '12px',
    padding: '1rem',
    marginTop: '1rem',
    marginBottom: '1rem',
    textAlign: 'center',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    marginBottom: '0.75rem',
  },
  emoji: {
    fontSize: '1.5rem',
  },
  title: {
    fontSize: '1.25rem',
    fontWeight: 700,
    color: '#92400e',
    fontFamily: 'var(--font-primary)',
  },
  explanation: {
    fontSize: '0.95rem',
    color: '#78350f',
    marginBottom: '1rem',
    lineHeight: 1.4,
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    marginBottom: '1rem',
    fontSize: '0.85rem',
  },
  th: {
    background: '#fde68a',
    padding: '0.5rem',
    fontWeight: 600,
    color: '#78350f',
    borderBottom: '2px solid #f59e0b',
  },
  td: {
    padding: '0.4rem',
    borderBottom: '1px solid #fcd34d',
    color: '#78350f',
  },
  results: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    marginBottom: '1rem',
  },
  resultRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.5rem 0.75rem',
    borderRadius: '8px',
    color: '#000',
  },
  resultEmoji: {
    fontSize: '1.25rem',
  },
  resultWord: {
    fontWeight: 600,
    flex: 1,
    textAlign: 'left',
  },
  resultDistance: {
    fontSize: '0.85rem',
    opacity: 0.8,
  },
  form: {
    display: 'flex',
    gap: '0.5rem',
    marginBottom: '0.5rem',
  },
  input: {
    flex: 1,
    padding: '0.625rem 0.875rem',
    fontSize: '1rem',
    border: '2px solid #f59e0b',
    borderRadius: '8px',
    outline: 'none',
    fontFamily: 'var(--font-primary)',
  },
  button: {
    padding: '0.625rem 1.25rem',
    fontSize: '1rem',
    fontWeight: 600,
    background: '#f59e0b',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  error: {
    color: '#dc2626',
    fontSize: '0.85rem',
    marginBottom: '0.5rem',
  },
  skipButton: {
    padding: '0.5rem 1rem',
    fontSize: '0.85rem',
    background: 'transparent',
    color: '#92400e',
    border: '1px solid #d97706',
    borderRadius: '6px',
    cursor: 'pointer',
    opacity: 0.7,
  },
  completeSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  summaryBox: {
    background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
    border: '2px solid #10b981',
    borderRadius: '10px',
    padding: '1rem',
  },
  summaryTitle: {
    fontSize: '1.1rem',
    fontWeight: 700,
    color: '#065f46',
    marginBottom: '0.5rem',
  },
  summaryStats: {
    display: 'flex',
    justifyContent: 'center',
    gap: '1rem',
    fontSize: '1.1rem',
    fontWeight: 600,
  },
  statGold: {
    color: '#b8860b',
  },
  statSilver: {
    color: '#6b7280',
  },
  statBronze: {
    color: '#92400e',
  },
  statMiss: {
    color: '#dc2626',
  },
  nearbyButton: {
    padding: '0.625rem 1rem',
    fontSize: '0.9rem',
    fontWeight: 500,
    background: '#fef3c7',
    color: '#92400e',
    border: '2px solid #f59e0b',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  nearbySection: {
    display: 'grid',
    gridTemplateColumns: '1fr auto 1fr',
    gap: '0.5rem',
    background: '#fffbeb',
    border: '1px solid #fcd34d',
    borderRadius: '8px',
    padding: '0.75rem',
    fontSize: '0.8rem',
    textAlign: 'left',
  },
  nearbyColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
  },
  nearbyHeader: {
    fontWeight: 600,
    color: '#92400e',
    marginBottom: '0.25rem',
    textAlign: 'center',
    fontSize: '0.85rem',
  },
  nearbyWord: {
    display: 'flex',
    gap: '0.5rem',
    padding: '0.2rem 0.4rem',
    background: '#fff',
    borderRadius: '4px',
    border: '1px solid #fde68a',
  },
  nearbyRank: {
    color: '#9ca3af',
    fontSize: '0.75rem',
    minWidth: '24px',
  },
  nearbyCenter: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0 0.5rem',
  },
  targetWordLabel: {
    fontSize: '0.7rem',
    color: '#6b7280',
    marginBottom: '0.25rem',
  },
  targetWordBox: {
    background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
    color: '#fff',
    fontWeight: 700,
    padding: '0.5rem 0.75rem',
    borderRadius: '6px',
    textTransform: 'uppercase',
    fontSize: '0.9rem',
  },
  continueButton: {
    padding: '0.875rem 1.5rem',
    fontSize: '1rem',
    fontWeight: 700,
    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
  },
};

export default BonusRoundInline;

