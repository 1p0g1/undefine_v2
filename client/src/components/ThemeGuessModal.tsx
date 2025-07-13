import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import { getPlayerId } from '../utils/player';
import { getThemeFeedbackMessage, getSimilarityBarColor, getSimilarityBarWidth } from '../utils/themeMessages';

interface ThemeStatus {
  currentTheme?: string | null;
  hasActiveTheme: boolean;
  progress: {
    totalWords: number;
    completedWords: number;
    themeGuess: string | null;
    canGuessTheme: boolean;
    hasGuessedToday: boolean;
    isCorrectGuess: boolean;
  };
  weeklyThemedWords: Array<{
    id: string;
    word: string;
    date: string;
    completedOn: string;
  }>;
}

interface ThemeStats {
  totalThemeAttempts: number;
  correctThemeGuesses: number;
  averageAttemptsPerTheme: number;
  averageWordsCompletedWhenGuessing: number;
  themesGuessed: string[];
}

interface ThemeGuessModalProps {
  open: boolean;
  onClose: () => void;
  gameId: string;
}

export const ThemeGuessModal: React.FC<ThemeGuessModalProps> = ({ 
  open, 
  onClose, 
  gameId 
}) => {
  const [guess, setGuess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [themeStatus, setThemeStatus] = useState<ThemeStatus | null>(null);
  const [themeStats, setThemeStats] = useState<ThemeStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastGuessResult, setLastGuessResult] = useState<{
    guess: string;
    isCorrect: boolean;
    actualTheme?: string;
    fuzzyMatch?: {
      method: 'exact' | 'synonym' | 'semantic' | 'error';
      confidence: number;
      similarity?: number;
    };
  } | null>(null);
  const [dataCache, setDataCache] = useState<{
    themeStatus: ThemeStatus | null;
    themeStats: ThemeStats | null;
    timestamp: number;
  } | null>(null);

  const playerId = getPlayerId();

  // Load theme data when modal opens
  useEffect(() => {
    if (open && playerId) {
      // Clear previous guess results to prevent state persistence between sessions
      setLastGuessResult(null);
      
      // Check for pre-loaded data from GameSummaryModal
      const preloadedData = typeof window !== 'undefined' ? (window as any).__themeDataCache : null;
      
      // Use pre-loaded data if available and recent (within 2 minutes)
      const now = Date.now();
      if (preloadedData && (now - preloadedData.timestamp < 120000)) {
        console.log('[ThemeGuessModal] Using pre-loaded theme data');
        setThemeStatus(preloadedData.themeStatus);
        setThemeStats(preloadedData.themeStats);
        setIsLoading(false);
        setError(null);
        
        // Clear the pre-loaded data after use
        if (typeof window !== 'undefined') {
          delete (window as any).__themeDataCache;
        }
        return;
      }
      
      // Use cached data if available and recent (within 2 minutes)
      if (dataCache && (now - dataCache.timestamp < 120000)) {
        console.log('[ThemeGuessModal] Using cached theme data');
        setThemeStatus(dataCache.themeStatus);
        setThemeStats(dataCache.themeStats);
        setIsLoading(false);
        setError(null);
      } else {
        loadThemeData();
      }
    }
  }, [open, playerId]);

  const loadThemeData = async () => {
    if (!playerId) return;

    setIsLoading(true);
    setError(null);
    try {
      const [statusResult, statsResult] = await Promise.all([
        apiClient.getThemeStatus(playerId),
        apiClient.getThemeStats(playerId)
      ]);

      // Validate the status result
      if (!statusResult) {
        throw new Error('Failed to load theme status');
      }

      // Check if we got an error response
      if (typeof statusResult === 'object' && 'error' in statusResult && typeof statusResult.error === 'string') {
        throw new Error(statusResult.error);
      }

      // Cast the result to ThemeStatus
      const status = statusResult as ThemeStatus;
      
      // If player hasn't completed any words this week, show a friendly message
      if (status.hasActiveTheme && status.weeklyThemedWords.length === 0) {
        setError('Complete at least one word this week to unlock theme guessing!');
      } else {
        setThemeStatus(status);
        setThemeStats(statsResult as ThemeStats);
        
        // Cache the data for 2 minutes
        setDataCache({
          themeStatus: status,
          themeStats: statsResult as ThemeStats,
          timestamp: Date.now()
        });
      }
    } catch (error) {
      console.error('[ThemeGuessModal] Error loading theme data:', error);
      setError(error instanceof Error ? error.message : 'Failed to load theme data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guess.trim() || isSubmitting || !playerId) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await apiClient.submitThemeGuess({
        player_id: playerId,
        guess: guess.trim(),
        gameId
      });

      console.log('[ThemeGuessModal] Theme guess response:', response);

      // Store the guess result for display
      setLastGuessResult({
        guess: guess.trim(),
        isCorrect: response.isCorrect,
        actualTheme: response.actualTheme,
        fuzzyMatch: response.fuzzyMatch
      });

      // Update theme status based on response
      if (themeStatus) {
        setThemeStatus({
          ...themeStatus,
          progress: {
            ...themeStatus.progress,
            hasGuessedToday: true,
            themeGuess: guess.trim(),
            isCorrectGuess: response.isCorrect
          }
        });
      }

      // Clear the guess input
      setGuess('');

    } catch (error) {
      console.error('[ThemeGuessModal] Error submitting theme guess:', error);
      setError('Failed to submit theme guess. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setGuess('');
    setError(null);
    setLastGuessResult(null);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold' }}>
            🎯 Theme of the Week
          </h2>
          <button
            onClick={handleClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.5rem',
              cursor: 'pointer',
              padding: '0.25rem'
            }}
          >
            ×
          </button>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <div style={{ marginBottom: '1rem' }}>🔄 Loading theme information...</div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '0.5rem',
            padding: '1rem',
            color: '#dc2626',
            marginBottom: '1rem'
          }}>
            {error}
          </div>
        )}

        {/* Main Content */}
        {!isLoading && !error && themeStatus && themeStats && (
          <div>
            {/* Theme Status Display */}
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: '0.5rem'
              }}>
                <span style={{ fontSize: '1rem', fontWeight: 'bold' }}>
                  Progress this week:
                </span>
                <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#059669' }}>
                  {themeStatus.progress.completedWords} / {themeStatus.progress.totalWords}
                </span>
              </div>
              
              {/* Word completion progress bar */}
              <div style={{
                width: '100%',
                height: '8px',
                backgroundColor: '#e5e7eb',
                borderRadius: '4px',
                overflow: 'hidden',
                marginBottom: '1rem'
              }}>
                <div style={{
                  width: `${(themeStatus.progress.completedWords / themeStatus.progress.totalWords) * 100}%`,
                  height: '100%',
                  backgroundColor: '#059669',
                  transition: 'width 0.3s ease'
                }} />
              </div>
            </div>

            {/* Fuzzy Match Result Display */}
            {lastGuessResult && lastGuessResult.fuzzyMatch && (
              <div style={{
                backgroundColor: '#f8f9ff',
                border: '2px solid #e0e4ff',
                borderRadius: '0.75rem',
                padding: '1.5rem',
                marginBottom: '1.5rem'
              }}>
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{
                    fontSize: '1.1rem',
                    fontWeight: 'bold',
                    marginBottom: '0.5rem'
                  }}>
                    Your guess: "{lastGuessResult.guess}"
                  </div>
                  
                  {/* Similarity Score Bar */}
                  <div style={{
                    width: '100%',
                    height: '12px',
                    backgroundColor: '#e5e7eb',
                    borderRadius: '6px',
                    overflow: 'hidden',
                    marginBottom: '1rem'
                  }}>
                    <div style={{
                      width: `${getSimilarityBarWidth(lastGuessResult.fuzzyMatch.confidence)}%`,
                      height: '100%',
                      backgroundColor: getSimilarityBarColor(lastGuessResult.fuzzyMatch.confidence),
                      transition: 'width 0.8s ease',
                      borderRadius: '6px'
                    }} />
                  </div>
                  
                  <div style={{
                    fontSize: '0.9rem',
                    color: '#6b7280',
                    marginBottom: '0.5rem'
                  }}>
                    Similarity: {lastGuessResult.fuzzyMatch.confidence}%
                  </div>
                </div>

                {/* Funny Feedback Message */}
                {(() => {
                  const feedbackMessage = getThemeFeedbackMessage(
                    lastGuessResult.fuzzyMatch.confidence,
                    lastGuessResult.actualTheme,
                    lastGuessResult.fuzzyMatch.method
                  );
                  
                  return (
                    <div style={{
                      fontSize: '1.2rem',
                      fontWeight: 'bold',
                      textAlign: 'center',
                      color: feedbackMessage.isCorrect ? '#059669' : '#dc2626'
                    }}>
                      {feedbackMessage.emoji} {feedbackMessage.message}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Theme Guess Form or Status */}
            {!themeStatus.progress.hasGuessedToday && themeStatus.progress.canGuessTheme ? (
              <form onSubmit={handleSubmit} style={{ marginBottom: '1rem' }}>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '0.5rem',
                    fontWeight: 'bold'
                  }}>
                    What connects this week's words?
                  </label>
                  <input
                    type="text"
                    value={guess}
                    onChange={(e) => setGuess(e.target.value)}
                    placeholder="Enter your theme guess..."
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      borderRadius: '0.5rem',
                      border: '2px solid #e5e7eb',
                      fontSize: '1rem',
                      boxSizing: 'border-box'
                    }}
                    disabled={isSubmitting}
                  />
                </div>
                <button
                  type="submit"
                  disabled={!guess.trim() || isSubmitting}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    backgroundColor: guess.trim() && !isSubmitting ? '#1a237e' : '#9ca3af',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.5rem',
                    fontSize: '1rem',
                    fontWeight: 'bold',
                    cursor: guess.trim() && !isSubmitting ? 'pointer' : 'not-allowed'
                  }}
                >
                  {isSubmitting ? '🤔 Thinking...' : '🎯 Submit Guess'}
                </button>
              </form>
            ) : (
              <div style={{
                textAlign: 'center',
                padding: '2rem',
                backgroundColor: '#f9fafb',
                borderRadius: '0.5rem'
              }}>
                {themeStatus.progress.hasGuessedToday ? (
                  <div>
                    <div style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>
                      ✅ You've already guessed today!
                    </div>
                    <div style={{ color: '#6b7280' }}>
                      Come back tomorrow to try again
                    </div>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>
                      🔒 Complete more words to unlock theme guessing
                    </div>
                    <div style={{ color: '#6b7280' }}>
                      You need to finish at least one word this week
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}; 