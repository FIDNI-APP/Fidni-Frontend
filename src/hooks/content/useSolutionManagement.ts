import { useState } from 'react';
import { addSolution, deleteSolution } from '@/lib/api';
import { Solution, Content } from '@/types';
import { useAuth } from '@/contexts/AuthContext';

interface UseSolutionManagementProps {
  contentId: string;
  onSolutionAdded?: (solution: Solution) => void;
  onSolutionDeleted?: () => void;
}

export function useSolutionManagement({
  contentId,
  onSolutionAdded,
  onSolutionDeleted
}: UseSolutionManagementProps) {
  const { isAuthenticated } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleAddSolution = async (
    solutionContent: string,
    setContent: (updater: (prev: Content | null) => Content | null) => void
  ) => {
    if (!isAuthenticated || !solutionContent.trim()) {
      return null;
    }

    try {
      setIsSubmitting(true);
      const newSolution = await addSolution(contentId, { content: solutionContent });

      setContent(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          solution: newSolution
        };
      });

      onSolutionAdded?.(newSolution);
      return newSolution;
    } catch (err) {
      console.error('Failed to add solution:', err);
      return null;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSolution = async (
    solutionId: string,
    onSuccess?: () => void
  ) => {
    if (!window.confirm('Are you sure you want to delete this solution?')) {
      return false;
    }

    try {
      setIsDeleting(true);
      await deleteSolution(solutionId);
      onSolutionDeleted?.();
      onSuccess?.();
      return true;
    } catch (err) {
      console.error('Failed to delete solution:', err);
      return false;
    } finally {
      setIsDeleting(false);
    }
  };

  return {
    handleAddSolution,
    handleDeleteSolution,
    isSubmitting,
    isDeleting
  };
}
