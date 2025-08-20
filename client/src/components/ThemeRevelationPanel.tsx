import React from 'react';

interface ThemeRevelationPanelProps {
  actualTheme: string;
  shouldReveal: boolean;
  revelationReason: 'week_ended' | 'missed_sunday' | null;
  playerBestGuess?: string;
  playerBestSimilarity?: number;
  hasCorrectGuess: boolean;
}

export const ThemeRevelationPanel: React.FC<ThemeRevelationPanelProps> = ({
  actualTheme,
  shouldReveal,
  revelationReason,
  playerBestGuess,
  playerBestSimilarity,
  hasCorrectGuess
}) => {
  // Don't show if we shouldn't reveal or if player already guessed correctly
  if (!shouldReveal || hasCorrectGuess) {
    return null;
  }

  const getRevelationMessage = () => {
    switch (revelationReason) {
      case 'week_ended':
        return {
          title: "🕰️ Week's End Revelation",
          subtitle: "Sunday has arrived! Here's this week's theme:",
          encouragement: "A new theme week begins tomorrow - get ready to explore fresh connections!"
        };
      case 'missed_sunday':
        return {
          title: "⏰ Theme Revealed",
          subtitle: "You missed Sunday's final chance, but here's what the theme was:",
          encouragement: "Don't worry - a brand new theme week is starting today!"
        };
      default:
        return {
          title: "🎭 Theme Revealed",
          subtitle: "Here's this week's theme:",
          encouragement: "Better luck with the next theme!"
        };
    }
  };

  const { title, subtitle, encouragement } = getRevelationMessage();

  return (
    <div style={{
      backgroundColor: '#fef3c7',
      border: '2px solid #f59e0b',
      borderRadius: '0.75rem',
      padding: '1.5rem',
      marginBottom: '1.5rem',
      textAlign: 'center'
    }}>
      {/* Title */}
      <h3 style={{
        margin: '0 0 0.5rem 0',
        fontSize: '1.1rem',
        fontWeight: 'bold',
        color: '#92400e',
        fontFamily: 'var(--font-primary)'
      }}>
        {title}
      </h3>

      {/* Subtitle */}
      <p style={{
        margin: '0 0 1rem 0',
        fontSize: '0.9rem',
        color: '#a16207',
        fontFamily: 'var(--font-primary)'
      }}>
        {subtitle}
      </p>

      {/* Actual Theme - Highlighted */}
      <div style={{
        backgroundColor: '#fbbf24',
        color: '#1f2937',
        padding: '1rem',
        borderRadius: '0.5rem',
        marginBottom: '1rem',
        border: '2px solid #f59e0b'
      }}>
        <div style={{
          fontSize: '0.8rem',
          fontWeight: '600',
          marginBottom: '0.25rem',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          color: '#92400e'
        }}>
          This Week's Theme
        </div>
        <div style={{
          fontSize: '1.3rem',
          fontWeight: 'bold',
          fontFamily: 'var(--font-primary)',
          color: '#1f2937'
        }}>
          "{actualTheme}"
        </div>
      </div>

      {/* Player's Best Guess Comparison (if they made guesses) */}
      {playerBestGuess && (
        <div style={{
          backgroundColor: '#fef9e7',
          border: '1px solid #fcd34d',
          borderRadius: '0.5rem',
          padding: '0.75rem',
          marginBottom: '1rem'
        }}>
          <div style={{
            fontSize: '0.8rem',
            color: '#92400e',
            marginBottom: '0.5rem',
            fontWeight: '600'
          }}>
            Your Best Guess This Week
          </div>
          <div style={{
            fontSize: '1rem',
            fontWeight: '600',
            color: '#1f2937',
            marginBottom: '0.5rem',
            fontFamily: 'var(--font-primary)'
          }}>
            "{playerBestGuess}"
          </div>
          {playerBestSimilarity !== undefined && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              justifyContent: 'center'
            }}>
              <div style={{
                flex: '0 0 100px',
                height: '6px',
                backgroundColor: '#fde68a',
                borderRadius: '3px',
                overflow: 'hidden'
              }}>
                <div style={{
                  width: `${playerBestSimilarity}%`,
                  height: '100%',
                  backgroundColor: playerBestSimilarity >= 70 ? '#059669' : 
                                   playerBestSimilarity >= 50 ? '#d97706' : '#dc2626',
                  transition: 'width 0.3s ease'
                }} />
              </div>
              <span style={{
                fontSize: '0.8rem',
                fontWeight: '600',
                color: '#92400e'
              }}>
                {playerBestSimilarity}% similarity
              </span>
            </div>
          )}
        </div>
      )}

      {/* Encouragement Message */}
      <div style={{
        fontSize: '0.85rem',
        color: '#a16207',
        fontStyle: 'italic',
        lineHeight: '1.4',
        fontFamily: 'var(--font-primary)'
      }}>
        {encouragement}
      </div>

      {/* Fun fact or tip */}
      <div style={{
        marginTop: '1rem',
        padding: '0.75rem',
        backgroundColor: '#fef9e7',
        borderRadius: '0.375rem',
        fontSize: '0.8rem',
        color: '#92400e',
        fontStyle: 'italic'
      }}>
        💡 Tip: Look for patterns in the themed words throughout the week - they often share conceptual connections rather than just literal meanings!
      </div>
    </div>
  );
};
