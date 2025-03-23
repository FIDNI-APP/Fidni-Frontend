import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  MessageSquare, 
  Trash2, 
  Edit, 
  Tag, 
  Eye, 
  Clock, 
  GraduationCap, 
  BarChart3, 
  Layers, 
  BookMarked,
  Flag,
  Lightbulb,
  MoreHorizontal
} from 'lucide-react';
import { Content, Difficulty, VoteValue } from '@/types';
import { Button } from './ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { VoteButtons } from './VoteButtons';
import TipTapRenderer from '@/components/editor/TipTapRenderer';

import '@/lib/styles.css';

interface ContentCardProps {
  content: Content;
  onVote: (id: string, value: VoteValue) => void;
  onDelete?: (id: string) => void;
  onEdit?: (id: string) => void;
  onSave?: (id: string, saved: boolean) => void;
}

export const ContentCard: React.FC<ContentCardProps> = ({
  content,
  onVote,
  onDelete,
  onEdit,
  onSave,
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAuthor = user?.id === content.author.id;
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [showActions, setShowActions] = useState<boolean>(false);
  
  // Check if solution exists
  const hasSolution = !!content.solution;

  const handleCardClick = (e: React.MouseEvent) => {
    // Check if any text is selected
    const selection = window.getSelection();
    if (selection && selection.toString().length > 0) {
      // User is selecting text, do not navigate
      return;
    }
    // Navigate to the exercise page
    navigate(`/exercises/${content.id}`);
  };

  const handleSaveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsSaved(!isSaved);
    if (onSave) {
      onSave(content.id, !isSaved);
    }
  };
  
  const getDifficultyColor = (difficulty: Difficulty): string => {
    switch (difficulty) {
      case 'easy':
        return 'from-emerald-500 to-emerald-400 text-white';
      case 'medium':
        return 'from-amber-500 to-amber-400 text-white';
      case 'hard':
        return 'from-rose-500 to-rose-400 text-white';
      default:
        return 'from-gray-500 to-gray-400 text-white';
    }
  };
  
  const getDifficultyIcon = (difficulty: Difficulty) => {
    switch (difficulty) {
      case 'easy':
        return <BarChart3 className="w-4 h-4" />;
      case 'medium':
        return (
          <div className="flex">
            <BarChart3 className="w-4 h-4" />
          </div>
        );
      case 'hard':
        return (
          <div className="flex">
            <BarChart3 className="w-4 h-4" />
          </div>
        );
      default:
        return <BarChart3 className="w-4 h-4" />;
    }
  };
  
  const getDifficultyLabel = (difficulty: Difficulty): string => {
    switch (difficulty) {
      case 'easy':
        return 'Facile';
      case 'medium':
        return 'Moyen';
      case 'hard':
        return 'Difficile';
      default:
        return difficulty;
    }
  };

  // Format time as "time ago"
  const getTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) {
      return 'à l\'instant';
    }
    
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
      return `il y a ${diffInMinutes} ${diffInMinutes === 1 ? 'minute' : 'minutes'}`;
    }
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
      return `il y a ${diffInHours} ${diffInHours === 1 ? 'heure' : 'heures'}`;
    }
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) {
      return `il y a ${diffInDays} ${diffInDays === 1 ? 'jour' : 'jours'}`;
    }
    
    const diffInWeeks = Math.floor(diffInDays / 7);
    if (diffInWeeks < 4) {
      return `il y a ${diffInWeeks} ${diffInWeeks === 1 ? 'semaine' : 'semaines'}`;
    }
    
    const diffInMonths = Math.floor(diffInDays / 30);
    if (diffInMonths < 12) {
      return `il y a ${diffInMonths} ${diffInMonths === 1 ? 'mois' : 'mois'}`;
    }
    
    const diffInYears = Math.floor(diffInDays / 365);
    return `il y a ${diffInYears} ${diffInYears === 1 ? 'an' : 'ans'}`;
  };

  // Check if the content has theorems and subfields
  const hasTheorems = content.theorems && content.theorems.length > 0;
  const hasSubfields = content.subfields && content.subfields.length > 0;

  return (
    <div
      className="group relative h-full"
      onClick={handleCardClick}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className="content-card bg-white rounded-3xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden cursor-pointer break-words border border-gray-300 hover:border-indigo-200 h-full flex flex-col"
      >
        {/* Save button - top right corner */}
        <button 
          onClick={handleSaveClick}
          className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-indigo-500 transition-colors"
          aria-label={isSaved ? "Unsave exercise" : "Save exercise"}
        >
          <Flag className={`w-4 h-4 ${isSaved ? 'fill-indigo-500 text-indigo-500' : ''}`} />
        </button>
      
        {/* Title section with title, difficulty tag, and save button */}
        <div className="pt-4 pb-2 px-5">
          <div className="flex items-center pr-8"> {/* Added right padding for save button space */}
            {/* Solution indicator and title on the left */}
            <div className="flex items-center flex-1 min-w-0">
              {/* Solution indicator as a simple lightbulb icon */}
              {hasSolution && (
                <Lightbulb className="w-4 h-4 text-emerald-500 mr-2 flex-shrink-0" />
              )}
              
              {/* Title */}
              <h2 className="text-lg font-bold text-gray-800 leading-tight truncate group-hover:text-indigo-600 transition-colors">
                {content.title}
              </h2>
            </div>
            
            {/* Difficulty tag - between title and save button */}
            <span 
              className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium bg-gradient-to-r ${getDifficultyColor(content.difficulty)} flex items-center gap-1 shrink-0`}
            >
              {getDifficultyIcon(content.difficulty)}
              <span>{getDifficultyLabel(content.difficulty)}</span>
            </span>
          </div>
        </div>
        
        {/* Subject badge and class level badge row */}
        <div className="px-5 mb-2">
          <div className="flex flex-wrap gap-1.5">
            {/* Subject badge */}
            <span className="bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-md text-sm font-medium">
              {content.subject.name}
            </span>
            
            {/* Class Level Badges */}
            {content.class_levels && content.class_levels.map((tag) => (
              <span
                key={tag.id}
                className="bg-gray-50 border border-gray-200 text-gray-700 px-2 py-0.5 rounded-md text-xs font-medium flex items-center"
              >
                <GraduationCap className="w-3 h-3 mr-1 text-indigo-500" />
                {tag.name}
              </span>
            ))}
          </div>
        </div>
        
        {/* Content preview area */}
        <div className="px-5 py-3 flex-grow border-t border-gray-50">
          <div className="prose prose-sm max-w-none text-gray-600 line-clamp-3">
            <TipTapRenderer content={content.content} />
          </div>
        </div>
        
        {/* Footer with metadata and buttons */}
        <div className="px-5 py-3 bg-gray-50 border-t border-gray-100">
          <div className="flex items-center justify-between relative">
            {/* Left side - votes, date and limited tags */}
            <div className="flex items-center gap-2">
              {/* Votes */}
              <VoteButtons
                initialVotes={content.vote_count}
                onVote={(value) => {
                  onVote(content.id, value);
                  event?.stopPropagation();
                }}
                vertical={false}
                userVote={content.user_vote}
                size="sm"
              />
              
              {/* Time ago */}
              <span className="text-xs text-gray-500 whitespace-nowrap">
                {getTimeAgo(content.created_at)}
              </span>
              
              {/* Limited Tags with "more" indicator */}
              {(() => {
                // Collect all available tags
                const allTags = [
                  ...(content.chapters || []),
                  ...(content.subfields || []),
                  ...(content.theorems || [])
                ];
                
                // Show only first 2 tags if there are more
                const visibleTags = allTags.slice(0, 2);
                const hiddenCount = allTags.length - visibleTags.length;
                
                return (
                  <>
                    {/* Show first tag if it's a chapter */}
                    {content.chapters && content.chapters.length > 0 && (
                      <span
                        key={content.chapters[0].id}
                        className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded-md text-xs whitespace-nowrap flex items-center border border-purple-100"
                      >
                        <Tag className="w-3 h-3 mr-1 text-purple-500" />
                        {content.chapters[0].name}
                      </span>
                    )}
                    
                    {/* Show first subfield if available and we haven't shown 2 tags yet */}
                    {hasSubfields && content.subfields.length > 0 && visibleTags.length < 3 && (
                      <span
                        key={content.subfields[0].id}
                        className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md text-xs whitespace-nowrap flex items-center border border-blue-100"
                      >
                        <Layers className="w-3 h-3 mr-1 text-blue-500" />
                        {content.subfields[0].name}
                      </span>
                    )}
                    {hasTheorems && content.theorems.length > 0 && visibleTags.length < 4 && (
                      <span
                        key={content.theorems[0].id}
                        className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md text-xs whitespace-nowrap flex items-center border border-blue-100"
                      >
                        <Layers className="w-3 h-3 mr-1 text-blue-500" />
                        {content.theorems[0].name}
                      </span>
                    )}
                    
                    {/* Show "+X more" if we have additional tags */}
                    {hiddenCount > 0 && (
                      <span className="bg-gray-50 text-gray-600 px-2 py-0.5 rounded-md text-xs whitespace-nowrap border border-gray-200">
                        +{hiddenCount} plus
                      </span>
                    )}
                  </>
                );
              })()}
            </div>
            
            {/* Right side - views, comments, and actions dropdown */}
            <div className="flex items-center gap-3 text-xs text-gray-500">
              {/* Views */}
              <span className="flex items-center gap-1">
                <Eye className="w-3.5 h-3.5 text-gray-400" />
                <span>{content.view_count}</span>
              </span>
              
              {/* Comments */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/exercises/${content.id}#comments`);
                }}
                className="flex items-center gap-1 hover:text-indigo-600 transition-colors"
              >
                <MessageSquare className="w-3.5 h-3.5 text-gray-400" />
                <span>{(content.comments || []).length}</span>
              </button>

              {/* Action buttons - shown only on hover and for the author */}
              {isAuthor && (
                <div className={`transition-opacity duration-300 flex items-center gap-1 ml-1 ${showActions ? 'opacity-100' : 'opacity-0'}`}>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit?.(content.id);
                    }}
                    className="h-6 w-6 p-0 rounded-full text-indigo-600 hover:bg-indigo-50"
                    title="Edit"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete?.(content.id);
                    }}
                    className="h-6 w-6 p-0 rounded-full text-red-600 hover:bg-red-50"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};