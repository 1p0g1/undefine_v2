/**
 * Test suite for Advanced Fuzzy Matching System
 * Demonstrates improvements over legacy character-based matching
 */

import { advancedFuzzyMatch } from './advancedFuzzyMatcher';

// Mock the semantic similarity function for testing
jest.mock('./semanticSimilarity', () => ({
  computeSemanticSimilarity: jest.fn().mockImplementation(async (word1: string, word2: string) => {
    // Mock semantic similarity scores for testing
    const mockSimilarities: Record<string, number> = {
      'happy-joyful': 0.85,
      'sad-melancholy': 0.82,
      'quick-fast': 0.88,
      'big-large': 0.90,
      'small-tiny': 0.87,
      'define-explain': 0.78,
      'define-hello': 0.15,
      'run-sprint': 0.75,
      'walk-stroll': 0.83
    };
    
    const key1 = `${word1}-${word2}`;
    const key2 = `${word2}-${word1}`;
    
    return mockSimilarities[key1] || mockSimilarities[key2] || 0.3;
  })
}));

describe('Advanced Fuzzy Matching System', () => {
  
  describe('Edit Distance (Levenshtein) Matching', () => {
    it('should detect single character typos', async () => {
      const result = await advancedFuzzyMatch('DEFIEN', 'DEFINE');
      expect(result.isFuzzy).toBe(true);
      expect(result.method).toBe('edit_distance');
      expect(result.confidence).toBeGreaterThan(80);
      expect(result.explanation).toContain('1 character change');
    });
    
    it('should detect double character typos', async () => {
      const result = await advancedFuzzyMatch('DEFNIE', 'DEFINE');
      expect(result.isFuzzy).toBe(true);
      expect(result.method).toBe('edit_distance');
      expect(result.confidence).toBeGreaterThan(60);
      expect(result.explanation).toContain('2 character changes');
    });
    
    it('should reject words with too many changes', async () => {
      const result = await advancedFuzzyMatch('XYZABC', 'DEFINE');
      expect(result.isFuzzy).toBe(false);
    });
  });
  
  describe('Keyboard Distance Matching', () => {
    it('should detect adjacent key typos', async () => {
      const result = await advancedFuzzyMatch('DEFUNE', 'DEFINE'); // U instead of I
      expect(result.isFuzzy).toBe(true);
      expect(result.method).toBe('keyboard');
      expect(result.explanation).toContain('Keyboard layout typo');
    });
    
    it('should detect QWERTY layout mistakes', async () => {
      const result = await advancedFuzzyMatch('QRFINE', 'DEFINE'); // Q instead of D
      expect(result.isFuzzy).toBe(true);
      expect(result.method).toBe('keyboard');
    });
  });
  
  describe('Phonetic Matching', () => {
    it('should detect sound-alike words', async () => {
      const result = await advancedFuzzyMatch('NITE', 'NIGHT');
      expect(result.isFuzzy).toBe(true);
      expect(result.method).toBe('phonetic');
      expect(result.confidence).toBe(85);
      expect(result.explanation).toContain('Sounds similar');
    });
    
    it('should match words with different spellings but same sound', async () => {
      const result = await advancedFuzzyMatch('FONE', 'PHONE');
      expect(result.isFuzzy).toBe(true);
      expect(result.method).toBe('phonetic');
    });
  });
  
  describe('Morphological Analysis', () => {
    it('should detect same word stems', async () => {
      const result = await advancedFuzzyMatch('RUNNING', 'RUN');
      expect(result.isFuzzy).toBe(true);
      expect(result.method).toBe('morphological');
      expect(result.confidence).toBe(80);
      expect(result.explanation).toContain('Same word stem');
    });
    
    it('should match words with different suffixes', async () => {
      const result = await advancedFuzzyMatch('QUICKLY', 'QUICK');
      expect(result.isFuzzy).toBe(true);
      expect(result.method).toBe('morphological');
    });
  });
  
  describe('Semantic Similarity', () => {
    it('should detect semantically related words', async () => {
      const result = await advancedFuzzyMatch('HAPPY', 'JOYFUL');
      expect(result.isFuzzy).toBe(true);
      expect(result.method).toBe('semantic');
      expect(result.confidence).toBe(85);
      expect(result.explanation).toContain('Semantically related');
    });
    
    it('should match synonyms', async () => {
      const result = await advancedFuzzyMatch('BIG', 'LARGE');
      expect(result.isFuzzy).toBe(true);
      expect(result.method).toBe('semantic');
      expect(result.confidence).toBe(90);
    });
    
    it('should reject unrelated words', async () => {
      const result = await advancedFuzzyMatch('DEFINE', 'HELLO');
      expect(result.isFuzzy).toBe(false);
    });
  });
  
  describe('Algorithm Priority', () => {
    it('should prefer edit distance over other methods', async () => {
      // A word that could match multiple ways should use edit distance first
      const result = await advancedFuzzyMatch('DEFIN', 'DEFINE');
      expect(result.isFuzzy).toBe(true);
      expect(result.method).toBe('edit_distance');
    });
    
    it('should use keyboard distance when edit distance fails', async () => {
      const result = await advancedFuzzyMatch('DEFUNE', 'DEFINE');
      expect(result.isFuzzy).toBe(true);
      expect(result.method).toBe('keyboard');
    });
    
    it('should fall back to character overlap for edge cases', async () => {
      const result = await advancedFuzzyMatch('DFINEE', 'DEFINE');
      expect(result.isFuzzy).toBe(true);
      expect(result.method).toBe('character_overlap');
    });
  });
  
  describe('Configuration Options', () => {
    it('should respect edit distance threshold', async () => {
      const result = await advancedFuzzyMatch('DEFIEN', 'DEFINE', { 
        editDistanceThreshold: 0 // No typos allowed
      });
      expect(result.isFuzzy).toBe(false);
    });
    
    it('should disable semantic matching when configured', async () => {
      const result = await advancedFuzzyMatch('HAPPY', 'JOYFUL', { 
        enableSemanticMatching: false
      });
      expect(result.isFuzzy).toBe(false);
    });
  });
  
  describe('Edge Cases', () => {
    it('should handle very short words', async () => {
      const result = await advancedFuzzyMatch('A', 'AB');
      expect(result.isFuzzy).toBe(false);
      expect(result.explanation).toContain('too short');
    });
    
    it('should handle very different lengths', async () => {
      const result = await advancedFuzzyMatch('DEFINE', 'EXTRAORDINARY');
      expect(result.isFuzzy).toBe(false);
      expect(result.explanation).toContain('too different in length');
    });
    
    it('should handle empty strings', async () => {
      const result = await advancedFuzzyMatch('', 'DEFINE');
      expect(result.isFuzzy).toBe(false);
    });
  });
  
  describe('Performance Comparison', () => {
    it('should provide detailed explanations', async () => {
      const result = await advancedFuzzyMatch('DEFIEN', 'DEFINE');
      expect(result.explanation).toBeTruthy();
      expect(result.explanation.length).toBeGreaterThan(10);
    });
    
    it('should provide confidence scores', async () => {
      const result = await advancedFuzzyMatch('DEFIEN', 'DEFINE');
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(100);
    });
  });
});

describe('Real-World Examples', () => {
  const testCases = [
    // Typos that old system would miss
    { guess: 'DEFIEN', target: 'DEFINE', expected: true, reason: 'Single character swap' },
    { guess: 'MOVMENT', target: 'MOVEMENT', expected: true, reason: 'Missing character' },
    { guess: 'RECIEVE', target: 'RECEIVE', expected: true, reason: 'Common spelling mistake' },
    
    // Semantic matches old system couldn't detect
    { guess: 'HAPPY', target: 'JOYFUL', expected: true, reason: 'Synonyms' },
    { guess: 'QUICK', target: 'FAST', expected: true, reason: 'Related words' },
    { guess: 'BIG', target: 'LARGE', expected: true, reason: 'Size synonyms' },
    
    // Keyboard typos
    { guess: 'DEFUNE', target: 'DEFINE', expected: true, reason: 'Adjacent key typo' },
    { guess: 'QEFINE', target: 'DEFINE', expected: true, reason: 'Q instead of D' },
    
    // Phonetic matches
    { guess: 'NITE', target: 'NIGHT', expected: true, reason: 'Sounds the same' },
    { guess: 'FONE', target: 'PHONE', expected: true, reason: 'Phonetic spelling' },
    
    // Cases that should NOT match
    { guess: 'HELLO', target: 'DEFINE', expected: false, reason: 'Completely different' },
    { guess: 'XYZABC', target: 'DEFINE', expected: false, reason: 'Random characters' },
    { guess: 'A', target: 'DEFINE', expected: false, reason: 'Too short' },
  ];
  
  testCases.forEach(({ guess, target, expected, reason }) => {
    it(`should ${expected ? 'match' : 'not match'} "${guess}" → "${target}" (${reason})`, async () => {
      const result = await advancedFuzzyMatch(guess, target);
      expect(result.isFuzzy).toBe(expected);
      
      if (expected) {
        expect(result.confidence).toBeGreaterThan(0);
        expect(result.explanation).toBeTruthy();
      }
    });
  });
}); 