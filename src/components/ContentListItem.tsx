import React from 'react';
import { Content, VoteValue } from '@/types';
import { ContentCard } from './ContentCard';
import {LessonCard} from '@/components/lesson/LessonCard';
import '@/lib/styles.css'

interface ContentListItemProps {
  lessons: Content[];
  onVote: (id: string, type: VoteValue) => void;
  onDelete?: (id: string) => void;
  onEdit?: (id: string) => void;
  userStatuses?: Record<string, any>;
}

export const ContentListItem: React.FC<ContentListItemProps> = ({ 
  lessons, 
  onVote,
  onDelete,
  onEdit,
}) => {
  // Make sure lessons is an array and has items before rendering
  if (!lessons || !Array.isArray(lessons) || lessons.length === 0) {
    return null;
  }
  
  return (
    <>
      {lessons.map((lesson) => {
        // Make sure lesson is not undefined before rendering
        if (!lesson) return null;
        
        return (
          <LessonCard 
            key={lesson.id} 
            lesson={lesson} 
            onVote={onVote}
            onDelete={onDelete}
            onEdit={onEdit}
          />
        );
      })}
    </>
  );
}