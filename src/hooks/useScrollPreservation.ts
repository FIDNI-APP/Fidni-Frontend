import { useRef, useCallback } from 'react';

/**
 * Hook for preserving scroll position across page updates
 *
 * Useful for maintaining scroll position when loading more items
 * or resetting scroll when filters change.
 *
 * @example
 * const { scrollRef, savePosition, restorePosition, resetScroll } = useScrollPreservation();
 *
 * const handleLoadMore = () => {
 *   savePosition();
 *   loadMoreItems();
 * };
 *
 * const handleFilterChange = () => {
 *   resetScroll();
 *   applyFilters();
 * };
 *
 * return <div ref={scrollRef}>...</div>;
 */
export function useScrollPreservation<T extends HTMLElement = HTMLDivElement>() {
  const scrollRef = useRef<T>(null);
  const savedPosition = useRef(0);

  /**
   * Save the current scroll position
   */
  const savePosition = useCallback(() => {
    if (scrollRef.current) {
      savedPosition.current = scrollRef.current.scrollTop;
    }
  }, []);

  /**
   * Restore the previously saved scroll position
   */
  const restorePosition = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = savedPosition.current;
    }
  }, []);

  /**
   * Reset scroll to top
   */
  const resetScroll = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
      savedPosition.current = 0;
    }
  }, []);

  /**
   * Get the current scroll position
   */
  const getCurrentPosition = useCallback(() => {
    return scrollRef.current?.scrollTop ?? 0;
  }, []);

  return {
    scrollRef,
    savePosition,
    restorePosition,
    resetScroll,
    getCurrentPosition,
    savedPosition: savedPosition.current,
  };
}
