import { useState } from 'react';
import {
  markExerciseProgress,
  removeExerciseProgress,
  saveExercise,
  unsaveExercise
} from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthModal } from '@/components/AuthController';

type ProgressStatus = 'success' | 'review' | null;

interface UseContentProgressProps {
  contentId: string;
  initialCompleted?: ProgressStatus;
  initialSaved?: boolean;
  onProgressChange?: (status: ProgressStatus) => void;
  onSaveChange?: (saved: boolean) => void;
}

export function useContentProgress({
  contentId,
  initialCompleted = null,
  initialSaved = false,
  onProgressChange,
  onSaveChange
}: UseContentProgressProps) {
  const { isAuthenticated } = useAuth();
  const { openModal } = useAuthModal();
  const [completed, setCompleted] = useState<ProgressStatus>(initialCompleted);
  const [savedForLater, setSavedForLater] = useState(initialSaved);
  const [loadingStates, setLoadingStates] = useState({
    progress: false,
    save: false
  });

  const markAsCompleted = async (status: 'success' | 'review') => {
    if (!isAuthenticated) {
      openModal();
      return;
    }

    try {
      setLoadingStates(prev => ({ ...prev, progress: true }));

      // Toggle: if clicking the same status, remove it
      if (completed === status) {
        await removeExerciseProgress(contentId);
        setCompleted(null);
        onProgressChange?.(null);
      } else {
        await markExerciseProgress(contentId, status);
        setCompleted(status);
        onProgressChange?.(status);
      }
    } catch (err) {
      console.error('Failed to update progress:', err);
    } finally {
      setLoadingStates(prev => ({ ...prev, progress: false }));
    }
  };

  const toggleSaved = async () => {
    if (!isAuthenticated) {
      openModal();
      return;
    }

    try {
      setLoadingStates(prev => ({ ...prev, save: true }));

      if (savedForLater) {
        await unsaveExercise(contentId);
        setSavedForLater(false);
        onSaveChange?.(false);
      } else {
        await saveExercise(contentId);
        setSavedForLater(true);
        onSaveChange?.(true);
      }
    } catch (err) {
      console.error('Failed to update saved status:', err);
    } finally {
      setLoadingStates(prev => ({ ...prev, save: false }));
    }
  };

  return {
    completed,
    savedForLater,
    loadingStates,
    markAsCompleted,
    toggleSaved,
    setCompleted,
    setSavedForLater
  };
}
