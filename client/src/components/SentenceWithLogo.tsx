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
    const boxSize = Math.max(14, Math.min(18, underscoreCount * 0.8));
    const fontSize = Math.max(8, Math.min(11, boxSize * 0.55));
    
    return (
      <span style={{ 
        display: 'inline-flex', 
        alignItems: 'center', 
        gap: '1px',
        margin: '0 3px', // Reduced margin to prevent spacing issues
        verticalAlign: 'middle',
        position: 'relative',
        top: '-1px',
        whiteSpace: 'nowrap'
      }}>
        {/* Un· diamond - matching UnPrefix styling but smaller */}
        <div style={{
          width: `${boxSize + 2}px`,
          height: `${boxSize + 2}px`,
          borderRadius: '2px',
          backgroundColor: '#f8f9ff',
          border: '1px solid #1a237e',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'var(--font-primary)',
          fontStyle: 'italic',
          fontWeight: '700',
          color: '#1a237e',
          fontSize: `${fontSize * 0.7}px`,
          transform: 'rotate(45deg)',
          boxShadow: '0 1px 2px rgba(26, 35, 126, 0.08)',
          flexShrink: 0,
          opacity: 0.7
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
              border: '1px solid #1a237e',
              borderRadius: '2px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#fff',
              fontFamily: 'var(--font-primary)',
              fontSize: `${fontSize}px`,
              fontWeight: '700',
              color: '#1a237e',
              boxShadow: '0 1px 2px rgba(26, 35, 126, 0.04)',
              letterSpacing: '0.02em',
              opacity: 0.7
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
    console.log('SentenceWithLogo - Input text:', inputText);
    
    // Pattern that captures a single letter or word before underscores
    // (\S+|\S)\s* captures either a word or single letter + optional space
    // _{3,} matches underscores (which we'll remove)
    // (\s*) captures trailing space
    const wordUnderscorePattern = /([a-zA-Z]\s*|[a-zA-Z]+\s*)_{3,}(\s*)/g;
    
    // If no matches, return as-is
    if (!wordUnderscorePattern.test(inputText)) {
      console.log('SentenceWithLogo - No matches found, returning as-is');
      return <span>{inputText}</span>;
    }
    
    console.log('SentenceWithLogo - Pattern matches found, processing...');
    
    // Reset regex for actual replacement
    wordUnderscorePattern.lastIndex = 0;
    
    const result = [];
    let lastIndex = 0;
    let match;
    
    while ((match = wordUnderscorePattern.exec(inputText)) !== null) {
      const [fullMatch, beforeText, afterSpace] = match;
      const matchStart = match.index;
      const underscoreMatch = fullMatch.match(/_{3,}/);
      const underscoreCount = underscoreMatch ? underscoreMatch[0].length : 6;
      
      console.log('SentenceWithLogo - Match details:', {
        fullMatch,
        beforeText,
        afterSpace,
        matchStart,
        underscoreCount
      });
      
      // Add any text before this match
      if (matchStart > lastIndex) {
        const beforeMatchText = inputText.slice(lastIndex, matchStart);
        console.log('SentenceWithLogo - Adding before text:', beforeMatchText);
        result.push(<span key={`before-${matchStart}`}>{beforeMatchText}</span>);
      }
      
      // Create the unbreakable word/letter + logo unit
      const textPart = beforeText.trimEnd();
      const hasSpaceAfterText = beforeText.endsWith(' ');
      
      console.log('SentenceWithLogo - Creating logo unit:', {
        textPart,
        hasSpaceAfterText,
        afterSpace
      });
      
      result.push(
        <span 
          key={`word-logo-${matchStart}`}
          style={{ 
            whiteSpace: 'nowrap',
            display: 'inline-block'
          }}
        >
          {textPart}
          {hasSpaceAfterText && ' '}
          <MiniUnDefineLogo underscoreCount={underscoreCount} />
          {afterSpace}
        </span>
      );
      
      lastIndex = matchStart + fullMatch.length;
    }
    
    // Add any remaining text
    if (lastIndex < inputText.length) {
      const remainingText = inputText.slice(lastIndex);
      console.log('SentenceWithLogo - Adding remaining text:', remainingText);
      result.push(<span key={`after-${lastIndex}`}>{remainingText}</span>);
    }
    
    console.log('SentenceWithLogo - Final result array length:', result.length);
    return <>{result}</>;
  };

  return (
    <span style={{ 
      lineHeight: '1.6',
      display: 'inline',
      wordBreak: 'keep-all' // Prevent breaking within words/logos
    }}>
      {renderTextWithLogo(text)}
    </span>
  );
}; 