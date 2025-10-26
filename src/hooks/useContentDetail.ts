/**
 * Unified Content Detail Hook
 *
 * Consolidates all content detail page logic (exercises, exams, lessons)
 * into a single, reusable hook. Reduces code duplication significantly.
 */

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthModal } from '@/components/AuthController';
import { getContentAPI, type ContentType, type ProgressStatus } from '@/lib/api';

interface UseContentDetailProps<T> {
  contentId: string | undefined;
  contentType: ContentType;
  autoMarkViewed?: boolean;
  onProgressChange?: (status: ProgressStatus | null) => void;
  onSaveChange?: (saved: boolean) => void;
}

/**
 * Comprehensive hook for content detail pages
 *
 * Handles loading, voting, progress tracking, and saving for any content type.
 *
 * @example
 * ```tsx
 * function ExerciseDetail() {
 *   const { id } = useParams();
 *   const {
 *     content,
 *     loading,
 *     handleVote,
 *     markAsCompleted,
 *     toggleSaved
 *   } = useContentDetail({
 *     contentId: id,
 *     contentType: 'exercise'
 *   });
 * }
 * ```
 */
export function useContentDetail<T = any>({
  contentId,
  contentType,
  autoMarkViewed = true,
  onProgressChange,
  onSaveChange,
}: UseContentDetailProps<T>) {
  const { isAuthenticated } = useAuth();
  const { openModal } = useAuthModal();

  const contentAPI = getContentAPI(contentType);

  // State management
  const [content, setContent] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // User interaction states
  const [completed, setCompleted] = useState<ProgressStatus | null>(null);
  const [savedForLater, setSavedForLater] = useState(false);
  const [loadingStates, setLoadingStates] = useState({
    progress: false,
    save: false,
    vote: false,
  });

  // ============ LOAD CONTENT ============

  const loadContent = async (id: string) => {
    try {
      setLoading(true);
      setError(null);

      const data = await contentAPI.getById(id);
      setContent(data);

      // Set user-specific states
      if (isAuthenticated) {
        setCompleted((data as any).user_complete || null);
        setSavedForLater((data as any).user_save || false);
      }

      return data;
    } catch (err) {
      console.error(`Failed to load ${contentType}:`, err);
      setError(`Failed to load the ${contentType}. Please try again later.`);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const reload = () => {
    if (contentId) {
      return loadContent(contentId);
    }
    return Promise.resolve(null);
  };

  // Load content on mount or when ID changes
  useEffect(() => {
    if (contentId) {
      loadContent(contentId);

      // Mark as viewed for analytics
      if (autoMarkViewed && isAuthenticated) {
        contentAPI.markViewed(contentId).catch(console.error);
      }
    }
  }, [contentId, isAuthenticated]);

  // ============ VOTING ============

  const handleVote = async (value: 1 | -1 | 0) => {
    if (!content || !contentId) return;

    try {
      setLoadingStates((prev) => ({ ...prev, vote: true }));
      const updatedContent = await contentAPI.vote(contentId, value);
      setContent(updatedContent);
    } catch (err) {
      console.error(`Failed to vote on ${contentType}:`, err);
    } finally {
      setLoadingStates((prev) => ({ ...prev, vote: false }));
    }
  };

  // ============ PROGRESS TRACKING ============

  const markAsCompleted = async (status: 'success' | 'review') => {
    if (!isAuthenticated) {
      openModal();
      return;
    }

    if (!contentId) return;

    try {
      setLoadingStates((prev) => ({ ...prev, progress: true }));

      // Toggle: if clicking the same status, remove it
      if (completed === status) {
        await contentAPI.removeProgress(contentId);
        setCompleted(null);
        onProgressChange?.(null);
      } else {
        await contentAPI.markProgress(contentId, status);
        setCompleted(status);
        onProgressChange?.(status);
      }
    } catch (err) {
      console.error(`Failed to update ${contentType} progress:`, err);
    } finally {
      setLoadingStates((prev) => ({ ...prev, progress: false }));
    }
  };

  // ============ SAVE FOR LATER ============

  const toggleSaved = async () => {
    if (!isAuthenticated) {
      openModal();
      return;
    }

    if (!contentId) return;

    try {
      setLoadingStates((prev) => ({ ...prev, save: true }));

      if (savedForLater) {
        await contentAPI.unsave(contentId);
        setSavedForLater(false);
        onSaveChange?.(false);
      } else {
        await contentAPI.save(contentId);
        setSavedForLater(true);
        onSaveChange?.(true);
      }
    } catch (err) {
      console.error(`Failed to update ${contentType} saved status:`, err);
    } finally {
      setLoadingStates((prev) => ({ ...prev, save: false }));
    }
  };

  // ============ COMMENTS ============

  const addComment = async (commentContent: string, parentId?: string) => {
    if (!isAuthenticated) {
      openModal();
      return null;
    }

    if (!contentId) return null;

    try {
      const comment = await contentAPI.addComment(contentId, commentContent, parentId);
      // Reload to get updated comments
      await reload();
      return comment;
    } catch (err) {
      console.error(`Failed to add comment to ${contentType}:`, err);
      throw err;
    }
  };

  // ============ DELETE ============

  const deleteContent = async () => {
    if (!contentId) return;

    try {
      await contentAPI.delete(contentId);
    } catch (err) {
      console.error(`Failed to delete ${contentType}:`, err);
      throw err;
    }
  };

  return {
    // Content data
    content,
    setContent,
    loading,
    error,

    // User interaction states
    completed,
    savedForLater,
    loadingStates,

    // Actions
    reload,
    handleVote,
    markAsCompleted,
    toggleSaved,
    addComment,
    deleteContent,

    // Manual state setters (for optimistic updates)
    setCompleted,
    setSavedForLater,
  };
}
