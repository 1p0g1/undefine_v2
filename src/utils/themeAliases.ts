/**
 * Theme Aliases
 * =============
 * 
 * Pre-defined alternative phrasings for themes that players commonly
 * express differently. Checked BEFORE semantic scoring — instant, no API calls.
 * 
 * Each alias maps to the canonical theme name stored in `words.theme`.
 * Matching is case-insensitive and trimmed.
 * 
 * Adding aliases:
 *   1. Add entries to THEME_ALIASES below
 *   2. Run the pattern matcher test suite to verify no conflicts
 *   3. These take effect immediately — no migration needed
 * 
 * @see src/game/theme.ts for integration point
 * @see docs/THEME_SCORING_IMPROVEMENT_PLAN.md (Phase 2)
 */

/**
 * Map of canonical theme → array of accepted aliases.
 * All matching is case-insensitive.
 */
export const THEME_ALIASES: Record<string, string[]> = {
  // ─── Language & Etymology ──────────────────────────────────────────────

  'Words from Sanskrit roots': [
    'sanskrit', 'sanskrit roots', 'sanskrit origins', 'words from sanskrit',
    'indian language roots', 'hindi roots',
  ],

  'Words have Indigenous-American Roots': [
    'indigenous roots', 'native american', 'native american roots',
    'indigenous american', 'indigenous words', 'native words',
  ],
  'Words have Indigenous American roots': [
    'indigenous roots', 'native american', 'native american roots',
    'indigenous american', 'indigenous words', 'native words',
  ],

  'Borrowed from French': [
    'french', 'french words', 'french origins', 'french borrowings',
    'words from french', 'loanwords from french', 'french loanwords',
  ],

  'Words that changed meaning over time': [
    'semantic shift', 'meaning change', 'changed meaning', 'semantic change',
    'words that changed', 'meaning over time', 'words whose meaning changed',
    'amelioration', 'pejoration',
  ],

  'Words Originating From Accidents or Mistakes': [
    'accidental words', 'mistakes', 'words from mistakes',
    'accidental origins', 'false etymology', 'mistaken etymology',
    'words created by accident',
  ],

  'Words From Ancient Measurements': [
    'ancient measurements', 'old measurements', 'measurements',
    'units of measurement', 'archaic measurements', 'historical measurements',
  ],

  'Words Where Stress Changes Meaning': [
    'stress changes meaning', 'heteronyms', 'stress patterns',
    'pronunciation changes meaning', 'stress shift', 'accent shift',
    'emphasis changes meaning', 'stress placement',
  ],

  'Back-Formations': [
    'back formations', 'back formation', 'back-formed words',
    'reverse derivation', 'stripped suffix', 'words formed by removing suffix',
  ],

  'Greek Words': [
    'greek', 'greek origins', 'words from greek', 'greek language',
    'hellenic', 'ancient greek', 'greek derived',
  ],

  'Greek myth': [
    'greek mythology', 'mythology', 'greek myths', 'ancient greek myths',
    'mythological', 'myths', 'olympian',
  ],

  // ─── Wordplay & Features ──────────────────────────────────────────────

  'Words That Are Both Nouns and Verbs': [
    'nouns and verbs', 'noun and verb', 'both noun and verb',
    'dual purpose words', 'words with two uses', 'noun-verb words',
    'verbing nouns', 'can be noun or verb',
  ],

  'Words With Silent Letters': [
    'silent letters', 'unpronounced letters', 'mute letters',
    'letters you dont say', 'silent letter words',
  ],

  'Words With Hidden Animals': [
    'hidden animals', 'animals inside words', 'concealed animals',
    'animal names hidden in words', 'words containing animal names',
    'secret animals',
  ],

  'word contains vegetable': [
    'hidden vegetables', 'vegetables inside words', 'concealed vegetables',
    'words containing vegetables', 'vegetable in the word',
  ],

  'Chemical elements with double meanings': [
    'chemical elements', 'elements', 'periodic table elements',
    'elements with other meanings', 'dual meaning elements',
  ],

  'Body parts used as verbs': [
    'body part verbs', 'body parts as verbs', 'body parts that are verbs',
    'body parts as actions', 'verbs from body parts',
  ],

  'collective nouns for animal groups': [
    'collective nouns', 'animal group names', 'group names for animals',
    'what you call a group of', 'animal collectives',
  ],

  'Alphabet': [
    'letters', 'letters of the alphabet', 'words that sound like letters',
    'homophones of letters', 'letter sounds',
  ],

  'Rainbow': [
    'colours', 'colors', 'rainbow colours', 'rainbow colors',
    'colour words', 'words with colours', 'words containing colours',
  ],

  // ─── Cultural & Pop Culture ───────────────────────────────────────────

  'Shakespeare': [
    'the bard', 'william shakespeare', 'shakespearean',
    'shakespeare words', 'shakespeare plays',
  ],

  'kpop/fandom culture': [
    'kpop', 'k-pop', 'korean pop', 'fandom', 'fan culture',
    'kpop fandom', 'k-pop culture',
  ],

  'Peter Pan': [
    'peter pan', 'neverland', 'j.m. barrie', 'jm barrie',
    'never never land',
  ],

  'spaghetti bolognese': [
    'spaghetti', 'bolognese', 'spag bol', 'pasta sauce',
    'bolognese ingredients', 'spaghetti ingredients', 'recipe',
  ],

  'ireland': [
    'irish', 'ireland', 'irish words', 'gaelic',
    'irish culture', 'emerald isle',
  ],

  // ─── Thematic Categories ──────────────────────────────────────────────

  'Keyboard': [
    'keyboard keys', 'computer keyboard', 'keyboard buttons',
    'keys on a keyboard',
  ],

  'Guitar': [
    'guitar parts', 'guitar terms', 'guitar anatomy',
    'parts of a guitar',
  ],

  'Fishing': [
    'fishing terms', 'angling', 'fishing words',
  ],

  'Drinking': [
    'drinking terms', 'pub', 'bar terms', 'drinks',
  ],

  'drinking alcohol': [
    'drinking', 'alcohol', 'ways to drink', 'drinking words',
    'synonyms for drinking',
  ],

  'Periodic table': [
    'elements', 'chemical elements', 'periodic table elements',
  ],

  'Words That Used To Be Places': [
    'place names', 'eponyms', 'toponyms', 'words from places',
    'words that were places', 'named after places',
  ],
};

/**
 * Build a reverse lookup: alias → canonical theme name.
 * All keys are lowercased for case-insensitive matching.
 */
function buildAliasLookup(): Map<string, string> {
  const lookup = new Map<string, string>();
  for (const [canonical, aliases] of Object.entries(THEME_ALIASES)) {
    for (const alias of aliases) {
      lookup.set(alias.toLowerCase().trim(), canonical);
    }
  }
  return lookup;
}

const ALIAS_LOOKUP = buildAliasLookup();

/**
 * Check if a guess matches any known alias for the given theme.
 * Returns the confidence (100 = alias match) or null if no alias matches.
 * 
 * @example
 *   tryAliasMatch("silent letters", "Words With Silent Letters") → { isMatch: true, confidence: 98 }
 *   tryAliasMatch("ocean", "Words With Silent Letters") → null
 */
export function tryAliasMatch(
  guess: string,
  theme: string
): { isMatch: boolean; confidence: number; alias: string } | null {
  const normalizedGuess = guess.toLowerCase().trim();
  const normalizedTheme = theme.toLowerCase().trim();

  const aliases = THEME_ALIASES[theme] || THEME_ALIASES[
    Object.keys(THEME_ALIASES).find(k => k.toLowerCase() === normalizedTheme) || ''
  ];

  if (!aliases) return null;

  for (const alias of aliases) {
    if (normalizedGuess === alias.toLowerCase().trim()) {
      console.log(`[themeAliases] Alias match: "${guess}" → "${alias}" for theme "${theme}"`);
      return { isMatch: true, confidence: 98, alias };
    }
  }

  return null;
}
