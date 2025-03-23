import React from 'react';
import { Content, VoteValue } from '@/types';
import { ContentCard } from './ContentCard';
import '@/lib/styles.css'

interface ContentListProps {
  contents: Content[];
  onVote: (id: string, type: VoteValue) => void;
  onDelete?: (id: string) => void;
  onEdit?: (id: string) => void;
}

export const ContentList: React.FC<ContentListProps> = ({ 
  contents, 
  onVote,
  onDelete,
  onEdit
}) => {
  return (
    // Return the items directly without the container div
    // This allows the parent grid to control the layout
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