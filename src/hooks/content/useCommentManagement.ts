import { useState, useCallback } from 'react';
import { addComment, type ContentType } from '@/lib/api';
import { Comment, Content } from '@/types';

interface UseCommentManagementProps {
  contentId: string;
  contentType: ContentType;
  onCommentAdded?: (comment: Comment) => void;
}

export function useCommentManagement({ contentId, contentType, onCommentAdded }: UseCommentManagementProps) {
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

  const handleAddComment = useCallback(
    async (
      content: Content,
      setContent: (updater: (prev: Content | null) => Content | null) => void,
      commentContent: string,
      parentId?: string
    ) => {
      if (!contentId || !content) return null;

      try {
        setIsSubmitting(true);
        const newComment = await addComment(contentType, contentId, commentContent, parentId);

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
    },
    [contentId, contentType, onCommentAdded]
  );

  return {
    handleAddComment,
    isSubmitting
  };
}
