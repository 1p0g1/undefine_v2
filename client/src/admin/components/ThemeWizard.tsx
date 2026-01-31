/**
 * Theme Wizard Component
 * 
 * Multi-step wizard for submitting a new theme with 7 words (Mon-Sun).
 * Flow: Enter Theme → Add Monday's Word → ... → Add Sunday's Word → Review → Submit
 */

import React, { useState, useCallback, useEffect } from 'react';
import { adminApi, WordData, DictionaryEntry } from '../api/adminClient';

interface DayWord {
  word: string;
  definition: string;
  etymology: string;
  inASentence: string;
  equivalents: string;
  difficulty: string;
}

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DIFFICULTY_OPTIONS = ['Easy', 'Medium', 'Hard', 'Expert'];

interface ThemeWizardProps {
  startDate: string; // First Monday of the week
  onComplete: () => void;
  onClose: () => void;
}

const createEmptyDayWord = (): DayWord => ({
  word: '',
  definition: '',
  etymology: '',
  inASentence: '',
  equivalents: '',
  difficulty: 'Medium',
});

export const ThemeWizard: React.FC<ThemeWizardProps> = ({ startDate, onComplete, onClose }) => {
  // Step: 0 = theme entry, 1-7 = days (Mon-Sun), 8 = review
  const [step, setStep] = useState(0);
  const [theme, setTheme] = useState('');
  const [words, setWords] = useState<DayWord[]>(
    Array(7).fill(null).map(() => createEmptyDayWord())
  );
  
  // UI state
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Dictionary lookup state
  const [dictResults, setDictResults] = useState<DictionaryEntry[]>([]);
  const [dictLoading, setDictLoading] = useState(false);
  const [showDictPanel, setShowDictPanel] = useState(false);

  // Calculate dates for each day of the week
  const getDayDate = (dayIndex: number): string => {
    const date = new Date(startDate);
    date.setDate(date.getDate() + dayIndex);
    return date.toISOString().split('T')[0];
  };

  const formatDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Dictionary search
  const searchDictionary = useCallback(async (query: string) => {
    if (query.length < 2) {
      setDictResults([]);
      setShowDictPanel(false);
      return;
    }

    setDictLoading(true);
    try {
      const response = await adminApi.searchDictionary(query, 10);
      setDictResults(response.results);
      setShowDictPanel(response.results.length > 0);
    } catch (err) {
      console.error('Dictionary search failed:', err);
    } finally {
      setDictLoading(false);
    }
  }, []);

  // Debounce dictionary search
  useEffect(() => {
    if (step >= 1 && step <= 7) {
      const currentWord = words[step - 1].word;
      const timer = setTimeout(() => {
        if (currentWord.length >= 2) {
          searchDictionary(currentWord);
        } else {
          setShowDictPanel(false);
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [step, words, searchDictionary]);

  // Apply dictionary entry
  const applyDictionaryEntry = (entry: DictionaryEntry) => {
    if (step < 1 || step > 7) return;
    
    const dayIndex = step - 1;
    const updated = [...words];
    updated[dayIndex] = {
      ...updated[dayIndex],
      word: entry.word,
      definition: entry.definition || updated[dayIndex].definition,
      etymology: entry.etymology || updated[dayIndex].etymology,
    };
    setWords(updated);
    setShowDictPanel(false);
  };

  // Update word field
  const updateWord = (field: keyof DayWord, value: string) => {
    if (step < 1 || step > 7) return;
    
    const dayIndex = step - 1;
    const updated = [...words];
    updated[dayIndex] = { ...updated[dayIndex], [field]: value };
    setWords(updated);
  };

  // Navigation
  const canGoNext = (): boolean => {
    if (step === 0) return theme.trim().length > 0;
    if (step >= 1 && step <= 7) {
      const dayWord = words[step - 1];
      return dayWord.word.trim().length > 0;
    }
    return true;
  };

  const goNext = () => {
    if (canGoNext() && step < 8) {
      setStep(step + 1);
      setShowDictPanel(false);
      setError(null);
    }
  };

  const goBack = () => {
    if (step > 0) {
      setStep(step - 1);
      setShowDictPanel(false);
      setError(null);
    }
  };

  const goToDay = (dayIndex: number) => {
    setStep(dayIndex + 1);
    setShowDictPanel(false);
    setError(null);
  };

  // Submit all words
  const handleSubmit = async () => {
    setSaving(true);
    setError(null);

    try {
      // Submit each word
      for (let i = 0; i < 7; i++) {
        const dayWord = words[i];
        const date = getDayDate(i);
        
        const wordData: WordData = {
          word: dayWord.word.trim().toUpperCase(),
          date,
          definition: dayWord.definition.trim() || undefined,
          etymology: dayWord.etymology.trim() || undefined,
          first_letter: dayWord.word.trim()[0]?.toUpperCase(),
          in_a_sentence: dayWord.inASentence.trim() || undefined,
          number_of_letters: dayWord.word.trim().length,
          equivalents: dayWord.equivalents.trim() 
            ? dayWord.equivalents.split(',').map(s => s.trim()).filter(Boolean)
            : undefined,
          theme: theme.trim(),
          difficulty: dayWord.difficulty || 'Medium',
        };

        await adminApi.saveWord(wordData);
      }

      setSuccess('All 7 words submitted successfully!');
      setTimeout(() => {
        onComplete();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit words');
    } finally {
      setSaving(false);
    }
  };

  // Render theme entry step
  const renderThemeStep = () => (
    <div style={styles.stepContent}>
      <div style={styles.stepHeader}>
        <span style={styles.stepNumber}>Step 1 of 8</span>
        <h2 style={styles.stepTitle}>What's your theme?</h2>
        <p style={styles.stepDescription}>
          Enter the theme that will connect all 7 words for the week.
        </p>
      </div>
      
      <div style={styles.fieldGroup}>
        <label style={styles.label}>Theme *</label>
        <input
          type="text"
          value={theme}
          onChange={(e) => setTheme(e.target.value)}
          style={styles.input}
          placeholder="e.g., Words from Greek mythology"
          autoFocus
        />
      </div>
    </div>
  );

  // Render word entry step
  const renderWordStep = () => {
    const dayIndex = step - 1;
    const dayWord = words[dayIndex];
    const dayName = DAYS_OF_WEEK[dayIndex];
    const date = getDayDate(dayIndex);

    return (
      <div style={styles.stepContent}>
        <div style={styles.stepHeader}>
          <span style={styles.stepNumber}>Step {step + 1} of 8</span>
          <h2 style={styles.stepTitle}>{dayName}'s Word</h2>
          <p style={styles.stepDescription}>{formatDate(date)}</p>
        </div>

        {/* Theme reminder */}
        <div style={styles.themeReminder}>
          <span style={styles.themeLabel}>Theme:</span>
          <span style={styles.themeValue}>{theme}</span>
        </div>

        {/* Previous words summary */}
        {dayIndex > 0 && (
          <div style={styles.previousWords}>
            <div style={styles.previousWordsLabel}>Previous words this week:</div>
            <div style={styles.previousWordsList}>
              {words.slice(0, dayIndex).map((w, i) => (
                <span 
                  key={i} 
                  style={styles.previousWordTag}
                  onClick={() => goToDay(i)}
                >
                  {DAYS_OF_WEEK[i].substring(0, 3)}: {w.word || '—'}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Word input with dictionary */}
        <div style={styles.fieldGroup}>
          <label style={styles.label}>Word *</label>
          <div style={styles.wordInputContainer}>
            <input
              type="text"
              value={dayWord.word}
              onChange={(e) => updateWord('word', e.target.value.toUpperCase())}
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

          <div style={styles.derivedFields}>
            <span>First letter: {dayWord.word.trim()[0]?.toUpperCase() || '—'}</span>
            <span>Letters: {dayWord.word.trim().length || '—'}</span>
          </div>
        </div>

        {/* Definition */}
        <div style={styles.fieldGroup}>
          <label style={styles.label}>
            <span style={styles.clueTag}>D</span> Definition
          </label>
          <textarea
            value={dayWord.definition}
            onChange={(e) => updateWord('definition', e.target.value)}
            style={styles.textarea}
            placeholder="The meaning of the word..."
            rows={2}
          />
        </div>

        {/* Etymology */}
        <div style={styles.fieldGroup}>
          <label style={styles.label}>
            <span style={styles.clueTag}>E</span> Etymology
          </label>
          <textarea
            value={dayWord.etymology}
            onChange={(e) => updateWord('etymology', e.target.value)}
            style={styles.textarea}
            placeholder="Origin and history of the word..."
            rows={2}
          />
        </div>

        {/* In a Sentence */}
        <div style={styles.fieldGroup}>
          <label style={styles.label}>
            <span style={styles.clueTag}>I</span> In a Sentence
          </label>
          <textarea
            value={dayWord.inASentence}
            onChange={(e) => updateWord('inASentence', e.target.value)}
            style={styles.textarea}
            placeholder="Example usage in a sentence..."
            rows={2}
          />
        </div>

        {/* Equivalents */}
        <div style={styles.fieldGroup}>
          <label style={styles.label}>
            <span style={styles.clueTag}>E</span> Equivalents (synonyms)
          </label>
          <input
            type="text"
            value={dayWord.equivalents}
            onChange={(e) => updateWord('equivalents', e.target.value)}
            style={styles.input}
            placeholder="synonym1, synonym2, synonym3..."
          />
          <span style={styles.hint}>Comma-separated list</span>
        </div>

        {/* Difficulty */}
        <div style={styles.fieldGroup}>
          <label style={styles.label}>Difficulty</label>
          <select
            value={dayWord.difficulty}
            onChange={(e) => updateWord('difficulty', e.target.value)}
            style={styles.select}
          >
            {DIFFICULTY_OPTIONS.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
      </div>
    );
  };

  // Render review step
  const renderReviewStep = () => (
    <div style={styles.stepContent}>
      <div style={styles.stepHeader}>
        <span style={styles.stepNumber}>Final Step</span>
        <h2 style={styles.stepTitle}>Review & Submit</h2>
        <p style={styles.stepDescription}>
          Review all 7 words before submitting. Click any day to make changes.
        </p>
      </div>

      {/* Theme */}
      <div style={styles.reviewTheme}>
        <span style={styles.reviewThemeLabel}>Theme:</span>
        <span style={styles.reviewThemeValue}>{theme}</span>
        <button style={styles.editBtn} onClick={() => setStep(0)}>Edit</button>
      </div>

      {/* All words */}
      <div style={styles.reviewList}>
        {words.map((dayWord, i) => (
          <div 
            key={i} 
            style={styles.reviewItem}
            onClick={() => goToDay(i)}
          >
            <div style={styles.reviewDay}>
              <span style={styles.reviewDayName}>{DAYS_OF_WEEK[i]}</span>
              <span style={styles.reviewDate}>{formatDate(getDayDate(i))}</span>
            </div>
            <div style={styles.reviewWord}>
              {dayWord.word || <span style={styles.missing}>No word entered</span>}
            </div>
            <div style={styles.reviewClues}>
              {dayWord.definition && <span style={styles.clueCheck}>D✓</span>}
              {dayWord.etymology && <span style={styles.clueCheck}>E✓</span>}
              {dayWord.inASentence && <span style={styles.clueCheck}>I✓</span>}
              {dayWord.equivalents && <span style={styles.clueCheck}>E✓</span>}
            </div>
            <span style={styles.reviewEditIcon}>✎</span>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <div>
            <h2 style={styles.title}>🎯 Submit Theme & Words</h2>
            <p style={styles.subtitle}>Week of {formatDate(startDate)}</p>
          </div>
          <button style={styles.closeBtn} onClick={onClose}>×</button>
        </div>

        {/* Progress */}
        <div style={styles.progress}>
          {[0, 1, 2, 3, 4, 5, 6, 7, 8].map(i => (
            <div 
              key={i} 
              style={{
                ...styles.progressDot,
                backgroundColor: i <= step ? '#1a237e' : '#e0e0e0',
              }}
            />
          ))}
        </div>

        {/* Messages */}
        {error && <div style={styles.error}>{error}</div>}
        {success && <div style={styles.success}>{success}</div>}

        {/* Content */}
        <div style={styles.content}>
          {step === 0 && renderThemeStep()}
          {step >= 1 && step <= 7 && renderWordStep()}
          {step === 8 && renderReviewStep()}
        </div>

        {/* Actions */}
        <div style={styles.actions}>
          {step > 0 && (
            <button style={styles.backBtn} onClick={goBack} disabled={saving}>
              ← Back
            </button>
          )}
          <div style={styles.actionsSpacer} />
          <button style={styles.cancelBtn} onClick={onClose} disabled={saving}>
            Cancel
          </button>
          {step < 8 ? (
            <button
              style={{
                ...styles.nextBtn,
                opacity: canGoNext() ? 1 : 0.5,
              }}
              onClick={goNext}
              disabled={!canGoNext() || saving}
            >
              {step === 0 ? 'Start Adding Words →' : 'Next Day →'}
            </button>
          ) : (
            <button
              style={styles.submitBtn}
              onClick={handleSubmit}
              disabled={saving}
            >
              {saving ? 'Submitting...' : '✓ Submit All Words'}
            </button>
          )}
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
    backgroundColor: 'rgba(0,0,0,0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '1rem',
    zIndex: 1000,
  },
  modal: {
    background: '#fff',
    borderRadius: '16px',
    width: '100%',
    maxWidth: '700px',
    maxHeight: '90vh',
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
    background: '#1a237e',
    borderRadius: '16px 16px 0 0',
    color: '#fff',
  },
  title: {
    margin: 0,
    fontSize: '1.25rem',
    fontWeight: 600,
  },
  subtitle: {
    margin: '0.25rem 0 0',
    fontSize: '0.85rem',
    opacity: 0.9,
  },
  closeBtn: {
    background: 'rgba(255,255,255,0.2)',
    border: 'none',
    fontSize: '1.25rem',
    color: '#fff',
    cursor: 'pointer',
    padding: '0.25rem 0.5rem',
    borderRadius: '4px',
    lineHeight: 1,
  },
  progress: {
    display: 'flex',
    gap: '6px',
    justifyContent: 'center',
    padding: '1rem',
    background: '#f5f5f5',
  },
  progressDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    transition: 'background-color 0.2s',
  },
  content: {
    flex: 1,
    overflow: 'auto',
    padding: '1.5rem',
  },
  stepContent: {},
  stepHeader: {
    marginBottom: '1.5rem',
  },
  stepNumber: {
    fontSize: '0.75rem',
    fontWeight: 600,
    color: '#1a237e',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  stepTitle: {
    margin: '0.5rem 0 0.25rem',
    fontSize: '1.5rem',
    fontWeight: 700,
    color: '#1a237e',
  },
  stepDescription: {
    margin: 0,
    fontSize: '0.9rem',
    color: '#666',
  },
  themeReminder: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.75rem 1rem',
    background: '#e8eaf6',
    borderRadius: '8px',
    marginBottom: '1rem',
  },
  themeLabel: {
    fontSize: '0.8rem',
    fontWeight: 600,
    color: '#5c6bc0',
  },
  themeValue: {
    fontSize: '0.9rem',
    fontWeight: 600,
    color: '#1a237e',
  },
  previousWords: {
    marginBottom: '1.25rem',
    padding: '0.75rem 1rem',
    background: '#f9f9f9',
    borderRadius: '8px',
    border: '1px solid #e8e8e8',
  },
  previousWordsLabel: {
    fontSize: '0.75rem',
    fontWeight: 600,
    color: '#666',
    marginBottom: '0.5rem',
  },
  previousWordsList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.375rem',
  },
  previousWordTag: {
    fontSize: '0.7rem',
    padding: '0.25rem 0.5rem',
    background: '#fff',
    border: '1px solid #ddd',
    borderRadius: '4px',
    color: '#333',
    cursor: 'pointer',
  },
  fieldGroup: {
    marginBottom: '1rem',
    position: 'relative',
  },
  label: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.85rem',
    fontWeight: 600,
    color: '#333',
    marginBottom: '0.375rem',
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
    width: '100%',
    padding: '0.75rem',
    fontSize: '1rem',
    border: '1px solid #ddd',
    borderRadius: '6px',
    outline: 'none',
    boxSizing: 'border-box',
  },
  textarea: {
    width: '100%',
    padding: '0.75rem',
    fontSize: '0.95rem',
    border: '1px solid #ddd',
    borderRadius: '6px',
    outline: 'none',
    resize: 'vertical',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
  },
  select: {
    width: '100%',
    padding: '0.75rem',
    fontSize: '1rem',
    border: '1px solid #ddd',
    borderRadius: '6px',
    outline: 'none',
    background: '#fff',
    boxSizing: 'border-box',
  },
  hint: {
    fontSize: '0.75rem',
    color: '#999',
    marginTop: '0.25rem',
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
    maxHeight: '200px',
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
    padding: '0.5rem 0.75rem',
    cursor: 'pointer',
    borderBottom: '1px solid #f0f0f0',
  },
  pos: {
    fontSize: '0.75rem',
    color: '#999',
    marginLeft: '0.5rem',
  },
  dictDef: {
    fontSize: '0.75rem',
    color: '#666',
    marginTop: '0.15rem',
  },
  reviewTheme: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '1rem',
    background: '#e8eaf6',
    borderRadius: '8px',
    marginBottom: '1rem',
  },
  reviewThemeLabel: {
    fontSize: '0.85rem',
    fontWeight: 600,
    color: '#5c6bc0',
  },
  reviewThemeValue: {
    fontSize: '1rem',
    fontWeight: 700,
    color: '#1a237e',
    flex: 1,
  },
  editBtn: {
    padding: '0.375rem 0.75rem',
    fontSize: '0.75rem',
    background: '#fff',
    border: '1px solid #c5cae9',
    borderRadius: '4px',
    color: '#5c6bc0',
    cursor: 'pointer',
  },
  reviewList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  reviewItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '1rem',
    background: '#f9f9f9',
    borderRadius: '8px',
    border: '1px solid #e8e8e8',
    cursor: 'pointer',
    transition: 'background 0.15s',
  },
  reviewDay: {
    minWidth: '100px',
  },
  reviewDayName: {
    display: 'block',
    fontSize: '0.9rem',
    fontWeight: 600,
    color: '#333',
  },
  reviewDate: {
    fontSize: '0.7rem',
    color: '#888',
  },
  reviewWord: {
    flex: 1,
    fontSize: '1rem',
    fontWeight: 600,
    color: '#1a237e',
  },
  missing: {
    color: '#f44336',
    fontWeight: 400,
    fontStyle: 'italic',
  },
  reviewClues: {
    display: 'flex',
    gap: '0.25rem',
  },
  clueCheck: {
    fontSize: '0.65rem',
    padding: '0.2rem 0.35rem',
    background: '#e8f5e9',
    color: '#2e7d32',
    borderRadius: '3px',
    fontWeight: 500,
  },
  reviewEditIcon: {
    color: '#999',
    fontSize: '1rem',
  },
  actions: {
    display: 'flex',
    gap: '0.75rem',
    padding: '1rem 1.5rem',
    borderTop: '1px solid #e0e0e0',
    background: '#fafafa',
    borderRadius: '0 0 16px 16px',
  },
  actionsSpacer: {
    flex: 1,
  },
  backBtn: {
    padding: '0.625rem 1rem',
    fontSize: '0.9rem',
    fontWeight: 500,
    color: '#666',
    background: '#fff',
    border: '1px solid #ddd',
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
  nextBtn: {
    padding: '0.625rem 1.5rem',
    fontSize: '0.9rem',
    fontWeight: 600,
    color: '#fff',
    background: '#1a237e',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  submitBtn: {
    padding: '0.625rem 1.5rem',
    fontSize: '0.9rem',
    fontWeight: 600,
    color: '#fff',
    background: '#2e7d32',
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

export default ThemeWizard;

