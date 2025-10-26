import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export interface FilterConfig<T> {
  [key: string]: {
    /** URL parameter name */
    param: string;
    /** Optional parser for the URL value */
    parser?: (val: string) => any;
    /** Optional serializer for the filter value */
    serializer?: (val: any) => string;
  };
}

/**
 * Hook for syncing filters with URL query parameters
 *
 * Automatically parses filters from URL and provides functions to
 * update the URL when filters change.
 *
 * @param filterConfig - Configuration mapping filter keys to URL params
 *
 * @example
 * const { parseFromURL, syncToURL } = useURLFilters({
 *   classLevels: {
 *     param: 'classLevels',
 *     parser: (val) => val.split(','),
 *     serializer: (val) => val.join(',')
 *   },
 *   subjects: {
 *     param: 'subjects',
 *     parser: (val) => val.split(',')
 *   }
 * });
 *
 * // Parse from URL on mount
 * useEffect(() => {
 *   const urlFilters = parseFromURL();
 *   setFilters(urlFilters);
 * }, []);
 *
 * // Sync to URL when filters change
 * useEffect(() => {
 *   syncToURL(filters);
 * }, [filters]);
 */
export function useURLFilters<T extends Record<string, any>>(filterConfig: FilterConfig<T>) {
  const location = useLocation();
  const navigate = useNavigate();

  /**
   * Parse filters from current URL query parameters
   */
  const parseFromURL = useCallback(() => {
    const params = new URLSearchParams(location.search);
    const filters = {} as Partial<T>;

    for (const [key, config] of Object.entries(filterConfig)) {
      const value = params.get(config.param);
      if (value) {
        filters[key as keyof T] = config.parser ? config.parser(value) : value.split(',');
      }
    }

    return filters;
  }, [location.search, filterConfig]);

  /**
   * Sync filters to URL query parameters
   */
  const syncToURL = useCallback(
    (filters: Partial<T>, replace: boolean = true) => {
      const params = new URLSearchParams();

      for (const [key, config] of Object.entries(filterConfig)) {
        const value = filters[key as keyof T];

        if (value !== undefined && value !== null) {
          // Handle arrays
          if (Array.isArray(value) && value.length > 0) {
            const serialized = config.serializer ? config.serializer(value) : value.join(',');
            params.set(config.param, serialized);
          }
          // Handle primitives
          else if (!Array.isArray(value) && value !== '') {
            const serialized = config.serializer ? config.serializer(value) : String(value);
            params.set(config.param, serialized);
          }
        }
      }

      const newUrl = params.toString() ? `${location.pathname}?${params.toString()}` : location.pathname;

      navigate(newUrl, { replace });
    },
    [filterConfig, location.pathname, navigate]
  );

  /**
   * Clear all filter parameters from URL
   */
  const clearURL = useCallback(() => {
    navigate(location.pathname, { replace: true });
  }, [location.pathname, navigate]);

  /**
   * Check if URL has any filter parameters
   */
  const hasURLFilters = useCallback(() => {
    const params = new URLSearchParams(location.search);
    return Object.values(filterConfig).some((config) => params.has(config.param));
  }, [location.search, filterConfig]);

  return {
    parseFromURL,
    syncToURL,
    clearURL,
    hasURLFilters,
  };
}
