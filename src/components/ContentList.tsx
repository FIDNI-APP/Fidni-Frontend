import React from 'react';
import { Content, VoteValue } from '@/types';
import { ContentCard } from './ContentCard';
import '@/lib/styles.css'

interface ContentListProps {
  contents: Content[];
  onVote: (id: string, type: VoteValue) => void;
  onDelete?: (id: string) => void;
  onEdit?: (id: string) => void;
  userStatuses?: Record<string, any>;
}

export const ContentList: React.FC<ContentListProps> = ({ 
  contents, 
  onVote,
  onDelete,
  onEdit,
}) => {
  return (
    <>
      {contents.map((content) => (
        <ContentCard 
          key={content.id} 
          content={content} 
          onVote={onVote}
          onDelete={onDelete}
          onEdit={onEdit}
        />
      ))}
    </>
  );
}