/**
 * Clue utilities for Un-Define v2
 */

import { CLUE_ORDER } from '../repositories/wordRepository.js';

/**
 * Get the next unrevealed clue in the DEFINE order
 */
export function getNextClue(revealedClues: string[]): string | null {
  return CLUE_ORDER.find(clue => !revealedClues.includes(clue)) || null;
}

/**
 * Get all clues that should be revealed based on guess count
 */
export function getRevealedClues(guessCount: number): string[] {
  return CLUE_ORDER.slice(0, guessCount);
}

/**
 * Initialize clue status for a new game
 */
export function initializeClueStatus(): Record<string, boolean> {
  return CLUE_ORDER.reduce(
    (acc, clue) => {
      acc[clue] = false;
      return acc;
    },
    {} as Record<string, boolean>
  );
}

/**
 * Update clue status based on revealed clues
 */
export function updateClueStatus(
  currentStatus: Record<string, boolean>,
  revealedClues: string[]
): Record<string, boolean> {
  const newStatus = { ...currentStatus };
  revealedClues.forEach(clue => {
    newStatus[clue] = true;
  });
  return newStatus;
}
