import React from 'react';

interface LoadingBarProps {
  isLoading: boolean;
}

export const LoadingBar: React.FC<LoadingBarProps> = ({ isLoading }) => {
  if (!isLoading) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '3px',
        backgroundColor: 'rgba(26, 35, 126, 0.1)',
        overflow: 'hidden',
        zIndex: 1000,
      }}
    >
      <div
        style={{
          position: 'absolute',
          width: '30%',
          height: '100%',
          backgroundColor: 'var(--color-primary, #1a237e)',
          animation: 'loading 1s infinite ease-in-out',
          transformOrigin: 'left',
        }}
      />
      <style>{`
        @keyframes loading {
          0% {
            transform: translateX(-100%);
          }
          50% {
            transform: translateX(200%);
          }
          100% {
            transform: translateX(-100%);
          }
        }
      `}</style>
    </div>
  );
}; 