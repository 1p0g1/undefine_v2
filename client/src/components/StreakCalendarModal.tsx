import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/client';

interface DayHistory {
  date: string;
  played: boolean;
  won: boolean;
  rank?: number;
}

interface StreakCalendarModalProps {
  open: boolean;
  onClose: () => void;
  playerId: string;
}

export const StreakCalendarModal: React.FC<StreakCalendarModalProps> = ({ open, onClose, playerId }) => {
  const [history, setHistory] = useState<DayHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    if (open) {
      loadPlayHistory();
    }
  }, [open, playerId]);

  const loadPlayHistory = async () => {
    try {
      setLoading(true);
      // We'll need to create this API endpoint
      const response = await fetch(`/api/player/history?player_id=${playerId}&months=2`);
      if (response.ok) {
        const data = await response.json();
        setHistory(data.history || []);
      }
    } catch (error) {
      console.error('Failed to load play history:', error);
      setHistory([]);
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    return { daysInMonth, startingDayOfWeek, year, month };
  };

  const getDateString = (year: number, month: number, day: number) => {
    return new Date(year, month, day).toISOString().split('T')[0];
  };

  const getDayData = (dateString: string): DayHistory | null => {
    return history.find(h => h.date === dateString) || null;
  };

  const renderCalendarDay = (day: number, month: number, year: number) => {
    const dateString = getDateString(year, month, day);
    const dayData = getDayData(dateString);
    const isToday = dateString === new Date().toISOString().split('T')[0];
    const isPast = new Date(dateString) < new Date(new Date().toISOString().split('T')[0]);
    
    let backgroundColor = 'transparent';
    let emoji = '';
    let textColor = '#374151';
    
    if (dayData?.played) {
      if (dayData.won) {
        backgroundColor = '#f0fdf4'; // Light green
        emoji = '✅';
        textColor = '#059669';
      } else {
        backgroundColor = '#fef2f2'; // Light red
        emoji = '❌';
        textColor = '#dc2626';
      }
    }

    return (
      <div
        key={`${month}-${day}`}
        style={{
          minHeight: '40px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          border: isToday ? '2px solid #1a237e' : '1px solid #e5e7eb',
          borderRadius: '6px',
          backgroundColor,
          color: textColor,
          fontWeight: isToday ? 600 : 400,
          fontSize: '0.9rem',
          position: 'relative',
          gap: '2px'
        }}
      >
        <span>{day}</span>
        {emoji && <span style={{ fontSize: '0.7rem' }}>{emoji}</span>}
      </div>
    );
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(newDate.getMonth() - 1);
      } else {
        newDate.setMonth(newDate.getMonth() + 1);
      }
      return newDate;
    });
  };

  if (!open) return null;

  const { daysInMonth, startingDayOfWeek, year, month } = getDaysInMonth(currentDate);
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '1rem'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '1rem',
        padding: '2rem',
        maxWidth: '500px',
        width: '100%',
        maxHeight: '90vh',
        overflow: 'auto',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
        fontFamily: 'Libre Baskerville, Georgia, Times, serif'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.5rem',
          borderBottom: '2px solid #e5e7eb',
          paddingBottom: '1rem'
        }}>
          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: 700,
            color: '#1a237e',
            margin: 0
          }}>
            Your Play History
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.5rem',
              cursor: 'pointer',
              color: '#6b7280',
              padding: '0.25rem'
            }}
          >
            ×
          </button>
        </div>

        {/* Month Navigation */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1rem'
        }}>
          <button
            onClick={() => navigateMonth('prev')}
            style={{
              background: 'none',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              padding: '0.5rem 0.75rem',
              cursor: 'pointer',
              fontSize: '0.9rem',
              color: '#374151'
            }}
          >
            ← Previous
          </button>
          <h3 style={{
            fontSize: '1.2rem',
            fontWeight: 600,
            margin: 0,
            color: '#1a237e'
          }}>
            {monthNames[month]} {year}
          </h3>
          <button
            onClick={() => navigateMonth('next')}
            disabled={new Date(year, month + 1) > new Date()}
            style={{
              background: 'none',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              padding: '0.5rem 0.75rem',
              cursor: new Date(year, month + 1) > new Date() ? 'not-allowed' : 'pointer',
              fontSize: '0.9rem',
              color: new Date(year, month + 1) > new Date() ? '#9ca3af' : '#374151',
              opacity: new Date(year, month + 1) > new Date() ? 0.5 : 1
            }}
          >
            Next →
          </button>
        </div>

        {/* Calendar Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: '4px',
          marginBottom: '1rem'
        }}>
          {/* Day headers */}
          {dayNames.map(day => (
            <div
              key={day}
              style={{
                padding: '0.5rem',
                textAlign: 'center',
                fontSize: '0.8rem',
                fontWeight: 600,
                color: '#6b7280'
              }}
            >
              {day}
            </div>
          ))}

          {/* Empty cells for days before month starts */}
          {Array.from({ length: startingDayOfWeek }, (_, i) => (
            <div key={`empty-${i}`} />
          ))}

          {/* Calendar days */}
          {Array.from({ length: daysInMonth }, (_, i) => 
            renderCalendarDay(i + 1, month, year)
          )}
        </div>

        {/* Legend */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '1.5rem',
          padding: '1rem',
          backgroundColor: '#f9fafb',
          borderRadius: '0.5rem',
          fontSize: '0.85rem',
          color: '#374151'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>✅</span>
            <span>Won</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>❌</span>
            <span>Lost</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ 
              width: '16px', 
              height: '16px', 
              border: '1px solid #d1d5db', 
              borderRadius: '3px' 
            }} />
            <span>No play</span>
          </div>
        </div>

        {loading && (
          <div style={{
            textAlign: 'center',
            color: '#6b7280',
            padding: '2rem'
          }}>
            Loading your play history...
          </div>
        )}
      </div>
    </div>
  );
}; 