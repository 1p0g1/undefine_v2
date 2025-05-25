import React, { useState, useRef, useEffect } from 'react';
import './GuessInput.css';

interface GuessInputProps {
  onGuess: (guess: string) => void;
  disabled?: boolean;
  maxLength?: number;
}

export function GuessInput({ onGuess, disabled = false, maxLength = 20 }: GuessInputProps) {
  const [guess, setGuess] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input on mount
  useEffect(() => {
    if (!disabled && inputRef.current) {
      inputRef.current.focus();
    }
  }, [disabled]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedGuess = guess.trim();
    if (trimmedGuess && !disabled) {
      onGuess(trimmedGuess);
      setGuess('');
    }
  };

  return (
    <form className="guess-input-form" onSubmit={handleSubmit}>
      <input
        ref={inputRef}
        type="text"
        value={guess}
        onChange={e => setGuess(e.target.value)}
        placeholder="Enter your guess..."
        disabled={disabled}
        maxLength={maxLength}
        className="guess-input"
        aria-label="Guess input"
      />
      <button
        type="submit"
        disabled={!guess.trim() || disabled}
        className="guess-submit"
        aria-label="Submit guess"
      >
        Guess
      </button>
    </form>
  );
} 