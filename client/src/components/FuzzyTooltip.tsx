import React, { useState } from 'react';

interface FuzzyTooltipProps {
  children: React.ReactNode;
}

export const FuzzyTooltip: React.FC<FuzzyTooltipProps> = ({ children }) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <div
        onClick={() => setIsVisible(!isVisible)}
        style={{ cursor: 'pointer' }}
      >
        {children}
      </div>
      
      {isVisible && (
        <>
          {/* Backdrop to close tooltip */}
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 999,
            }}
            onClick={() => setIsVisible(false)}
          />
          
          {/* Tooltip content */}
          <div
            style={{
              position: 'absolute',
              top: '100%',
              left: '50%',
              transform: 'translateX(-50%)',
              marginTop: '8px',
              backgroundColor: 'white',
              border: '2px solid #e5e7eb',
              borderRadius: '12px',
              padding: '1.5rem',
              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
              zIndex: 1000,
              width: '320px',
              fontFamily: 'var(--font-primary)',
              fontSize: '0.875rem',
              lineHeight: '1.5',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Arrow pointing up */}
            <div
              style={{
                position: 'absolute',
                top: '-8px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: 0,
                height: 0,
                borderLeft: '8px solid transparent',
                borderRight: '8px solid transparent',
                borderBottom: '8px solid #e5e7eb',
              }}
            />
            <div
              style={{
                position: 'absolute',
                top: '-6px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: 0,
                height: 0,
                borderLeft: '7px solid transparent',
                borderRight: '7px solid transparent',
                borderBottom: '7px solid white',
              }}
            />

            {/* Title */}
            <div style={{ 
              fontSize: '1rem', 
              fontWeight: 'bold', 
              color: '#1a237e',
              marginBottom: '0.75rem',
              textAlign: 'center'
            }}>
              🧩 Fuzzy Matches Explained
            </div>

            {/* What are fuzzy matches */}
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontWeight: '600', marginBottom: '0.25rem', color: '#374151' }}>
                What are fuzzy matches?
              </div>
              <div style={{ color: '#6b7280' }}>
                "Close" guesses that show you're thinking of related words. Like guessing "DEFINE" when the answer is "REFINE".
              </div>
            </div>

            {/* Calculation example */}
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
                💡 Calculation Example
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
                  <strong>Your guesses:</strong>
                </div>
                <div style={{ paddingLeft: '1rem', marginBottom: '0.5rem' }}>
                  1. "MOTION" → ✅ <span style={{ color: '#059669' }}>+25 pts (fuzzy)</span><br/>
                  2. "GESTURE" → ❌ 0 pts<br/>
                  3. "MOVEMENT" → ✅ Correct!
                </div>
                <hr style={{ margin: '0.5rem 0', border: 'none', borderTop: '1px solid #e5e7eb' }} />
                <div>
                  <strong>Final score:</strong> 800 + 25 - 6 = <strong style={{ color: '#1a237e' }}>819 pts</strong>
                </div>
              </div>
            </div>

            {/* How it helps ranking */}
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontWeight: '600', marginBottom: '0.25rem', color: '#374151' }}>
                How does this help my ranking?
              </div>
              <div style={{ color: '#6b7280' }}>
                Fuzzy matches give you bonus points, helping you rank higher than players who made random guesses with the same guess count.
              </div>
            </div>

            {/* Scoring formula */}
            <div style={{ 
              backgroundColor: '#f0fdf4',
              border: '1px solid #d1fae5',
              borderRadius: '8px',
              padding: '0.75rem',
              textAlign: 'center'
            }}>
              <div style={{ 
                fontSize: '0.75rem', 
                fontWeight: '600',
                color: '#065f46',
                marginBottom: '0.25rem'
              }}>
                FUZZY BONUS FORMULA
              </div>
              <div style={{ 
                fontFamily: 'monospace',
                fontSize: '0.8rem',
                color: '#059669',
                fontWeight: 'bold'
              }}>
                Fuzzy Matches × 25 = Bonus Points
              </div>
            </div>

            {/* Close button */}
            <div style={{ textAlign: 'center', marginTop: '1rem' }}>
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
        </>
      )}
    </div>
  );
}; 