/**
 * Algorithmic British→American spelling normalization
 * 
 * Instead of a static lookup table, this uses pattern-based rules
 * to convert British spellings to American equivalents.
 * 
 * This is sustainable because it handles ALL words matching the patterns,
 * not just pre-defined entries.
 */

/**
 * Generate possible American spellings for a word
 * Returns an array of possible variants (including the original)
 */
export function generateAmericanVariants(word: string): string[] {
  const normalized = word.toLowerCase().trim();
  const variants = new Set<string>([normalized]);
  
  // -our → -or (colour → color, honour → honor)
  if (normalized.endsWith('our')) {
    variants.add(normalized.slice(0, -3) + 'or');
  }
  // Also handle -oured → -ored, -ouring → -oring, -ours → -ors
  if (normalized.endsWith('oured')) {
    variants.add(normalized.slice(0, -5) + 'ored');
  }
  if (normalized.endsWith('ouring')) {
    variants.add(normalized.slice(0, -6) + 'oring');
  }
  if (normalized.endsWith('ours')) {
    variants.add(normalized.slice(0, -4) + 'ors');
  }

  // -ise → -ize (realise → realize, organise → organize)
  if (normalized.endsWith('ise')) {
    variants.add(normalized.slice(0, -3) + 'ize');
  }
  if (normalized.endsWith('ised')) {
    variants.add(normalized.slice(0, -4) + 'ized');
  }
  if (normalized.endsWith('ising')) {
    variants.add(normalized.slice(0, -5) + 'izing');
  }
  if (normalized.endsWith('isation')) {
    variants.add(normalized.slice(0, -7) + 'ization');
  }

  // -yse → -yze (analyse → analyze, paralyse → paralyze)
  if (normalized.endsWith('yse')) {
    variants.add(normalized.slice(0, -3) + 'yze');
  }
  if (normalized.endsWith('ysed')) {
    variants.add(normalized.slice(0, -4) + 'yzed');
  }
  if (normalized.endsWith('ysing')) {
    variants.add(normalized.slice(0, -5) + 'yzing');
  }

  // -re → -er (centre → center, theatre → theater)
  // But NOT for words ending in -ere (here, there, where)
  if (normalized.endsWith('re') && !normalized.endsWith('ere')) {
    variants.add(normalized.slice(0, -2) + 'er');
  }
  if (normalized.endsWith('res') && !normalized.endsWith('eres')) {
    variants.add(normalized.slice(0, -3) + 'ers');
  }

  // -ogue → -og (catalogue → catalog, dialogue → dialog)
  if (normalized.endsWith('ogue')) {
    variants.add(normalized.slice(0, -4) + 'og');
  }
  if (normalized.endsWith('ogues')) {
    variants.add(normalized.slice(0, -5) + 'ogs');
  }

  // -ence → -ense (defence → defense, offence → offense)
  if (normalized.endsWith('ence')) {
    variants.add(normalized.slice(0, -4) + 'ense');
  }

  // Double consonants: ll → l (travelling → traveling)
  // Common patterns: -lling → -ling, -lled → -led, -ller → -ler
  if (normalized.endsWith('lling')) {
    variants.add(normalized.slice(0, -5) + 'ling');
  }
  if (normalized.endsWith('lled')) {
    variants.add(normalized.slice(0, -4) + 'led');
  }
  if (normalized.endsWith('ller')) {
    variants.add(normalized.slice(0, -4) + 'ler');
  }
  if (normalized.endsWith('llery')) {
    variants.add(normalized.slice(0, -5) + 'lery');
  }
  if (normalized.endsWith('llous')) {
    variants.add(normalized.slice(0, -5) + 'lous');
  }

  // -ae- → -e- (anaemia → anemia, encyclopaedia → encyclopedia)
  if (normalized.includes('ae')) {
    variants.add(normalized.replace(/ae/g, 'e'));
  }

  // -oe- → -e- (foetus → fetus, oestrogen → estrogen)
  if (normalized.includes('oe')) {
    variants.add(normalized.replace(/oe/g, 'e'));
  }

  // Specific common differences
  const specificMappings: Record<string, string> = {
    'grey': 'gray',
    'tyre': 'tire',
    'tyres': 'tires',
    'kerb': 'curb',
    'kerbs': 'curbs',
    'aluminium': 'aluminum',
    'aeroplane': 'airplane',
    'aeroplanes': 'airplanes',
    'cheque': 'check',
    'cheques': 'checks',
    'draught': 'draft',
    'draughts': 'drafts',
    'gaol': 'jail',
    'gaols': 'jails',
    'mould': 'mold',
    'moulds': 'molds',
    'plough': 'plow',
    'ploughs': 'plows',
    'programme': 'program', // but 'program' for computer context
    'programmes': 'programs',
    'pyjamas': 'pajamas',
    'sceptic': 'skeptic',
    'sceptics': 'skeptics',
    'sceptical': 'skeptical',
    'storey': 'story',
    'storeys': 'stories',
    'sulphur': 'sulfur',
    'whisky': 'whiskey',
    'woollen': 'woolen',
    'yoghurt': 'yogurt',
    'enquiry': 'inquiry',
    'enquiries': 'inquiries',
    'judgement': 'judgment',
    'ageing': 'aging',
    'moustache': 'mustache',
    'omelette': 'omelet',
    'mediaeval': 'medieval',
    'furore': 'furor',
    'manoeuvre': 'maneuver',
    'manoeuvres': 'maneuvers',
    'jewellery': 'jewelry',
  };

  if (specificMappings[normalized]) {
    variants.add(specificMappings[normalized]);
  }

  return Array.from(variants);
}

/**
 * Normalize a word and generate all possible lookup variants
 * This combines basic normalization with British→American conversion
 */
export function generateAllLookupVariants(word: string): string[] {
  // Basic normalization: lowercase, remove diacritics, remove non-alpha
  const normalized = word
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^a-z]/g, ''); // Remove non-alpha (hyphens, apostrophes, etc.)

  // Get American variants of the normalized word
  const variants = generateAmericanVariants(normalized);
  
  return Array.from(new Set(variants));
}

/**
 * Check if a word looks like it might have British spelling
 * Useful for admin dashboard warnings
 */
export function detectPotentialBritishSpelling(word: string): {
  isBritish: boolean;
  pattern?: string;
  suggestedAmerican?: string;
} {
  const normalized = word.toLowerCase().trim();
  
  // Check patterns
  if (normalized.endsWith('our') && !normalized.endsWith('four') && !normalized.endsWith('pour')) {
    return { isBritish: true, pattern: '-our', suggestedAmerican: normalized.slice(0, -3) + 'or' };
  }
  if (normalized.endsWith('ise') && !normalized.endsWith('rise') && !normalized.endsWith('wise')) {
    return { isBritish: true, pattern: '-ise', suggestedAmerican: normalized.slice(0, -3) + 'ize' };
  }
  if (normalized.endsWith('yse')) {
    return { isBritish: true, pattern: '-yse', suggestedAmerican: normalized.slice(0, -3) + 'yze' };
  }
  if (normalized.endsWith('re') && !normalized.endsWith('ere') && !normalized.endsWith('ire') && !normalized.endsWith('ore')) {
    const american = normalized.slice(0, -2) + 'er';
    // Check if it's a common -re word
    const reWords = ['centre', 'theatre', 'metre', 'litre', 'fibre', 'calibre', 'sabre', 'lustre', 'sombre', 'spectre', 'meagre'];
    if (reWords.includes(normalized)) {
      return { isBritish: true, pattern: '-re', suggestedAmerican: american };
    }
  }
  if (normalized.endsWith('ogue')) {
    return { isBritish: true, pattern: '-ogue', suggestedAmerican: normalized.slice(0, -4) + 'og' };
  }
  if (normalized.includes('ae') || normalized.includes('oe')) {
    return { isBritish: true, pattern: 'ae/oe ligature', suggestedAmerican: normalized.replace(/ae/g, 'e').replace(/oe/g, 'e') };
  }
  
  return { isBritish: false };
}

/**
 * Detect potential issues with a word for dictionary lookup
 * Returns warnings for admin dashboard
 */
export function analyzeWordForDictionary(word: string): {
  normalized: string;
  hasSpecialChars: boolean;
  hasDiacritics: boolean;
  potentialBritish: ReturnType<typeof detectPotentialBritishSpelling>;
  variants: string[];
} {
  const original = word.trim();
  const hasSpecialChars = /[^a-zA-Z]/.test(original);
  const hasDiacritics = /[^\x00-\x7F]/.test(original);
  const normalized = original
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z]/g, '');
  
  return {
    normalized,
    hasSpecialChars,
    hasDiacritics,
    potentialBritish: detectPotentialBritishSpelling(original),
    variants: generateAllLookupVariants(original),
  };
}

