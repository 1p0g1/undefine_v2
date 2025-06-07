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
    const scale = Math.max(0.5, Math.min(0.8, baseWidth / 10)); // Scale between 0.5-0.8
    
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
        // Match main DEFINE box styling
        border: '2px solid var(--color-primary)', // Same as main boxes
        borderRadius: '0.4rem', // Same as main boxes
        padding: '0.1rem 0.25rem',
        backgroundColor: '#fff', // Same as main boxes
        boxShadow: '0 2px 8px rgba(26, 35, 126, 0.04)', // Same as main boxes
        width: `${baseWidth}em`,
        justifyContent: 'center',
        flexShrink: 0,
        fontFamily: 'var(--font-primary)' // Same as main boxes
      }}>
        {/* Mini Un prefix */}
        <span style={{
          fontStyle: 'italic',
          fontWeight: 600,
          fontSize: '0.8rem',
          color: 'var(--color-primary)',
          marginRight: '0.08rem',
          whiteSpace: 'nowrap',
          letterSpacing: '0.05em' // Match main box letter spacing
        }}>
          Un·
        </span>
        
        {/* Mini DEFINE boxes - matching main box proportions */}
        {['D', 'E', 'F', 'I', 'N', 'E'].map((letter, index) => (
          <span
            key={`mini-${letter}-${index}`}
            style={{
              width: '1rem',
              height: '1rem',
              border: '2px solid var(--color-primary)', // Match main box border
              borderRadius: '0.4rem', // Match main box border radius
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.55rem',
              fontWeight: 700, // Match main box font weight
              color: 'var(--color-primary)',
              backgroundColor: '#fff',
              marginRight: index < 5 ? '0.05rem' : '0', // Slightly increased gap
              fontFamily: 'var(--font-primary)',
              flexShrink: 0,
              letterSpacing: '0.05em', // Match main box letter spacing
              boxShadow: '0 2px 8px rgba(26, 35, 126, 0.04)', // Match main box shadow
              transition: 'all 0.2s ease' // Match main box transition
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