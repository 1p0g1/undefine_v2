/**
 * Theme Test Tool Component
 * 
 * Allows admins to test theme guess matching against the AI scoring system.
 * Useful for debugging and refining theme design.
 */

import React, { useState } from 'react';
import { adminApi } from '../api/adminClient';

export const ThemeTestTool: React.FC = () => {
  const [theme, setTheme] = useState('');
  const [guess, setGuess] = useState('');
  const [result, setResult] = useState<{
    similarity: number;
    isMatch: boolean;
    method: string;
    confidence: number;
    error?: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTest = async () => {
    if (!theme.trim() || !guess.trim()) {
      setError('Please enter both theme and guess');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await adminApi.testTheme(theme.trim(), guess.trim());
      setResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to test theme');
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setTheme('');
    setGuess('');
    setResult(null);
    setError(null);
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h2 style={styles.title}>🧪 Theme Test Lab</h2>
        <p style={styles.subtitle}>
          Test how the AI scores theme guesses. Use this to refine themes and understand scoring behavior.
        </p>
      </div>

      {/* Input Section */}
      <div style={styles.inputSection}>
        <div style={styles.inputGroup}>
          <label style={styles.label}>Actual Theme</label>
          <input
            type="text"
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            placeholder="e.g., Words Where Stress Changes Meaning"
            style={styles.input}
            disabled={loading}
          />
        </div>

        <div style={styles.inputGroup}>
          <label style={styles.label}>Test Guess</label>
          <input
            type="text"
            value={guess}
            onChange={(e) => setGuess(e.target.value)}
            placeholder="e.g., stress patterns"
            style={styles.input}
            disabled={loading}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleTest();
              }
            }}
          />
        </div>

        <div style={styles.buttonGroup}>
          <button
            onClick={handleTest}
            disabled={loading || !theme.trim() || !guess.trim()}
            style={{
              ...styles.button,
              ...styles.testButton,
              ...(loading || !theme.trim() || !guess.trim() ? styles.buttonDisabled : {})
            }}
          >
            {loading ? '🔄 Testing...' : '🧪 Test Similarity'}
          </button>
          <button
            onClick={handleClear}
            disabled={loading}
            style={{ ...styles.button, ...styles.clearButton }}
          >
            🗑️ Clear
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div style={styles.errorBox}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Result Display */}
      {result && (
        <div style={styles.resultSection}>
          <div style={styles.resultHeader}>
            <h3 style={styles.resultTitle}>Test Result</h3>
            <div style={{
              ...styles.matchBadge,
              backgroundColor: result.isMatch ? '#10b981' : '#ef4444'
            }}>
              {result.isMatch ? '✓ Match' : '✗ No Match'}
            </div>
          </div>

          <div style={styles.scoreDisplay}>
            <div style={styles.scoreLabel}>Confidence Score</div>
            <div style={styles.scoreValue}>{result.confidence}%</div>
            <div style={styles.scoreBar}>
              <div
                style={{
                  ...styles.scoreBarFill,
                  width: `${result.confidence}%`,
                  backgroundColor: 
                    result.confidence >= 78 ? '#10b981' :
                    result.confidence >= 60 ? '#f59e0b' :
                    '#ef4444'
                }}
              />
            </div>
            <div style={styles.thresholdMarker}>
              <span style={styles.thresholdLabel}>78% threshold</span>
              <div style={styles.thresholdLine} />
            </div>
          </div>

          <div style={styles.metadataGrid}>
            <div style={styles.metadataItem}>
              <div style={styles.metadataLabel}>Method</div>
              <div style={styles.metadataValue}>
                {result.method === 'exact' ? '🎯 Exact Match' :
                 result.method === 'semantic' ? '🤖 AI Semantic' :
                 '❌ Error'}
              </div>
            </div>
            <div style={styles.metadataItem}>
              <div style={styles.metadataLabel}>Raw Similarity</div>
              <div style={styles.metadataValue}>
                {(result.similarity * 100).toFixed(2)}%
              </div>
            </div>
          </div>

          {result.error && (
            <div style={styles.resultError}>
              <strong>API Error:</strong> {result.error}
            </div>
          )}
        </div>
      )}

      {/* AI Info Panel */}
      <div style={styles.infoPanel}>
        <h3 style={styles.infoPanelTitle}>ℹ️ AI Configuration</h3>
        
        <div style={styles.infoSection}>
          <h4 style={styles.infoSectionTitle}>Model</h4>
          <div style={styles.codeBlock}>
            sentence-transformers/all-MiniLM-L6-v2
          </div>
          <p style={styles.infoText}>
            Industry-standard sentence embedding model optimized for semantic similarity tasks.
          </p>
        </div>

        <div style={styles.infoSection}>
          <h4 style={styles.infoSectionTitle}>Matching Threshold</h4>
          <div style={styles.codeBlock}>
            78% (0.78 similarity score)
          </div>
          <p style={styles.infoText}>
            Guesses scoring 78% or above are considered correct. This threshold balances accepting
            valid synonyms while rejecting unrelated guesses.
          </p>
        </div>

        <div style={styles.infoSection}>
          <h4 style={styles.infoSectionTitle}>Contextual Prompting</h4>
          <div style={styles.codeBlock}>
            {`const contextualGuess = \`What connects this week's words? \${guess}\`;
const contextualTheme = \`What connects this week's words? \${theme}\`;`}
          </div>
          <p style={styles.infoText}>
            Both the guess and theme are framed as answers to the same implicit question,
            creating a symmetric comparison for better matching accuracy.
          </p>
        </div>

        <div style={styles.infoSection}>
          <h4 style={styles.infoSectionTitle}>API Endpoint</h4>
          <div style={styles.codeBlock}>
            https://router.huggingface.co/hf-inference/models/{'{model}'}
          </div>
          <p style={styles.infoText}>
            Uses Hugging Face's Inference Providers API (new router endpoint).
          </p>
        </div>

        <div style={styles.infoSection}>
          <h4 style={styles.infoSectionTitle}>Cost Estimate</h4>
          <div style={styles.codeBlock}>
            ~$3/month for 1000 daily users
          </div>
          <p style={styles.infoText}>
            Each theme guess triggers one API call. Testing is free during development.
          </p>
        </div>

        <div style={styles.infoSection}>
          <h4 style={styles.infoSectionTitle}>Source Code</h4>
          <div style={styles.codeBlock}>
            src/utils/semanticSimilarity.ts
            <br />
            src/game/theme.ts (isThemeGuessCorrect)
          </div>
          <p style={styles.infoText}>
            See these files for complete implementation details and testing utilities.
          </p>
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '1.5rem',
    maxWidth: '900px',
    margin: '0 auto',
  },
  header: {
    marginBottom: '2rem',
    textAlign: 'center',
  },
  title: {
    margin: '0 0 0.5rem 0',
    fontSize: '1.75rem',
    fontWeight: 700,
    color: '#1a237e',
  },
  subtitle: {
    margin: 0,
    fontSize: '0.95rem',
    color: '#6b7280',
    lineHeight: 1.5,
  },
  inputSection: {
    background: '#fff',
    borderRadius: '12px',
    padding: '1.5rem',
    marginBottom: '1.5rem',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    border: '1px solid #e8e8e8',
  },
  inputGroup: {
    marginBottom: '1.25rem',
  },
  label: {
    display: 'block',
    fontWeight: 600,
    marginBottom: '0.5rem',
    color: '#374151',
    fontSize: '0.875rem',
  },
  input: {
    width: '100%',
    padding: '0.75rem',
    fontSize: '1rem',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    outline: 'none',
    transition: 'border-color 0.2s',
    fontFamily: 'inherit',
  },
  buttonGroup: {
    display: 'flex',
    gap: '0.75rem',
    marginTop: '1.5rem',
  },
  button: {
    padding: '0.75rem 1.5rem',
    fontSize: '0.95rem',
    fontWeight: 600,
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  testButton: {
    flex: 1,
    background: '#1a237e',
    color: '#fff',
  },
  clearButton: {
    background: '#f3f4f6',
    color: '#374151',
  },
  buttonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  errorBox: {
    background: '#fef2f2',
    color: '#dc2626',
    padding: '1rem',
    borderRadius: '8px',
    marginBottom: '1.5rem',
    border: '1px solid #fecaca',
  },
  resultSection: {
    background: '#fff',
    borderRadius: '12px',
    padding: '1.5rem',
    marginBottom: '1.5rem',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    border: '1px solid #e8e8e8',
  },
  resultHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1.5rem',
  },
  resultTitle: {
    margin: 0,
    fontSize: '1.25rem',
    fontWeight: 600,
    color: '#1f2937',
  },
  matchBadge: {
    padding: '0.375rem 0.75rem',
    borderRadius: '6px',
    color: '#fff',
    fontSize: '0.875rem',
    fontWeight: 600,
  },
  scoreDisplay: {
    marginBottom: '1.5rem',
  },
  scoreLabel: {
    fontSize: '0.875rem',
    fontWeight: 500,
    color: '#6b7280',
    marginBottom: '0.5rem',
  },
  scoreValue: {
    fontSize: '2.5rem',
    fontWeight: 700,
    color: '#1a237e',
    marginBottom: '1rem',
  },
  scoreBar: {
    width: '100%',
    height: '20px',
    background: '#f3f4f6',
    borderRadius: '10px',
    overflow: 'hidden',
    position: 'relative',
  },
  scoreBarFill: {
    height: '100%',
    transition: 'width 0.5s ease',
    borderRadius: '10px',
  },
  thresholdMarker: {
    position: 'relative',
    marginTop: '0.5rem',
  },
  thresholdLabel: {
    position: 'absolute',
    left: '78%',
    transform: 'translateX(-50%)',
    fontSize: '0.75rem',
    color: '#6b7280',
    fontWeight: 500,
  },
  thresholdLine: {
    position: 'absolute',
    left: '78%',
    top: '-0.5rem',
    width: '2px',
    height: '1.5rem',
    background: '#9ca3af',
    opacity: 0.5,
  },
  metadataGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1rem',
  },
  metadataItem: {
    background: '#f9fafb',
    padding: '1rem',
    borderRadius: '8px',
  },
  metadataLabel: {
    fontSize: '0.75rem',
    fontWeight: 500,
    color: '#6b7280',
    textTransform: 'uppercase',
    marginBottom: '0.25rem',
  },
  metadataValue: {
    fontSize: '1.1rem',
    fontWeight: 600,
    color: '#1f2937',
  },
  resultError: {
    marginTop: '1rem',
    padding: '0.75rem',
    background: '#fff7ed',
    color: '#ea580c',
    borderRadius: '6px',
    fontSize: '0.875rem',
    border: '1px solid #fed7aa',
  },
  infoPanel: {
    background: '#f9fafb',
    borderRadius: '12px',
    padding: '1.5rem',
    border: '1px solid #e5e7eb',
  },
  infoPanelTitle: {
    margin: '0 0 1.5rem 0',
    fontSize: '1.1rem',
    fontWeight: 600,
    color: '#1f2937',
  },
  infoSection: {
    marginBottom: '1.5rem',
  },
  infoSectionTitle: {
    margin: '0 0 0.5rem 0',
    fontSize: '0.95rem',
    fontWeight: 600,
    color: '#374151',
  },
  codeBlock: {
    background: '#1f2937',
    color: '#10b981',
    padding: '0.75rem',
    borderRadius: '6px',
    fontSize: '0.85rem',
    fontFamily: 'monospace',
    marginBottom: '0.5rem',
    overflowX: 'auto',
    whiteSpace: 'pre-wrap',
    lineHeight: 1.5,
  },
  infoText: {
    margin: 0,
    fontSize: '0.875rem',
    color: '#6b7280',
    lineHeight: 1.5,
  },
};

export default ThemeTestTool;
