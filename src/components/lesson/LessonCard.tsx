import React from 'react';
import { Lesson, VoteValue } from '@/types';
import { ContentCard } from '@/components/exercise/ContentCard';

interface LessonCardProps {
  lesson: Lesson;
  onVote: (id: string, value: VoteValue) => void;
  onDelete?: (id: string) => void;
  onEdit?: (id: string) => void;
  onSave?: (id: string, saved: boolean) => void;
}

export const LessonCard: React.FC<LessonCardProps> = ({
  lesson,
  onVote,
  onDelete,
  onEdit,
  onSave
}) => {
  return (
    <ContentCard
      content={lesson as any}
      onVote={onVote}
      onDelete={onDelete}
      onEdit={onEdit}
      onSave={onSave}
      contentType="lesson"
    />
  );
};
