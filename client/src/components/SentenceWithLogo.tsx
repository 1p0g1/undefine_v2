import React from 'react';
import { UnPrefix } from './UnPrefix';
import { GameSessionState } from '../../../shared-types/src/game';
import { ShortClueKey } from '../../../shared-types/src/clues';
import { GuessStatus } from './DefineBoxes';

interface SentenceWithLogoProps {
  text: string;
}

export const SentenceWithLogo: React.FC<SentenceWithLogoProps> = ({ text }) => {
  // Simple mini logo component that adapts to underscore length
  const MiniUnDefineLogo = ({ underscoreCount }: { underscoreCount: number }) => {
    // Base width calculation - each underscore is roughly 0.6em wide
    const baseWidth = Math.max(6, Math.min(12, underscoreCount * 0.6)); // Between 6-12em
    const scale = Math.max(0.4, Math.min(0.7, baseWidth / 10)); // Scale between 0.4-0.7
    
    return (
      <span style={{ 
        display: 'inline-flex', 
        alignItems: 'center', 
        gap: '0.05rem',
        margin: '0 0.1rem',
        verticalAlign: 'middle',
        transform: `scale(${scale})`,
        transformOrigin: 'center',
        position: 'relative',
        top: '-1px',
        // Add border around the whole logo
        border: '1px solid var(--color-primary)',
        borderRadius: '0.3rem',
        padding: '0.1rem 0.2rem',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        boxShadow: '0 1px 3px rgba(26, 35, 126, 0.1)',
        width: `${baseWidth}em`,
        justifyContent: 'center',
        flexShrink: 0
      }}>
        {/* Mini Un prefix */}
        <span style={{
          fontStyle: 'italic',
          fontWeight: 600,
          fontSize: '0.8rem',
          color: 'var(--color-primary)',
          marginRight: '0.05rem',
          whiteSpace: 'nowrap'
        }}>
          Un·
        </span>
        
        {/* Mini DEFINE boxes */}
        {['D', 'E', 'F', 'I', 'N', 'E'].map((letter, index) => (
          <span
            key={`mini-${letter}-${index}`}
            style={{
              width: '1rem',
              height: '1rem',
              border: '1px solid var(--color-primary)',
              borderRadius: '0.15rem',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.55rem',
              fontWeight: 700,
              color: 'var(--color-primary)',
              backgroundColor: '#fff',
              marginRight: index < 5 ? '0.02rem' : '0',
              fontFamily: 'var(--font-primary)',
              flexShrink: 0
            }}
          >
            {letter}
          </span>
        ))}
      </span>
    );
  };

  // Function to replace underscore sequences with the mini logo
  const renderTextWithLogo = (inputText: string) => {
    // Find sequences of underscores (3 or more in a row)
    const underscorePattern = /_{3,}/g;
    const parts = inputText.split(underscorePattern);
    const matches = inputText.match(underscorePattern);

    if (!matches) {
      return <span>{inputText}</span>;
    }

    const result = [];
    for (let i = 0; i < parts.length; i++) {
      // Add the text part
      if (parts[i]) {
        result.push(<span key={`text-${i}`}>{parts[i]}</span>);
      }
      
      // Add the mini logo if there's a corresponding match
      if (matches[i]) {
        const underscoreCount = matches[i].length;
        result.push(
          <MiniUnDefineLogo 
            key={`logo-${i}`} 
            underscoreCount={underscoreCount}
          />
        );
      }
    }

    return <>{result}</>;
  };

  return (
    <span style={{ lineHeight: '1.6' }}>
      {renderTextWithLogo(text)}
    </span>
  );
}; 