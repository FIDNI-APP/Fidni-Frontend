import { api } from '../api/apiClient';

export type VoteValue = 1 | -1 | 0;

export interface ContentAPIConfig {
  /** The plural resource path (e.g., 'exercises', 'exams', 'lessons') */
  resourcePath: string;

  /** The singular resource name (e.g., 'exercise', 'exam', 'lesson') */
  resourceName: string;
}

/**
 * Generic Content API Factory
 *
 * Creates a consistent set of API functions for content resources (exercises, exams, lessons).
 * Eliminates duplicate code by providing a single source of truth for common operations.
 *
 * @example
 * const exerciseAPI = createContentAPI({
 *   resourcePath: 'exercises',
 *   resourceName: 'exercise'
 * });
 *
 * // Now you can use:
 * await exerciseAPI.vote(id, 1);
 * await exerciseAPI.markProgress(id, 'success');
 * await exerciseAPI.save(id);
 */
export function createContentAPI(config: ContentAPIConfig) {
  const { resourcePath, resourceName } = config;

  return {
    /**
     * Vote on content (upvote, downvote, or unvote)
     */
    vote: async (id: string, value: VoteValue) => {
      try {
        const response = await api.post(`/${resourcePath}/${id}/vote/`, { value });
        return response.data.item; // Return the updated item
      } catch (error) {
        console.error(`Vote error on ${resourceName}:`, error);
        throw error;
      }
    },

    /**
     * Mark content progress (success or review)
     */
    markProgress: async (id: string, status: 'success' | 'review') => {
      const response = await api.post(`/${resourcePath}/${id}/mark_progress/`, { status });
      return response.data;
    },

    /**
     * Remove content progress
     */
    removeProgress: async (id: string) => {
      await api.delete(`/${resourcePath}/${id}/remove_progress/`);
    },

    /**
     * Save content for later
     */
    save: async (id: string) => {
      const response = await api.post(`/${resourcePath}/${id}/save_${resourceName}/`);
      return response.data;
    },

    /**
     * Unsave content
     */
    unsave: async (id: string) => {
      await api.delete(`/${resourcePath}/${id}/unsave_${resourceName}/`);
    },

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

    /**
     * Mark content as viewed
     */
    markViewed: async (id: string) => {
      const response = await api.post(`/${resourcePath}/${id}/view/`);
      return response.data;
    },

    /**
     * Delete content
     */
    delete: async (id: string) => {
      await api.delete(`/${resourcePath}/${id}/`);
    },

    /**
     * Get content by ID
     */
    getById: async (id: string) => {
      const response = await api.get(`/${resourcePath}/${id}/`);
      return response.data;
    },

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
     * Get time spent on content
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

    /**
     * Save a study session
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
     * Auto-save time spent (with threshold)
     */
    autoSaveTimeSpent: async (id: string, timeSeconds: number, minTimeThreshold: number = 10) => {
      if (timeSeconds >= minTimeThreshold) {
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

/**
 * Create API instances for each content type
 */
export const exerciseContentAPI = createContentAPI({
  resourcePath: 'exercises',
  resourceName: 'exercise',
});

export const examContentAPI = createContentAPI({
  resourcePath: 'exams',
  resourceName: 'exam',
});

export const lessonContentAPI = createContentAPI({
  resourcePath: 'lessons',
  resourceName: 'lesson',
});
