// ─── Section-Level MJML Cache ────────────────────────────────────────────────
// LRU-style cache for previously compiled MJML sections.
// Reduces redundant AI calls and compilation for unchanged sections.

const MAX_CACHE_SIZE = 50;

interface CacheEntry {
  sectionMjml: string;
  compiledHtml: string;
  timestamp: number;
}

class SectionCache {
  private cache = new Map<string, CacheEntry>();

  /**
   * Simple hash function for MJML content.
   */
  private hash(content: string): string {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0; // Convert to 32bit integer
    }
    return hash.toString(36);
  }

  /**
   * Get cached compiled HTML for a section.
   */
  get(sectionMjml: string): string | null {
    const key = this.hash(sectionMjml);
    const entry = this.cache.get(key);
    if (entry) {
      // Move to end (most recently used)
      this.cache.delete(key);
      this.cache.set(key, { ...entry, timestamp: Date.now() });
      return entry.compiledHtml;
    }
    return null;
  }

  /**
   * Cache a compiled section.
   */
  set(sectionMjml: string, compiledHtml: string): void {
    const key = this.hash(sectionMjml);

    // Evict oldest if at capacity
    if (this.cache.size >= MAX_CACHE_SIZE) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      sectionMjml,
      compiledHtml,
      timestamp: Date.now(),
    });
  }

  /**
   * Check if a section is cached.
   */
  has(sectionMjml: string): boolean {
    return this.cache.has(this.hash(sectionMjml));
  }

  /**
   * Clear all cached sections.
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache size.
   */
  get size(): number {
    return this.cache.size;
  }
}

// Singleton instance
export const sectionCache = new SectionCache();
