import React from 'react';

interface StreakDiamondProps {
  currentStreak: number;
  bestStreak: number;
  lastWinDate?: string | null;
}

export const StreakDiamond: React.FC<StreakDiamondProps> = ({ 
  currentStreak, 
  bestStreak,
  lastWinDate
}) => {
  const isActive = (() => {
    if (!lastWinDate || currentStreak <= 0) return false;
    const last = new Date(lastWinDate);
    const today = new Date();
    const daysDiff = Math.floor((today.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));
    return daysDiff <= 1;
  })();

  return (
    <div style={{
      position: 'absolute', // Changed from 'relative' to 'absolute'
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%) rotate(45deg)', // Combined transforms
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '3.5rem',
      height: '3.5rem',
      backgroundColor: isActive ? '#fff7ed' : '#ffffff',
      border: '2px solid #0f2740', // deep blue similar to flame outline
      borderRadius: '0.5rem',
      // Use drop-shadow so the glow respects the diamond alpha (no square boxes)
      filter: isActive ? 'drop-shadow(0 0 16px rgba(255,140,0,0.35)) drop-shadow(0 3px 10px rgba(16,24,40,0.12))' : 'drop-shadow(0 3px 10px rgba(16,24,40,0.12))',
      zIndex: 10, // Above flames
    }}>
      {/* Content container - counter-rotate to keep text straight */}
      <div style={{
        transform: 'rotate(-45deg)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        width: '100%',
        height: '100%'
      }}>
        {/* Current Streak (larger) */}
        <div style={{
          fontSize: '1.25rem', // 2pts larger than best
          fontWeight: '700',
          color: '#1e293b',
          lineHeight: '1',
          fontFamily: '"Libre Baskerville", serif',
        }}>
          {currentStreak}
        </div>
        
        {/* Diagonal line across middle */}
        <div style={{
          width: '60%',
          height: '1px',
          backgroundColor: '#64748b',
          margin: '1px 0',
        }} />
        
        {/* Best Streak (smaller) */}
        <div style={{
          fontSize: '1rem', // Base size
          fontWeight: '600',
          color: '#64748b',
          lineHeight: '1', 
          fontFamily: '"Libre Baskerville", serif',
        }}>
          {bestStreak}
        </div>
      </div>
    </div>
  );
}; 