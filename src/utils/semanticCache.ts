/**
 * Semantic Similarity Cache
 * Caches API results to avoid repeated expensive calls
 */

interface CacheEntry {
  similarity: number;
  timestamp: number;
  method: string;
}

class SemanticCache {
  private cache = new Map<string, CacheEntry>();
  private readonly TTL = 24 * 60 * 60 * 1000; // 24 hours
  private readonly MAX_SIZE = 1000; // Limit cache size

  /**
   * Generate cache key from two words
   */
  private getCacheKey(word1: string, word2: string): string {
    // Normalize and sort to ensure consistent keys
    const normalized1 = word1.toLowerCase().trim();
    const normalized2 = word2.toLowerCase().trim();
    const sorted = [normalized1, normalized2].sort();
    return `${sorted[0]}:${sorted[1]}`;
  }

  /**
   * Check if cache entry is still valid
   */
  private isValid(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp < this.TTL;
  }

  /**
   * Get cached similarity score
   */
  get(word1: string, word2: string): number | null {
    const key = this.getCacheKey(word1, word2);
    const entry = this.cache.get(key);
    
    if (!entry || !this.isValid(entry)) {
      this.cache.delete(key);
      return null;
    }
    
    console.log(`[SemanticCache] Cache hit: ${word1} → ${word2} = ${entry.similarity}`);
    return entry.similarity;
  }

  /**
   * Store similarity score in cache
   */
  set(word1: string, word2: string, similarity: number, method: string): void {
    const key = this.getCacheKey(word1, word2);
    
    // Evict old entries if cache is full
    if (this.cache.size >= this.MAX_SIZE) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }
    
    this.cache.set(key, {
      similarity,
      timestamp: Date.now(),
      method
    });
    
    console.log(`[SemanticCache] Cached: ${word1} → ${word2} = ${similarity} (${method})`);
  }

  /**
   * Clear expired entries
   */
  cleanup(): void {
    const now = Date.now();
    const entries = Array.from(this.cache.entries());
    for (const [key, entry] of entries) {
      if (now - entry.timestamp > this.TTL) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; hitRate: number; avgAge: number } {
    const now = Date.now();
    let totalAge = 0;
    
    const entries = Array.from(this.cache.values());
    for (const entry of entries) {
      totalAge += now - entry.timestamp;
    }
    
    return {
      size: this.cache.size,
      hitRate: 0, // Would need to track hits vs misses
      avgAge: totalAge / this.cache.size / 1000 // seconds
    };
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }
}

// Global cache instance
const semanticCache = new SemanticCache();

// Cleanup expired entries every 10 minutes
setInterval(() => {
  semanticCache.cleanup();
}, 10 * 60 * 1000);

export default semanticCache; 