import React, { useState, useEffect } from 'react';
import { safeFetch, ApiError, isVercelPreview, getApiBaseUrl } from '../utils/apiHelpers';

interface DayHistory {
  date: string;
  played: boolean;
  won: boolean;
  rank?: number;
}

interface HistoryResponse {
  history: DayHistory[];
  dateRange: {
    start: string;
    end: string;
  };
}

interface AvailableDateInfo {
  date: string;
  word: string;
  hasWord: boolean;
  theme: string | null;
  difficulty: string | null;
}

interface StreakCalendarModalProps {
  open: boolean;
  onClose: () => void;
  playerId: string;
  onSelectArchiveDate?: (date: string) => void; // NEW: Callback for archive play
}

export const StreakCalendarModal: React.FC<StreakCalendarModalProps> = ({ 
  open, 
  onClose, 
  playerId,
  onSelectArchiveDate 
}) => {
  const [history, setHistory] = useState<DayHistory[]>([]);
  const [availableDates, setAvailableDates] = useState<Map<string, AvailableDateInfo>>(new Map());
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open, playerId, currentDate]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load both play history and available dates in parallel
      await Promise.all([
        loadPlayHistory(),
        loadAvailableDates()
      ]);
    } finally {
      setLoading(false);
    }
  };

  const loadPlayHistory = async () => {
    try {
      console.log('[StreakCalendarModal] Environment check:', {
        playerId,
        baseUrl: getApiBaseUrl(),
        isPreview: isVercelPreview(),
        hostname: window.location.hostname
      });
      
      // 🔧 SYSTEMATIC FIX: Use safeFetch with proper URL construction
      const baseUrl = getApiBaseUrl();
      const url = `${baseUrl}/api/player/history?player_id=${playerId}&months=2`;
      console.log('[StreakCalendarModal] Request URL:', url);
      
      const data = await safeFetch<HistoryResponse>(url);
      setHistory(data.history || []);
      
      console.log(`[StreakCalendarModal] Loaded ${data.history?.length || 0} history records`);
      console.log('[StreakCalendarModal] Sample history data:', data.history?.slice(0, 3));
    } catch (error) {
      console.error('[StreakCalendarModal] Failed to load play history:', error);
      
      // Provide specific error messages based on error type
      if (error instanceof ApiError) {
        console.error('[StreakCalendarModal] API Error details:', {
          message: error.message,
          status: error.status,
          url: error.url,
          responseText: error.responseText?.substring(0, 200)
        });
        
        if (error.status === 404) {
          console.warn('[StreakCalendarModal] History API not available - this may be expected in preview environments');
        }
      }
      
      // Set empty history instead of throwing - calendar should still show
      setHistory([]);
    }
  };

  const loadAvailableDates = async () => {
    try {
      // Calculate month range
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const startOfMonth = new Date(year, month, 1);
      const endOfMonth = new Date(year, month + 1, 0);
      
      const startDate = startOfMonth.toISOString().split('T')[0];
      const endDate = endOfMonth.toISOString().split('T')[0];
      
      const baseUrl = getApiBaseUrl();
      const url = `${baseUrl}/api/archive/available-dates?start_date=${startDate}&end_date=${endDate}`;
      console.log('[StreakCalendarModal] Fetching available dates:', url);
      
      const data = await safeFetch<{ dates: AvailableDateInfo[] }>(url);
      
      // Convert to Map for quick lookup
      const dateMap = new Map<string, AvailableDateInfo>();
      (data.dates || []).forEach(dateInfo => {
        dateMap.set(dateInfo.date, dateInfo);
      });
      
      setAvailableDates(dateMap);
      console.log(`[StreakCalendarModal] Loaded ${dateMap.size} available dates`);
    } catch (error) {
      console.error('[StreakCalendarModal] Failed to load available dates:', error);
      setAvailableDates(new Map());
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

  const getDateState = (dateString: string): 'today' | 'won' | 'lost' | 'available' | 'no-word' | 'future' => {
    const today = new Date().toISOString().split('T')[0];
    const dateObj = new Date(dateString);
    const todayObj = new Date(today);
    
    // Future date
    if (dateObj > todayObj) return 'future';
    
    // Today
    if (dateString === today) return 'today';
    
    // Check if played
    const dayData = getDayData(dateString);
    if (dayData?.played) {
      const state = dayData.won ? 'won' : 'lost';
      // Debug logging for first few dates
      if (dateString.endsWith('-01') || dateString.endsWith('-15')) {
        console.log('[getDateState] Date', dateString, ':', state, dayData);
      }
      return state;
    }
    
    // Check if word exists for this date
    if (availableDates.has(dateString)) return 'available';
    
    // No word
    return 'no-word';
  };

  const handleDateClick = (dateString: string) => {
    const state = getDateState(dateString);
    
    // Only allow clicking on available dates (not played) or lost dates (can retry)
    if ((state === 'available' || state === 'lost') && onSelectArchiveDate) {
      console.log('[StreakCalendarModal] Selected archive date:', dateString);
      onSelectArchiveDate(dateString);
      onClose();
    }
  };

  const renderCalendarDay = (day: number, month: number, year: number) => {
    const dateString = getDateString(year, month, day);
    const state = getDateState(dateString);
    const isClickable = (state === 'available' || state === 'lost') && !!onSelectArchiveDate;
    
    let backgroundColor = 'transparent';
    let emoji = '';
    let textColor = '#374151';
    let borderStyle = '1px solid #e5e7eb';
    let cursor = 'default';
    let opacity = 1;
    
    switch (state) {
      case 'today':
        borderStyle = '2px solid #1a237e';
        backgroundColor = '#dbeafe';
        textColor = '#1a237e';
        break;
      case 'won':
        backgroundColor = '#d1fae5'; // Stronger green for visibility
        emoji = '✅';
        textColor = '#065f46';
        borderStyle = '2px solid #10b981';
        break;
      case 'lost':
        backgroundColor = '#fee2e2'; // Stronger red for visibility
        emoji = '❌';
        textColor = '#991b1b';
        borderStyle = '2px solid #ef4444';
        cursor = isClickable ? 'pointer' : 'default';
        break;
      case 'available':
        borderStyle = '2px solid #3b82f6';
        backgroundColor = '#eff6ff';
        textColor = '#1e40af';
        cursor = isClickable ? 'pointer' : 'default';
        break;
      case 'no-word':
      case 'future':
        opacity = 0.3;
        textColor = '#9ca3af';
        cursor = 'not-allowed';
        break;
    }

    return (
      <div
        key={`${month}-${day}`}
        onClick={() => isClickable && handleDateClick(dateString)}
        style={{
          minHeight: '40px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          border: borderStyle,
          borderRadius: '6px',
          backgroundColor,
          color: textColor,
          fontWeight: state === 'today' ? 600 : 400,
          fontSize: '0.9rem',
          position: 'relative',
          gap: '2px',
          cursor,
          opacity,
          transition: 'all 0.2s ease',
          ...(isClickable && {
            ':hover': {
              transform: 'scale(1.05)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
            }
          })
        }}
        onMouseEnter={(e) => {
          if (isClickable) {
            e.currentTarget.style.transform = 'scale(1.05)';
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
          }
        }}
        onMouseLeave={(e) => {
          if (isClickable) {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = 'none';
          }
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
          flexDirection: 'column',
          gap: '0.75rem',
          padding: '1rem',
          backgroundColor: '#f9fafb',
          borderRadius: '0.5rem',
          fontSize: '0.85rem',
          color: '#374151'
        }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>✅</span>
              <span>Won</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>❌</span>
              <span>Lost (click to retry)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ 
                width: '16px', 
                height: '16px', 
                border: '2px solid #3b82f6', 
                borderRadius: '3px',
                backgroundColor: '#eff6ff'
              }} />
              <span>Available (click to play)</span>
            </div>
          </div>
          {onSelectArchiveDate && (
            <div style={{ 
              textAlign: 'center', 
              fontSize: '0.8rem', 
              color: '#6b7280',
              fontStyle: 'italic'
            }}>
              Click any blue-bordered date to play from the archive!
            </div>
          )}
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

        {/* Show helpful message if no data and not loading */}
        {!loading && history.length === 0 && (
          <div style={{
            textAlign: 'center',
            color: '#6b7280',
            padding: '1rem',
            fontStyle: 'italic'
          }}>
            {isVercelPreview() 
              ? 'Play history not available in preview environment' 
              : 'No play history available yet. Start playing to see your progress!'}
          </div>
        )}
      </div>
    </div>
  );
}; 