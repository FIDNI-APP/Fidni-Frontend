import { useState } from 'react';
import { voteExercise, voteSolution } from '@/lib/api';
import { VoteValue } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthModal } from '@/components/AuthController';

interface UseContentVotingProps {
  contentId: string;
  onVoteSuccess?: () => void;
}

export function useContentVoting({ contentId, onVoteSuccess }: UseContentVotingProps) {
  const { isAuthenticated } = useAuth();
  const { openModal } = useAuthModal();
  const [isVoting, setIsVoting] = useState(false);

  const handleVote = async (
    value: VoteValue,
    target: 'exercise' | 'solution' = 'exercise',
    targetId?: string
  ) => {
    if (!isAuthenticated) {
      openModal();
      return null;
    }

    try {
      setIsVoting(true);
      let result;

      if (target === 'solution' && targetId) {
        result = await voteSolution(targetId, value);
      } else {
        result = await voteExercise(contentId, value);
      }

      onVoteSuccess?.();
      return result;
    } catch (err) {
      console.error('Failed to vote:', err);
      return null;
    } finally {
      setIsVoting(false);
    }
  };

  return { handleVote, isVoting };
}
