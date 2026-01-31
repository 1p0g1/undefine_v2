/**
 * Dictionary Search Component
 * 
 * Standalone search to check if a word exists in the dictionary
 * without initiating word creation.
 */

import React, { useState, useCallback } from 'react';
import { adminApi, DictionaryEntry } from '../api/adminClient';

interface DictionarySearchProps {
  onClose: () => void;
}

export const DictionarySearch: React.FC<DictionarySearchProps> = ({ onClose }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<DictionaryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setSearched(true);

    try {
      const response = await adminApi.searchDictionary(query.trim(), 50);
      setResults(response.results);
    } catch (err) {
      console.error('Dictionary search failed:', err);
      setError(err instanceof Error ? err.message : 'Search failed');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <div>
            <h2 style={styles.title}>📖 Dictionary Search</h2>
            <p style={styles.subtitle}>Check if a word exists in the dictionary</p>
          </div>
          <button style={styles.closeBtn} onClick={onClose}>×</button>
        </div>

        {/* Search Input */}
        <div style={styles.searchContainer}>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            style={styles.searchInput}
            placeholder="Type a word to search..."
            autoFocus
          />
          <button
            style={styles.searchBtn}
            onClick={handleSearch}
            disabled={loading || !query.trim()}
          >
            {loading ? '...' : '🔍 Search'}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div style={styles.error}>{error}</div>
        )}

        {/* Results */}
        <div style={styles.resultsContainer}>
          {loading && (
            <div style={styles.loadingState}>Searching dictionary...</div>
          )}

          {!loading && searched && results.length === 0 && (
            <div style={styles.noResults}>
              <div style={styles.noResultsIcon}>🔍</div>
              <div style={styles.noResultsText}>
                No matches found for "<strong>{query}</strong>"
              </div>
              <div style={styles.noResultsHint}>
                Try a different spelling or check if it's a common word
              </div>
            </div>
          )}

          {!loading && results.length > 0 && (
            <>
              <div style={styles.resultsHeader}>
                Found <strong>{results.length}</strong> result{results.length !== 1 ? 's' : ''}
              </div>
              <div style={styles.resultsList}>
                {results.map((entry) => (
                  <div key={entry.id} style={styles.resultItem}>
                    <div style={styles.resultWord}>
                      <strong>{entry.word}</strong>
                      {entry.part_of_speech && (
                        <span style={styles.pos}>{entry.part_of_speech}</span>
                      )}
                    </div>
                    {entry.definition && (
                      <div style={styles.resultDef}>{entry.definition}</div>
                    )}
                    {entry.etymology && (
                      <div style={styles.resultEtym}>
                        <em>Etymology:</em> {entry.etymology.substring(0, 150)}
                        {entry.etymology.length > 150 ? '...' : ''}
                      </div>
                    )}
                    <div style={styles.resultMeta}>
                      {entry.number_of_letters} letters • Lex rank: {entry.lex_rank}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <button style={styles.closeFooterBtn} onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '1rem',
    zIndex: 1000,
  },
  modal: {
    background: '#fff',
    borderRadius: '12px',
    width: '100%',
    maxWidth: '700px',
    maxHeight: '85vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: '1.5rem',
    borderBottom: '1px solid #e0e0e0',
  },
  title: {
    margin: 0,
    fontSize: '1.25rem',
    fontWeight: 600,
    color: '#1a237e',
  },
  subtitle: {
    margin: '0.25rem 0 0',
    fontSize: '0.85rem',
    color: '#666',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    fontSize: '1.5rem',
    color: '#999',
    cursor: 'pointer',
    padding: '0.25rem',
    lineHeight: 1,
  },
  searchContainer: {
    display: 'flex',
    gap: '0.75rem',
    padding: '1.25rem 1.5rem',
    borderBottom: '1px solid #f0f0f0',
    background: '#fafafa',
  },
  searchInput: {
    flex: 1,
    padding: '0.875rem 1rem',
    fontSize: '1rem',
    border: '2px solid #e0e0e0',
    borderRadius: '8px',
    outline: 'none',
  },
  searchBtn: {
    padding: '0.875rem 1.5rem',
    fontSize: '0.95rem',
    fontWeight: 600,
    background: '#1a237e',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  resultsContainer: {
    flex: 1,
    overflow: 'auto',
    padding: '1rem 1.5rem',
  },
  loadingState: {
    textAlign: 'center',
    padding: '3rem',
    color: '#888',
  },
  noResults: {
    textAlign: 'center',
    padding: '3rem',
  },
  noResultsIcon: {
    fontSize: '3rem',
    opacity: 0.5,
    marginBottom: '1rem',
  },
  noResultsText: {
    fontSize: '1rem',
    color: '#333',
    marginBottom: '0.5rem',
  },
  noResultsHint: {
    fontSize: '0.85rem',
    color: '#888',
  },
  resultsHeader: {
    fontSize: '0.85rem',
    color: '#666',
    marginBottom: '1rem',
  },
  resultsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  resultItem: {
    padding: '1rem',
    background: '#f8f9fa',
    borderRadius: '8px',
    border: '1px solid #e8e8e8',
  },
  resultWord: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginBottom: '0.5rem',
    fontSize: '1.1rem',
    color: '#1a237e',
  },
  pos: {
    fontSize: '0.75rem',
    color: '#888',
    fontWeight: 400,
  },
  resultDef: {
    fontSize: '0.9rem',
    color: '#333',
    lineHeight: 1.5,
    marginBottom: '0.5rem',
  },
  resultEtym: {
    fontSize: '0.8rem',
    color: '#666',
    lineHeight: 1.4,
    marginBottom: '0.5rem',
  },
  resultMeta: {
    fontSize: '0.75rem',
    color: '#999',
  },
  error: {
    margin: '0 1.5rem',
    padding: '0.75rem',
    background: '#ffebee',
    color: '#c62828',
    borderRadius: '6px',
    fontSize: '0.875rem',
  },
  footer: {
    padding: '1rem 1.5rem',
    borderTop: '1px solid #e0e0e0',
    display: 'flex',
    justifyContent: 'flex-end',
  },
  closeFooterBtn: {
    padding: '0.625rem 1.5rem',
    fontSize: '0.9rem',
    fontWeight: 500,
    background: '#f5f5f5',
    color: '#333',
    border: '1px solid #ddd',
    borderRadius: '6px',
    cursor: 'pointer',
  },
};

export default DictionarySearch;

