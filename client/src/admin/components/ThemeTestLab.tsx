/**
 * Theme Test Lab
 * 
 * Admin tool for testing and debugging theme similarity matching.
 * Allows testing different guesses against themes to verify AI accuracy.
 * 
 * Features:
 * - Test any theme/guess combination
 * - See raw similarity score
 * - Understand the threshold used
 * - View contextual framing applied
 * - See which model is being used
 */

import React, { useState } from 'react';
import { getApiBaseUrl } from '../../utils/env';

interface TestResult {
  isCorrect: boolean;
  method: 'exact' | 'semantic' | 'error';
  confidence: number;
  similarity?: number;
  threshold: number;
  contextualGuess: string;
  contextualTheme: string;
  rawGuess: string;
  rawTheme: string;
  model: string;
  error?: string;
}

interface ThemeTestLabProps {
  onClose: () => void;
}

export const ThemeTestLab: React.FC<ThemeTestLabProps> = ({ onClose }) => {
  const [theme, setTheme] = useState('');
  const [guess, setGuess] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);
  const [history, setHistory] = useState<TestResult[]>([]);

  const handleTest = async () => {
    if (!theme.trim() || !guess.trim()) {
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const baseUrl = getApiBaseUrl();
      const response = await fetch(`${baseUrl}/api/admin/theme-test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': localStorage.getItem('admin_key') || '',
        },
        body: JSON.stringify({ theme: theme.trim(), guess: guess.trim() }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to test theme');
      }

      const testResult: TestResult = {
        ...data,
        rawGuess: guess.trim(),
        rawTheme: theme.trim(),
      };
      
      setResult(testResult);
      setHistory(prev => [testResult, ...prev.slice(0, 9)]); // Keep last 10
    } catch (error) {
      console.error('Theme test error:', error);
      setResult({
        isCorrect: false,
        method: 'error',
        confidence: 0,
        threshold: 0.78,
        contextualGuess: '',
        contextualTheme: '',
        rawGuess: guess.trim(),
        rawTheme: theme.trim(),
        model: 'N/A',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (confidence: number, isCorrect: boolean) => {
    if (isCorrect) return '#22c55e';
    if (confidence >= 70) return '#f59e0b';
    if (confidence >= 50) return '#ef4444';
    return '#6b7280';
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <div>
            <h2 style={styles.title}>🧪 Theme Test Lab</h2>
            <p style={styles.subtitle}>Debug and fine-tune theme matching AI</p>
          </div>
          <button onClick={onClose} style={styles.closeBtn}>×</button>
        </div>

        {/* Info Panel */}
        <div style={styles.infoPanel}>
          <h4 style={styles.infoTitle}>📚 How Theme Matching Works</h4>
          <div style={styles.infoContent}>
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>Model:</span>
              <code style={styles.infoCode}>sentence-transformers/all-MiniLM-L6-v2</code>
            </div>
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>Threshold:</span>
              <span style={styles.infoValue}>78% similarity required to pass</span>
            </div>
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>Contextual Framing:</span>
              <span style={styles.infoValue}>
                Both guess and theme are prefixed with "What connects this week's words?"
              </span>
            </div>
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>Method:</span>
              <span style={styles.infoValue}>
                Computes cosine similarity between sentence embeddings
              </span>
            </div>
          </div>
        </div>

        {/* Test Input */}
        <div style={styles.inputSection}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Theme (Actual Answer)</label>
            <input
              type="text"
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              placeholder="e.g., Words Where Stress Changes Meaning"
              style={styles.input}
            />
          </div>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Guess (Player's Attempt)</label>
            <input
              type="text"
              value={guess}
              onChange={(e) => setGuess(e.target.value)}
              placeholder="e.g., work"
              style={styles.input}
              onKeyDown={(e) => e.key === 'Enter' && handleTest()}
            />
          </div>
          <button 
            onClick={handleTest} 
            disabled={loading || !theme.trim() || !guess.trim()}
            style={styles.testBtn}
          >
            {loading ? '🔄 Testing...' : '🧪 Test Similarity'}
          </button>
        </div>

        {/* Result */}
        {result && (
          <div style={{
            ...styles.resultPanel,
            borderColor: result.error ? '#ef4444' : getScoreColor(result.confidence, result.isCorrect),
          }}>
            {result.error ? (
              <div style={styles.errorResult}>
                <span style={styles.errorIcon}>❌</span>
                <span>{result.error}</span>
              </div>
            ) : (
              <>
                <div style={styles.resultHeader}>
                  <div style={{
                    ...styles.scoreCircle,
                    background: getScoreColor(result.confidence, result.isCorrect),
                  }}>
                    {result.confidence}%
                  </div>
                  <div style={styles.resultMeta}>
                    <div style={{
                      ...styles.verdict,
                      color: result.isCorrect ? '#22c55e' : '#ef4444',
                    }}>
                      {result.isCorrect ? '✅ WOULD PASS' : '❌ WOULD FAIL'}
                    </div>
                    <div style={styles.resultMethod}>
                      Method: {result.method} • Threshold: {Math.round(result.threshold * 100)}%
                    </div>
                  </div>
                </div>
                
                <div style={styles.resultDetails}>
                  <div style={styles.detailRow}>
                    <span style={styles.detailLabel}>Raw Similarity:</span>
                    <span style={styles.detailValue}>
                      {result.similarity !== undefined 
                        ? `${(result.similarity * 100).toFixed(2)}%`
                        : 'N/A'}
                    </span>
                  </div>
                  <div style={styles.detailRow}>
                    <span style={styles.detailLabel}>Contextual Guess:</span>
                    <code style={styles.detailCode}>{result.contextualGuess}</code>
                  </div>
                  <div style={styles.detailRow}>
                    <span style={styles.detailLabel}>Contextual Theme:</span>
                    <code style={styles.detailCode}>{result.contextualTheme}</code>
                  </div>
                </div>

                {/* Interpretation */}
                <div style={styles.interpretation}>
                  <strong>💡 Interpretation:</strong>
                  {result.confidence >= 78 ? (
                    <span> This score exceeds the 78% threshold, so it would be marked as CORRECT.</span>
                  ) : result.confidence >= 70 ? (
                    <span> Close but below threshold. The model found some semantic overlap but not enough.</span>
                  ) : result.confidence >= 50 ? (
                    <span> Low-moderate similarity. The guess shares some conceptual space but is clearly different.</span>
                  ) : (
                    <span> Very low similarity. These are semantically distant concepts.</span>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* History */}
        {history.length > 0 && (
          <div style={styles.historySection}>
            <h4 style={styles.historyTitle}>📋 Recent Tests</h4>
            <div style={styles.historyList}>
              {history.map((h, i) => (
                <div 
                  key={i} 
                  style={{
                    ...styles.historyItem,
                    borderLeftColor: getScoreColor(h.confidence, h.isCorrect),
                  }}
                  onClick={() => {
                    setTheme(h.rawTheme);
                    setGuess(h.rawGuess);
                    setResult(h);
                  }}
                >
                  <div style={styles.historyMain}>
                    <span style={styles.historyGuess}>"{h.rawGuess}"</span>
                    <span style={styles.historyArrow}>→</span>
                    <span style={styles.historyTheme}>"{h.rawTheme}"</span>
                  </div>
                  <div style={{
                    ...styles.historyScore,
                    color: getScoreColor(h.confidence, h.isCorrect),
                  }}>
                    {h.confidence}%
                    {h.isCorrect ? ' ✓' : ' ✗'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tips */}
        <div style={styles.tipsSection}>
          <h4 style={styles.tipsTitle}>💡 Tips for Theme Design</h4>
          <ul style={styles.tipsList}>
            <li>Themes should be specific enough that unrelated words score below 50%</li>
            <li>If a common word like "work" scores 70%+, the theme may be too broad</li>
            <li>Good themes are descriptive phrases, not single words</li>
            <li>Test several "wrong" guesses to ensure they fail appropriately</li>
            <li>Synonyms of the actual theme should score 75%+ to be recognized</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '1rem',
  },
  modal: {
    background: '#fff',
    borderRadius: '1rem',
    maxWidth: '800px',
    width: '100%',
    maxHeight: '90vh',
    overflowY: 'auto',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: '1.5rem',
    borderBottom: '1px solid #e5e7eb',
    position: 'sticky',
    top: 0,
    background: '#fff',
    zIndex: 10,
  },
  title: {
    margin: 0,
    fontSize: '1.5rem',
    fontWeight: 700,
    color: '#1f2937',
  },
  subtitle: {
    margin: '0.25rem 0 0',
    fontSize: '0.875rem',
    color: '#6b7280',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    fontSize: '1.5rem',
    cursor: 'pointer',
    color: '#6b7280',
    padding: '0.5rem',
    lineHeight: 1,
  },
  infoPanel: {
    background: '#f0f9ff',
    border: '1px solid #bae6fd',
    borderRadius: '0.5rem',
    margin: '1rem 1.5rem',
    padding: '1rem',
  },
  infoTitle: {
    margin: '0 0 0.75rem',
    fontSize: '0.875rem',
    fontWeight: 600,
    color: '#0369a1',
  },
  infoContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  infoRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.5rem',
    fontSize: '0.8rem',
  },
  infoLabel: {
    fontWeight: 600,
    color: '#0369a1',
    minWidth: '140px',
  },
  infoCode: {
    background: '#e0f2fe',
    padding: '0.125rem 0.375rem',
    borderRadius: '0.25rem',
    fontSize: '0.75rem',
    fontFamily: 'monospace',
  },
  infoValue: {
    color: '#0c4a6e',
  },
  inputSection: {
    padding: '1rem 1.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
  },
  label: {
    fontSize: '0.875rem',
    fontWeight: 600,
    color: '#374151',
  },
  input: {
    padding: '0.75rem 1rem',
    border: '2px solid #e5e7eb',
    borderRadius: '0.5rem',
    fontSize: '1rem',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  testBtn: {
    padding: '0.875rem 1.5rem',
    background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
    color: '#fff',
    border: 'none',
    borderRadius: '0.5rem',
    fontSize: '1rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'opacity 0.2s',
  },
  resultPanel: {
    margin: '0 1.5rem 1rem',
    padding: '1rem',
    borderRadius: '0.5rem',
    border: '2px solid',
    background: '#fafafa',
  },
  errorResult: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    color: '#ef4444',
    fontWeight: 500,
  },
  errorIcon: {
    fontSize: '1.25rem',
  },
  resultHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    marginBottom: '1rem',
  },
  scoreCircle: {
    width: '4rem',
    height: '4rem',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontWeight: 700,
    fontSize: '1.25rem',
  },
  resultMeta: {
    flex: 1,
  },
  verdict: {
    fontSize: '1.25rem',
    fontWeight: 700,
  },
  resultMethod: {
    fontSize: '0.875rem',
    color: '#6b7280',
    marginTop: '0.25rem',
  },
  resultDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    marginBottom: '1rem',
  },
  detailRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.5rem',
    fontSize: '0.875rem',
  },
  detailLabel: {
    fontWeight: 600,
    color: '#374151',
    minWidth: '130px',
  },
  detailValue: {
    color: '#6b7280',
  },
  detailCode: {
    background: '#f3f4f6',
    padding: '0.25rem 0.5rem',
    borderRadius: '0.25rem',
    fontSize: '0.75rem',
    fontFamily: 'monospace',
    color: '#1f2937',
    wordBreak: 'break-word',
  },
  interpretation: {
    background: '#fef3c7',
    padding: '0.75rem',
    borderRadius: '0.5rem',
    fontSize: '0.875rem',
    color: '#92400e',
  },
  historySection: {
    padding: '0 1.5rem 1rem',
  },
  historyTitle: {
    margin: '0 0 0.75rem',
    fontSize: '0.875rem',
    fontWeight: 600,
    color: '#374151',
  },
  historyList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  historyItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.5rem 0.75rem',
    background: '#f9fafb',
    borderRadius: '0.375rem',
    borderLeft: '3px solid',
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  historyMain: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.875rem',
    overflow: 'hidden',
  },
  historyGuess: {
    color: '#1f2937',
    fontWeight: 500,
  },
  historyArrow: {
    color: '#9ca3af',
  },
  historyTheme: {
    color: '#6b7280',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  historyScore: {
    fontWeight: 600,
    fontSize: '0.875rem',
    flexShrink: 0,
  },
  tipsSection: {
    padding: '1rem 1.5rem',
    background: '#f9fafb',
    borderTop: '1px solid #e5e7eb',
  },
  tipsTitle: {
    margin: '0 0 0.5rem',
    fontSize: '0.875rem',
    fontWeight: 600,
    color: '#374151',
  },
  tipsList: {
    margin: 0,
    paddingLeft: '1.25rem',
    fontSize: '0.8rem',
    color: '#6b7280',
    lineHeight: 1.6,
  },
};

