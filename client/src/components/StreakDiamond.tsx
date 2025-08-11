import React from 'react';

interface StreakDiamondProps {
  currentStreak: number;
  bestStreak: number;
}

export const StreakDiamond: React.FC<StreakDiamondProps> = ({ 
  currentStreak, 
  bestStreak 
}) => {
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
      backgroundColor: '#ffffff',
      backgroundImage: 'radial-gradient(ellipse at center, rgba(255,140,0,0.28) 0%, rgba(255,140,0,0.15) 55%, rgba(255,140,0,0) 75%)', // soft inner orange glow that respects diamond shape
      border: '2px solid #0f2740', // deep blue similar to flame outline
      borderRadius: '0.5rem',
      boxShadow: '0 6px 14px rgba(16, 24, 40, 0.12), 0 0 16px rgba(255,140,0,0.20)', // subtle depth + outer warmth
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