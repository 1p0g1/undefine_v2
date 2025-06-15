import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { apiClient } from '../api/client';
import { getPlayerId } from '../utils/player';
import { Toast } from './Toast';

interface ThemeGuessModalProps {
  open: boolean;
  onClose: () => void;
  gameId?: string;
}

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

interface ErrorResponse {
  error: string;
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
  const [toast, setToast] = useState<{ message: string; isVisible: boolean } | null>(null);

  const playerId = getPlayerId();

  // Load theme status and stats when modal opens
  useEffect(() => {
    if (open && playerId) {
      loadThemeData();
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
        setThemeStats(statsResult);
      }
    } catch (err) {
      console.error('Failed to load theme data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load theme information');
      setToast({ message: 'Failed to load theme information', isVisible: true });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitGuess = async () => {
    if (!guess.trim() || !gameId || !playerId) return;

    setIsSubmitting(true);
    try {
      const result = await apiClient.submitThemeGuess({
        player_id: playerId,
        guess: guess.trim(),
        gameId
      });

      if (result.isCorrect) {
        setToast({ message: `🎉 Correct! The theme was "${result.actualTheme}"`, isVisible: true });
      } else {
        setToast({ message: `Not quite right. Try again tomorrow!`, isVisible: true });
      }

      // Reload theme data to reflect the new guess
      await loadThemeData();
      setGuess('');
    } catch (err) {
      console.error('Failed to submit theme guess:', err);
      
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit guess';
      if (errorMessage.includes('Already guessed today')) {
        setToast({ message: 'You can only guess the theme once per day', isVisible: true });
      } else {
        setToast({ message: 'Failed to submit guess. Please try again.', isVisible: true });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isSubmitting) {
      handleSubmitGuess();
    }
  };

  if (!open) return null;

  const modalContent = (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '1rem'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        style={{
          backgroundColor: '#fdfbf6',
          borderRadius: '1rem',
          padding: '2rem',
          width: '100%',
          maxWidth: '480px',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.2)',
          color: '#1a237e',
          fontFamily: 'var(--font-primary)'
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ 
            margin: '0 0 0.5rem 0', 
            fontSize: '1.5rem',
            fontWeight: '700',
            color: '#1a237e'
          }}>
            🎯 Theme of the Week
          </h2>
          <p style={{ 
            margin: 0, 
            fontSize: '0.9rem', 
            color: '#666',
            lineHeight: '1.4'
          }}>
            Can you guess the weekly theme connecting today's words?
          </p>
        </div>

        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <div style={{ fontSize: '0.9rem', color: '#666' }}>Loading theme information...</div>
          </div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <div style={{ fontSize: '0.9rem', color: '#dc2626' }}>
              {error}
            </div>
          </div>
        ) : !themeStatus?.hasActiveTheme ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <div style={{ fontSize: '0.9rem', color: '#666' }}>
              No active theme this week. Check back soon!
            </div>
          </div>
        ) : themeStatus.weeklyThemedWords.length === 0 ? (
          <div style={{
            backgroundColor: '#f3f4f6',
            border: '2px solid #d1d5db',
            borderRadius: '0.5rem',
            padding: '1.5rem',
            marginBottom: '1.5rem',
            textAlign: 'center'
          }}>
            <div style={{ fontWeight: '600', marginBottom: '0.5rem', color: '#1a237e' }}>
              🔒 Complete Today's Word First
            </div>
            <div style={{ fontSize: '0.9rem', color: '#666', lineHeight: '1.4' }}>
              You need to complete at least one word this week before you can guess the theme.
              Try solving today's word to unlock theme guessing!
            </div>
          </div>
        ) : (
          <>
            {/* Progress Section */}
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: '0.5rem' 
              }}>
                <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>Weekly Progress</span>
                <span style={{ fontSize: '0.85rem', color: '#666' }}>
                  {themeStatus.weeklyThemedWords.length} / {themeStatus.progress.totalWords} themed words completed this week
                </span>
              </div>
              <div style={{
                width: '100%',
                height: '8px',
                backgroundColor: '#e5e7eb',
                borderRadius: '4px',
                overflow: 'hidden'
              }}>
                <div style={{
                  width: `${(themeStatus.weeklyThemedWords.length / themeStatus.progress.totalWords) * 100}%`,
                  height: '100%',
                  backgroundColor: '#1a237e',
                  borderRadius: '4px',
                  transition: 'width 0.3s ease'
                }} />
              </div>
            </div>

            {/* Weekly Themed Words Section */}
            {themeStatus.weeklyThemedWords.length > 0 && (
              <div style={{
                backgroundColor: '#f8fffe',
                border: '1px solid #d1fae5',
                borderRadius: '0.5rem',
                padding: '1rem',
                marginBottom: '1.5rem'
              }}>
                <h3 style={{ 
                  margin: '0 0 0.75rem 0', 
                  fontSize: '0.95rem', 
                  fontWeight: '600',
                  color: '#065f46'
                }}>
                  📚 This Week's Themed Words ({themeStatus.weeklyThemedWords.length})
                </h3>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                  gap: '0.5rem'
                }}>
                  {themeStatus.weeklyThemedWords.map((wordInfo, index) => (
                    <div 
                      key={wordInfo.id}
                      style={{
                        backgroundColor: '#ecfdf5',
                        border: '1px solid #a7f3d0',
                        borderRadius: '0.375rem',
                        padding: '0.5rem',
                        textAlign: 'center'
                      }}
                    >
                      <div style={{ 
                        fontSize: '0.85rem', 
                        fontWeight: '600',
                        color: '#047857' 
                      }}>
                        {wordInfo.word}
                      </div>
                      <div style={{ 
                        fontSize: '0.7rem', 
                        color: '#059669',
                        marginTop: '0.25rem'
                      }}>
                        {new Date(wordInfo.date).toLocaleDateString('en-US', { 
                          weekday: 'short', 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ 
                  fontSize: '0.75rem', 
                  color: '#047857', 
                  marginTop: '0.75rem',
                  textAlign: 'center',
                  fontStyle: 'italic'
                }}>
                  These are the themed words you've completed this week
                </div>
              </div>
            )}

            {/* Current Status */}
            {themeStatus.progress.hasGuessedToday ? (
              <div style={{
                backgroundColor: themeStatus.progress.isCorrectGuess ? '#dcfce7' : '#fef2f2',
                border: `2px solid ${themeStatus.progress.isCorrectGuess ? '#16a34a' : '#dc2626'}`,
                borderRadius: '0.5rem',
                padding: '1rem',
                marginBottom: '1.5rem',
                textAlign: 'center'
              }}>
                <div style={{ fontWeight: '600', marginBottom: '0.5rem' }}>
                  {themeStatus.progress.isCorrectGuess ? '🎉 Correct!' : '❌ Not quite right'}
                </div>
                <div style={{ fontSize: '0.9rem' }}>
                  Your guess: <strong>"{themeStatus.progress.themeGuess}"</strong>
                </div>
                {!themeStatus.progress.isCorrectGuess && (
                  <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.5rem' }}>
                    Try again tomorrow!
                  </div>
                )}
              </div>
            ) : themeStatus.weeklyThemedWords.length === 0 ? (
              <div style={{
                backgroundColor: '#f3f4f6',
                border: '2px solid #d1d5db',
                borderRadius: '0.5rem',
                padding: '1rem',
                marginBottom: '1.5rem',
                textAlign: 'center'
              }}>
                <div style={{ fontWeight: '600', marginBottom: '0.5rem' }}>
                  🔒 Complete a themed word first
                </div>
                <div style={{ fontSize: '0.9rem', color: '#666' }}>
                  You need to complete at least one themed word from this week before you can guess the theme.
                </div>
              </div>
            ) : (
              <>
                {/* Guess Input */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ 
                    display: 'block', 
                    fontWeight: '600', 
                    marginBottom: '0.5rem',
                    fontSize: '0.9rem'
                  }}>
                    What's the theme connecting these words?
                  </label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                      type="text"
                      value={guess}
                      onChange={(e) => setGuess(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Enter your theme guess..."
                      disabled={isSubmitting}
                      style={{
                        flex: 1,
                        padding: '0.75rem',
                        border: '2px solid #d1d5db',
                        borderRadius: '0.5rem',
                        fontSize: '1rem',
                        fontFamily: 'var(--font-primary)',
                        backgroundColor: isSubmitting ? '#f9fafb' : '#fff',
                        outline: 'none'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#1a237e';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#d1d5db';
                      }}
                    />
                    <button
                      onClick={handleSubmitGuess}
                      disabled={!guess.trim() || isSubmitting}
                      style={{
                        padding: '0.75rem 1.5rem',
                        backgroundColor: (!guess.trim() || isSubmitting) ? '#d1d5db' : '#1a237e',
                        color: 'white',
                        border: 'none',
                        borderRadius: '0.5rem',
                        fontSize: '0.9rem',
                        fontWeight: '600',
                        cursor: (!guess.trim() || isSubmitting) ? 'not-allowed' : 'pointer',
                        fontFamily: 'var(--font-primary)',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {isSubmitting ? 'Guessing...' : 'Guess'}
                    </button>
                  </div>
                  <div style={{ 
                    fontSize: '0.8rem', 
                    color: '#666', 
                    marginTop: '0.5rem' 
                  }}>
                    💡 Think about what connects the {themeStatus.weeklyThemedWords.length} word{themeStatus.weeklyThemedWords.length !== 1 ? 's' : ''} you've completed this week!
                  </div>
                </div>
              </>
            )}

            {/* Statistics Section */}
            {themeStats && themeStats.totalThemeAttempts > 0 && (
              <div style={{
                backgroundColor: '#f8f9ff',
                border: '1px solid #e0e4ff',
                borderRadius: '0.5rem',
                padding: '1rem',
                marginBottom: '1rem'
              }}>
                <h3 style={{ 
                  margin: '0 0 1rem 0', 
                  fontSize: '1rem', 
                  fontWeight: '600',
                  color: '#1a237e'
                }}>
                  📊 Your Theme Statistics
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.2rem', fontWeight: '700', color: '#1a237e' }}>
                      {themeStats.correctThemeGuesses}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#666' }}>Themes Guessed</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.2rem', fontWeight: '700', color: '#1a237e' }}>
                      {Math.round((themeStats.correctThemeGuesses / themeStats.totalThemeAttempts) * 100)}%
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#666' }}>Success Rate</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.2rem', fontWeight: '700', color: '#1a237e' }}>
                      {themeStats.averageWordsCompletedWhenGuessing}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#666' }}>Avg Words Done</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.2rem', fontWeight: '700', color: '#1a237e' }}>
                      {themeStats.totalThemeAttempts}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#666' }}>Total Attempts</div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Close Button */}
        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          <button
            onClick={onClose}
            style={{
              padding: '0.75rem 2rem',
              backgroundColor: 'transparent',
              color: '#1a237e',
              border: '2px solid #1a237e',
              borderRadius: '0.5rem',
              fontSize: '0.9rem',
              fontWeight: '600',
              cursor: 'pointer',
              fontFamily: 'var(--font-primary)'
            }}
          >
            Close
          </button>
        </div>
      </div>

      {/* Toast Notifications */}
      {toast && (
        <Toast
          message={toast.message}
          isVisible={toast.isVisible}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );

  return createPortal(modalContent, document.body);
}; 