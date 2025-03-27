import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  MessageSquare, 
  Trash2, 
  Edit, 
  Tag, 
  Eye, 
  GraduationCap, 
  BarChart3, 
  Layers, 
  BookMarked,
  Bookmark,
  Lightbulb,
  User,
  Clock
} from 'lucide-react';
import { Content, Difficulty, VoteValue } from '@/types';
import { Button } from './ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { VoteButtons } from './VoteButtons';
import TipTapRenderer from '@/components/editor/TipTapRenderer';
import { useAuthModal } from '@/components/AuthController';

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
  const { isAuthenticated } = useAuth();
  const { openModal } = useAuthModal(); 
  
  // Check if solution exists
  const hasSolution = !!content.solution;

  const handleCardClick = (e: React.MouseEvent) => {
    // Check if any text is selected
    const selection = window.getSelection();
    if (selection && selection.toString().length > 0) {
      // User is selecting text, do not navigate
      return;
    }
    
    // If user is not authenticated, prompt login instead of navigating
    if (!isAuthenticated) {
      e.preventDefault();
      openModal(`/exercises/${content.id}`);
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
        return 'bg-emerald-500 text-white';
      case 'medium':
        return 'bg-amber-500 text-white';
      case 'hard':
        return 'bg-rose-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };
  
  const getDifficultyIcon = (difficulty: Difficulty) => {
    switch (difficulty) {
      case 'easy':
        return <BarChart3 className="w-3.5 h-3.5" />;
      case 'medium':
        return <BarChart3 className="w-3.5 h-3.5" />;
      case 'hard':
        return <BarChart3 className="w-3.5 h-3.5" />;
      default:
        return <BarChart3 className="w-3.5 h-3.5" />;
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
  const hasChapters = content.chapters && content.chapters.length > 0;

  return (
    <div
      className="group h-full"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div 
        className="bg-white cursor-pointer rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-200 hover:border-indigo-300 h-full flex flex-col overflow-hidden relative"
        onClick={handleCardClick}
      >
        {/* Top colorful strip based on difficulty */}
        <div className={`h-1.5 w-full ${getDifficultyColor(content.difficulty)}`}></div>
        
        {/* Header section with title and basic metadata */}
        <div className="p-5 pb-3">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex-1 min-w-0">
              {/* Title with solution indicator */}
              <div className="flex items-start">
                {hasSolution && (
                  <div className="bg-emerald-100 p-1 rounded-full mr-2 mt-1 flex-shrink-0">
                    <Lightbulb className="w-3 h-3 text-emerald-600" />
                  </div>
                )}
                <h2 className="text-xl font-bold text-gray-800 leading-tight group-hover:text-indigo-700 transition-colors">
                  {content.title}
                </h2>
              </div>
            </div>
            
            {/* Right side - difficulty and bookmark */}
            <div className="flex items-start gap-1 flex-shrink-0">
              {/* Difficulty badge */}
              <span className={`px-1 py-1 rounded-md text-s font-medium flex items-center gap-1 ${getDifficultyColor(content.difficulty)}`}>
                {getDifficultyIcon(content.difficulty)}
                <span>{getDifficultyLabel(content.difficulty)}</span>
              </span>
              
              {/* Save button */}
              <button 
                onClick={handleSaveClick}
                className="p-1.5 rounded-md hover:bg-gray-100 transition-colors"
                aria-label={isSaved ? "Retirer des favoris" : "Ajouter aux favoris"}
              >
                <Bookmark className={`w-5 h-5 ${isSaved ? 'fill-indigo-500 text-indigo-500' : 'text-gray-400'}`} />
              </button>
            </div>
          </div>
          
          {/* Main metadata - Author, time and subject tags */}
          <div className="flex flex-wrap items-center gap-2 mb-2">
            {/* User info */}
            <div className="flex items-center text-xs text-gray-500 mr-1">
              <User className="w-3 h-3 mr-1 text-gray-400" />
              <span>{content.author.username}</span>
            </div>
            
            {/* Time info */}
            <div className="flex items-center text-xs text-gray-500 mr-1">
              <Clock className="w-3 h-3 mr-1 text-gray-400" />
              <span>{getTimeAgo(content.created_at)}</span>
            </div>
            
            {/* Primary tags: subject and class level */}
            {content.subject && (
              <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded text-xs font-medium">
                {content.subject.name}
              </span>
            )}
            
            {/* Class Level Badges */}
            {content.class_levels && content.class_levels.map((level) => (
              <span
                key={level.id}
                className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-xs font-medium flex items-center"
              >
                <GraduationCap className="w-3 h-3 mr-1 text-indigo-500" />
                {level.name}
              </span>
            ))}
          </div>
        </div>
        
        {/* Content preview area */}
        <div className="px-5 py-4 flex-grow">
          <div className="prose prose-sm max-w-none text-gray-600 line-clamp-3">
            <TipTapRenderer content={content.content} />
          </div>
        </div>
        
        {/* Footer with stats, tags and actions */}
        <div className="px-5 py-3 bg-gray-50 border-t border-gray-100">
          <div className="flex items-center justify-between">
            {/* Left side - votes and specific tags side by side */}
            <div className="flex items-center gap-3 overflow-hidden">
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
              
              {/* Secondary tags (chapters, subfields, theorems) */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                {/* Chapter tags */}
                {hasChapters && content.chapters.slice(0, 2).map(chapter => (
                  <span
                    key={chapter.id}
                    className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded text-xs flex-shrink-0 flex items-center whitespace-nowrap"
                  >
                    <Tag className="w-3 h-3 mr-1 text-purple-500" />
                    {chapter.name}
                  </span>
                ))}
                
                {/* Subfield tags */}
                {hasSubfields && content.subfields.slice(0, 1).map(subfield => (
                  <span
                    key={subfield.id}
                    className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs flex-shrink-0 flex items-center whitespace-nowrap"
                  >
                    <Layers className="w-3 h-3 mr-1 text-blue-500" />
                    {subfield.name}
                  </span>
                ))}
                
                {/* Theorem tags */}
                {hasTheorems && content.theorems.slice(0, 1).map(theorem => (
                  <span
                    key={theorem.id}
                    className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded text-xs flex-shrink-0 flex items-center whitespace-nowrap"
                  >
                    <BookMarked className="w-3 h-3 mr-1 text-amber-500" />
                    {theorem.name}
                  </span>
                ))}
                
                {/* More tag if needed */}
                {(
                  (hasChapters ? Math.max(0, content.chapters.length - 2) : 0) + 
                  (hasSubfields ? Math.max(0, content.subfields.length - 1) : 0) + 
                  (hasTheorems ? Math.max(0, content.theorems.length - 1) : 0)
                ) > 0 && (
                  <span className="bg-gray-50 text-gray-600 px-2 py-0.5 rounded text-xs flex-shrink-0 border border-gray-200">
                    +{
                      (hasChapters ? Math.max(0, content.chapters.length - 2) : 0) + 
                      (hasSubfields ? Math.max(0, content.subfields.length - 1) : 0) + 
                      (hasTheorems ? Math.max(0, content.theorems.length - 1) : 0)
                    }
                  </span>
                )}
              </div>
            </div>
            
            {/* Right side - stats and actions */}
            <div className="flex items-center gap-3 flex-shrink-0">
              {/* Views */}
              <div className="flex items-center text-xs text-gray-500">
                <Eye className="w-5 h-4 mr-1 text-gray-400" />
                <span>{content.view_count}</span>
              </div>
              
              {/* Comments */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/exercises/${content.id}#comments`);
                }}
                className="flex items-center text-xs text-gray-500 hover:text-indigo-600 transition-colors"
              >
                <MessageSquare className="w-5 h-4 mr-1 text-gray-400" />
                <span>{(content.comments || []).length}</span>
              </button>
              
              {/* Author actions */}
              {isAuthor && showActions && (
                <div className="flex items-center ml-1 gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit?.(content.id);
                    }}
                    className="h-7 w-7 p-0 rounded-full bg-white text-indigo-600 hover:bg-indigo-50 shadow-sm"
                    title="Modifier"
                  >
                    <Edit className="w-3.5 h-5" />
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete?.(content.id);
                    }}
                    className="h-7 w-7 p-0 rounded-full bg-white text-red-600 hover:bg-red-50 shadow-sm"
                    title="Supprimer"
                  >
                    <Trash2 className="w-3.5 h-5" />
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