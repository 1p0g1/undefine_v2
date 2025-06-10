import React from 'react';
import { UnPrefix } from './UnPrefix';
import { GameSessionState } from '../../../shared-types/src/game';
import { ShortClueKey } from '../../../shared-types/src/clues';
import { GuessStatus } from './DefineBoxes';

interface SentenceWithLogoProps {
  text: string;
}

export const SentenceWithLogo: React.FC<SentenceWithLogoProps> = ({ text }) => {
  // Mini logo component that matches the main DEFINE box styling
  const MiniUnDefineLogo = ({ underscoreCount }: { underscoreCount: number }) => {
    // Calculate appropriate size based on underscore count (smaller than main boxes)
    const boxSize = Math.max(18, Math.min(24, underscoreCount * 1.2));
    const fontSize = Math.max(10, Math.min(13, boxSize * 0.55));
    
    return (
      <span style={{ 
        display: 'inline-flex', 
        alignItems: 'center', 
        gap: '2px',
        margin: '0 6px 0 2px',
        verticalAlign: 'middle',
        position: 'relative',
        top: '-1px'
      }}>
        {/* Un· diamond - matching UnPrefix styling but smaller */}
        <div style={{
          width: `${boxSize}px`,
          height: `${boxSize}px`,
          borderRadius: '3px',
          backgroundColor: '#f8f9ff',
          border: '2px solid #1a237e',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'var(--font-primary)',
          fontStyle: 'italic',
          fontWeight: '700',
          color: '#1a237e',
          fontSize: `${fontSize * 0.8}px`,
          transform: 'rotate(45deg)',
          boxShadow: '0 1px 3px rgba(26, 35, 126, 0.1)',
          flexShrink: 0
        }}>
          <span style={{ 
            transform: 'rotate(-45deg)',
            lineHeight: 1
          }}>
            Un·
          </span>
        </div>
        
        {/* DEFINE boxes - matching main styling */}
        {['D', 'E', 'F', 'I', 'N', 'E'].map((letter, index) => (
          <div
            key={letter + index}
            style={{
              width: `${boxSize}px`,
              height: `${boxSize}px`,
              border: '2px solid #1a237e',
              borderRadius: '3px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#fff',
              fontFamily: 'var(--font-primary)',
              fontSize: `${fontSize}px`,
              fontWeight: '700',
              color: '#1a237e',
              boxShadow: '0 1px 3px rgba(26, 35, 126, 0.04)',
              letterSpacing: '0.02em'
            }}
          >
            {letter}
          </div>
        ))}
      </span>
    );
  };

  // Function to replace underscore sequences with the mini logo
  const renderTextWithLogo = (inputText: string) => {
    // Find sequences of underscores (3 or more in a row, or individual underscores representing the word)
    const underscorePattern = /_{3,}|_+/g;
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
        // Add a space before the logo to ensure clear separation from preceding text
        if (i > 0 && parts[i] && !parts[i].endsWith(' ')) {
          result.push(<span key={`space-before-${i}`}> </span>);
        }
        result.push(
          <MiniUnDefineLogo 
            key={`logo-${i}`} 
            underscoreCount={underscoreCount}
          />
        );
        // Add a space after the logo to ensure clear separation from following text
        if (i < parts.length - 1 && parts[i + 1] && !parts[i + 1].startsWith(' ')) {
          result.push(<span key={`space-after-${i}`}> </span>);
        }
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