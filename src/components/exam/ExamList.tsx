import React from 'react';
import { Exam, VoteValue } from '@/types';
import { ContentCard } from '@/components/exercise/ContentCard';
import '@/lib/styles.css'

interface ExamListProps {
  exams: Exam[];
  onVote: (id: string, type: VoteValue) => void;
  onDelete?: (id: string) => void;
  onEdit?: (id: string) => void;
}

export const ExamList: React.FC<ExamListProps> = ({
  exams,
  onVote,
  onDelete,
  onEdit,
}) => {
  // Make sure exams is an array and has items before rendering
  if (!exams || !Array.isArray(exams) || exams.length === 0) {
    return null;
  }

  return (
    <>
      {exams.map((exam) => {
        // Make sure exam is not undefined before rendering
        if (!exam) return null;

        return (
          <ContentCard
            key={exam.id}
            content={exam as any}
            onVote={onVote}
            onDelete={onDelete}
            onEdit={onEdit}
            contentType="exam"
          />
        );
      })}
    </>
  );
}
