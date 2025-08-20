import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import { getPlayerId } from '../utils/player';

interface ThemeHistoryEntry {
  id: string;
  guess: string;
  isCorrect: boolean;
  attemptDate: string;
  wordsCompletedWhenGuessed: number;
  totalWordGuesses: number;
  similarityScore: number | null;
  confidencePercentage: number | null;
  matchingMethod: string | null;
  createdAt: string;
}

interface ThemeHistoryData {
  theme: string;
  totalAttempts: number;
  hasCorrectGuess: boolean;
  history: ThemeHistoryEntry[];
}

interface ThemeHistoryPanelProps {
  theme: string;
  isVisible: boolean;
}

export const ThemeHistoryPanel: React.FC<ThemeHistoryPanelProps> = ({ theme, isVisible }) => {
  const [historyData, setHistoryData] = useState<ThemeHistoryData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const playerId = getPlayerId();

  useEffect(() => {
    if (isVisible && theme && playerId && !historyData) {
      loadThemeHistory();
    }
  }, [isVisible, theme, playerId]);

  const loadThemeHistory = async () => {
    if (!playerId || !theme) return;

    setIsLoading(true);
    setError(null);

    try {
      console.log('[ThemeHistoryPanel] Loading theme history for:', { theme, playerId });
      
      const response = await apiClient.get(`/api/theme-history?player_id=${playerId}&theme=${encodeURIComponent(theme)}`);
      
      if (response.ok) {
        const data = await response.json();
        setHistoryData(data);
        console.log('[ThemeHistoryPanel] Theme history loaded:', data);
      } else {
        throw new Error(`Failed to load theme history: ${response.status}`);
      }
    } catch (err) {
      console.error('[ThemeHistoryPanel] Error loading theme history:', err);
      setError('Failed to load guess history');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const getSimilarityColor = (percentage: number | null) => {
    if (!percentage) return '#6b7280';
    if (percentage >= 80) return '#059669';
    if (percentage >= 60) return '#d97706';
    if (percentage >= 40) return '#dc2626';
    return '#6b7280';
  };

  const getSimilarityLabel = (percentage: number | null) => {
    if (!percentage) return 'No match';
    if (percentage >= 80) return 'Very close!';
    if (percentage >= 60) return 'Good guess';
    if (percentage >= 40) return 'Some similarity';
    return 'Try again';
  };

  if (!isVisible || !historyData) {
    return null;
  }

  // Don't show if no history
  if (historyData.history.length === 0) {
    return null;
  }

  return (
    <div style={{
      backgroundColor: '#f8fafc',
      border: '1px solid #e2e8f0',
      borderRadius: '0.5rem',
      marginBottom: '1.5rem'
    }}>
      {/* Collapsible Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          width: '100%',
          padding: '1rem',
          backgroundColor: 'transparent',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontFamily: 'var(--font-primary)',
          fontSize: '0.95rem',
          fontWeight: '600',
          color: '#475569',
          textAlign: 'left'
        }}
      >
        <span>
          📋 Your Previous Guesses ({historyData.totalAttempts})
          {historyData.hasCorrectGuess && (
            <span style={{ 
              marginLeft: '0.5rem', 
              color: '#059669',
              fontSize: '0.85rem'
            }}>
              ✅ Solved!
            </span>
          )}
        </span>
        <span style={{
          transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s ease',
          fontSize: '0.8rem'
        }}>
          ▼
        </span>
      </button>

      {/* Expandable Content */}
      {isExpanded && (
        <div style={{ 
          padding: '0 1rem 1rem 1rem',
          borderTop: '1px solid #e2e8f0'
        }}>
          {isLoading ? (
            <div style={{ 
              textAlign: 'center', 
              padding: '1rem',
              color: '#6b7280',
              fontSize: '0.9rem'
            }}>
              Loading guess history...
            </div>
          ) : error ? (
            <div style={{ 
              textAlign: 'center', 
              padding: '1rem',
              color: '#dc2626',
              fontSize: '0.9rem'
            }}>
              {error}
            </div>
          ) : (
            <div style={{ marginTop: '1rem' }}>
              {historyData.history.map((entry, index) => (
                <div
                  key={entry.id}
                  style={{
                    backgroundColor: entry.isCorrect ? '#f0fdf4' : '#ffffff',
                    border: `1px solid ${entry.isCorrect ? '#bbf7d0' : '#e5e7eb'}`,
                    borderRadius: '0.375rem',
                    padding: '0.75rem',
                    marginBottom: index < historyData.history.length - 1 ? '0.5rem' : '0',
                    position: 'relative'
                  }}
                >
                  {/* Correct guess indicator */}
                  {entry.isCorrect && (
                    <div style={{
                      position: 'absolute',
                      top: '0.5rem',
                      right: '0.5rem',
                      fontSize: '0.8rem'
                    }}>
                      ✅
                    </div>
                  )}

                  {/* Date and guess */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '0.5rem'
                  }}>
                    <span style={{
                      fontSize: '0.85rem',
                      color: '#6b7280',
                      fontWeight: '500'
                    }}>
                      {formatDate(entry.attemptDate)}
                    </span>
                    <span style={{
                      fontSize: '0.8rem',
                      color: '#9ca3af'
                    }}>
                      {entry.wordsCompletedWhenGuessed} words completed
                    </span>
                  </div>

                  {/* Guess text */}
                  <div style={{
                    fontSize: '1rem',
                    fontWeight: '600',
                    color: entry.isCorrect ? '#059669' : '#374151',
                    marginBottom: '0.5rem',
                    fontFamily: 'var(--font-primary)'
                  }}>
                    "{entry.guess}"
                  </div>

                  {/* Similarity feedback (if not correct) */}
                  {!entry.isCorrect && entry.confidencePercentage !== null && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}>
                      {/* Similarity bar */}
                      <div style={{
                        flex: 1,
                        height: '6px',
                        backgroundColor: '#e5e7eb',
                        borderRadius: '3px',
                        overflow: 'hidden'
                      }}>
                        <div style={{
                          width: `${entry.confidencePercentage}%`,
                          height: '100%',
                          backgroundColor: getSimilarityColor(entry.confidencePercentage),
                          transition: 'width 0.3s ease'
                        }} />
                      </div>
                      
                      {/* Percentage and label */}
                      <div style={{
                        fontSize: '0.75rem',
                        color: getSimilarityColor(entry.confidencePercentage),
                        fontWeight: '600',
                        minWidth: '60px',
                        textAlign: 'right'
                      }}>
                        {entry.confidencePercentage}%
                      </div>
                    </div>
                  )}

                  {/* Similarity label */}
                  {!entry.isCorrect && entry.confidencePercentage !== null && (
                    <div style={{
                      fontSize: '0.75rem',
                      color: getSimilarityColor(entry.confidencePercentage),
                      marginTop: '0.25rem',
                      textAlign: 'center',
                      fontStyle: 'italic'
                    }}>
                      {getSimilarityLabel(entry.confidencePercentage)}
                    </div>
                  )}
                </div>
              ))}

              {/* Summary message */}
              <div style={{
                marginTop: '1rem',
                padding: '0.75rem',
                backgroundColor: '#f1f5f9',
                borderRadius: '0.375rem',
                fontSize: '0.8rem',
                color: '#475569',
                textAlign: 'center',
                fontStyle: 'italic'
              }}>
                {historyData.hasCorrectGuess 
                  ? "🎉 Great job solving this week's theme!"
                  : `Keep trying! You've made ${historyData.totalAttempts} attempt${historyData.totalAttempts === 1 ? '' : 's'} so far.`
                }
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
