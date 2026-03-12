import { tryAliasMatch, THEME_ALIASES } from '../themeAliases';

describe('tryAliasMatch', () => {
  describe('exact alias matches', () => {
    it('matches "silent letters" for "Words With Silent Letters"', () => {
      const result = tryAliasMatch('silent letters', 'Words With Silent Letters');
      expect(result).not.toBeNull();
      expect(result!.isMatch).toBe(true);
      expect(result!.confidence).toBe(98);
    });

    it('matches "french" for "Borrowed from French"', () => {
      const result = tryAliasMatch('french', 'Borrowed from French');
      expect(result).not.toBeNull();
      expect(result!.isMatch).toBe(true);
      expect(result!.confidence).toBe(98);
    });

    it('matches "native american" for indigenous theme', () => {
      const result = tryAliasMatch('native american', 'Words have Indigenous-American Roots');
      expect(result).not.toBeNull();
      expect(result!.isMatch).toBe(true);
    });

    it('matches "heteronyms" for stress theme', () => {
      const result = tryAliasMatch('heteronyms', 'Words Where Stress Changes Meaning');
      expect(result).not.toBeNull();
      expect(result!.isMatch).toBe(true);
    });

    it('matches "the bard" for Shakespeare', () => {
      const result = tryAliasMatch('the bard', 'Shakespeare');
      expect(result).not.toBeNull();
      expect(result!.isMatch).toBe(true);
    });

    it('matches "kpop" for kpop/fandom culture', () => {
      const result = tryAliasMatch('kpop', 'kpop/fandom culture');
      expect(result).not.toBeNull();
      expect(result!.isMatch).toBe(true);
    });

    it('matches "place names" for Words That Used To Be Places', () => {
      const result = tryAliasMatch('place names', 'Words That Used To Be Places');
      expect(result).not.toBeNull();
      expect(result!.isMatch).toBe(true);
    });
  });

  describe('case insensitivity', () => {
    it('matches "SILENT LETTERS" (upper) for silent letters theme', () => {
      const result = tryAliasMatch('SILENT LETTERS', 'Words With Silent Letters');
      expect(result).not.toBeNull();
      expect(result!.isMatch).toBe(true);
    });

    it('matches "French Words" (mixed) for Borrowed from French', () => {
      const result = tryAliasMatch('French Words', 'Borrowed from French');
      expect(result).not.toBeNull();
      expect(result!.isMatch).toBe(true);
    });
  });

  describe('non-matching guesses', () => {
    it('returns null for a random guess against a known theme', () => {
      const result = tryAliasMatch('ocean creatures', 'Words With Silent Letters');
      expect(result).toBeNull();
    });

    it('returns null for a theme not in the alias map', () => {
      const result = tryAliasMatch('something', 'A Theme That Does Not Exist');
      expect(result).toBeNull();
    });

    it('returns null for partial alias matches', () => {
      const result = tryAliasMatch('silent', 'Words With Silent Letters');
      expect(result).toBeNull();
    });
  });

  describe('THEME_ALIASES completeness', () => {
    it('has aliases for key themes', () => {
      const requiredThemes = [
        'Shakespeare',
        'Borrowed from French',
        'Words With Silent Letters',
        'Words That Are Both Nouns and Verbs',
        'Words that changed meaning over time',
      ];
      for (const theme of requiredThemes) {
        expect(THEME_ALIASES[theme]).toBeDefined();
        expect(THEME_ALIASES[theme].length).toBeGreaterThan(0);
      }
    });
  });
});
