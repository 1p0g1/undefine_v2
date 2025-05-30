import { WordRow, WordResponseShape } from '../../../shared-types/src/word';

/**
 * Maps a word row from the database to the API response shape
 * @param word The word row from the database
 * @returns The shaped word response
 */
export function mapWordRowToResponse(word: WordRow): WordResponseShape {
  // Ensure equivalents is always an array
  const equivalents = word.equivalents || [];

  return {
    id: word.id,
    word: word.word,
    definition: word.definition,
    first_letter: word.first_letter,
    in_a_sentence: word.in_a_sentence,
    equivalents,
    number_of_letters: word.number_of_letters,
    etymology: word.etymology,
    difficulty: word.difficulty,
    date: word.date
  };
} 