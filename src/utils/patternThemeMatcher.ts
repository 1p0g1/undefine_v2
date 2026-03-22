/**
 * Pattern Theme Matcher
 * =====================
 * 
 * Handles structural/pattern themes where the connection between words
 * is a morphological pattern (compound words, affixes, hidden words)
 * rather than a semantic concept.
 * 
 * Theme types detected automatically from theme text:
 * 
 *   "____fish"              → SUFFIX     (catfish, sunfish, dogfish)
 *   "re____"                → PREFIX     (rewind, rebuild, return)
 *   "pro-words"             → PREFIX     (tract→protract, cure→procure)
 *   "word contains [X]"     → CONTAINS   (hidden word inside each word)
 *   "Words With Hidden [X]" → CONTAINS   (same pattern, alternate phrasing)
 *   "[word]-"               → HYPHENATED (words form hyphenated compounds)
 *   "self-[word]"           → HYPHENATED (self-aware, self-made, etc.)
 * 
 * For pattern themes, matching is RULE-BASED (no API calls, instant):
 *   - Core word extraction + normalisation
 *   - Flexible phrase matching (synonymous ways of describing the pattern)
 *   - Confidence scoring based on match specificity
 * 
 * For non-pattern themes, returns null → caller falls through to semantic scoring.
 * 
 * @see src/game/theme.ts for integration point
 * @see docs/THEME_SCORING_IMPROVEMENT_PLAN.md for design decisions
 */

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type PatternType = 'suffix' | 'prefix' | 'contains' | 'hidden' | 'hyphenated';

export interface DetectedPattern {
  type: PatternType;
  coreWord: string;
  originalTheme: string;
}

export interface PatternMatchResult {
  isMatch: boolean;
  confidence: number;       // 0-100
  matchReason: string;       // human-readable explanation
  patternType: PatternType;
  coreWord: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// PATTERN DETECTION
// ─────────────────────────────────────────────────────────────────────────────

const UNDERSCORE_SUFFIX_RE = /^[_*]+\s*(.+)$/;       // "____fish"  → fish
const UNDERSCORE_PREFIX_RE = /^(.+?)\s*[_*]+$/;       // "fish____"  → fish
const DASH_SUFFIX_RE       = /^-\s*(.+)$/;            // "-fish"     → fish
const DASH_PREFIX_RE       = /^(.+?)\s*-$/;           // "re-"       → re

// "[prefix]-words" convention: "pro-words", "sub-words", "para-words"
const PREFIX_WORDS_RE      = /^([a-z]{2,6})-words?$/i;

// Hyphenated word patterns
const HYPHEN_PREFIX_RE     = /^(.+?)-\[?word\]?$/i;   // "self-[word]"  → self
const HYPHEN_SUFFIX_RE     = /^\[?word\]?-(.+)$/i;    // "[word]-proof" → proof
const HYPHEN_GENERIC_RE    = /^\[?word\]?\s*-\s*$/i;  // "[word]-"      → generic hyphenated
const HYPHENATED_WORDS_RE  = /^hyphenated\s+words?$/i; // "hyphenated words"

const CONTAINS_PHRASES = [
  /\bword\s+contains?\s+(.+)/i,                       // "word contains vegetable"
  /\bcontains?\s+(?:a\s+)?hidden\s+(.+)/i,            // "contains hidden animal"
  /\bwords?\s+with\s+hidden\s+(.+)/i,                 // "Words With Hidden Animals"
  /\bhidden\s+(.+?)(?:\s+inside\b|\s+in\s+each\b)/i,  // "hidden animals inside" (greedy only with trailing anchor)
  /\bhidden\s+(\S+)/i,                                 // "hidden animals" (single word after hidden)
];

/**
 * Detect whether a theme string represents a structural pattern.
 * Returns null if the theme is a standard semantic theme.
 */
export function detectThemePattern(theme: string): DetectedPattern | null {
  const trimmed = theme.trim();

  // 1. Underscore/asterisk suffix: "____fish", "***fish"
  const suffixMatch = trimmed.match(UNDERSCORE_SUFFIX_RE);
  if (suffixMatch) {
    return { type: 'suffix', coreWord: suffixMatch[1].trim().toLowerCase(), originalTheme: trimmed };
  }

  // 2. Underscore/asterisk prefix: "re____", "un***"
  const prefixMatch = trimmed.match(UNDERSCORE_PREFIX_RE);
  if (prefixMatch) {
    return { type: 'prefix', coreWord: prefixMatch[1].trim().toLowerCase(), originalTheme: trimmed };
  }

  // 3. Dash suffix: "-fish"
  const dashSuffixMatch = trimmed.match(DASH_SUFFIX_RE);
  if (dashSuffixMatch) {
    return { type: 'suffix', coreWord: dashSuffixMatch[1].trim().toLowerCase(), originalTheme: trimmed };
  }

  // 4. Dash prefix: "re-"
  const dashPrefixMatch = trimmed.match(DASH_PREFIX_RE);
  if (dashPrefixMatch) {
    return { type: 'prefix', coreWord: dashPrefixMatch[1].trim().toLowerCase(), originalTheme: trimmed };
  }

  // 5. "[prefix]-words" convention: "pro-words" → prefix:pro, "sub-words" → prefix:sub
  const prefixWordsMatch = trimmed.match(PREFIX_WORDS_RE);
  if (prefixWordsMatch) {
    return { type: 'prefix', coreWord: prefixWordsMatch[1].trim().toLowerCase(), originalTheme: trimmed };
  }

  // 6. Hyphenated word patterns
  // "self-[word]" or "self-____" → hyphenated prefix
  const hyphenPrefixMatch = trimmed.match(HYPHEN_PREFIX_RE);
  if (hyphenPrefixMatch) {
    return { type: 'hyphenated', coreWord: hyphenPrefixMatch[1].trim().toLowerCase(), originalTheme: trimmed };
  }
  // "[word]-proof" → hyphenated suffix
  const hyphenSuffixMatch = trimmed.match(HYPHEN_SUFFIX_RE);
  if (hyphenSuffixMatch) {
    return { type: 'hyphenated', coreWord: hyphenSuffixMatch[1].trim().toLowerCase(), originalTheme: trimmed };
  }
  // "[word]-" or "hyphenated words" → generic hyphenated
  if (HYPHEN_GENERIC_RE.test(trimmed) || HYPHENATED_WORDS_RE.test(trimmed)) {
    return { type: 'hyphenated', coreWord: 'hyphenated', originalTheme: trimmed };
  }

  // 7. Contains/hidden phrasing
  for (const re of CONTAINS_PHRASES) {
    const containsMatch = trimmed.match(re);
    if (containsMatch) {
      return { type: 'contains', coreWord: containsMatch[1].trim().toLowerCase(), originalTheme: trimmed };
    }
  }

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// PATTERN MATCHING
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Normalise a guess for comparison: lowercase, trim, collapse whitespace,
 * strip common filler words that don't change meaning.
 */
function normaliseGuess(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .replace(/['']/g, "'")
    .replace(/\s+/g, ' ');
}

/**
 * Check whether a guess matches a detected pattern theme.
 * Returns a PatternMatchResult with confidence and reasoning.
 */
export function matchPatternTheme(
  guess: string,
  pattern: DetectedPattern
): PatternMatchResult {
  const norm = normaliseGuess(guess);
  const core = pattern.coreWord;

  // ── 1. Exact pattern notation match (highest confidence) ──────────────
  if (matchesPatternNotation(norm, pattern)) {
    return hit(100, `Exact pattern notation match`, pattern);
  }

  // ── 1b. Exact theme label match (e.g. guess "pro-words" for theme "pro-words")
  if (norm === pattern.originalTheme.toLowerCase()) {
    return hit(100, `Exact theme label match`, pattern);
  }

  // ── 2. Core word only ("fish") ────────────────────────────────────────
  if (norm === core || norm === core + 's' || norm + 's' === core) {
    return hit(95, `Core word match: "${core}"`, pattern);
  }

  // ── 3. Relationship phrases ───────────────────────────────────────────
  const phraseResult = matchRelationshipPhrase(norm, pattern);
  if (phraseResult) {
    return phraseResult;
  }

  // ── 4. Contains core word in a descriptive context ────────────────────
  if (norm.includes(core) && norm.split(' ').length >= 2) {
    const contextWords = norm.split(' ').filter(w => w !== core && w.length > 2);
    const hasDescriptiveContext = contextWords.some(w =>
      DESCRIPTIVE_CONTEXT_WORDS.has(w)
    );
    // Reject phrases that describe a CATEGORY rather than the PATTERN
    // e.g. "types of fish" describes a topic, not a compound-word pattern
    const hasCategoryContext = contextWords.some(w =>
      CATEGORY_CONTEXT_WORDS.has(w)
    );
    if (hasCategoryContext && !hasDescriptiveContext) {
      return {
        isMatch: false,
        confidence: 0,
        matchReason: `"${guess}" describes a category, not the pattern`,
        patternType: pattern.type,
        coreWord: core,
      };
    }
    if (hasDescriptiveContext) {
      return hit(80, `Descriptive phrase containing "${core}"`, pattern);
    }
    return hit(60, `Contains core word "${core}" with context`, pattern);
  }

  // ── 5. Pluralised or derived form of core word ────────────────────────
  if (isDerivation(norm, core)) {
    return hit(85, `Derived form of core word "${core}"`, pattern);
  }

  // ── No match ──────────────────────────────────────────────────────────
  return {
    isMatch: false,
    confidence: 0,
    matchReason: `No pattern match for "${guess}" against ${pattern.type}:${core}`,
    patternType: pattern.type,
    coreWord: core,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function hit(confidence: number, reason: string, pattern: DetectedPattern): PatternMatchResult {
  return {
    isMatch: true,
    confidence,
    matchReason: reason,
    patternType: pattern.type,
    coreWord: pattern.coreWord,
  };
}

/**
 * Words that indicate the user is DESCRIBING a pattern, not just naming a topic.
 */
/**
 * Words that indicate a CATEGORY description (topic-based, not pattern-based).
 * "types of fish" is about fish as a topic, NOT the "____fish" compound word pattern.
 */
const CATEGORY_CONTEXT_WORDS = new Set([
  'types', 'type', 'kinds', 'kind', 'species', 'varieties', 'variety',
  'examples', 'example', 'related', 'about', 'associated',
  'category', 'categories', 'group', 'groups', 'family', 'families',
  'list', 'collection',
]);

const DESCRIPTIVE_CONTEXT_WORDS = new Set([
  'compound', 'words', 'word', 'add', 'added', 'adding',
  'end', 'ends', 'ending', 'start', 'starts', 'starting',
  'begin', 'begins', 'beginning', 'precede', 'precedes', 'preceding',
  'follow', 'follows', 'following', 'suffix', 'prefix', 'affix',
  'contain', 'contains', 'containing', 'hidden', 'inside', 'within',
  'combine', 'combined', 'combining', 'attached', 'appended',
  'before', 'after', 'front', 'back',
  'become', 'becomes', 'form', 'forms', 'create', 'creates',
  'prefixed', 'prefixable', 'prepend', 'prepended',
]);

/**
 * Does the guess use a direct pattern notation (underscores, dashes, asterisks)?
 */
function matchesPatternNotation(norm: string, pattern: DetectedPattern): boolean {
  const core = pattern.coreWord;

  if (pattern.type === 'suffix') {
    return /^[_*-]+/.test(norm) && norm.endsWith(core);
  }
  if (pattern.type === 'prefix') {
    return /[_*-]+$/.test(norm) && norm.startsWith(core);
  }
  if (pattern.type === 'hyphenated') {
    if (core === 'hyphenated') {
      return /^(?:\[?word\]?\s*-|hyphenated)/.test(norm);
    }
    return norm.includes(core) && norm.includes('-');
  }
  return false;
}

/**
 * Match relationship phrases like "ends in fish", "can add fish", "precede fish".
 */
function matchRelationshipPhrase(
  norm: string,
  pattern: DetectedPattern
): PatternMatchResult | null {
  const core = pattern.coreWord;

  // Build phrase patterns based on type
  const phrases: Array<{ re: RegExp; confidence: number; reason: string }> = [];

  if (pattern.type === 'suffix') {
    phrases.push(
      { re: re(`end(?:s|ing)? (?:in|with) ${core}`), confidence: 95, reason: `"ends in/with ${core}"` },
      { re: re(`can (?:add|append|attach) ${core}`), confidence: 90, reason: `"can add ${core}"` },
      { re: re(`(?:add|append|attach|put) ${core} (?:to |at )?(?:the )?end`), confidence: 90, reason: `"add ${core} to the end"` },
      { re: re(`(?:go|goes|pair|pairs|combine|combines) with ${core}`), confidence: 90, reason: `"goes with ${core}"` },
      { re: re(`(?:precede|precedes|come|comes) before ${core}`), confidence: 90, reason: `"precedes ${core}"` },
      { re: re(`precede(?:s)? ${core}`), confidence: 90, reason: `"precede ${core}"` },
      { re: re(`(?:followed|follow) by ${core}`), confidence: 90, reason: `"followed by ${core}"` },
      { re: re(`${core} (?:suffix|at the end|after|follows)`), confidence: 85, reason: `"${core} suffix"` },
      { re: re(`compound (?:words? )?(?:with |ending (?:in |with )?)${core}`), confidence: 90, reason: `"compound words with ${core}"` },
      { re: re(`words? ending (?:in |with )${core}`), confidence: 90, reason: `"words ending in ${core}"` },
      { re: re(`words? (?:that )?(?:can )?(?:have |get )${core} (?:added|appended)`), confidence: 90, reason: `"words that can have ${core} added"` },
      { re: re(`blank ${core}`), confidence: 85, reason: `"blank ${core}"` },
      { re: re(`something ${core}`), confidence: 80, reason: `"something ${core}"` },
    );
  }

  if (pattern.type === 'prefix') {
    phrases.push(
      { re: re(`(?:start|begin)(?:s|ning)? with ${core}`), confidence: 95, reason: `"starts with ${core}"` },
      { re: re(`${core} (?:prefix|at the (?:start|beginning)|before)`), confidence: 85, reason: `"${core} prefix"` },
      { re: re(`can (?:add|prepend|attach) ${core}`), confidence: 90, reason: `"can add ${core}"` },
      { re: re(`(?:add|prepend|put) ${core} (?:to |at )?(?:the )?(?:start|beginning|front)`), confidence: 90, reason: `"add ${core} to the start"` },
      { re: re(`words? (?:starting|beginning) with ${core}`), confidence: 90, reason: `"words starting with ${core}"` },
      { re: re(`${core} (?:followed by |before |precedes? )`), confidence: 85, reason: `"${core} followed by..."` },
      { re: re(`${core} blank`), confidence: 85, reason: `"${core} blank"` },
      { re: re(`${core} something`), confidence: 80, reason: `"${core} something"` },
      { re: re(`(?:become|form|create|make)s? (?:new |other )?words? (?:with |when (?:you )?(?:add|prefix) )${core}`), confidence: 92, reason: `"become new words with ${core}"` },
      { re: re(`words? that (?:become|form|create|make) (?:new |other )?words? (?:with |when (?:prefixed|you add) )${core}`), confidence: 92, reason: `"words that become new words with ${core}"` },
      { re: re(`${core} (?:can be )?(?:added|prefixed|attached) (?:to )?(?:make|form|create)`), confidence: 88, reason: `"${core} added to make..."` },
      { re: re(`prefix(?:able|ed)? (?:with )?${core}`), confidence: 90, reason: `"prefixed with ${core}"` },
      { re: re(`${core} prefix(?:able|ed)?`), confidence: 88, reason: `"${core} prefixable"` },
      { re: re(`(?:add|put|stick) ${core} (?:in |on |to )?(?:the )?front`), confidence: 90, reason: `"add ${core} to the front"` },
    );
  }

  if (pattern.type === 'contains' || pattern.type === 'hidden') {
    phrases.push(
      { re: re(`(?:contain|contains|containing) (?:a |the )?${core}`), confidence: 95, reason: `"contains ${core}"` },
      { re: re(`hidden ${core}`), confidence: 95, reason: `"hidden ${core}"` },
      { re: re(`${core} (?:hidden |inside |within |in (?:each |the |every )?word)`), confidence: 90, reason: `"${core} hidden in word"` },
      { re: re(`(?:has|have) (?:a )?${core} (?:inside|within|in them)`), confidence: 90, reason: `"has ${core} inside"` },
      { re: re(`${core} (?:is |are )?(?:embedded|buried|concealed)`), confidence: 85, reason: `"${core} embedded"` },
      { re: re(`words? with (?:a )?${core} in (?:them|it)`), confidence: 90, reason: `"words with ${core} in them"` },
    );
  }

  if (pattern.type === 'hyphenated') {
    if (core === 'hyphenated') {
      phrases.push(
        { re: re(`hyphenated`), confidence: 95, reason: `"hyphenated words"` },
        { re: re(`words? with (?:a )?hyphen`), confidence: 95, reason: `"words with a hyphen"` },
        { re: re(`compound.?hyphen`), confidence: 90, reason: `"compound-hyphenated"` },
        { re: re(`hyphen.?compound`), confidence: 90, reason: `"hyphen compound"` },
        { re: re(`words? (?:joined|connected|linked) (?:by |with )?(?:a )?(?:hyphen|dash)`), confidence: 90, reason: `"words joined by hyphen"` },
        { re: re(`two.?part words?`), confidence: 80, reason: `"two-part words"` },
        { re: re(`dash(?:ed)? words?`), confidence: 85, reason: `"dashed words"` },
        { re: re(`words? with (?:a )?dash`), confidence: 85, reason: `"words with a dash"` },
      );
    } else {
      phrases.push(
        { re: re(`(?:start|begin)(?:s|ning)? with ${core}`), confidence: 90, reason: `"starts with ${core}-"` },
        { re: re(`end(?:s|ing)? (?:in|with) ${core}`), confidence: 90, reason: `"ends with -${core}"` },
        { re: re(`${core}.?(?:hyphen|dash|prefix)`), confidence: 90, reason: `"${core}- prefix"` },
        { re: re(`(?:hyphen|dash|prefix).?${core}`), confidence: 90, reason: `"hyphen-${core}"` },
        { re: re(`${core} words?`), confidence: 85, reason: `"${core} words"` },
        { re: re(`words? (?:starting|beginning) with ${core}`), confidence: 90, reason: `"words starting with ${core}"` },
        { re: re(`words? ending (?:in|with) ${core}`), confidence: 90, reason: `"words ending in ${core}"` },
      );
    }
  }

  for (const { re: pattern_re, confidence, reason } of phrases) {
    if (pattern_re.test(norm)) {
      return hit(confidence, reason, pattern);
    }
  }

  return null;
}

/**
 * Check if `guess` is a simple derivation of `core` (plural, -ing, -ed, etc.)
 */
function isDerivation(guess: string, core: string): boolean {
  const derivations = [
    core + 'es',
    core + 'ed',
    core + 'ing',
    core + 'er',
    core + 'ers',
    core + 'ish',
    core + 'y',
    core + 'like',
  ];
  return derivations.includes(guess);
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function re(pattern: string): RegExp {
  return new RegExp(pattern, 'i');
}

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC API: One-shot check
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Attempt to match a guess against a theme using pattern detection.
 * 
 * Returns PatternMatchResult if the theme is a pattern theme (regardless of match).
 * Returns null if the theme is NOT a pattern theme → caller should fall through
 * to semantic scoring.
 * 
 * @example
 *   tryPatternMatch("fish", "____fish")       → { isMatch: true, confidence: 95 }
 *   tryPatternMatch("ends in fish", "____fish") → { isMatch: true, confidence: 95 }
 *   tryPatternMatch("ocean", "____fish")        → { isMatch: false, confidence: 0 }
 *   tryPatternMatch("fish", "Shakespeare")      → null  (not a pattern theme)
 */
export function tryPatternMatch(guess: string, theme: string): PatternMatchResult | null {
  const pattern = detectThemePattern(theme);
  if (!pattern) return null;

  console.log(`[patternThemeMatcher] Detected ${pattern.type} pattern: core="${pattern.coreWord}" from theme="${theme}"`);
  const result = matchPatternTheme(guess, pattern);
  console.log(`[patternThemeMatcher] "${guess}" → ${result.isMatch ? 'MATCH' : 'NO MATCH'} (${result.confidence}%) - ${result.matchReason}`);

  return result;
}
