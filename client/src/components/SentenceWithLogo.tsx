import React from 'react';
import { UnPrefix } from './UnPrefix';
import { GameSessionState } from '../../../shared-types/src/game';
import { ShortClueKey } from '../../../shared-types/src/clues';
import { GuessStatus } from './DefineBoxes';

interface SentenceWithLogoProps {
  text: string;
}

export const SentenceWithLogo: React.FC<SentenceWithLogoProps> = ({ text }) => {
  // Simple SVG logo component that adapts to underscore length
  const MiniUnDefineLogo = ({ underscoreCount }: { underscoreCount: number }) => {
    // Calculate appropriate width based on underscore count
    const logoWidth = Math.max(80, Math.min(120, underscoreCount * 8)); // 80-120px range
    
    return (
      <span style={{ 
        display: 'inline-flex', 
        alignItems: 'center', 
        margin: '0 0.1rem',
        verticalAlign: 'middle',
        position: 'relative',
        top: '-1px'
      }}>
        <svg 
          width={logoWidth} 
          height="20" 
          viewBox="0 0 120 20" 
          style={{ 
            display: 'inline-block',
            verticalAlign: 'middle'
          }}
        >
          {/* Diamond background for Un· */}
          <path 
            d="M2 10 L10 2 L18 10 L10 18 Z" 
            fill="white" 
            stroke="#1a237e" 
            strokeWidth="1.5"
          />
          
          {/* Un· text */}
          <text 
            x="10" 
            y="13" 
            textAnchor="middle" 
            fontSize="8" 
            fontFamily="var(--font-primary)" 
            fontStyle="italic" 
            fontWeight="600" 
            fill="#1a237e"
          >
            Un·
          </text>
          
          {/* DEFINE boxes */}
          {['D', 'E', 'F', 'I', 'N', 'E'].map((letter, index) => {
            const x = 24 + (index * 15);
            return (
              <g key={letter + index}>
                <rect 
                  x={x} 
                  y="4" 
                  width="12" 
                  height="12" 
                  fill="white" 
                  stroke="#1a237e" 
                  strokeWidth="1.5" 
                  rx="2"
                />
                <text 
                  x={x + 6} 
                  y="12.5" 
                  textAnchor="middle" 
                  fontSize="7" 
                  fontFamily="var(--font-primary)" 
                  fontWeight="700" 
                  fill="#1a237e"
                >
                  {letter}
                </text>
              </g>
            );
          })}
        </svg>
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