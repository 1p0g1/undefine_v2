import { useState, useCallback } from 'react';
import { GameSessionState, WordResponse, GuessResponse } from '../api/types';

function getPlayerId() {
  return localStorage.getItem('nickname') || 'anonymous';
}

const useGame = () => {
  const [gameState, setGameState] = useState<GameSessionState>({
    gameId: '',
    guesses: [],
    revealedClues: [],
    clueStatus: {},
    usedHint: false,
    isComplete: false,
    isWon: false,
  });
  // Track guess status for each box (max 6)
  const [guessStatus, setGuessStatus] = useState<
    ('correct' | 'incorrect' | 'fuzzy' | 'empty' | 'active')[]
  >(['empty', 'empty', 'empty', 'empty', 'empty', 'empty']);
  // DEV ONLY: store solution in state for clue logic
  const [solution, setSolution] = useState<string | undefined>(undefined); // DEV ONLY
  // Store clues for clue logic
  const [clues, setClues] = useState<WordResponse['clues'] | undefined>(undefined);
  // Track leaderboard modal
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  const startNewGame = useCallback(async () => {
    try {
      const response = await fetch('/api/word', {
        headers: {
          'Content-Type': 'application/json',
          'player-id': getPlayerId(),
        },
      });
      if (!response.ok) {
        console.error('Error fetching /api/word:', response.status, response.statusText);
        setClues(undefined);
        return;
      }
      const data: WordResponse = await response.json();
      setGameState({
        gameId: data.gameId,
        guesses: [],
        revealedClues: [],
        clueStatus: {},
        usedHint: false,
        isComplete: false,
        isWon: false,
      });
      setGuessStatus(['empty', 'empty', 'empty', 'empty', 'empty', 'empty']);
      setShowLeaderboard(false);
      // DEV ONLY: set solution if present
      if (data.solution) setSolution(data.solution); // DEV ONLY
      setClues(data.clues);
    } catch (error) {
      console.error('Failed to start new game:', error);
      setClues(undefined);
    }
  }, []);

  const submitGuess = useCallback(
    async (guess: string) => {
      const trimmedGuess = guess.trim();
      const playerId = getPlayerId();
      if (!gameState.gameId || !trimmedGuess) {
        console.error('Missing gameId or guess');
        return;
      }
      if (gameState.guesses.length >= 6) return;
      if (gameState.guesses.includes(trimmedGuess)) {
        console.warn('Duplicate guess:', trimmedGuess);
        return;
      }
      console.log('Submitting guess payload:', {
        player_id: playerId,
        gameId: gameState.gameId,
        guess: trimmedGuess,
      });
      try {
        const response = await fetch('/api/guess', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'player-id': playerId,
          },
          body: JSON.stringify({
            gameId: gameState.gameId,
            guess: trimmedGuess,
          }),
        });
        const data: GuessResponse = await response.json();
        setGameState((prevState: GameSessionState) => {
          const newGuesses = [...prevState.guesses, trimmedGuess];
          // Determine status for this guess
          let status: 'correct' | 'incorrect' | 'fuzzy' = 'incorrect';
          // Fix: compare guess and solution with trim/lowercase
          if (solution && trimmedGuess.toLowerCase() === solution.toLowerCase()) status = 'correct';
          else if (data.isFuzzy) status = 'fuzzy';
          // Update guessStatus array
          setGuessStatus(prev => {
            const updated = [...prev];
            updated[newGuesses.length - 1] = status;
            return updated;
          });
          // Show leaderboard if 6 guesses or game over
          if (newGuesses.length >= 6 || status === 'correct') setShowLeaderboard(true);
          return {
            ...prevState,
            guesses: newGuesses,
            revealedClues: data.revealedClues,
            isComplete: status === 'correct' || newGuesses.length >= 6,
            isWon: status === 'correct',
          };
        });
      } catch (error) {
        console.error('Failed to submit guess:', error);
      }
    },
    [gameState.gameId, gameState.guesses, gameState.isComplete, solution]
  );

  return {
    gameState,
    startNewGame,
    submitGuess,
    solution, // DEV ONLY: expose for clue logic
    clues,
    guessStatus,
    showLeaderboard,
  };
};

// Enum for clue keys
export enum ClueKey {
  Definition = 'D',
  Equivalents = 'E',
  FirstLetter = 'F',
  InSentence = 'I',
  NumLetters = 'N',
  Etymology = 'E2',
}

/**
 * Returns the clues to display based on the number of incorrect guesses.
 * D: Definition (always shown)
 * E: Equivalents (after 1st incorrect guess)
 * F: First Letter (after 2nd incorrect guess)
 * I: In a Sentence (after 3rd incorrect guess)
 * N: Number of Letters (after 4th incorrect guess)
 * E2: Etymology (after 5th incorrect guess)
 */
export function getVisibleClues(
  clues: WordResponse['clues'],
  guesses: string[] = [],
  correctAnswer: string = ''
): { key: string; label: string; value: string }[] {
  if (!clues) return [];
  // Count incorrect guesses only
  const incorrectGuesses = guesses.filter(g => g.toLowerCase() !== correctAnswer.toLowerCase());
  const visibleClues: { key: string; label: string; value: string }[] = [];
  // Always show D
  if (clues.D) {
    visibleClues.push({ key: ClueKey.Definition, label: 'Definition', value: clues.D });
  }
  if (incorrectGuesses.length >= 1 && clues.E && clues.E.length > 0) {
    visibleClues.push({
      key: ClueKey.Equivalents,
      label: 'Equivalents',
      value: clues.E.join(', '),
    });
  }
  if (incorrectGuesses.length >= 2 && clues.F) {
    visibleClues.push({ key: ClueKey.FirstLetter, label: 'First Letter', value: clues.F });
  }
  if (incorrectGuesses.length >= 3 && clues.I) {
    visibleClues.push({ key: ClueKey.InSentence, label: 'In a Sentence', value: clues.I });
  }
  if (incorrectGuesses.length >= 4 && clues.N !== undefined && clues.N !== null) {
    visibleClues.push({
      key: ClueKey.NumLetters,
      label: 'Number of Letters',
      value: clues.N.toString(),
    });
  }
  if (incorrectGuesses.length >= 5 && clues.E2) {
    visibleClues.push({ key: ClueKey.Etymology, label: 'Etymology', value: clues.E2 });
  }
  // DEV ONLY: log visible clues for debugging
  if (typeof window !== 'undefined' && window.location.search.includes('dev=true')) {
    // eslint-disable-next-line no-console
    console.log(
      'Visible clues:',
      visibleClues.map(c => c.key)
    );
  }
  return visibleClues;
}

export default useGame;
