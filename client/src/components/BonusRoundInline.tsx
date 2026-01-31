/**
 * BonusRoundInline.tsx
 * 
 * Inline bonus round UI - shows after winning early (<6 guesses).
 * Allows player to guess dictionary neighbours of today's word.
 * 
 * Visual design: "Golden Hour" / "Unlocked Chamber" aesthetic
 * - Soft golden aura with animated gradient
 * - Floating sparkle particles (CSS pseudo-elements)
 * - Gold-themed inputs and buttons
 * - Respects prefers-reduced-motion
 */

import React, { useState, useCallback, useEffect } from 'react';
import { getApiBaseUrl } from '../utils/apiHelpers';

export interface BonusGuessResult {
  guess: string;
  valid: boolean;
  tier?: 'perfect' | 'good' | 'average' | 'miss';
  distance?: number;
  error?: string;
  message?: string;
}

// CSS for golden aura animations - injected once
const BONUS_ROUND_STYLES = `
  @keyframes goldenAuraPulse {
    0%, 100% {
      box-shadow: 
        0 0 30px rgba(251, 191, 36, 0.3),
        0 0 60px rgba(251, 191, 36, 0.15),
        inset 0 0 30px rgba(251, 191, 36, 0.05);
    }
    50% {
      box-shadow: 
        0 0 40px rgba(251, 191, 36, 0.4),
        0 0 80px rgba(251, 191, 36, 0.2),
        inset 0 0 40px rgba(251, 191, 36, 0.08);
    }
  }

  @keyframes shimmerText {
    0% { background-position: -200% center; }
    100% { background-position: 200% center; }
  }

  @keyframes floatSparkle {
    0%, 100% {
      transform: translateY(0) scale(1);
      opacity: 0.6;
    }
    50% {
      transform: translateY(-8px) scale(1.1);
      opacity: 1;
    }
  }

  @keyframes gentleFloat {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-4px); }
  }

  @keyframes successPulse {
    0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(251, 191, 36, 0.4); }
    50% { transform: scale(1.02); box-shadow: 0 0 20px 5px rgba(251, 191, 36, 0.3); }
    100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(251, 191, 36, 0); }
  }

  @media (prefers-reduced-motion: reduce) {
    .bonus-round-container,
    .bonus-round-title,
    .bonus-sparkle,
    .bonus-result-row {
      animation: none !important;
    }
  }

  .bonus-round-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.2);
    backdrop-filter: saturate(0.8);
    z-index: 50;
    cursor: pointer;
  }

  .bonus-round-container {
    position: relative;
    z-index: 51;
    animation: goldenAuraPulse 4s ease-in-out infinite;
  }

  .bonus-round-title {
    background: linear-gradient(
      90deg,
      #b8860b 0%,
      #ffd700 25%,
      #fff8dc 50%,
      #ffd700 75%,
      #b8860b 100%
    );
    background-size: 200% auto;
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    animation: shimmerText 3s linear infinite;
  }

  .bonus-sparkle {
    position: absolute;
    width: 6px;
    height: 6px;
    background: radial-gradient(circle, rgba(255,215,0,0.8) 0%, transparent 70%);
    border-radius: 50%;
    pointer-events: none;
    animation: floatSparkle 3s ease-in-out infinite;
  }

  .bonus-input:focus {
    border-color: #fbbf24 !important;
    box-shadow: 0 0 0 3px rgba(251, 191, 36, 0.3), 0 0 20px rgba(251, 191, 36, 0.2) !important;
    outline: none;
  }

  .bonus-button:hover:not(:disabled) {
    background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%) !important;
    box-shadow: 0 0 20px rgba(251, 191, 36, 0.4);
  }

  .bonus-result-row.success {
    animation: successPulse 0.6s ease-out;
  }
`;

interface BonusRoundInlineProps {
  wordId: string;
  playerId: string;
  targetWord: string;
  remainingAttempts: number; // Number of unused guesses
  gameSessionId?: string; // For persisting guesses to database
  onComplete?: (results: BonusGuessResult[]) => void;
  onClose?: (results: BonusGuessResult[]) => void; // Close handler for clicking outside or X button
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
  onComplete,
  onClose
}) => {
  const [currentAttempt, setCurrentAttempt] = useState(0);
  const [guess, setGuess] = useState('');
  const [results, setResults] = useState<BonusGuessResult[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showNearbyWords, setShowNearbyWords] = useState(false);
  const [nearbyWords, setNearbyWords] = useState<{ above: string[]; below: string[] } | null>(null);
  const [loadingNearby, setLoadingNearby] = useState(false);
  const [userFinished, setUserFinished] = useState(false);
  const [lastResultSuccess, setLastResultSuccess] = useState(false); // For success animation

  const isComplete = currentAttempt >= remainingAttempts;

  // Inject styles once on mount
  useEffect(() => {
    const styleId = 'bonus-round-styles';
    if (!document.getElementById(styleId)) {
      const styleEl = document.createElement('style');
      styleEl.id = styleId;
      styleEl.textContent = BONUS_ROUND_STYLES;
      document.head.appendChild(styleEl);
    }
  }, []);

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

      // If word not in dictionary, show error but don't advance attempt
      if (data.error === 'not_in_dictionary' || data.error === 'word_not_found') {
        setErrorMessage(data.message || 'Word not in dictionary. Try a real word!');
        setGuess('');
        setIsSubmitting(false);
        return;
      }
      
      // If it's the same as today's word
      if (data.error === 'same_word') {
        setErrorMessage(data.message || "That's today's word! Try a nearby word.");
        setGuess('');
        setIsSubmitting(false);
        return;
      }

      // If target word lookup failed
      if (data.error === 'target_not_found') {
        setErrorMessage(data.message || 'Bonus round unavailable for this word.');
        setIsSubmitting(false);
        return;
      }
      
      // If guess is invalid (too short, etc)
      if (data.error === 'invalid_guess') {
        setErrorMessage(data.message || 'Please enter a valid word.');
        setGuess('');
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

      // Trigger success animation for scoring guesses
      if (result.tier && result.tier !== 'miss') {
        setLastResultSuccess(true);
        setTimeout(() => setLastResultSuccess(false), 600);
      }

      // Don't auto-complete - let user review results and click continue

    } catch (error) {
      console.error('[BonusRound] Error:', error);
      setErrorMessage('Failed to check guess. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [guess, wordId, playerId, currentAttempt, remainingAttempts, isSubmitting, isComplete, results, onComplete]);

  const handleClose = useCallback(async () => {
    // Finalize bonus score before closing
    if (gameSessionId && results.length > 0) {
      try {
        const baseUrl = getApiBaseUrl();
        await fetch(`${baseUrl}/api/bonus/finalize-score`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            gameSessionId,
            playerId,
            wordId
          })
        });
        console.log('[BonusRound] Score finalized');
      } catch (error) {
        console.error('[BonusRound] Error finalizing score:', error);
        // Continue anyway - don't block the user
      }
    }
    
    setUserFinished(true);
    if (onComplete) {
      onComplete(results);
    }
    if (onClose) {
      onClose(results);
    }
  }, [results, onComplete, onClose, gameSessionId, playerId, wordId]);

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
    <>
      {/* Subtle page overlay - dims and desaturates background, clickable to close */}
      {!userFinished && <div className="bonus-round-overlay" onClick={handleClose} />}
      
      <div className="bonus-round-container" style={styles.container}>
        {/* Close button */}
        <button 
          onClick={handleClose}
          style={styles.closeButton}
          aria-label="Close bonus round"
        >
          ✕
        </button>
        {/* Floating sparkles - subtle ambient motion */}
        <div className="bonus-sparkle" style={{ top: '10%', left: '5%', animationDelay: '0s' }} />
        <div className="bonus-sparkle" style={{ top: '20%', right: '8%', animationDelay: '1s' }} />
        <div className="bonus-sparkle" style={{ bottom: '15%', left: '10%', animationDelay: '2s' }} />
        <div className="bonus-sparkle" style={{ bottom: '25%', right: '5%', animationDelay: '0.5s' }} />

        {/* Header with shimmer effect */}
        <div style={styles.header}>
          <span style={styles.emoji}>✨</span>
          <span className="bonus-round-title" style={styles.title}>Bonus Round!</span>
          <span style={styles.emoji}>✨</span>
        </div>

        {/* Explanation */}
        <div style={styles.explanation}>
          Guess <strong style={{ color: '#b8860b' }}>{remainingAttempts - currentAttempt}</strong> word{remainingAttempts - currentAttempt !== 1 ? 's' : ''} closest to "<strong style={{ color: '#b8860b' }}>{targetWord}</strong>" in the dictionary. They can come before or after alphabetically.
        </div>

        {/* Compact scoring legend */}
        <div style={styles.scoringLegend}>
          <span><span style={{ color: '#b8860b' }}>🥇</span> ≤10</span>
          <span><span style={{ color: '#6b7280' }}>🥈</span> ≤25</span>
          <span><span style={{ color: '#92400e' }}>🥉</span> ≤50</span>
          <span>❌ &gt;50</span>
        </div>

        {/* Results list with success animation */}
        {results.length > 0 && (
          <div style={styles.results}>
            {results.map((r, idx) => {
              const tier = TIER_INFO[r.tier || 'miss'];
              const isLatest = idx === results.length - 1 && lastResultSuccess;
              return (
                <div 
                  key={idx} 
                  className={`bonus-result-row ${isLatest ? 'success' : ''}`}
                  style={{ ...styles.resultRow, background: tier.bg }}
                >
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
                className="bonus-input"
                style={styles.input}
                disabled={isSubmitting}
                autoFocus
              />
              <button
                type="submit"
                className="bonus-button"
                style={styles.button}
                disabled={!guess.trim() || isSubmitting}
              >
                {isSubmitting ? '...' : 'Go'}
              </button>
            </form>
            {errorMessage && (
              <div style={styles.error}>{errorMessage}</div>
            )}
          </>
        ) : !userFinished ? (
        // Complete state - show results with integrated answers toggle
        <div style={styles.completeSection}>
          {/* Summary box with integrated answers toggle */}
          <div style={styles.summaryBox}>
            <div style={styles.summaryTitle}>🎯 Your Results</div>
            <div style={styles.summaryStats}>
              <span style={styles.statGold}>🥇 {results.filter(r => r.tier === 'perfect').length}</span>
              <span style={styles.statSilver}>🥈 {results.filter(r => r.tier === 'good').length}</span>
              <span style={styles.statBronze}>🥉 {results.filter(r => r.tier === 'average').length}</span>
              <span style={styles.statMiss}>❌ {results.filter(r => r.tier === 'miss').length}</span>
            </div>
            
            {/* Integrated answers toggle */}
            <button 
              onClick={fetchNearbyWords} 
              style={styles.answersToggle}
              disabled={loadingNearby}
            >
              {loadingNearby ? '🔍 Loading...' : showNearbyWords ? '📖 Hide Answers' : '📖 See Answers'}
            </button>
          </div>

          {/* Scrollable nearby words list */}
          {showNearbyWords && nearbyWords && (
            <div style={styles.nearbyScrollContainer}>
              <div style={styles.nearbyScrollList}>
                {/* Words above (reversed so closest to target is at bottom) */}
                {[...nearbyWords.above].reverse().map((word, idx) => (
                  <div key={`above-${idx}`} style={styles.nearbyListItem}>
                    <span style={styles.nearbyListRank}>-{nearbyWords.above.length - idx}</span>
                    <span style={styles.nearbyListWord}>{word}</span>
                  </div>
                ))}
                
                {/* Target word - highlighted */}
                <div style={styles.targetWordHighlight}>
                  <span style={styles.targetWordStar}>★</span>
                  <span style={styles.targetWordText}>{targetWord.toUpperCase()}</span>
                  <span style={styles.targetWordStar}>★</span>
                </div>
                
                {/* Words below */}
                {nearbyWords.below.map((word, idx) => (
                  <div key={`below-${idx}`} style={styles.nearbyListItem}>
                    <span style={styles.nearbyListRank}>+{idx + 1}</span>
                    <span style={styles.nearbyListWord}>{word}</span>
                  </div>
                ))}
              </div>
              
              {/* Dictionary attribution */}
              <div style={styles.dictionaryAttribution}>
                📚 <a 
                  href="https://www.gutenberg.org/files/669/669-h/669-h.htm" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={styles.attributionLink}
                >
                  Project Gutenberg's OPTED
                </a>
              </div>
            </div>
          )}
        </div>
        ) : null}
      </div>
    </>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'relative',
    background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 50%, #fde68a 100%)',
    border: '3px solid #fbbf24',
    borderRadius: '16px',
    padding: '1.25rem',
    marginTop: '1rem',
    marginBottom: '1rem',
    textAlign: 'center',
    overflow: 'hidden',
  },
  closeButton: {
    position: 'absolute',
    top: '0.5rem',
    right: '0.5rem',
    background: 'rgba(255, 255, 255, 0.8)',
    border: '1px solid #fbbf24',
    borderRadius: '50%',
    width: '28px',
    height: '28px',
    fontSize: '1rem',
    color: '#92400e',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    marginBottom: '0.5rem',
  },
  emoji: {
    fontSize: '1.25rem',
  },
  title: {
    fontSize: '1.4rem',
    fontWeight: 800,
    fontFamily: 'var(--font-primary)',
  },
  explanation: {
    fontSize: '0.9rem',
    color: '#78350f',
    marginBottom: '0.75rem',
    lineHeight: 1.4,
  },
  scoringLegend: {
    display: 'flex',
    justifyContent: 'center',
    gap: '0.75rem',
    fontSize: '0.8rem',
    color: '#78350f',
    marginBottom: '0.75rem',
    padding: '0.5rem',
    background: 'rgba(255, 255, 255, 0.5)',
    borderRadius: '8px',
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
    fontSize: '16px', // Prevents iOS zoom on focus
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
    background: 'rgba(255, 255, 255, 0.8)',
    padding: '0.5rem',
    borderRadius: '6px',
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
    marginBottom: '0.75rem',
  },
  answersToggle: {
    padding: '0.5rem 1rem',
    fontSize: '0.85rem',
    fontWeight: 600,
    background: '#fff',
    color: '#065f46',
    border: '1px solid #10b981',
    borderRadius: '6px',
    cursor: 'pointer',
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
  dictionaryAttribution: {
    fontSize: '0.7rem',
    color: '#78716c',
    textAlign: 'center' as const,
    marginTop: '0.5rem',
    lineHeight: 1.4,
    fontStyle: 'italic',
  },
  attributionLink: {
    color: '#059669',
    textDecoration: 'underline',
  },
  nearbyScrollContainer: {
    marginTop: '0.75rem',
    background: '#fffbeb',
    border: '1px solid #fcd34d',
    borderRadius: '8px',
    padding: '0.5rem',
  },
  nearbyScrollList: {
    maxHeight: '200px',
    overflowY: 'auto' as const,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.25rem',
  },
  nearbyListItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.35rem 0.5rem',
    background: '#fff',
    borderRadius: '4px',
    border: '1px solid #fde68a',
    fontSize: '0.85rem',
  },
  nearbyListRank: {
    color: '#9ca3af',
    fontSize: '0.75rem',
    minWidth: '28px',
    textAlign: 'right' as const,
  },
  nearbyListWord: {
    flex: 1,
    textAlign: 'left' as const,
    color: '#374151',
  },
  targetWordHighlight: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    padding: '0.5rem',
    background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
    borderRadius: '6px',
    margin: '0.25rem 0',
  },
  targetWordText: {
    fontWeight: 700,
    color: '#fff',
    fontSize: '0.95rem',
  },
  targetWordStar: {
    color: '#fff',
    fontSize: '0.8rem',
  },
};

export default BonusRoundInline;

