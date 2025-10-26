/**
 * Custom Hook: useContentActions
 *
 * Simplifies content detail pages by extracting save/progress/vote logic
 * Reduces complexity from 1000+ line components
 */

import { useState } from 'react';
import { VoteValue } from '@/types';

export interface UseContentActionsProps {
  contentId: string;
  contentType: 'exercise' | 'exam' | 'lesson';
  initialSaved?: boolean;
  initialCompleted?: 'success' | 'review' | null;
  onVote?: (value: VoteValue) => Promise<any>;
  onSave?: () => Promise<void>;
  onUnsave?: () => Promise<void>;
  onMarkProgress?: (status: 'success' | 'review') => Promise<void>;
  onRemoveProgress?: () => Promise<void>;
}

/**
 * Manages all user actions for content (save, complete, vote)
 */
export function useContentActions({
  contentId,
  contentType,
  initialSaved = false,
  initialCompleted = null,
  onVote,
  onSave,
  onUnsave,
  onMarkProgress,
  onRemoveProgress,
}: UseContentActionsProps) {
  // State
  const [savedForLater, setSavedForLater] = useState(initialSaved);
  const [completed, setCompleted] = useState<'success' | 'review' | null>(initialCompleted);
  const [showConfetti, setShowConfetti] = useState(false);
  const [loadingStates, setLoadingStates] = useState({
    progress: false,
    save: false,
    vote: false,
  });

  // Toggle save status
  const toggleSave = async () => {
    setLoadingStates(prev => ({ ...prev, save: true }));
    try {
      if (savedForLater) {
        await onUnsave?.();
        setSavedForLater(false);
      } else {
        await onSave?.();
        setSavedForLater(true);
      }
    } catch (error) {
      console.error('Error toggling save:', error);
      throw error;
    } finally {
      setLoadingStates(prev => ({ ...prev, save: false }));
    }
  };

  // Mark as completed
  const markComplete = async (status: 'success' | 'review') => {
    setLoadingStates(prev => ({ ...prev, progress: true }));
    try {
      await onMarkProgress?.(status);
      setCompleted(status);

      // Show confetti for success
      if (status === 'success') {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 3000);
      }
    } catch (error) {
      console.error('Error marking progress:', error);
      throw error;
    } finally {
      setLoadingStates(prev => ({ ...prev, progress: false }));
    }
  };

  // Remove completion status
  const removeComplete = async () => {
    setLoadingStates(prev => ({ ...prev, progress: true }));
    try {
      await onRemoveProgress?.();
      setCompleted(null);
    } catch (error) {
      console.error('Error removing progress:', error);
      throw error;
    } finally {
      setLoadingStates(prev => ({ ...prev, progress: false }));
    }
  };

  // Handle voting
  const handleVote = async (value: VoteValue) => {
    setLoadingStates(prev => ({ ...prev, vote: true }));
    try {
      await onVote?.(value);
    } catch (error) {
      console.error('Error voting:', error);
      throw error;
    } finally {
      setLoadingStates(prev => ({ ...prev, vote: false }));
    }
  };

  return {
    // State
    savedForLater,
    completed,
    showConfetti,
    loadingStates,

    // Actions
    toggleSave,
    markComplete,
    removeComplete,
    handleVote,

    // Setters (if needed)
    setSavedForLater,
    setCompleted,
  };
}
