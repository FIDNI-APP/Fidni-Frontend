// src/lib/api/requestManager.ts
import { useState, useEffect } from 'react';

// In-memory request cache
const requestCache = new Map();
const pendingRequests = new Map();

// Request deduplication function
// Define interfaces for cache and request handling
interface CacheEntry<T> {
    data: T;
    timestamp: number;
}

interface PendingRequest<T> {
    promise: Promise<T>;
}

export async function dedupedRequest<T>(
    key: string, 
    requestFn: () => Promise<T>
): Promise<T> {
    // Return cached data if available and not expired
    if (requestCache.has(key)) {
        const { data, timestamp } = requestCache.get(key) as CacheEntry<T>;
        const isExpired = Date.now() - timestamp > 5 * 60 * 1000; // 5 minutes
        
        if (!isExpired) return data;
    }
    
    // If request is in progress, wait for it to complete
    if (pendingRequests.has(key)) {
        return pendingRequests.get(key) as Promise<T>;
    }
    
    // Make the request and store the promise
    const promise = requestFn().then(result => {
        // Cache the result
        requestCache.set(key, { 
            data: result, 
            timestamp: Date.now() 
        });
        // Remove from pending requests
        pendingRequests.delete(key);
        return result;
    });
    
    pendingRequests.set(key, promise);
    return promise;
}

// React hook for data fetching with automatic deduplication
interface QueryResult<T> {
    data: T | null;
    isLoading: boolean;
    error: Error | null;
}

export function useDedupedQuery<T>(
    key: string,
    queryFn: () => Promise<T>,
    dependencies: any[] = []
): QueryResult<T> {
    const [data, setData] = useState<T | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<Error | null>(null);
    
    useEffect(() => {
        let isMounted = true;
        setIsLoading(true);
        
        dedupedRequest(key, queryFn)
            .then(result => {
                if (isMounted) {
                    setData(result);
                    setIsLoading(false);
                }
            })
            .catch(err => {
                if (isMounted) {
                    setError(err);
                    setIsLoading(false);
                }
            });
        
        return () => {
            isMounted = false;
        };
    }, dependencies);
    
    return { data, isLoading, error };
}

// Invalidate cache entries (use after mutations)
interface QueryInvalidationPattern {
    keyPattern: string;
}

export function invalidateQueries(keyPattern: string): void {
    for (const key of requestCache.keys()) {
        if (key.includes(keyPattern)) {
            requestCache.delete(key);
        }
    }
}