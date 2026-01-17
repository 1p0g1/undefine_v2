/**
 * Theme Test Lab Component
 * 
 * Interactive tool for testing theme guess matching against the AI scoring system.
 * Supports multiple scoring methods and detailed debugging output.
 * 
 * Features:
 * - Test multiple scoring methods (embedding, NLI, hybrid)
 * - View detailed breakdown by method
 * - Custom templates for advanced testing
 * - Persistent settings via localStorage
 */

import React, { useState, useEffect } from 'react';
import { getApiBaseUrl } from '../../utils/apiHelpers';
import { getAdminKey } from '../api/adminClient';

interface EmbeddingDetail {
  similarity: number;
  isMatch: boolean;
  model: string;
  threshold: number;
}

interface NLIDetail {
  entailment: number;
  contradiction: number;
  neutral: number;
  isMatch: boolean;
  model: string;
  threshold: number;
}

interface HybridDetail {
  finalScore: number;
  isMatch: boolean;
  embeddingWeight: number;
  nliWeight: number;
  strategy: string;
}

interface ThemeTestResult {
  similarity: number;
  isMatch: boolean;
  method: string;
  confidence: number;
  details: {
    embedding?: EmbeddingDetail;
    nli?: NLIDetail;
    hybrid?: HybridDetail;
  };
  debug: {
    themeUsed: string;
    guessUsed: string;
    templatesUsed?: {
      theme: string;
      guess: string;
    };
    processingTimeMs: number;
  };
  error?: string;
}

interface ApiError {
  error: string;
  details?: string;
  status?: number;
  statusText?: string;
}

const STORAGE_KEY = 'undefine_theme_lab_settings';

export const ThemeTestTool: React.FC = () => {
  const [theme, setTheme] = useState('');
  const [guess, setGuess] = useState('');
  const [words, setWords] = useState('');
  const [result, setResult] = useState<ThemeTestResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  
  // Advanced options
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [themeTemplate, setThemeTemplate] = useState("What connects this week's words? {theme}");
  const [guessTemplate, setGuessTemplate] = useState("What connects this week's words? {guess}");
  const [selectedMethods, setSelectedMethods] = useState<string[]>(['embedding', 'nli', 'hybrid']);

  // Load saved settings on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const settings = JSON.parse(saved);
        if (settings.themeTemplate) setThemeTemplate(settings.themeTemplate);
        if (settings.guessTemplate) setGuessTemplate(settings.guessTemplate);
        if (settings.selectedMethods) setSelectedMethods(settings.selectedMethods);
      }
    } catch (e) {
      console.warn('Failed to load saved settings:', e);
    }
  }, []);

  // Save settings on change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        themeTemplate,
        guessTemplate,
        selectedMethods
      }));
    } catch (e) {
      console.warn('Failed to save settings:', e);
    }
  }, [themeTemplate, guessTemplate, selectedMethods]);

  const handleTest = async () => {
    if (!theme.trim() || !guess.trim()) {
      setError({ error: 'Please enter both theme and guess' });
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    const baseUrl = getApiBaseUrl();
    const url = `${baseUrl}/api/admin/theme-test`;
    const adminKey = getAdminKey();

    if (!adminKey) {
      setError({ error: 'Not authenticated', details: 'Admin key not found. Please log in again.' });
      setLoading(false);
      return;
    }

    console.log('[ThemeTestTool] Making request:', { url, theme: theme.trim(), guess: guess.trim() });

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Key': adminKey
        },
        body: JSON.stringify({
          theme: theme.trim(),
          guess: guess.trim(),
          options: {
            methods: selectedMethods,
            themeTemplate: showAdvanced ? themeTemplate : undefined,
            guessTemplate: showAdvanced ? guessTemplate : undefined,
            words: words.trim() ? words.split(',').map(w => w.trim()).filter(Boolean) : undefined
          }
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setError({
          error: data.error || `HTTP ${response.status}`,
          details: data.details || response.statusText,
          status: response.status,
          statusText: response.statusText
        });
        return;
      }

      setResult(data);
      
    } catch (err) {
      console.error('[ThemeTestTool] Fetch error:', err);
      setError({
        error: 'Network Error',
        details: err instanceof Error 
          ? `${err.message}. Check that the backend is deployed and CORS is configured.`
          : 'Failed to connect to the API. The server may be unavailable.',
        status: 0,
        statusText: 'Network Error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setTheme('');
    setGuess('');
    setWords('');
    setResult(null);
    setError(null);
  };

  const toggleMethod = (method: string) => {
    setSelectedMethods(prev => 
      prev.includes(method) 
        ? prev.filter(m => m !== method)
        : [...prev, method]
    );
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h2 style={styles.title}>🧪 Theme Test Lab</h2>
        <p style={styles.subtitle}>
          Test how the AI scores theme guesses. Compare multiple scoring methods and refine thresholds.
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
            placeholder="e.g., Words that are both nouns and verbs"
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
            placeholder="e.g., dual part of speech"
            style={styles.input}
            disabled={loading}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleTest();
            }}
          />
        </div>

        <div style={styles.inputGroup}>
          <label style={styles.label}>Weekly Words (optional, comma-separated)</label>
          <input
            type="text"
            value={words}
            onChange={(e) => setWords(e.target.value)}
            placeholder="e.g., book, hammer, table, bottle"
            style={styles.input}
            disabled={loading}
          />
        </div>

        {/* Method Selection */}
        <div style={styles.methodSection}>
          <label style={styles.label}>Scoring Methods</label>
          <div style={styles.methodButtons}>
            {['embedding', 'nli', 'hybrid'].map(method => (
              <button
                key={method}
                onClick={() => toggleMethod(method)}
                style={{
                  ...styles.methodBtn,
                  ...(selectedMethods.includes(method) ? styles.methodBtnActive : {})
                }}
                disabled={loading}
              >
                {method === 'embedding' && '📊 Embedding'}
                {method === 'nli' && '🧠 NLI'}
                {method === 'hybrid' && '⚡ Hybrid'}
              </button>
            ))}
          </div>
        </div>

        {/* Advanced Options Toggle */}
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          style={styles.advancedToggle}
        >
          {showAdvanced ? '▼' : '▶'} Advanced Options
        </button>

        {showAdvanced && (
          <div style={styles.advancedSection}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Theme Template</label>
              <input
                type="text"
                value={themeTemplate}
                onChange={(e) => setThemeTemplate(e.target.value)}
                style={styles.input}
                disabled={loading}
              />
              <div style={styles.templateHint}>Use {'{theme}'} and {'{words}'} as placeholders</div>
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Guess Template</label>
              <input
                type="text"
                value={guessTemplate}
                onChange={(e) => setGuessTemplate(e.target.value)}
                style={styles.input}
                disabled={loading}
              />
              <div style={styles.templateHint}>Use {'{guess}'} and {'{words}'} as placeholders</div>
            </div>
          </div>
        )}

        <div style={styles.buttonGroup}>
          <button
            onClick={handleTest}
            disabled={loading || !theme.trim() || !guess.trim() || selectedMethods.length === 0}
            style={{
              ...styles.button,
              ...styles.testButton,
              ...(loading || !theme.trim() || !guess.trim() || selectedMethods.length === 0 ? styles.buttonDisabled : {})
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
          <div style={styles.errorHeader}>
            <strong>❌ {error.error}</strong>
            {error.status !== undefined && (
              <span style={styles.errorStatus}>HTTP {error.status}</span>
            )}
          </div>
          {error.details && (
            <div style={styles.errorDetails}>{error.details}</div>
          )}
          {error.status === 0 && (
            <div style={styles.errorHelp}>
              <strong>Troubleshooting:</strong>
              <ul style={{ margin: '0.5rem 0', paddingLeft: '1.5rem' }}>
                <li>Check that the backend is deployed to Vercel</li>
                <li>Verify VITE_API_BASE_URL is set correctly in frontend env</li>
                <li>Ensure CORS headers are configured for admin endpoints</li>
              </ul>
            </div>
          )}
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

          {/* Primary Score */}
          <div style={styles.scoreDisplay}>
            <div style={styles.scoreLabel}>Final Confidence ({result.method})</div>
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
          </div>

          {/* Method Breakdown */}
          <div style={styles.methodBreakdown}>
            <h4 style={styles.breakdownTitle}>Method Breakdown</h4>
            
            {/* Embedding */}
            {result.details.embedding && (
              <div style={styles.methodCard}>
                <div style={styles.methodCardHeader}>
                  <span>📊 Embedding Similarity</span>
                  <span style={{
                    color: result.details.embedding.isMatch ? '#10b981' : '#ef4444'
                  }}>
                    {(result.details.embedding.similarity * 100).toFixed(1)}%
                  </span>
                </div>
                <div style={styles.methodCardMeta}>
                  Model: {result.details.embedding.model}
                  <br />
                  Threshold: {(result.details.embedding.threshold * 100)}%
                </div>
              </div>
            )}

            {/* NLI */}
            {result.details.nli && (
              <div style={styles.methodCard}>
                <div style={styles.methodCardHeader}>
                  <span>🧠 NLI Entailment</span>
                  <span style={{
                    color: result.details.nli.isMatch ? '#10b981' : '#ef4444'
                  }}>
                    {result.details.nli.isMatch ? 'Pass' : 'Fail'}
                  </span>
                </div>
                <div style={styles.nliScores}>
                  <div style={styles.nliScore}>
                    <span style={{ color: '#10b981' }}>Entailment</span>
                    <strong>{(result.details.nli.entailment * 100).toFixed(1)}%</strong>
                  </div>
                  <div style={styles.nliScore}>
                    <span style={{ color: '#ef4444' }}>Contradiction</span>
                    <strong>{(result.details.nli.contradiction * 100).toFixed(1)}%</strong>
                  </div>
                  <div style={styles.nliScore}>
                    <span style={{ color: '#6b7280' }}>Neutral</span>
                    <strong>{(result.details.nli.neutral * 100).toFixed(1)}%</strong>
                  </div>
                </div>
                <div style={styles.methodCardMeta}>
                  Model: {result.details.nli.model}
                </div>
              </div>
            )}

            {/* Hybrid */}
            {result.details.hybrid && (
              <div style={styles.methodCard}>
                <div style={styles.methodCardHeader}>
                  <span>⚡ Hybrid Decision</span>
                  <span style={{
                    color: result.details.hybrid.isMatch ? '#10b981' : '#ef4444'
                  }}>
                    {(result.details.hybrid.finalScore * 100).toFixed(1)}%
                  </span>
                </div>
                <div style={styles.methodCardMeta}>
                  Strategy: <strong>{result.details.hybrid.strategy}</strong>
                  <br />
                  Weights: Embedding {result.details.hybrid.embeddingWeight * 100}%, NLI {result.details.hybrid.nliWeight * 100}%
                </div>
              </div>
            )}
          </div>

          {/* Debug Info */}
          <div style={styles.debugSection}>
            <h4 style={styles.debugTitle}>Debug Info</h4>
            <pre style={styles.debugPre}>
              {JSON.stringify(result.debug, null, 2)}
            </pre>
          </div>

          {result.error && (
            <div style={styles.resultError}>
              <strong>Warning:</strong> {result.error}
            </div>
          )}
        </div>
      )}

      {/* AI Config Info */}
      <div style={styles.infoPanel}>
        <h3 style={styles.infoPanelTitle}>ℹ️ Scoring Methods</h3>
        
        <div style={styles.infoSection}>
          <h4 style={styles.infoSectionTitle}>📊 Embedding (sentence-transformers/all-MiniLM-L6-v2)</h4>
          <p style={styles.infoText}>
            Computes cosine similarity between theme and guess embeddings. Good for synonyms but can give false positives for unrelated concepts that share semantic space.
          </p>
        </div>

        <div style={styles.infoSection}>
          <h4 style={styles.infoSectionTitle}>🧠 NLI (facebook/bart-large-mnli)</h4>
          <p style={styles.infoText}>
            Zero-shot classification checks if the guess logically relates to the theme. Better at rejecting category mismatches like "begin with b" vs "parts of speech".
          </p>
        </div>

        <div style={styles.infoSection}>
          <h4 style={styles.infoSectionTitle}>⚡ Hybrid (Recommended)</h4>
          <p style={styles.infoText}>
            Combines embedding and NLI scores with smart rules: high contradiction overrides embedding similarity; high entailment + decent embedding = pass.
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
    marginBottom: '1rem',
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
    boxSizing: 'border-box',
  },
  methodSection: {
    marginBottom: '1rem',
  },
  methodButtons: {
    display: 'flex',
    gap: '0.5rem',
    flexWrap: 'wrap',
  },
  methodBtn: {
    padding: '0.5rem 1rem',
    fontSize: '0.875rem',
    fontWeight: 500,
    border: '2px solid #e5e7eb',
    borderRadius: '6px',
    background: '#fff',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  methodBtnActive: {
    borderColor: '#1a237e',
    background: '#e8eaf6',
    color: '#1a237e',
  },
  advancedToggle: {
    background: 'none',
    border: 'none',
    color: '#6b7280',
    cursor: 'pointer',
    fontSize: '0.875rem',
    padding: '0.5rem 0',
    marginBottom: '0.5rem',
  },
  advancedSection: {
    background: '#f9fafb',
    padding: '1rem',
    borderRadius: '8px',
    marginBottom: '1rem',
  },
  templateHint: {
    fontSize: '0.75rem',
    color: '#9ca3af',
    marginTop: '0.25rem',
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
  errorHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.5rem',
  },
  errorStatus: {
    fontSize: '0.75rem',
    background: '#dc2626',
    color: '#fff',
    padding: '0.125rem 0.5rem',
    borderRadius: '4px',
  },
  errorDetails: {
    fontSize: '0.875rem',
    marginTop: '0.5rem',
    opacity: 0.9,
  },
  errorHelp: {
    marginTop: '0.75rem',
    paddingTop: '0.75rem',
    borderTop: '1px solid #fecaca',
    fontSize: '0.8rem',
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
    marginBottom: '0.25rem',
  },
  scoreValue: {
    fontSize: '2.5rem',
    fontWeight: 700,
    color: '#1a237e',
    marginBottom: '0.5rem',
  },
  scoreBar: {
    width: '100%',
    height: '16px',
    background: '#f3f4f6',
    borderRadius: '8px',
    overflow: 'hidden',
  },
  scoreBarFill: {
    height: '100%',
    transition: 'width 0.5s ease',
    borderRadius: '8px',
  },
  methodBreakdown: {
    marginBottom: '1.5rem',
  },
  breakdownTitle: {
    margin: '0 0 1rem 0',
    fontSize: '1rem',
    fontWeight: 600,
    color: '#374151',
  },
  methodCard: {
    background: '#f9fafb',
    padding: '1rem',
    borderRadius: '8px',
    marginBottom: '0.75rem',
  },
  methodCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontWeight: 600,
    marginBottom: '0.5rem',
  },
  methodCardMeta: {
    fontSize: '0.75rem',
    color: '#6b7280',
    lineHeight: 1.5,
  },
  nliScores: {
    display: 'flex',
    gap: '1rem',
    marginBottom: '0.5rem',
  },
  nliScore: {
    display: 'flex',
    flexDirection: 'column',
    fontSize: '0.8rem',
  },
  debugSection: {
    marginTop: '1rem',
    paddingTop: '1rem',
    borderTop: '1px solid #e5e7eb',
  },
  debugTitle: {
    margin: '0 0 0.5rem 0',
    fontSize: '0.875rem',
    fontWeight: 600,
    color: '#6b7280',
  },
  debugPre: {
    background: '#1f2937',
    color: '#10b981',
    padding: '0.75rem',
    borderRadius: '6px',
    fontSize: '0.75rem',
    overflow: 'auto',
    maxHeight: '200px',
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
    margin: '0 0 1rem 0',
    fontSize: '1.1rem',
    fontWeight: 600,
    color: '#1f2937',
  },
  infoSection: {
    marginBottom: '1rem',
  },
  infoSectionTitle: {
    margin: '0 0 0.25rem 0',
    fontSize: '0.9rem',
    fontWeight: 600,
    color: '#374151',
  },
  infoText: {
    margin: 0,
    fontSize: '0.8rem',
    color: '#6b7280',
    lineHeight: 1.5,
  },
};

export default ThemeTestTool;
