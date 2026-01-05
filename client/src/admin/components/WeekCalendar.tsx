/**
 * Week Calendar Component
 * 
 * Displays a calendar view of scheduled words by week.
 * Color coding:
 * - Green: Has word + theme
 * - Yellow: Has word, no theme
 * - Red: Missing word
 * - Gray: Future date (not yet needed)
 */

import React from 'react';
import { WeekInfo, DayInfo } from '../api/adminClient';

interface WeekCalendarProps {
  weeks: WeekInfo[];
  onDayClick: (date: string, existingWord: DayInfo | null) => void;
  selectedDate?: string;
}

const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function formatWeekLabel(weekStart: string): string {
  const date = new Date(weekStart);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatDayLabel(dateStr: string): string {
  const date = new Date(dateStr);
  return date.getDate().toString();
}

function getDayStatus(day: DayInfo): 'complete' | 'partial' | 'missing' | 'future' {
  const today = new Date().toISOString().split('T')[0];
  const dayDate = day.date;
  
  // Future dates (more than 2 weeks out) are gray
  const twoWeeksFromNow = new Date();
  twoWeeksFromNow.setDate(twoWeeksFromNow.getDate() + 14);
  if (dayDate > twoWeeksFromNow.toISOString().split('T')[0]) {
    if (day.hasWord && day.theme) return 'complete';
    if (day.hasWord) return 'partial';
    return 'future';
  }
  
  if (day.hasWord && day.theme) return 'complete';
  if (day.hasWord) return 'partial';
  return 'missing';
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'complete': return '#4caf50'; // Green
    case 'partial': return '#ff9800';  // Orange
    case 'missing': return '#f44336';  // Red
    case 'future': return '#e0e0e0';   // Gray
    default: return '#e0e0e0';
  }
}

function getStatusBg(status: string): string {
  switch (status) {
    case 'complete': return '#e8f5e9';
    case 'partial': return '#fff3e0';
    case 'missing': return '#ffebee';
    case 'future': return '#fafafa';
    default: return '#fafafa';
  }
}

export const WeekCalendar: React.FC<WeekCalendarProps> = ({ 
  weeks, 
  onDayClick,
  selectedDate 
}) => {
  const today = new Date().toISOString().split('T')[0];

  return (
    <div style={styles.container}>
      {/* Header row */}
      <div style={styles.headerRow}>
        <div style={styles.weekLabel}></div>
        {DAYS_OF_WEEK.map(day => (
          <div key={day} style={styles.dayHeader}>{day}</div>
        ))}
        <div style={styles.themeHeader}>Theme</div>
      </div>

      {/* Week rows */}
      {weeks.map((week) => (
        <div key={week.weekStart} style={styles.weekRow}>
          <div style={styles.weekLabel}>
            {formatWeekLabel(week.weekStart)}
          </div>
          
          {week.days.map((day) => {
            const status = getDayStatus(day);
            const isToday = day.date === today;
            const isSelected = day.date === selectedDate;
            // Only allow clicking on days WITHOUT existing words
            const isClickable = !day.hasWord;
            
            return (
              <div
                key={day.date}
                style={{
                  ...styles.dayCell,
                  backgroundColor: getStatusBg(status),
                  borderColor: isSelected ? '#1a237e' : isToday ? '#2196f3' : getStatusColor(status),
                  borderWidth: isSelected || isToday ? '2px' : '1px',
                  cursor: isClickable ? 'pointer' : 'default',
                  opacity: day.hasWord ? 0.85 : 1,
                }}
                onClick={() => {
                  // Only allow clicking to ADD new words (not edit existing)
                  if (!day.hasWord) {
                    onDayClick(day.date, null);
                  }
                }}
                title={day.hasWord 
                  ? `${day.date}: ${day.word} (already scheduled)` 
                  : `${day.date}: Click to add word`
                }
              >
                <span style={styles.dayNumber}>{formatDayLabel(day.date)}</span>
                {day.hasWord && (
                  <span style={styles.wordPreview}>
                    {day.word?.substring(0, 6)}{day.word && day.word.length > 6 ? '…' : ''}
                  </span>
                )}
                {!day.hasWord && status !== 'future' && (
                  <span style={styles.addIcon}>+</span>
                )}
                {day.hasWord && (
                  <span style={styles.doneIndicator}>✓</span>
                )}
              </div>
            );
          })}
          
          <div style={{
            ...styles.themeCell,
            backgroundColor: week.theme ? '#e3f2fd' : '#fff',
            color: week.theme ? '#1565c0' : '#999',
          }}>
            {week.theme || '—'}
          </div>
        </div>
      ))}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  headerRow: {
    display: 'grid',
    gridTemplateColumns: '80px repeat(7, 1fr) 120px',
    gap: '2px',
    marginBottom: '4px',
  },
  weekRow: {
    display: 'grid',
    gridTemplateColumns: '80px repeat(7, 1fr) 120px',
    gap: '2px',
  },
  weekLabel: {
    fontSize: '0.75rem',
    fontWeight: 600,
    color: '#666',
    padding: '8px 4px',
    display: 'flex',
    alignItems: 'center',
  },
  dayHeader: {
    fontSize: '0.7rem',
    fontWeight: 600,
    color: '#999',
    textAlign: 'center',
    padding: '4px',
    textTransform: 'uppercase',
  },
  themeHeader: {
    fontSize: '0.7rem',
    fontWeight: 600,
    color: '#999',
    textAlign: 'center',
    padding: '4px',
    textTransform: 'uppercase',
  },
  dayCell: {
    minHeight: '60px',
    padding: '6px',
    borderRadius: '6px',
    border: '1px solid',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'transform 0.1s, box-shadow 0.1s',
    position: 'relative',
  },
  dayNumber: {
    fontSize: '0.85rem',
    fontWeight: 600,
    color: '#333',
  },
  wordPreview: {
    fontSize: '0.65rem',
    color: '#666',
    marginTop: '2px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  addIcon: {
    fontSize: '1.25rem',
    color: '#999',
    fontWeight: 300,
  },
  doneIndicator: {
    position: 'absolute',
    top: '4px',
    right: '4px',
    fontSize: '0.6rem',
    color: '#4caf50',
    fontWeight: 700,
  },
  themeCell: {
    padding: '8px',
    borderRadius: '6px',
    fontSize: '0.7rem',
    fontWeight: 500,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    border: '1px solid #e0e0e0',
  },
};

export default WeekCalendar;

