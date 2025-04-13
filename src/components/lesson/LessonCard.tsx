import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  MessageSquare, 
  Trash2, 
  Edit, 
  Tag, 
  Eye, 
  GraduationCap, 
  BookOpen,
  Bookmark,
  ChevronRight,
  Share2,
  Loader2,
  Layers,
  BookMarked,
  Sparkles
} from 'lucide-react';
import { Lesson, VoteValue } from '@/types';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { VoteButtons } from '@/components/VoteButtons';
import TipTapRenderer from '@/components/editor/TipTapRenderer';
import { useAuthModal } from '@/components/AuthController';
import '@/lib/styles.css';

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
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAuthor = user?.id === lesson.author.id;
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const { isAuthenticated } = useAuth();
  const { openModal } = useAuthModal(); 


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
      openModal(`/lessons/${lesson.id}`);
      return;
    }
    
    // Navigate to the lesson page
    navigate(`/lessons/${lesson.id}`);
  };

  // Truncate title if too long
  const truncateTitle = (title: string, maxLength = 60) => {
    if (title.length <= maxLength) return title;
    return title.substring(0, maxLength) + '...';
  };

  // Check if the content has theorems and chapters
  const hasTheorems = lesson.theorems && lesson.theorems.length > 0;
  const hasChapters = lesson.chapters && lesson.chapters.length > 0;
  
  // Calculate total tags for the "+X" indicator
  const totalMoreTags = (
    (hasChapters ? Math.max(0, lesson.chapters.length - 1) : 0) + 
    (hasTheorems ? Math.max(0, lesson.theorems.length - 1) : 0)
  );

  return (
    <div
      className="group h-full transition-all duration-300"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div 
        className="flex flex-col h-full bg-white cursor-pointer rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden border border-gray-100 hover:border-indigo-300 transform hover:-translate-y-1"
        onClick={handleCardClick}
      >
        {/* Card Header with Improved Styling */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-4 relative overflow-hidden">
          {/* Background Pattern - Subtle Grid Texture */}
          <div className="absolute inset-0 opacity-10">
            <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="smallGrid" width="12" height="12" patternUnits="userSpaceOnUse">
                  <path d="M 12 0 L 0 0 0 12" fill="none" stroke="white" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#smallGrid)" />
            </svg>
          </div>
          
          <div className="relative">
            {/* Title Section */}
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-start gap-2">
                <div className="bg-yellow-400 p-1 rounded-full flex-shrink-0 mt-1 transition-transform duration-300 transform group-hover:scale-110">
                  <Sparkles className="w-3 h-3 text-white" />
                </div>
                <h2 className="text-xl font-bold text-white leading-tight group-hover:underline decoration-2 decoration-white/60">
                  {truncateTitle(lesson.title)}
                </h2>
              </div>
            </div>
            
            {/* Tags Section - Made More Compact & Consistent */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Subject Tag */}
              {lesson.subject && (
                <span className="bg-white/20 backdrop-blur-sm px-2 py-0.5 rounded-full text-xs font-medium text-white flex items-center">
                  <BookOpen className="w-3 h-3 mr-1" />
                  {lesson.subject.name}
                </span>
              )}
              
              {/* Class Level Badge */}
              {lesson.class_levels && lesson.class_levels.length > 0 && (
                <span className="bg-white/20 backdrop-blur-sm px-2 py-0.5 rounded-full text-xs font-medium text-white flex items-center">
                  <GraduationCap className="w-3 h-3 mr-1" />
                  {lesson.class_levels[0].name}
                </span>
              )}
            </div>
          </div>
        </div>
        
        {/* Content Preview */}
        <div className="px-5 py-4 flex-grow">
          <div className="prose prose-sm max-w-none text-gray-700 line-clamp-3 overflow-hidden">
            <TipTapRenderer content={lesson.content} />
          </div>
        </div>
        
        {/* Footer Section */}
        <div className="mt-auto px-5 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between transition-colors duration-300 group-hover:bg-white">
          {/* Left side - votes and tags */}
          <div className="flex items-center gap-3 overflow-hidden">
            {/* Vote Buttons */}
            <div className="transition-transform duration-300 group-hover:scale-105">
              <VoteButtons
                initialVotes={lesson.vote_count}
                onVote={(value: VoteValue) => {
                  onVote(lesson.id, value);
                  event?.stopPropagation();
                }}
                vertical={false}
                userVote={lesson.user_vote}
                size="sm"
              />
            </div>
            
            {/* Tags */}
            <div className="flex items-center flex-wrap gap-1.5 overflow-hidden max-w-xs">
              {/* Chapter Tags */}
              {hasChapters && lesson.chapters.slice(0, 1).map(chapter => (
                <span
                  key={chapter.id}
                  className="bg-purple-50 text-purple-700 px-2 py-0.5 text-xs rounded-md flex items-center whitespace-nowrap border border-purple-100 transition-transform duration-300 group-hover:scale-105"
                >
                  <Tag className="w-3 h-3 mr-1 text-purple-500" />
                  <span className="truncate max-w-[80px]">{chapter.name}</span>
                </span>
              ))}
              
              {/* Theorem Tags */}
              {hasTheorems && lesson.theorems.slice(0, 1).map(theorem => (
                <span
                  key={theorem.id}
                  className="bg-amber-50 text-amber-700 px-2 py-0.5 text-xs rounded-md flex items-center whitespace-nowrap border border-amber-100 transition-transform duration-300 group-hover:scale-105"
                >
                  <BookMarked className="w-3 h-3 mr-1 text-amber-500" />
                  <span className="truncate max-w-[80px]">{theorem.name}</span>
                </span>
              ))}
              
              {/* More Tag with nicer styling */}
              {totalMoreTags > 0 && (
                <span className="bg-gray-50 text-gray-600 px-2 py-0.5 rounded-md text-xs flex-shrink-0 border border-gray-200 flex items-center group-hover:bg-indigo-50 group-hover:text-indigo-600 group-hover:border-indigo-100 transition-colors duration-300">
                  <span>+{totalMoreTags}</span>
                </span>
              )}
            </div>
          </div>
          
          {/* Right side - stats and actions */}
          <div className="flex items-center gap-3">
            {/* Views */}
            <div className="flex items-center text-xs text-gray-500 group-hover:text-indigo-600 transition-colors duration-300">
              <Eye className="w-4 h-4 mr-1 text-gray-400 group-hover:text-indigo-500 transition-colors duration-300" />
              <span>{lesson.view_count}</span>
            </div>
            
            {/* Comments Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/lessons/${lesson.id}#comments`);
              }}
              className="flex items-center text-xs text-gray-500 hover:text-indigo-600 transition-all duration-300 hover:scale-105"
            >
              <MessageSquare className="w-4 h-4 mr-1 text-gray-400 group-hover:text-indigo-500 transition-colors duration-300" />
              <span>{(lesson.comments || []).length}</span>
            </button>
            
            {/* Share Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigator.clipboard.writeText(window.location.origin + `/lessons/${lesson.id}`);
                // Add a toast notification here in a real implementation
              }}
              className="flex items-center text-xs text-gray-500 hover:text-indigo-600 transition-all duration-300 hover:scale-105"
              title="Copy link"
            >
              <Share2 className="w-4 h-4 text-gray-400 group-hover:text-indigo-500 transition-colors duration-300" />
            </button>
            
            {/* Author actions */}
            {isAuthor && (
              <div className={`flex items-center gap-2 ml-2 transition-all duration-300 z-20 ${isHovered ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4 pointer-events-none'}`}>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit?.(lesson.id);
                  }}
                  className="h-8 px-2 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-100 transition-all duration-300 hover:shadow-md"
                  title="Edit"
                >
                  <Edit className="w-3.5 h-3.5 mr-1" />
                  <span className="text-xs">Edit</span>
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete?.(lesson.id);
                  }}

                  className="h-8 px-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 border border-red-100 transition-all duration-300 hover:shadow-md"
                  title="Delete"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" />
                  <span className="text-xs">Delete</span>
                </Button>
              </div>
            )}
          </div>
        </div>
        
        {/* Action Button - Positioned to not interfere with edit/delete buttons */}
        <div 
          className={`absolute inset-0 flex items-center justify-center z-10 pointer-events-none ${isHovered ? 'translate-x-0 opacity-100' : 'translate-x-4 opacity-0'}`}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleCardClick(e);
            }}
            className={`bg-purple-600/80 hover:bg-purple-700/90 text-white p-4 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 backdrop-blur-sm pointer-events-auto ${isHovered ? 'scale-10 opacity-80' : 'scale-40 opacity-100 hover:opacity-90'}`}
            aria-label="View lesson"
          >
            <ChevronRight className="w-8 h-8" />
            <p className="font-medium text-lg mb-1 text-white">View lesson</p>
          </button>
        </div>
      </div>
    </div>
  );
};