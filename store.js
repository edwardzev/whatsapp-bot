// Cache Time-to-Live (TTL) in milliseconds
export const cacheTTL = 10 * 60 * 1000; // 10 minutes

// In-memory cache store (temporary data storage)
export const cache = {};

// In-memory state store per chat
// This holds temporary conversation states per chat
// If persistence is required, use a database instead
export const state = {};

// In-memory statistics store for message counters per chat
export const stats = {};

/**
 * Cleanup function to clear expired cache entries
 */
export function cleanupCache() {
  const now = Date.now();
  Object.keys(cache).forEach((key) => {
    if (cache[key].time && now - cache[key].time > cacheTTL) {
      delete cache[key];
    }
  });
}

/**
 * Schedule cache cleanup every 10 minutes
 */
setInterval(cleanupCache, cacheTTL);
