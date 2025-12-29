/**
 * Word Editor Component
 * 
 * Modal for adding/editing words with all DEFINE clues.
 * Includes dictionary lookup for suggestions.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { adminApi, WordData, WordResponse, DictionaryEntry } from '../api/adminClient';

interface WordEditorProps {
  date: string;
  existingWord?: WordResponse | null;
  existingThemes: string[];
  onSave: () => void;
  onClose: () => void;
}

const DIFFICULTY_OPTIONS = ['Easy', 'Medium', 'Hard', 'Expert'];

export const WordEditor: React.FC<WordEditorProps> = ({
  date,
  existingWord,
  existingThemes,
  onSave,
  onClose,
}) => {
  // Form state
  const [word, setWord] = useState(existingWord?.word || '');
  const [definition, setDefinition] = useState(existingWord?.definition || '');
  const [etymology, setEtymology] = useState(existingWord?.etymology || '');
  const [inASentence, setInASentence] = useState(existingWord?.in_a_sentence || '');
  const [equivalents, setEquivalents] = useState(existingWord?.equivalents?.join(', ') || '');
  const [theme, setTheme] = useState(existingWord?.theme || '');
  const [difficulty, setDifficulty] = useState(existingWord?.difficulty || 'Medium');
  const [newTheme, setNewTheme] = useState('');

  // UI state
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Dictionary lookup state
  const [dictResults, setDictResults] = useState<DictionaryEntry[]>([]);
  const [dictLoading, setDictLoading] = useState(false);
  const [showDictPanel, setShowDictPanel] = useState(false);

  // Derived values (auto-calculated)
  const firstLetter = word.trim()[0]?.toUpperCase() || '';
  const numberOfLetters = word.trim().length;

  // Dictionary search (debounced)
  const searchDictionary = useCallback(async (query: string) => {
    if (query.length < 2) {
      setDictResults([]);
      return;
    }

    setDictLoading(true);
    try {
      const response = await adminApi.searchDictionary(query, 10);
      setDictResults(response.results);
    } catch (err) {
      console.error('Dictionary search failed:', err);
    } finally {
      setDictLoading(false);
    }
  }, []);

  // Debounce dictionary search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (word.length >= 2) {
        searchDictionary(word);
        setShowDictPanel(true);
      } else {
        setShowDictPanel(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [word, searchDictionary]);

  // Apply dictionary entry to form
  const applyDictionaryEntry = (entry: DictionaryEntry) => {
    setWord(entry.word);
    if (entry.definition && !definition) {
      setDefinition(entry.definition);
    }
    if (entry.etymology && !etymology) {
      setEtymology(entry.etymology);
    }
    setShowDictPanel(false);
  };

  // Handle save
  const handleSave = async () => {
    if (!word.trim()) {
      setError('Word is required');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const wordData: WordData = {
        id: existingWord?.id,
        word: word.trim().toUpperCase(),
        date,
        definition: definition.trim() || undefined,
        etymology: etymology.trim() || undefined,
        first_letter: firstLetter,
        in_a_sentence: inASentence.trim() || undefined,
        number_of_letters: numberOfLetters,
        equivalents: equivalents.trim() 
          ? equivalents.split(',').map(s => s.trim()).filter(Boolean)
          : undefined,
        theme: (theme === '__new__' ? newTheme : theme) || undefined,
        difficulty: difficulty || undefined,
      };

      const result = await adminApi.saveWord(wordData);
      setSuccess(`Word ${result.action} successfully!`);
      
      setTimeout(() => {
        onSave();
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save word');
    } finally {
      setSaving(false);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!existingWord?.id) return;
    
    if (!confirm('Are you sure you want to delete this word? This cannot be undone.')) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await adminApi.deleteWord(existingWord.id);
      setSuccess('Word deleted successfully!');
      setTimeout(() => {
        onSave();
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete word');
    } finally {
      setSaving(false);
    }
  };

  const formattedDate = new Date(date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <div>
            <h2 style={styles.title}>
              {existingWord ? 'Edit Word' : 'Add Word'}
            </h2>
            <p style={styles.dateLabel}>{formattedDate}</p>
          </div>
          <button style={styles.closeBtn} onClick={onClose}>×</button>
        </div>

        {/* Messages */}
        {error && <div style={styles.error}>{error}</div>}
        {success && <div style={styles.success}>{success}</div>}

        {/* Form */}
        <div style={styles.form}>
          {/* Word input with dictionary lookup */}
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Word *</label>
            <div style={styles.wordInputContainer}>
              <input
                type="text"
                value={word}
                onChange={(e) => setWord(e.target.value.toUpperCase())}
                style={styles.input}
                placeholder="THE WORD"
                autoFocus
              />
              {dictLoading && <span style={styles.loadingIndicator}>...</span>}
            </div>
            
            {/* Dictionary suggestions */}
            {showDictPanel && dictResults.length > 0 && (
              <div style={styles.dictPanel}>
                <div style={styles.dictHeader}>📖 Dictionary suggestions</div>
                {dictResults.map((entry) => (
                  <div
                    key={entry.id}
                    style={styles.dictEntry}
                    onClick={() => applyDictionaryEntry(entry)}
                  >
                    <strong>{entry.word}</strong>
                    {entry.part_of_speech && <span style={styles.pos}>{entry.part_of_speech}</span>}
                    <div style={styles.dictDef}>
                      {entry.definition?.substring(0, 100)}
                      {entry.definition && entry.definition.length > 100 ? '...' : ''}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Auto-derived fields display */}
            <div style={styles.derivedFields}>
              <span><strong>F</strong>irst letter: {firstLetter || '—'}</span>
              <span><strong>N</strong>umber of letters: {numberOfLetters || '—'}</span>
            </div>
          </div>

          {/* Definition (D clue) */}
          <div style={styles.fieldGroup}>
            <label style={styles.label}>
              <span style={styles.clueTag}>D</span> Definition
            </label>
            <textarea
              value={definition}
              onChange={(e) => setDefinition(e.target.value)}
              style={styles.textarea}
              placeholder="The meaning of the word..."
              rows={3}
            />
          </div>

          {/* Etymology (E clue) */}
          <div style={styles.fieldGroup}>
            <label style={styles.label}>
              <span style={styles.clueTag}>E</span> Etymology
            </label>
            <textarea
              value={etymology}
              onChange={(e) => setEtymology(e.target.value)}
              style={styles.textarea}
              placeholder="Origin and history of the word..."
              rows={2}
            />
          </div>

          {/* In a Sentence (I clue) */}
          <div style={styles.fieldGroup}>
            <label style={styles.label}>
              <span style={styles.clueTag}>I</span> In a Sentence
            </label>
            <textarea
              value={inASentence}
              onChange={(e) => setInASentence(e.target.value)}
              style={styles.textarea}
              placeholder="Example usage in a sentence..."
              rows={2}
            />
          </div>

          {/* Equivalents (E clue - synonyms) */}
          <div style={styles.fieldGroup}>
            <label style={styles.label}>
              <span style={styles.clueTag}>E</span> Equivalents (synonyms)
            </label>
            <input
              type="text"
              value={equivalents}
              onChange={(e) => setEquivalents(e.target.value)}
              style={styles.input}
              placeholder="synonym1, synonym2, synonym3..."
            />
            <span style={styles.hint}>Comma-separated list</span>
          </div>

          {/* Theme */}
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Theme</label>
            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              style={styles.select}
            >
              <option value="">— No theme —</option>
              {existingThemes.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
              <option value="__new__">+ New theme...</option>
            </select>
            {theme === '__new__' && (
              <input
                type="text"
                value={newTheme}
                onChange={(e) => setNewTheme(e.target.value)}
                style={{ ...styles.input, marginTop: '0.5rem' }}
                placeholder="Enter new theme name..."
              />
            )}
          </div>

          {/* Difficulty */}
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Difficulty</label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              style={styles.select}
            >
              {DIFFICULTY_OPTIONS.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Actions */}
        <div style={styles.actions}>
          {existingWord && (
            <button
              style={styles.deleteBtn}
              onClick={handleDelete}
              disabled={saving}
            >
              Delete
            </button>
          )}
          <div style={styles.actionsSpacer} />
          <button
            style={styles.cancelBtn}
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            style={styles.saveBtn}
            onClick={handleSave}
            disabled={saving || !word.trim()}
          >
            {saving ? 'Saving...' : 'Save Word'}
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
    maxWidth: '600px',
    maxHeight: '90vh',
    overflow: 'auto',
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
  dateLabel: {
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
  form: {
    padding: '1.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.375rem',
    position: 'relative',
  },
  label: {
    fontSize: '0.85rem',
    fontWeight: 600,
    color: '#333',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  clueTag: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '20px',
    height: '20px',
    background: '#1a237e',
    color: '#fff',
    borderRadius: '4px',
    fontSize: '0.7rem',
    fontWeight: 700,
  },
  input: {
    padding: '0.75rem',
    fontSize: '1rem',
    border: '1px solid #ddd',
    borderRadius: '6px',
    outline: 'none',
  },
  textarea: {
    padding: '0.75rem',
    fontSize: '0.95rem',
    border: '1px solid #ddd',
    borderRadius: '6px',
    outline: 'none',
    resize: 'vertical',
    fontFamily: 'inherit',
  },
  select: {
    padding: '0.75rem',
    fontSize: '1rem',
    border: '1px solid #ddd',
    borderRadius: '6px',
    outline: 'none',
    background: '#fff',
  },
  hint: {
    fontSize: '0.75rem',
    color: '#999',
  },
  wordInputContainer: {
    position: 'relative',
  },
  loadingIndicator: {
    position: 'absolute',
    right: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    color: '#999',
  },
  derivedFields: {
    display: 'flex',
    gap: '1.5rem',
    fontSize: '0.8rem',
    color: '#666',
    marginTop: '0.25rem',
  },
  dictPanel: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    background: '#fff',
    border: '1px solid #ddd',
    borderRadius: '6px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    zIndex: 10,
    maxHeight: '250px',
    overflow: 'auto',
  },
  dictHeader: {
    padding: '0.5rem 0.75rem',
    fontSize: '0.75rem',
    fontWeight: 600,
    color: '#666',
    borderBottom: '1px solid #eee',
    background: '#fafafa',
  },
  dictEntry: {
    padding: '0.75rem',
    cursor: 'pointer',
    borderBottom: '1px solid #f0f0f0',
  },
  pos: {
    fontSize: '0.75rem',
    color: '#999',
    marginLeft: '0.5rem',
  },
  dictDef: {
    fontSize: '0.8rem',
    color: '#666',
    marginTop: '0.25rem',
  },
  actions: {
    display: 'flex',
    gap: '0.75rem',
    padding: '1rem 1.5rem',
    borderTop: '1px solid #e0e0e0',
    background: '#fafafa',
    borderRadius: '0 0 12px 12px',
  },
  actionsSpacer: {
    flex: 1,
  },
  deleteBtn: {
    padding: '0.625rem 1rem',
    fontSize: '0.9rem',
    fontWeight: 500,
    color: '#d32f2f',
    background: '#ffebee',
    border: '1px solid #ffcdd2',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  cancelBtn: {
    padding: '0.625rem 1.25rem',
    fontSize: '0.9rem',
    fontWeight: 500,
    color: '#666',
    background: '#fff',
    border: '1px solid #ddd',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  saveBtn: {
    padding: '0.625rem 1.5rem',
    fontSize: '0.9rem',
    fontWeight: 600,
    color: '#fff',
    background: '#1a237e',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  error: {
    margin: '0 1.5rem',
    padding: '0.75rem',
    background: '#ffebee',
    color: '#c62828',
    borderRadius: '6px',
    fontSize: '0.875rem',
  },
  success: {
    margin: '0 1.5rem',
    padding: '0.75rem',
    background: '#e8f5e9',
    color: '#2e7d32',
    borderRadius: '6px',
    fontSize: '0.875rem',
  },
};

export default WordEditor;

