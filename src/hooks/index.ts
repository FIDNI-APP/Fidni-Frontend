/**
 * Custom Hooks - Centralized exports
 *
 * These hooks simplify complex components by extracting common logic
 */

// ============ UNIFIED CONTENT HOOKS (New - Recommended) ============
export { useContentDetail } from './useContentDetail';
export { useContentTimeTracker } from './useContentTimeTracker';

// ============ LEGACY CONTENT HOOKS (For specific use cases) ============
export { useContentActions } from './useContentActions';
export { useContentUI } from './useContentUI';
export { useContentData } from './useContentData';
export { useContentLoader } from './content/useContentLoader';
export { useCommentManagement } from './content/useCommentManagement';
export { useSolutionManagement } from './content/useSolutionManagement';
export { useContentVoting } from './useContentVoting';
export { useContentProgress } from './useContentProgress';

// ============ UI CONTROL HOOKS ============
export { useUIControls } from './useUIControls';
export { useSessionHistory } from './useSessionHistory';

// ============ TIME TRACKING HOOKS ============
export { useAdvancedTimeTracker } from './useAdvancedTimeTracker';

// ============ UTILITY HOOKS ============
export { useDebounce } from './useDebounce';
export { useFetchCache } from './useFetchCache';
export { useAsyncState } from './useAsyncState';
export { useScrollPreservation } from './useScrollPreservation';
export { useOptimisticUpdate } from './useOptimisticUpdate';
export { useURLFilters } from './useURLFilters';

// ============ TYPE EXPORTS ============
export type { UseContentActionsProps } from './useContentActions';
export type { UseContentUIProps } from './useContentUI';
export type { UseContentDataProps } from './useContentData';
export type { AsyncState, UseAsyncStateReturn } from './useAsyncState';
export type { FilterConfig } from './useURLFilters';
