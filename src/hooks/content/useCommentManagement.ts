import { useState } from 'react';
import { addComment } from '@/lib/api';
import { Comment, Content } from '@/types';

interface UseCommentManagementProps {
  contentId: string;
  onCommentAdded?: (comment: Comment) => void;
}

export function useCommentManagement({ contentId, onCommentAdded }: UseCommentManagementProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateCommentsTree = (comments: Comment[], newComment: Comment, parentId: string): Comment[] => {
    return comments.map(comment => {
      if (comment.id === parentId) {
        return {
          ...comment,
          replies: [...(comment.replies || []), newComment]
        };
      }
      if (comment.replies) {
        return {
          ...comment,
          replies: updateCommentsTree(comment.replies, newComment, parentId)
        };
      }
      return comment;
    });
  };

  const handleAddComment = async (
    content: Content,
    setContent: (updater: (prev: Content | null) => Content | null) => void,
    commentContent: string,
    parentId?: string
  ) => {
    if (!contentId || !content) return null;

    try {
      setIsSubmitting(true);
      const newComment = await addComment(contentId, commentContent, parentId);

      setContent(prev => {
        if (!prev) return prev;

        let updatedComments = [...prev.comments];

        if (parentId) {
          updatedComments = updateCommentsTree(updatedComments, newComment, parentId);
        } else {
          updatedComments.push(newComment);
        }

        return {
          ...prev,
          comments: updatedComments
        };
      });

      onCommentAdded?.(newComment);
      return newComment;
    } catch (err) {
      console.error('Failed to add comment:', err);
      return null;
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    handleAddComment,
    isSubmitting
  };
}
