import {
  detectThemePattern,
  tryPatternMatch,
  matchPatternTheme,
} from '../patternThemeMatcher';

// ─────────────────────────────────────────────────────────────────────────────
// PATTERN DETECTION
// ─────────────────────────────────────────────────────────────────────────────

describe('detectThemePattern', () => {
  it('detects suffix pattern: ____fish', () => {
    const result = detectThemePattern('____fish');
    expect(result).not.toBeNull();
    expect(result!.type).toBe('suffix');
    expect(result!.coreWord).toBe('fish');
  });

  it('detects suffix pattern: ***fish', () => {
    const result = detectThemePattern('***fish');
    expect(result).not.toBeNull();
    expect(result!.type).toBe('suffix');
    expect(result!.coreWord).toBe('fish');
  });

  it('detects suffix with dash: -fish', () => {
    const result = detectThemePattern('-fish');
    expect(result).not.toBeNull();
    expect(result!.type).toBe('suffix');
    expect(result!.coreWord).toBe('fish');
  });

  it('detects prefix pattern: re____', () => {
    const result = detectThemePattern('re____');
    expect(result).not.toBeNull();
    expect(result!.type).toBe('prefix');
    expect(result!.coreWord).toBe('re');
  });

  it('detects prefix pattern: un___', () => {
    const result = detectThemePattern('un___');
    expect(result).not.toBeNull();
    expect(result!.type).toBe('prefix');
    expect(result!.coreWord).toBe('un');
  });

  it('detects contains pattern: "word contains vegetable"', () => {
    const result = detectThemePattern('word contains vegetable');
    expect(result).not.toBeNull();
    expect(result!.type).toBe('contains');
    expect(result!.coreWord).toBe('vegetable');
  });

  it('detects hidden pattern: "Words With Hidden Animals"', () => {
    const result = detectThemePattern('Words With Hidden Animals');
    expect(result).not.toBeNull();
    expect(result!.type).toBe('contains');
    // Captured from "Words With Hidden Animals" → group = "Animals" → lowercase
    expect(result!.coreWord).toBe('animals');
  });

  it('returns null for semantic themes', () => {
    expect(detectThemePattern('Shakespeare')).toBeNull();
    expect(detectThemePattern('Weather')).toBeNull();
    expect(detectThemePattern('Greek myth')).toBeNull();
    expect(detectThemePattern('Words That Are Both Nouns and Verbs')).toBeNull();
    expect(detectThemePattern('Periodic table')).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUFFIX MATCHING: "____fish"
// ─────────────────────────────────────────────────────────────────────────────

describe('suffix pattern: ____fish', () => {
  const THEME = '____fish';

  const shouldMatch: Array<[string, number]> = [
    ['fish', 95],
    ['____fish', 100],
    ['___fish', 100],
    ['-fish', 100],
    ['*fish', 100],
    ['ends in fish', 95],
    ['ends with fish', 95],
    ['can add fish', 90],
    ['go with fish', 90],
    ['precede fish', 90],
    ['followed by fish', 90],
    ['compound words with fish', 90],
    ['words ending in fish', 90],
    ['fish suffix', 85],
    ['blank fish', 85],
    ['words that can have fish added', 90],
    ['fishes', 85],           // derivation (suffix -es)
  ];

  const shouldNotMatch: string[] = [
    'ocean creatures',
    'types of fish',
    'aquatic animals',
    'Shakespeare',
    'cooking',
    '',
  ];

  it.each(shouldMatch)('MATCH: "%s" (>= %d%% confidence)', (guess, minConfidence) => {
    const result = tryPatternMatch(guess, THEME);
    expect(result).not.toBeNull();
    expect(result!.isMatch).toBe(true);
    expect(result!.confidence).toBeGreaterThanOrEqual(minConfidence);
  });

  it.each(shouldNotMatch)('NO MATCH: "%s"', (guess) => {
    const result = tryPatternMatch(guess, THEME);
    expect(result).not.toBeNull();
    expect(result!.isMatch).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PREFIX MATCHING: "re____"
// ─────────────────────────────────────────────────────────────────────────────

describe('prefix pattern: re____', () => {
  const THEME = 're____';

  const shouldMatch: Array<[string, number]> = [
    ['re', 95],
    ['re____', 100],
    ['re-', 100],
    ['starts with re', 95],
    ['begins with re', 95],
    ['re prefix', 85],
    ['words starting with re', 90],
    ['can add re', 90],
  ];

  const shouldNotMatch: string[] = [
    'prefix',       // too generic
    'spelling',
    'grammar',
  ];

  it.each(shouldMatch)('MATCH: "%s" (>= %d%% confidence)', (guess, minConfidence) => {
    const result = tryPatternMatch(guess, THEME);
    expect(result).not.toBeNull();
    expect(result!.isMatch).toBe(true);
    expect(result!.confidence).toBeGreaterThanOrEqual(minConfidence);
  });

  it.each(shouldNotMatch)('NO MATCH: "%s"', (guess) => {
    const result = tryPatternMatch(guess, THEME);
    expect(result).not.toBeNull();
    expect(result!.isMatch).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// CONTAINS MATCHING: "word contains vegetable"
// ─────────────────────────────────────────────────────────────────────────────

describe('contains pattern: "word contains vegetable"', () => {
  const THEME = 'word contains vegetable';

  const shouldMatch: Array<[string, number]> = [
    ['contains vegetable', 95],
    ['hidden vegetable', 95],
    ['vegetable hidden in word', 90],
    ['vegetable', 95],
    ['vegetables', 95],
    ['words with vegetable in them', 90],
  ];

  const shouldNotMatch: string[] = [
    'farming',
    'cooking ingredients',
    'salad',
  ];

  it.each(shouldMatch)('MATCH: "%s" (>= %d%% confidence)', (guess, minConfidence) => {
    const result = tryPatternMatch(guess, THEME);
    expect(result).not.toBeNull();
    expect(result!.isMatch).toBe(true);
    expect(result!.confidence).toBeGreaterThanOrEqual(minConfidence);
  });

  it.each(shouldNotMatch)('NO MATCH: "%s"', (guess) => {
    const result = tryPatternMatch(guess, THEME);
    expect(result).not.toBeNull();
    expect(result!.isMatch).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// HIDDEN ANIMALS: "Words With Hidden Animals"
// ─────────────────────────────────────────────────────────────────────────────

describe('hidden pattern: "Words With Hidden Animals"', () => {
  const THEME = 'Words With Hidden Animals';

  const shouldMatch: Array<[string, number]> = [
    ['hidden animals', 95],
    ['animals hidden in word', 80],
    ['contains animals', 95],
    ['animals', 95],
  ];

  const shouldNotMatch: string[] = [
    'zoo',
    'wildlife',
    'pets',
  ];

  it.each(shouldMatch)('MATCH: "%s" (>= %d%% confidence)', (guess, minConfidence) => {
    const result = tryPatternMatch(guess, THEME);
    expect(result).not.toBeNull();
    expect(result!.isMatch).toBe(true);
    expect(result!.confidence).toBeGreaterThanOrEqual(minConfidence);
  });

  it.each(shouldNotMatch)('NO MATCH: "%s"', (guess) => {
    const result = tryPatternMatch(guess, THEME);
    expect(result).not.toBeNull();
    expect(result!.isMatch).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SEMANTIC THEMES PASS THROUGH (return null)
// ─────────────────────────────────────────────────────────────────────────────

describe('semantic themes return null (pass-through)', () => {
  const semanticThemes = [
    'Shakespeare',
    'Weather',
    'Animals',
    'Greek myth',
    'Periodic table',
    'collective nouns for animal groups',
    'Words That Are Both Nouns and Verbs',
    'Borrowed from French',
    'Back-Formations',
    'kpop/fandom culture',
    'spaghetti bolognese',
    'Peter Pan',
  ];

  it.each(semanticThemes)('"%s" returns null (not a pattern theme)', (theme) => {
    const result = tryPatternMatch('some guess', theme);
    expect(result).toBeNull();
  });
});
