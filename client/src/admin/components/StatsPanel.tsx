/**
 * Stats Panel Component
 * 
 * Displays quick stats about word coverage and themes.
 */

import React from 'react';

interface StatsPanelProps {
  stats: {
    totalDays: number;
    daysWithWords: number;
    weeksWithThemes: number;
    uniqueThemes: string[];
  };
  totalWeeks: number;
}

export const StatsPanel: React.FC<StatsPanelProps> = ({ stats, totalWeeks }) => {
  const coveragePercent = stats.totalDays > 0 
    ? Math.round((stats.daysWithWords / stats.totalDays) * 100) 
    : 0;
  
  const themePercent = totalWeeks > 0
    ? Math.round((stats.weeksWithThemes / totalWeeks) * 100)
    : 0;

  return (
    <div style={styles.container}>
      <div style={styles.statCard}>
        <div style={styles.statValue}>{stats.daysWithWords}</div>
        <div style={styles.statLabel}>Words Scheduled</div>
        <div style={styles.statSubtext}>
          {coveragePercent}% of {stats.totalDays} days
        </div>
        <div style={styles.progressBar}>
          <div 
            style={{ 
              ...styles.progressFill, 
              width: `${coveragePercent}%`,
              backgroundColor: coveragePercent >= 80 ? '#4caf50' : coveragePercent >= 50 ? '#ff9800' : '#f44336'
            }} 
          />
        </div>
      </div>

      <div style={styles.statCard}>
        <div style={styles.statValue}>{stats.weeksWithThemes}</div>
        <div style={styles.statLabel}>Weeks with Themes</div>
        <div style={styles.statSubtext}>
          {themePercent}% of {totalWeeks} weeks
        </div>
        <div style={styles.progressBar}>
          <div 
            style={{ 
              ...styles.progressFill, 
              width: `${themePercent}%`,
              backgroundColor: themePercent >= 80 ? '#4caf50' : themePercent >= 50 ? '#ff9800' : '#f44336'
            }} 
          />
        </div>
      </div>

      <div style={styles.statCard}>
        <div style={styles.statValue}>{stats.uniqueThemes.length}</div>
        <div style={styles.statLabel}>Unique Themes</div>
        <div style={styles.themeList}>
          {stats.uniqueThemes.slice(0, 5).map(theme => (
            <span key={theme} style={styles.themeTag}>{theme}</span>
          ))}
          {stats.uniqueThemes.length > 5 && (
            <span style={styles.moreTag}>+{stats.uniqueThemes.length - 5} more</span>
          )}
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1rem',
    marginBottom: '1.5rem',
  },
  statCard: {
    background: '#fff',
    borderRadius: '10px',
    padding: '1.25rem',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    border: '1px solid #e8e8e8',
  },
  statValue: {
    fontSize: '2rem',
    fontWeight: 700,
    color: '#1a237e',
    lineHeight: 1,
  },
  statLabel: {
    fontSize: '0.85rem',
    fontWeight: 600,
    color: '#333',
    marginTop: '0.5rem',
  },
  statSubtext: {
    fontSize: '0.75rem',
    color: '#888',
    marginTop: '0.25rem',
  },
  progressBar: {
    height: '4px',
    background: '#e8e8e8',
    borderRadius: '2px',
    marginTop: '0.75rem',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: '2px',
    transition: 'width 0.3s ease',
  },
  themeList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.375rem',
    marginTop: '0.75rem',
  },
  themeTag: {
    fontSize: '0.65rem',
    padding: '0.25rem 0.5rem',
    background: '#e3f2fd',
    color: '#1565c0',
    borderRadius: '4px',
    fontWeight: 500,
  },
  moreTag: {
    fontSize: '0.65rem',
    padding: '0.25rem 0.5rem',
    color: '#888',
  },
};

export default StatsPanel;

