/**
 * Words Table Search
 * 
 * Search the internal 'words' table (scheduled game words).
 * Similar to DictionarySearch but for game content.
 */

import React, { useState, useCallback } from 'react';
import { getAdminKey } from '../api/adminClient';
import { getApiBaseUrl } from '../../utils/apiHelpers';

interface WordEntry {
  id: string;
  word: string;
  date: string | null;
  theme: string | null;
  definition: string | null;
  etymology: string | null;
  first_letter: string | null;
  in_a_sentence: string | null;
  number_of_letters: number | null;
  equivalents: string[] | null;
  difficulty: string | null;
  created_at: string;
}

interface WordsSearchProps {
  onSelectWord?: (word: WordEntry) => void;
}

export const WordsSearch: React.FC<WordsSearchProps> = ({ onSelectWord }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchType, setSearchType] = useState<'word' | 'theme' | 'date'>('word');
  const [results, setResults] = useState<WordEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<{ total: number; withTheme: number; withClues: number } | null>(null);

  const handleSearch = useCallback(async () => {
    if (!searchTerm.trim()) {
      setError('Please enter a search term');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResults([]);

    try {
      const adminKey = getAdminKey();
      if (!adminKey) {
        throw new Error('Not authenticated');
      }

      const baseUrl = getApiBaseUrl();
      const url = new URL(`${baseUrl}/api/admin/words-search`);
      url.searchParams.set('q', searchTerm.trim());
      url.searchParams.set('type', searchType);

      const response = await fetch(url.toString(), {
        headers: {
          'X-Admin-Key': adminKey,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Request failed: ${response.status}`);
      }

      const data = await response.json();
      setResults(data.words || []);
      setStats(data.stats || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm, searchType]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', { 
      weekday: 'short',
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    });
  };

  const getClueStatus = (word: WordEntry) => {
    const clues = [
      word.definition,
      word.etymology,
      word.first_letter,
      word.in_a_sentence,
      word.number_of_letters,
      word.equivalents
    ];
    const filled = clues.filter(c => c !== null && c !== undefined && (Array.isArray(c) ? c.length > 0 : true)).length;
    return `${filled}/6 clues`;
  };

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>🔍 Words Table Search</h3>
      <p style={styles.subtitle}>Search scheduled game words (internal database)</p>
      
      <div style={styles.searchRow}>
        <select
          value={searchType}
          onChange={(e) => setSearchType(e.target.value as 'word' | 'theme' | 'date')}
          style={styles.select}
        >
          <option value="word">By Word</option>
          <option value="theme">By Theme</option>
          <option value="date">By Date (YYYY-MM)</option>
        </select>
        
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={
            searchType === 'word' ? 'e.g., harp' :
            searchType === 'theme' ? 'e.g., ireland' :
            'e.g., 2026-03'
          }
          style={styles.input}
        />
        
        <button
          onClick={handleSearch}
          disabled={isLoading}
          style={styles.searchBtn}
        >
          {isLoading ? '⏳' : '🔍'} Search
        </button>
      </div>

      {error && (
        <div style={styles.error}>❌ {error}</div>
      )}

      {stats && (
        <div style={styles.stats}>
          Found <strong>{stats.total}</strong> words
          {stats.withTheme > 0 && <> • <strong>{stats.withTheme}</strong> with themes</>}
          {stats.withClues > 0 && <> • <strong>{stats.withClues}</strong> with all clues</>}
        </div>
      )}

      {results.length > 0 && (
        <div style={styles.results}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Word</th>
                <th style={styles.th}>Date</th>
                <th style={styles.th}>Theme</th>
                <th style={styles.th}>Clues</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {results.map((word) => (
                <tr key={word.id} style={styles.tr}>
                  <td style={styles.td}>
                    <strong>{word.word}</strong>
                  </td>
                  <td style={styles.td}>
                    <span style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                      {word.date || '—'}
                    </span>
                    <br />
                    <span style={{ fontSize: '0.7rem', color: '#666' }}>
                      {formatDate(word.date)}
                    </span>
                  </td>
                  <td style={styles.td}>
                    {word.theme ? (
                      <span style={styles.themeBadge}>{word.theme}</span>
                    ) : (
                      <span style={{ color: '#999' }}>—</span>
                    )}
                  </td>
                  <td style={styles.td}>
                    <span style={{
                      ...styles.clueBadge,
                      backgroundColor: getClueStatus(word).startsWith('6') ? '#dcfce7' : '#fef3c7',
                      color: getClueStatus(word).startsWith('6') ? '#166534' : '#92400e'
                    }}>
                      {getClueStatus(word)}
                    </span>
                  </td>
                  <td style={styles.td}>
                    {onSelectWord && (
                      <button
                        onClick={() => onSelectWord(word)}
                        style={styles.selectBtn}
                      >
                        Edit
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {results.length === 0 && !isLoading && !error && searchTerm && (
        <div style={styles.empty}>
          No words found matching "{searchTerm}" ({searchType})
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '1rem',
    backgroundColor: '#f8fafc',
    borderRadius: '0.5rem',
    border: '1px solid #e2e8f0',
    marginBottom: '1rem',
  },
  title: {
    margin: '0 0 0.25rem 0',
    fontSize: '1rem',
    color: '#1e293b',
  },
  subtitle: {
    margin: '0 0 1rem 0',
    fontSize: '0.8rem',
    color: '#64748b',
  },
  searchRow: {
    display: 'flex',
    gap: '0.5rem',
    marginBottom: '1rem',
  },
  select: {
    padding: '0.5rem',
    borderRadius: '0.375rem',
    border: '1px solid #cbd5e1',
    backgroundColor: '#fff',
    fontSize: '0.875rem',
  },
  input: {
    flex: 1,
    padding: '0.5rem 0.75rem',
    borderRadius: '0.375rem',
    border: '1px solid #cbd5e1',
    fontSize: '0.875rem',
  },
  searchBtn: {
    padding: '0.5rem 1rem',
    backgroundColor: '#3b82f6',
    color: '#fff',
    border: 'none',
    borderRadius: '0.375rem',
    cursor: 'pointer',
    fontWeight: 500,
    fontSize: '0.875rem',
  },
  error: {
    padding: '0.75rem',
    backgroundColor: '#fef2f2',
    color: '#dc2626',
    borderRadius: '0.375rem',
    marginBottom: '1rem',
    fontSize: '0.875rem',
  },
  stats: {
    padding: '0.5rem 0.75rem',
    backgroundColor: '#eff6ff',
    borderRadius: '0.375rem',
    marginBottom: '1rem',
    fontSize: '0.8rem',
    color: '#1e40af',
  },
  results: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '0.875rem',
  },
  th: {
    textAlign: 'left',
    padding: '0.5rem',
    borderBottom: '2px solid #e2e8f0',
    color: '#64748b',
    fontWeight: 600,
    fontSize: '0.75rem',
    textTransform: 'uppercase',
  },
  tr: {
    borderBottom: '1px solid #e2e8f0',
  },
  td: {
    padding: '0.5rem',
    verticalAlign: 'middle',
  },
  themeBadge: {
    display: 'inline-block',
    padding: '0.125rem 0.5rem',
    backgroundColor: '#dbeafe',
    color: '#1d4ed8',
    borderRadius: '1rem',
    fontSize: '0.75rem',
    fontWeight: 500,
  },
  clueBadge: {
    display: 'inline-block',
    padding: '0.125rem 0.5rem',
    borderRadius: '1rem',
    fontSize: '0.7rem',
    fontWeight: 500,
  },
  selectBtn: {
    padding: '0.25rem 0.5rem',
    backgroundColor: '#e2e8f0',
    color: '#475569',
    border: 'none',
    borderRadius: '0.25rem',
    cursor: 'pointer',
    fontSize: '0.75rem',
  },
  empty: {
    padding: '1rem',
    textAlign: 'center',
    color: '#94a3b8',
    fontStyle: 'italic',
  },
};

export default WordsSearch;
