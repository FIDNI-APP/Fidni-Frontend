import React from 'react';
import { Exam, VoteValue } from '@/types';
import { ContentCard } from '@/components/exercise/ContentCard';

interface ExamCardProps {
  exam: Exam;
  onVote: (id: string, value: VoteValue) => void;
  onDelete?: (id: string) => void;
  onEdit?: (id: string) => void;
  onSave?: (id: string, saved: boolean) => void;
}

export const ExamCard: React.FC<ExamCardProps> = ({
  exam,
  onVote,
  onDelete,
  onEdit,
  onSave
}) => {
  return (
    <ContentCard
      content={exam as any}
      onVote={onVote}
      onDelete={onDelete}
      onEdit={onEdit}
      onSave={onSave}
      contentType="exam"
    />
  );
};
