// src/components/HomeContentCard.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  MessageSquare, 
  Tag, 
  Eye, 
  BarChart3, 
  GraduationCap,
  Bookmark,
  Lightbulb,
  ArrowRight,
  BookOpen,
  Layers
} from 'lucide-react';
import { Content, VoteValue, Difficulty } from '@/types';
import { VoteButtons } from './VoteButtons';
import TipTapRenderer from './editor/TipTapRenderer';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthModal } from '@/components/AuthController';

interface HomeContentCardProps {
  content: Content;
  onVote: (id: string, value: VoteValue) => void;
}

export const HomeContentCard: React.FC<HomeContentCardProps> = ({
  content,
  onVote,
}) => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { openModal } = useAuthModal();
  const [isHovered, setIsHovered] = useState(false);

  const handleCardClick = (e: React.MouseEvent) => {
    // Check if any text is selected
    const selection = window.getSelection();
    if (selection && selection.toString().length > 0) {
      // User is selecting text, do not navigate
      return;
    }
    
    if (!isAuthenticated) {
      e.preventDefault();
      openModal(`/exercises/${content.id}`);
      return;
    }
    
    navigate(`/exercises/${content.id}`);
  };

  const getDifficultyColor = (difficulty: Difficulty) => {
    switch (difficulty) {
      case 'easy':
        return 'from-emerald-500 to-emerald-400 border-emerald-400';
      case 'medium':
        return 'from-amber-500 to-amber-400 border-amber-400';
      case 'hard':
        return 'from-rose-500 to-rose-400 border-rose-400';
      default:
        return 'from-gray-500 to-gray-400 border-gray-400';
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
  
  const truncateTitle = (title: string, maxLength = 50) => {
    if (title.length <= maxLength) return title;
    return title.substring(0, maxLength) + '...';
  };
  
  // Check if solution exists
  const hasSolution = !!content.solution;
  
  // Check if the content has chapters
  const hasChapters = content.chapters && content.chapters.length > 0;
  const hasSubfields = content.subfields && content.subfields.length > 0;

  return (
    <div 
      className="relative group bg-white rounded-xl shadow-md transition-all duration-300 border border-gray-200 overflow-hidden h-full transform hover:-translate-y-1 hover:shadow-xl hover:border-indigo-300 cursor-pointer"
      onClick={handleCardClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Card Header with Gradient */}
      <div className="relative bg-gradient-to-r from-indigo-600 to-purple-600 p-4">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="smallGrid" width="10" height="10" patternUnits="userSpaceOnUse">
                <path d="M 10 0 L 0 0 0 10" fill="none" stroke="white" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#smallGrid)" />
          </svg>
        </div>
        
        {/* Title with Solution Indicator */}
        <div className="flex items-start gap-1.5 mb-3 relative z-10">
          {hasSolution && (
            <div className="flex-shrink-0 bg-emerald-400 p-1 rounded-full mt-1 transform transition-transform group-hover:scale-110">
              <Lightbulb className="w-3 h-3 text-white" />
            </div>
          )}
          <h3 className="text-lg font-bold text-white leading-tight group-hover:underline">
            {truncateTitle(content.title)}
          </h3>
        </div>
        
        {/* Difficulty and Subject Tags */}
        <div className="flex flex-wrap gap-1.5 mb-2">
          {/* Subject Tag */}
          {content.subject && (
            <span className="bg-white/20 backdrop-blur-sm px-2 py-0.5 rounded-full text-xs font-medium text-white flex items-center">
              <BookOpen className="w-3 h-3 mr-1" />
              {content.subject.name}
            </span>
          )}
          
          {/* Difficulty Badge */}
          <span className={`bg-gradient-to-r ${getDifficultyColor(content.difficulty)} px-2 py-0.5 rounded-full text-xs font-medium text-white flex items-center`}>
            <BarChart3 className="w-3 h-3 mr-1" />
            {getDifficultyLabel(content.difficulty)}
          </span>
          
          {/* Class Levels Badge - if available */}
          {content.class_levels && content.class_levels.length > 0 && (
            <span className="bg-white/20 backdrop-blur-sm px-2 py-0.5 rounded-full text-xs font-medium text-white flex items-center">
              <GraduationCap className="w-3 h-3 mr-1" />
              {content.class_levels[0].name}
            </span>
          )}
        </div>
      </div>
      
      {/* Content Area */}
      <div className="px-4 py-4 flex-grow">
        <div className="prose prose-sm max-w-none text-gray-600 line-clamp-3 overflow-hidden">
          <TipTapRenderer content={content.content} compact={true} />
        </div>
      </div>
      
      {/* Card Footer */}
      <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex justify-between items-center mt-auto">
        {/* Left side - Vote and Stats */}
        <div className="flex items-center gap-3">
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
          
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="flex items-center">
              <Eye className="w-3 h-3 text-indigo-400 mr-1" />
              <span>{content.view_count}</span>
            </span>
            
            <span className="flex items-center">
              <MessageSquare className="w-3 h-3 text-indigo-400 mr-1" />
              <span>{(content.comments || []).length}</span>
            </span>
          </div>
        </div>
        
        {/* Right side - Tags */}
        <div className="flex items-center gap-1">
          {hasChapters && content.chapters.slice(0, 1).map(chapter => (
            <span
              key={chapter.id}
              className="bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded text-xs flex items-center border border-purple-100"
            >
              <Tag className="w-2.5 h-2.5 mr-0.5" />
              <span className="truncate max-w-[80px]">{chapter.name}</span>
            </span>
          ))}
          
          {hasSubfields && content.subfields.slice(0, 1).map(subfield => (
            <span
              key={subfield.id}
              className="bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded text-xs flex items-center border border-blue-100"
            >
              <Layers className="w-2.5 h-2.5 mr-0.5" />
              <span className="truncate max-w-[80px]">{subfield.name}</span>
            </span>
          ))}
        </div>
      </div>
      
      {/* Improved Hover Overlay */}
      <div 
        className={`absolute inset-0 bg-gradient-to-br from-indigo-900/80 to-purple-900/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 backdrop-blur-[2px] pointer-events-none`}
        aria-hidden="true"
      >
        <div className="transform translate-y-6 group-hover:translate-y-0 transition-transform duration-300 text-center px-6">
          <div className="w-12 h-12 mx-auto mb-3 bg-white/20 rounded-full flex items-center justify-center">
            <ArrowRight className="w-6 h-6 text-white" />
          </div>
          <p className="text-white font-medium mb-2">View Exercise</p>
          <div className="text-white/80 text-sm max-w-xs mx-auto">
            Click to see full details and solution
          </div>
        </div>
      </div>
    </div>
  );
};