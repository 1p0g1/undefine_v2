/**
 * Admin Dashboard
 * 
 * Main dashboard with calendar view, stats, and word management.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { adminApi, WeekInfo, DayInfo, WordResponse, clearAdminKey } from './api/adminClient';
import { WeekCalendar } from './components/WeekCalendar';
import { WordEditor } from './components/WordEditor';
import { StatsPanel } from './components/StatsPanel';

interface AdminDashboardProps {
  onLogout: () => void;
}

function getDefaultDateRange() {
  const today = new Date();
  // Start from 2 weeks ago
  const start = new Date(today);
  start.setDate(start.getDate() - 14);
  // End 10 weeks from now
  const end = new Date(today);
  end.setDate(end.getDate() + 70);
  
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  };
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout }) => {
  // Data state
  const [weeks, setWeeks] = useState<WeekInfo[]>([]);
  const [stats, setStats] = useState<{
    totalDays: number;
    daysWithWords: number;
    weeksWithThemes: number;
    uniqueThemes: string[];
  }>({ totalDays: 0, daysWithWords: 0, weeksWithThemes: 0, uniqueThemes: [] });
  
  // UI state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState(getDefaultDateRange);
  
  // Editor state
  const [editorDate, setEditorDate] = useState<string | null>(null);
  const [editorWord, setEditorWord] = useState<WordResponse | null>(null);

  // Load data
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await adminApi.getWeeks(dateRange.start, dateRange.end);
      setWeeks(response.weeks);
      setStats(response.stats);
    } catch (err) {
      console.error('Failed to load weeks:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle day click
  const handleDayClick = async (date: string, existingDay: DayInfo | null) => {
    setEditorDate(date);
    
    if (existingDay?.wordId) {
      // Load full word data
      try {
        const response = await adminApi.getWordById(existingDay.wordId);
        setEditorWord(response.word);
      } catch (err) {
        console.error('Failed to load word:', err);
        setEditorWord(null);
      }
    } else {
      setEditorWord(null);
    }
  };

  // Handle editor close
  const handleEditorClose = () => {
    setEditorDate(null);
    setEditorWord(null);
  };

  // Handle editor save
  const handleEditorSave = () => {
    handleEditorClose();
    loadData(); // Refresh data
  };

  // Handle logout
  const handleLogout = () => {
    clearAdminKey();
    onLogout();
  };

  // Navigation
  const navigateWeeks = (direction: number) => {
    const start = new Date(dateRange.start);
    const end = new Date(dateRange.end);
    const weeks = direction * 4; // Move by 4 weeks
    
    start.setDate(start.getDate() + weeks * 7);
    end.setDate(end.getDate() + weeks * 7);
    
    setDateRange({
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
    });
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <h1 style={styles.title}>Un·Define Admin</h1>
          <span style={styles.subtitle}>Word & Theme Management</span>
        </div>
        <div style={styles.headerRight}>
          <button style={styles.refreshBtn} onClick={loadData} disabled={loading}>
            {loading ? '↻' : '↻'} Refresh
          </button>
          <button style={styles.logoutBtn} onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      {/* Error display */}
      {error && (
        <div style={styles.errorBanner}>
          {error}
          <button onClick={() => setError(null)} style={styles.dismissBtn}>×</button>
        </div>
      )}

      {/* Main content */}
      <main style={styles.main}>
        {/* Stats */}
        <StatsPanel stats={stats} totalWeeks={weeks.length} />

        {/* Calendar navigation */}
        <div style={styles.calendarHeader}>
          <button style={styles.navBtn} onClick={() => navigateWeeks(-1)}>
            ← Earlier
          </button>
          <div style={styles.dateRangeLabel}>
            {new Date(dateRange.start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            {' — '}
            {new Date(dateRange.end).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </div>
          <button style={styles.navBtn} onClick={() => navigateWeeks(1)}>
            Later →
          </button>
        </div>

        {/* Legend */}
        <div style={styles.legend}>
          <div style={styles.legendItem}>
            <span style={{ ...styles.legendDot, background: '#4caf50' }} />
            Word + Theme
          </div>
          <div style={styles.legendItem}>
            <span style={{ ...styles.legendDot, background: '#ff9800' }} />
            Word only
          </div>
          <div style={styles.legendItem}>
            <span style={{ ...styles.legendDot, background: '#f44336' }} />
            Missing
          </div>
          <div style={styles.legendItem}>
            <span style={{ ...styles.legendDot, background: '#e0e0e0' }} />
            Future
          </div>
        </div>

        {/* Calendar */}
        {loading ? (
          <div style={styles.loadingState}>Loading...</div>
        ) : (
          <div style={styles.calendarContainer}>
            <WeekCalendar
              weeks={weeks}
              onDayClick={handleDayClick}
              selectedDate={editorDate || undefined}
            />
          </div>
        )}

        {/* Quick actions */}
        <div style={styles.quickActions}>
          <h3 style={styles.sectionTitle}>Quick Actions</h3>
          <div style={styles.actionButtons}>
            <button 
              style={styles.actionBtn}
              onClick={() => {
                const nextEmpty = weeks.flatMap(w => w.days).find(d => !d.hasWord && d.date >= today);
                if (nextEmpty) handleDayClick(nextEmpty.date, null);
              }}
            >
              📝 Add Next Missing Word
            </button>
            <button 
              style={styles.actionBtn}
              onClick={() => {
                const noTheme = weeks.flatMap(w => w.days).find(d => d.hasWord && !d.theme && d.date >= today);
                if (noTheme) handleDayClick(noTheme.date, noTheme);
              }}
            >
              🏷️ Add Theme to Untagged
            </button>
          </div>
        </div>
      </main>

      {/* Word Editor Modal */}
      {editorDate && (
        <WordEditor
          date={editorDate}
          existingWord={editorWord}
          existingThemes={stats.uniqueThemes}
          onSave={handleEditorSave}
          onClose={handleEditorClose}
        />
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    background: '#f5f5f7',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1rem 2rem',
    background: '#1a237e',
    color: '#fff',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '1rem',
  },
  headerRight: {
    display: 'flex',
    gap: '0.75rem',
  },
  title: {
    margin: 0,
    fontSize: '1.5rem',
    fontWeight: 700,
    fontFamily: 'Libre Baskerville, serif',
  },
  subtitle: {
    fontSize: '0.85rem',
    opacity: 0.8,
  },
  refreshBtn: {
    padding: '0.5rem 1rem',
    fontSize: '0.85rem',
    background: 'rgba(255,255,255,0.15)',
    color: '#fff',
    border: '1px solid rgba(255,255,255,0.3)',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  logoutBtn: {
    padding: '0.5rem 1rem',
    fontSize: '0.85rem',
    background: 'transparent',
    color: '#fff',
    border: '1px solid rgba(255,255,255,0.3)',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  main: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '1.5rem',
  },
  errorBanner: {
    margin: '1rem 2rem',
    padding: '0.75rem 1rem',
    background: '#ffebee',
    color: '#c62828',
    borderRadius: '6px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dismissBtn: {
    background: 'none',
    border: 'none',
    fontSize: '1.25rem',
    color: '#c62828',
    cursor: 'pointer',
  },
  calendarHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem',
  },
  navBtn: {
    padding: '0.5rem 1rem',
    fontSize: '0.85rem',
    background: '#fff',
    border: '1px solid #ddd',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  dateRangeLabel: {
    fontSize: '0.9rem',
    fontWeight: 600,
    color: '#333',
  },
  legend: {
    display: 'flex',
    gap: '1.5rem',
    marginBottom: '1rem',
    fontSize: '0.8rem',
    color: '#666',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.375rem',
  },
  legendDot: {
    width: '12px',
    height: '12px',
    borderRadius: '3px',
  },
  calendarContainer: {
    background: '#fff',
    borderRadius: '12px',
    padding: '1rem',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    border: '1px solid #e8e8e8',
    overflowX: 'auto',
  },
  loadingState: {
    textAlign: 'center',
    padding: '3rem',
    color: '#888',
  },
  quickActions: {
    marginTop: '1.5rem',
    background: '#fff',
    borderRadius: '12px',
    padding: '1.25rem',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    border: '1px solid #e8e8e8',
  },
  sectionTitle: {
    margin: '0 0 1rem',
    fontSize: '0.9rem',
    fontWeight: 600,
    color: '#333',
  },
  actionButtons: {
    display: 'flex',
    gap: '0.75rem',
    flexWrap: 'wrap',
  },
  actionBtn: {
    padding: '0.625rem 1rem',
    fontSize: '0.85rem',
    background: '#f5f5f5',
    border: '1px solid #e0e0e0',
    borderRadius: '6px',
    cursor: 'pointer',
  },
};

export default AdminDashboard;

