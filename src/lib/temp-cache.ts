/**
 * Temporary Encrypted File Cache for Vercel
 * Stores encrypted files temporarily (15 minutes) for cross-request access
 * This helps when the persistent store is empty due to serverless scaling
 */

interface CachedFile {
  encryptedData: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  expiresAt: number;
  createdAt: number;
}

// In-memory cache - global for the server instance lifetime
const tempCache = new Map<string, CachedFile>();

const CACHE_TTL = 15 * 60 * 1000; // 15 minutes in milliseconds

/**
 * Store encrypted file in temporary cache
 */
export function cacheFile(fileId: string, file: CachedFile): void {
  file.expiresAt = Date.now() + CACHE_TTL;
  tempCache.set(fileId, file);
  console.log(`[TempCache] Cached file: ${fileId} (expires in ${CACHE_TTL / 1000}s)`);
}

/**
 * Retrieve from temporary cache
 */
export function getCachedFile(fileId: string): CachedFile | null {
  const file = tempCache.get(fileId);
  
  if (!file) {
    console.log(`[TempCache] Cache miss for ${fileId}`);
    return null;
  }

  // Check expiry
  if (Date.now() > file.expiresAt) {
    console.log(`[TempCache] Cached file expired: ${fileId}`);
    tempCache.delete(fileId);
    return null;
  }

  console.log(`[TempCache] Cache hit for ${fileId}`);
  return file;
}

/**
 * Clear expired entries
 */
export function cleanupExpiredCache(): void {
  let cleaned = 0;
  for (const [fileId, file] of tempCache.entries()) {
    if (Date.now() > file.expiresAt) {
      tempCache.delete(fileId);
      cleaned++;
    }
  }
  if (cleaned > 0) {
    console.log(`[TempCache] Cleaned up ${cleaned} expired entries`);
  }
}

/**
 * Clear all cache
 */
export function clearCache(): void {
  tempCache.clear();
  console.log(`[TempCache] Cleared all cache`);
}

/**
 * Get cache stats
 */
export function getCacheStats(): { size: number; keys: string[] } {
  return {
    size: tempCache.size,
    keys: Array.from(tempCache.keys()),
  };
}
