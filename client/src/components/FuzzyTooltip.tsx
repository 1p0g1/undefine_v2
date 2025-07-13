import React, { useState } from 'react';
import { createPortal } from 'react-dom';

interface FuzzyTooltipProps {
  children: React.ReactNode;
}

export const FuzzyTooltip: React.FC<FuzzyTooltipProps> = ({ children }) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <>
      <div
        onClick={() => setIsVisible(!isVisible)}
        style={{ cursor: 'pointer' }}
      >
        {children}
      </div>
      
      {isVisible && createPortal(
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            zIndex: 50,
          }}
          onClick={() => setIsVisible(false)}
        >
          <div
            style={{
              fontFamily: 'var(--font-primary)',
              background: 'var(--color-bg)',
              color: 'var(--color-primary)',
              backgroundColor: 'white',
              borderRadius: '0.5rem',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
              padding: '2rem',
              width: '100%',
              maxWidth: '32rem',
              position: 'relative',
              maxHeight: '90vh',
              overflowY: 'auto',
              fontSize: '0.875rem',
              lineHeight: '1.5',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setIsVisible(false)}
              style={{
                position: 'absolute',
                top: '0.5rem',
                right: '0.5rem',
                background: 'none',
                border: 'none',
                fontSize: '1.5rem',
                cursor: 'pointer',
                color: '#9ca3af',
                fontFamily: 'var(--font-primary)',
              }}
            >
              &times;
            </button>

            {/* Title */}
            <div style={{ 
              fontSize: '1.1rem', 
              fontWeight: 'bold', 
              color: '#1a237e',
              marginBottom: '1rem',
              textAlign: 'center'
            }}>
              🎯 Complete Scoring System
            </div>

            {/* Complete Formula */}
            <div style={{ 
              backgroundColor: '#f8f9ff', 
              border: '2px solid #e0e4ff',
              borderRadius: '8px',
              padding: '1rem',
              marginBottom: '1rem',
              textAlign: 'center'
            }}>
              <div style={{ 
                fontSize: '0.75rem', 
                fontWeight: '600',
                color: '#1a237e',
                marginBottom: '0.5rem'
              }}>
                COMPLETE SCORING FORMULA
              </div>
              <div style={{ 
                fontFamily: 'monospace',
                fontSize: '0.9rem',
                color: '#1a237e',
                fontWeight: 'bold',
                marginBottom: '0.5rem'
              }}>
                Final Score = Base Score + Fuzzy Bonus - Time Penalty
              </div>
            </div>

            {/* Base Scores */}
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontWeight: '600', marginBottom: '0.5rem', color: '#374151' }}>
                Base Score by Guess Number:
              </div>
              <div style={{ 
                fontFamily: 'monospace',
                fontSize: '0.8rem',
                backgroundColor: '#f9fafb',
                padding: '0.75rem',
                borderRadius: '6px',
                border: '1px solid #d1d5db'
              }}>
                <div>Guess 1: 1,000 points</div>
                <div>Guess 2: 900 points</div>
                <div>Guess 3: 800 points</div>
                <div>Guess 4: 700 points</div>
                <div>Guess 5: 600 points</div>
                <div>Guess 6: 500 points</div>
              </div>
            </div>

            {/* Fuzzy Bonus */}
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontWeight: '600', marginBottom: '0.25rem', color: '#374151' }}>
                Fuzzy Bonus:
              </div>
              <div style={{ color: '#6b7280', marginBottom: '0.5rem' }}>
                +25 points per "close" guess (like "DEFINE" when answer is "REFINE")
              </div>
              <div style={{ 
                backgroundColor: '#f0fdf4',
                border: '1px solid #d1fae5',
                borderRadius: '6px',
                padding: '0.5rem',
                fontSize: '0.8rem'
              }}>
                <strong style={{ color: '#059669' }}>Example:</strong> 2 fuzzy matches = +50 bonus points
              </div>
            </div>

            {/* Time Penalty */}
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontWeight: '600', marginBottom: '0.25rem', color: '#374151' }}>
                Time Penalty:
              </div>
              <div style={{ color: '#6b7280', marginBottom: '0.5rem' }}>
                -1 point per 10 seconds (minimal impact unless very slow)
              </div>
              <div style={{ 
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '6px',
                padding: '0.5rem',
                fontSize: '0.8rem'
              }}>
                <strong style={{ color: '#dc2626' }}>Example:</strong> 60 seconds = -6 points
              </div>
            </div>

            {/* Full Example */}
            <div style={{ 
              backgroundColor: '#f8f9ff', 
              border: '1px solid #e0e4ff',
              borderRadius: '8px',
              padding: '1rem',
              marginBottom: '1rem'
            }}>
              <div style={{ 
                fontWeight: '600', 
                marginBottom: '0.5rem',
                color: '#1a237e',
                textAlign: 'center'
              }}>
                💡 Complete Scoring Example
              </div>
              
              <div style={{ 
                fontFamily: 'monospace',
                fontSize: '0.8rem',
                backgroundColor: 'white',
                padding: '0.75rem',
                borderRadius: '6px',
                border: '1px solid #d1d5db'
              }}>
                <div style={{ marginBottom: '0.5rem' }}>
                  <strong>Target word:</strong> "MOVEMENT"
                </div>
                <div style={{ marginBottom: '0.5rem' }}>
                  <strong>Your performance:</strong>
                </div>
                <div style={{ paddingLeft: '1rem', marginBottom: '0.5rem' }}>
                  • Guessed on attempt #3 → Base: 800 pts<br/>
                  • 2 fuzzy matches → Bonus: +50 pts<br/>
                  • Took 45 seconds → Penalty: -4 pts
                </div>
                <hr style={{ margin: '0.5rem 0', border: 'none', borderTop: '1px solid #e5e7eb' }} />
                <div>
                  <strong>Final Score:</strong> 800 + 50 - 4 = <strong style={{ color: '#1a237e' }}>846 points</strong>
                </div>
              </div>
            </div>

            {/* Key Insights */}
            <div style={{ 
              backgroundColor: '#fffbeb',
              border: '1px solid #fed7aa',
              borderRadius: '8px',
              padding: '0.75rem',
              marginBottom: '1rem'
            }}>
              <div style={{ 
                fontWeight: '600',
                color: '#92400e',
                marginBottom: '0.5rem'
              }}>
                💡 Key Insights:
              </div>
              <ul style={{ 
                margin: 0,
                paddingLeft: '1rem',
                color: '#92400e',
                fontSize: '0.8rem'
              }}>
                <li>Guess number has the <strong>biggest impact</strong> on score</li>
                <li>Fuzzy matches <strong>reward</strong> intelligent guessing</li>
                <li>Time penalty is <strong>minimal</strong> unless very slow</li>
              </ul>
            </div>

            {/* Close button */}
            <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
              <button
                onClick={() => setIsVisible(false)}
                style={{
                  backgroundColor: '#1a237e',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '0.5rem 1rem',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-primary)'
                }}
              >
                Got it! 👍
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}; 