import React from 'react';
import { UnPrefix } from './UnPrefix';
import { GameSessionState } from '../../../shared-types/src/game';
import { ShortClueKey } from '../../../shared-types/src/clues';
import { GuessStatus } from './DefineBoxes';

interface SentenceWithLogoProps {
  text: string;
}

export const SentenceWithLogo: React.FC<SentenceWithLogoProps> = ({ text }) => {
  // Simple mini logo component
  const MiniUnDefineLogo = () => (
    <span style={{ 
      display: 'inline-flex', 
      alignItems: 'center', 
      gap: '0.1rem',
      margin: '0 0.2rem',
      verticalAlign: 'middle',
      transform: 'scale(0.6)',
      transformOrigin: 'center',
      position: 'relative',
      top: '-1px'
    }}>
      {/* Mini Un prefix */}
      <span style={{
        fontStyle: 'italic',
        fontWeight: 600,
        fontSize: '0.9rem',
        color: 'var(--color-primary)',
        marginRight: '0.1rem'
      }}>
        Un·
      </span>
      
      {/* Mini DEFINE boxes */}
      {['D', 'E', 'F', 'I', 'N', 'E'].map((letter, index) => (
        <span
          key={`mini-${letter}-${index}`}
          style={{
            width: '1.2rem',
            height: '1.2rem',
            border: '1px solid var(--color-primary)',
            borderRadius: '0.2rem',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.65rem',
            fontWeight: 700,
            color: 'var(--color-primary)',
            backgroundColor: '#fff',
            marginRight: index < 5 ? '0.05rem' : '0',
            fontFamily: 'var(--font-primary)'
          }}
        >
          {letter}
        </span>
      ))}
    </span>
  );

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
        result.push(<MiniUnDefineLogo key={`logo-${i}`} />);
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