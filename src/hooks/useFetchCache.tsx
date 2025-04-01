import { useCallback, useRef } from 'react';

interface CacheItem<T> {
  data: T;
  timestamp: number;
}

interface UseFetchCacheOptions {
  cacheDuration?: number; // Duration in milliseconds
}

export function useFetchCache<T = any>(options: UseFetchCacheOptions = {}) {
  const { cacheDuration = 5 * 60 * 1000 } = options; // Default to 5 minutes
  const cache = useRef<Record<string, CacheItem<T>>>({});
  
  /**
   * Get cached data if available and not expired
   */
  const getCachedData = useCallback((key: string): T | null => {
    const cachedItem = cache.current[key];
    if (cachedItem && Date.now() - cachedItem.timestamp < cacheDuration) {
      return cachedItem.data;
    }
    return null;
  }, [cacheDuration]);
  
  /**
   * Store data in the cache
   */
  const setCachedData = useCallback((key: string, data: T) => {
    cache.current[key] = {
      data,
      timestamp: Date.now(),
    };
  }, []);
  
  /**
   * Remove a specific item from the cache
   */
  const removeCachedData = useCallback((key: string) => {
    if (key in cache.current) {
      delete cache.current[key];
      return true;
    }
    return false;
  }, []);
  
  /**
   * Clear all expired items from cache
   */
  const clearExpiredCache = useCallback(() => {
    const now = Date.now();
    const keysToRemove: string[] = [];
    
    Object.entries(cache.current).forEach(([key, item]) => {
      if (now - item.timestamp > cacheDuration) {
        keysToRemove.push(key);
      }
    });
    
    keysToRemove.forEach(key => {
      delete cache.current[key];
    });
    
    return keysToRemove.length;
  }, [cacheDuration]);
  
  /**
   * Clear entire cache
   */
  const invalidateCache = useCallback(() => {
    const count = Object.keys(cache.current).length;
    cache.current = {};
    return count;
  }, []);
  
  /**
   * Get the current size of the cache
   */
  const getCacheSize = useCallback(() => {
    return Object.keys(cache.current).length;
  }, []);

  return { 
    getCachedData, 
    setCachedData, 
    removeCachedData,
    clearExpiredCache,
    invalidateCache,
    getCacheSize
  };
}