/**
 * Enhanced Content API Factory
 *
 * Provides a unified, type-safe API interface for all content types
 * (exercises, exams, lessons) to eliminate code duplication.
 */

import { api } from './apiClient';
import { Difficulty, SortOption } from '@/types';

export type VoteValue = 1 | -1 | 0;
export type ProgressStatus = 'success' | 'review';
export type ContentType = 'exercise' | 'exam' | 'lesson';

/**
 * Base query parameters shared across all content types
 */
export interface BaseContentQueryParams {
  classLevels?: string[];
  subjects?: string[];
  chapters?: string[];
  difficulties?: Difficulty[];
  subfields?: string[];
  theorems?: string[];
  sort?: SortOption | string;
  page?: number;
  per_page?: number;
  search?: string;
}

/**
 * Response structure for paginated content lists
 */
export interface ContentListResponse<T> {
  results: T[];
  count: number;
  next: string | null;
  previous: string | null;
}

/**
 * Configuration for creating a content API instance
 */
export interface ContentAPIConfig {
  /** Plural resource path (e.g., 'exercises', 'exams', 'lessons') */
  resourcePath: string;
  /** Singular resource name (e.g., 'exercise', 'exam', 'lesson') */
  resourceName: string;
}

/**
 * Factory function to create a complete API interface for any content type
 *
 * This eliminates duplicate API code across exercises, exams, and lessons
 * by providing a single source of truth for all common operations.
 *
 * @example
 * ```ts
 * const exerciseAPI = createContentAPI({
 *   resourcePath: 'exercises',
 *   resourceName: 'exercise'
 * });
 *
 * // Use anywhere:
 * await exerciseAPI.getById('123');
 * await exerciseAPI.vote('123', 1);
 * await exerciseAPI.markProgress('123', 'success');
 * ```
 */
export function createContentAPI<T = any>(config: ContentAPIConfig) {
  const { resourcePath, resourceName } = config;

  return {
    // ============ LIST & RETRIEVE ============

    /**
     * Get paginated list of content with optional filters
     */
    getList: async (params: BaseContentQueryParams): Promise<ContentListResponse<T>> => {
      const queryParams: Record<string, any> = {
        class_levels: params.classLevels,
        subjects: params.subjects,
        chapters: params.chapters,
        difficulties: params.difficulties,
        subfields: params.subfields,
        theorems: params.theorems,
        sort: params.sort,
        page: params.page,
        per_page: params.per_page,
        search: params.search,
      };

      const response = await api.get(`/${resourcePath}/`, { params: queryParams });

      return {
        results: response.data.results || [],
        count: response.data.count || 0,
        next: response.data.next,
        previous: response.data.previous,
      };
    },

    /**
     * Get single content item by ID
     */
    getById: async (id: string): Promise<T> => {
      const response = await api.get(`/${resourcePath}/${id}/`);
      return response.data;
    },

    // ============ CREATE, UPDATE, DELETE ============

    /**
     * Create new content
     */
    create: async (data: Record<string, any>): Promise<T> => {
      const response = await api.post(`/${resourcePath}/`, data);
      return response.data;
    },

    /**
     * Update existing content
     */
    update: async (id: string, data: Record<string, any>): Promise<T> => {
      const response = await api.put(`/${resourcePath}/${id}/`, data);
      return response.data;
    },

    /**
     * Delete content
     */
    delete: async (id: string): Promise<void> => {
      await api.delete(`/${resourcePath}/${id}/`);
    },

    // ============ VOTING ============

    /**
     * Vote on content (upvote, downvote, or remove vote)
     */
    vote: async (id: string, value: VoteValue): Promise<T> => {
      try {
        const response = await api.post(`/${resourcePath}/${id}/vote/`, { value });
        return response.data.item;
      } catch (error) {
        console.error(`Vote error on ${resourceName}:`, error);
        throw error;
      }
    },

    // ============ PROGRESS TRACKING ============

    /**
     * Mark content as completed (success) or needs review
     */
    markProgress: async (id: string, status: ProgressStatus) => {
      const response = await api.post(`/${resourcePath}/${id}/mark_progress/`, { status });
      return response.data;
    },

    /**
     * Remove progress marker from content
     */
    removeProgress: async (id: string): Promise<void> => {
      await api.delete(`/${resourcePath}/${id}/remove_progress/`);
    },

    /**
     * Mark content as viewed (for analytics)
     */
    markViewed: async (id: string) => {
      const response = await api.post(`/${resourcePath}/${id}/view/`);
      return response.data;
    },

    // ============ SAVE FOR LATER ============

    /**
     * Save content for later review
     */
    save: async (id: string) => {
      const response = await api.post(`/${resourcePath}/${id}/save_${resourceName}/`);
      return response.data;
    },

    /**
     * Remove content from saved items
     */
    unsave: async (id: string): Promise<void> => {
      await api.delete(`/${resourcePath}/${id}/unsave_${resourceName}/`);
    },

    // ============ COMMENTS ============

    /**
     * Add a comment to content
     */
    addComment: async (id: string, content: string, parentId?: string) => {
      const response = await api.post(`/${resourcePath}/${id}/comment/`, {
        content,
        parent: parentId,
      });
      return response.data;
    },

    // ============ TIME TRACKING ============

    /**
     * Save time spent on content
     */
    saveTimeSpent: async (id: string, timeSeconds: number) => {
      try {
        const response = await api.post(`/${resourcePath}/${id}/save_time_spent/`, {
          time_spent: timeSeconds,
        });
        return response.data;
      } catch (error) {
        console.error(`Error saving time spent on ${resourceName}:`, error);
        throw error;
      }
    },

    /**
     * Get total time spent on content
     */
    getTimeSpent: async (id: string) => {
      try {
        const response = await api.get(`/${resourcePath}/${id}/get_time_spent/`);
        return response.data;
      } catch (error) {
        console.error(`Error getting time spent on ${resourceName}:`, error);
        throw error;
      }
    },

    // ============ SESSION MANAGEMENT ============

    /**
     * Save a study session with optional notes
     */
    saveSession: async (id: string, sessionType: string = 'study', notes: string = '') => {
      try {
        const response = await api.post(`/${resourcePath}/${id}/save_session/`, {
          session_type: sessionType,
          notes: notes,
        });
        return response.data;
      } catch (error) {
        console.error(`Error saving session for ${resourceName}:`, error);
        throw error;
      }
    },

    /**
     * Get session history for content
     */
    getSessionHistory: async (id: string) => {
      try {
        const response = await api.get(`/${resourcePath}/${id}/session_history/`);
        return response.data.sessions;
      } catch (error) {
        console.error(`Error getting session history for ${resourceName}:`, error);
        throw error;
      }
    },

    /**
     * Auto-save time spent (only if above threshold)
     */
    autoSaveTimeSpent: async (id: string, timeSeconds: number, minThreshold: number = 10) => {
      if (timeSeconds >= minThreshold) {
        try {
          const response = await api.post(`/${resourcePath}/${id}/save_time_spent/`, {
            time_spent: timeSeconds,
          });
          console.log(`Auto-saved ${timeSeconds}s for ${resourceName} ${id}`);
          return response.data;
        } catch (error) {
          console.warn(`Failed to auto-save time spent on ${resourceName}:`, error);
        }
      }
    },
  };
}

// ============ PRE-CONFIGURED INSTANCES ============

/**
 * Exercise API - all exercise-related operations
 */
export const exerciseAPI = createContentAPI({
  resourcePath: 'exercises',
  resourceName: 'exercise',
});

/**
 * Exam API - all exam-related operations
 */
export const examAPI = createContentAPI({
  resourcePath: 'exams',
  resourceName: 'exam',
});

/**
 * Lesson API - all lesson-related operations
 */
export const lessonAPI = createContentAPI({
  resourcePath: 'lessons',
  resourceName: 'lesson',
});

/**
 * Helper to get the appropriate API instance based on content type
 */
export function getContentAPI(contentType: ContentType) {
  switch (contentType) {
    case 'exercise':
      return exerciseAPI;
    case 'exam':
      return examAPI;
    case 'lesson':
      return lessonAPI;
    default:
      throw new Error(`Unknown content type: ${contentType}`);
  }
}
