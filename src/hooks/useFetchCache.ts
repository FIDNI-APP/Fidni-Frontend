import { useRef, useCallback } from 'react';

/**
 * Custom hook for caching fetch results
 *
 * Provides in-memory caching with TTL (time-to-live) to reduce
 * unnecessary API calls for the same data.
 *
 * @param cacheDuration - Cache duration in milliseconds (default: 5 minutes)
 * @returns Object with cache management functions
 *
 * @example
 * const { getCachedData, setCachedData, invalidateCache } = useFetchCache();
 *
 * const fetchData = async () => {
 *   const cacheKey = JSON.stringify(params);
 *   const cached = getCachedData(cacheKey);
 *
 *   if (cached) return cached;
 *
 *   const data = await api.fetch(params);
 *   setCachedData(cacheKey, data);
 *   return data;
 * };
 */
export function useFetchCache(cacheDuration: number = 5 * 60 * 1000) {
  const cache = useRef<Record<string, { data: any; timestamp: number }>>({});

  /**
   * Get cached data if it exists and hasn't expired
   */
  const getCachedData = useCallback((key: string) => {
    const cachedItem = cache.current[key];
    if (cachedItem && Date.now() - cachedItem.timestamp < cacheDuration) {
      return cachedItem.data;
    }
    return null;
  }, [cacheDuration]);

  /**
   * Store data in cache with current timestamp
   */
  const setCachedData = useCallback((key: string, data: any) => {
    cache.current[key] = {
      data,
      timestamp: Date.now(),
    };
  }, []);

  /**
   * Clear all cached data
   */
  const invalidateCache = useCallback(() => {
    cache.current = {};
  }, []);

  /**
   * Remove specific cache entry
   */
  const removeCacheEntry = useCallback((key: string) => {
    delete cache.current[key];
  }, []);

  return { getCachedData, setCachedData, invalidateCache, removeCacheEntry };
}
