// src/components/HomeContentCard.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  MessageSquare, 
  Tag, 
  Eye, 
  GraduationCap,
  Bookmark,
  Lightbulb,
  ChevronRight,
  BookOpen,
  Layers,
  Loader2
} from 'lucide-react';
import { Content, VoteValue, Difficulty } from '@/types';
import { VoteButtons } from './VoteButtons';
import TipTapRenderer from './editor/TipTapRenderer';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthModal } from '@/components/AuthController';
import { saveExercise, unsaveExercise } from '@/lib/api';
import axios from 'axios';

interface HomeContentCardProps {
  content: Content;
  onVote: (id: string, value: VoteValue, contentType?: 'exercise' | 'lesson' | 'exam') => void;
  onSave?: (id: string, saved: boolean) => void;
}

export const HomeContentCard: React.FC<HomeContentCardProps> = ({
  content,
  onVote,
  onSave
}) => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { openModal } = useAuthModal();
  const [isHovered, setIsHovered] = useState(false);
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Initialize saved state from content
  useEffect(() => {
    if (content && content.user_save !== undefined) {
      setIsSaved(content.user_save);
    }
  }, [content]);

  // Detect content type based on properties
  const getContentType = (): 'exercise' | 'lesson' | 'exam' => {
    // Exams have is_national_exam property
    if ('is_national_exam' in content) return 'exam';
    // Exercises have difficulty property, lessons don't
    if ('difficulty' in content && content.difficulty) return 'exercise';
    // Otherwise it's a lesson
    return 'lesson';
  };

  const getNavigationPath = () => {
    const contentType = getContentType();
    const basePaths = {
      exercise: '/exercises',
      lesson: '/lessons',
      exam: '/exams'
    };
    return `${basePaths[contentType]}/${content.id}`;
  };

  const handleCardClick = (e: React.MouseEvent) => {
    // Check if any text is selected
    const selection = window.getSelection();
    if (selection && selection.toString().length > 0) {
      // User is selecting text, do not navigate
      return;
    }

    if (!isAuthenticated) {
      e.preventDefault();
      openModal();
      return;
    }

    navigate(getNavigationPath());
  };

  const handleSaveClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!isAuthenticated) {
        // Prompt login if not authenticated
        openModal();
        return;
    }
    
    try {
        setIsSaving(true);
        
        if (isSaved) {
            // If currently saved, unsave it and take content.id to string 

            await unsaveExercise(content.id.toString());
            setIsSaved(false);
        } else {
            // If not saved, save it
            try {
                await saveExercise(content.id.toString());
                setIsSaved(true);
            } catch (error) {
                // If error is "already saved", consider it a success
                if (axios.isAxiosError(error) && error.response?.status === 400) {
                    // Already saved - still update UI
                    setIsSaved(true);
                } else {
                    // Rethrow other errors
                    throw error;
                }
            }
        }
        
        // Call the callback if provided
        if (onSave) {
            onSave(content.id.toString(), !isSaved);
        }
    } catch (error) {
        console.error("Error toggling save status:", error);
    } finally {
        setIsSaving(false);
    }
  };

  const getDifficultyInfo = (difficulty: Difficulty) => {
    switch (difficulty) {
      case 'easy':
        return {
          label: 'Facile',
          color: 'from-emerald-500 to-green-500',
          badgeColor: 'bg-emerald-400 text-white',
          icon: <BarChart className="w-3 h-3" />
        };
      case 'medium':
        return {
          label: 'Moyen',
          color: 'from-amber-500 to-yellow-500',
          badgeColor: 'bg-amber-400 text-white',
          icon: <BarChart className="w-3 h-3" />
        };
      case 'hard':
        return {
          label: 'Difficile',
          color: 'from-rose-500 to-pink-500',
          badgeColor: 'bg-rose-400 text-white',
          icon: <BarChart className="w-3 h-3" />
        };
      default:
        return {
          label: difficulty,
          color: 'from-gray-500 to-gray-400',
          badgeColor: 'bg-gray-400 text-white',
          icon: <BarChart className="w-3 h-3" />
        };
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

  // Check if solution exists
  const hasSolution = !!content.solution;
  
  // Check if the content has chapters
  const hasChapters = content.chapters && content.chapters.length > 0;
  const hasSubfields = content.subfields && content.subfields.length > 0;
  
  // Get difficulty info
  const difficultyInfo = getDifficultyInfo(content.difficulty);
  
  // Truncate title if too long
  const truncateTitle = (title: string, maxLength = 50) => {
    if (title.length <= maxLength) return title;
    return title.substring(0, maxLength) + '...';
  };

  return (
    <div
      className="relative group bg-white rounded-xl shadow-md transition-all duration-300 border border-gray-200 overflow-hidden transform hover:-translate-y-2 hover:shadow-2xl hover:border-purple-300 h-full"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex flex-col h-full">
        {/* Card Header with Improved Styling */}
        <div className="relative bg-gradient-to-r from-purple-600 to-indigo-600 p-3 flex-shrink-0">
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

          {/* Header Content with Save Button */}
          <div className="flex justify-between items-start mb-2 relative z-10">
            {/* Title with Solution Indicator */}
            <div className="flex items-start gap-1.5 flex-1 min-w-0">
              {hasSolution && (
                <div className="flex-shrink-0 bg-emerald-400 p-1 rounded-full mt-1 transform transition-transform group-hover:scale-110">
                  <Lightbulb className="w-3 h-3 text-white" />
                </div>
              )}
              <h3
                className="text-lg font-bold text-white leading-tight cursor-pointer hover:underline line-clamp-2"
                onClick={handleCardClick}
              >
                {truncateTitle(content.title)}
              </h3>
            </div>

            {/* Save Button */}
            <button
              onClick={handleSaveClick}
              className="p-1.5 rounded-full bg-white/10 hover:bg-white/30 transition-all cursor-pointer hover:scale-110 flex-shrink-0"
              aria-label={isSaved ? "Retirer des favoris" : "Ajouter aux favoris"}
              disabled={isSaving}
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 text-white animate-spin" />
              ) : (
                <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-yellow-300 text-yellow-300' : 'text-white'}`} />
              )}
            </button>
          </div>

          {/* Difficulty and Subject Tags */}
          <div className="flex flex-wrap gap-1 relative z-10">
            {/* Subject Tag */}
            {content.subject && (
              <span
                className="bg-white/20 backdrop-blur-sm px-2 py-0.5 rounded-full text-xs font-medium text-white flex items-center cursor-pointer hover:bg-white/30 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  // Navigate to subject filter or similar action
                }}
              >
                <BookOpen className="w-3 h-3 mr-1" />
                {content.subject.name}
              </span>
            )}

            {/* Difficulty Badge */}
            <span className={`${difficultyInfo.badgeColor} px-2 py-0.5 rounded-full text-xs font-medium flex items-center cursor-pointer hover:opacity-90 transition-opacity`}>
              {difficultyInfo.icon}
              <span className="ml-1">{difficultyInfo.label}</span>
            </span>

            {/* Class Levels Badge - if available */}
            {content.class_levels && content.class_levels.length > 0 && (
              <span
                className="bg-white/20 backdrop-blur-sm px-2 py-0.5 rounded-full text-xs font-medium text-white flex items-center cursor-pointer hover:bg-white/30 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  // Navigate to class level filter or similar action
                }}
              >
                <GraduationCap className="w-3 h-3 mr-1" />
                {content.class_levels[0].name}
              </span>
            )}
          </div>
        </div>

        {/* Content Preview */}
        <div className="px-4 py-3 cursor-pointer flex-grow overflow-hidden" onClick={handleCardClick}>
          <div className="prose prose-sm max-w-none text-gray-700 line-clamp-3">
            <TipTapRenderer content={content.content} compact={true} />
          </div>
        </div>

        {/* Tags Section */}
        <div className="px-3 pb-2 flex-shrink-0">
          <div className="flex items-center gap-1 overflow-hidden">
            {hasChapters && content.chapters.slice(0, 1).map(chapter => (
              <span
                key={chapter.id}
                className="inline-flex items-center bg-purple-50 text-purple-600 px-2 py-0.5 rounded text-xs border border-purple-100 hover:bg-purple-100 transition-colors cursor-pointer max-w-[120px]"
                onClick={(e) => {
                  e.stopPropagation();
                  // Navigate to chapter filter
                }}
              >
                <Tag className="w-3 h-3 mr-1 flex-shrink-0" />
                <span className="truncate">{chapter.name}</span>
              </span>
            ))}

            {hasSubfields && content.subfields.slice(0, 1).map(subfield => (
              <span
                key={subfield.id}
                className="inline-flex items-center bg-blue-50 text-blue-600 px-2 py-0.5 rounded text-xs border border-blue-100 hover:bg-blue-100 transition-colors cursor-pointer max-w-[120px]"
                onClick={(e) => {
                  e.stopPropagation();
                  // Navigate to subfield filter
                }}
              >
                <Layers className="w-3 h-3 mr-1 flex-shrink-0" />
                <span className="truncate">{subfield.name}</span>
              </span>
            ))}
          </div>
        </div>

        {/* Card Footer */}
        <div className="mt-auto px-4 py-3 bg-gradient-to-r from-gray-50 to-gray-100 border-t border-gray-200 flex justify-between items-center flex-shrink-0">
          {/* Left side - Vote and Stats */}
          <div className="flex items-center gap-3">
            {/* Vote buttons */}
            <div className="w-20">
              <VoteButtons
                initialVotes={content.vote_count}
                onVote={(value) => {
                  const contentType = getContentType();
                  onVote(content.id.toString(), value, contentType);
                }}
                vertical={false}
                userVote={content.user_vote}
                size="sm"
              />
            </div>

            <div className="flex items-center gap-3 text-xs text-gray-600">
              <span className="flex items-center gap-1">
                <Eye className="w-4 h-4 text-purple-500" />
                <span className="font-medium">{content.view_count}</span>
              </span>

              <span className="flex items-center gap-1">
                <MessageSquare className="w-4 h-4 text-purple-500" />
                <span className="font-medium">{(content.comments || []).length}</span>
              </span>
            </div>
          </div>

          {/* Right side - Time */}
          <div className="flex items-center text-xs text-gray-500">
            <span className="whitespace-nowrap">{getTimeAgo(content.created_at)}</span>
          </div>
        </div>
      </div>

      {/* Centered Action Button */}
      <div
        className={`absolute inset-0 flex items-center justify-center z-10 pointer-events-none transition-all duration-300 ${isHovered ? 'opacity-100' : 'opacity-0'}`}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleCardClick(e);
          }}
          className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-3 rounded-xl shadow-2xl flex items-center gap-2 transition-all duration-300 pointer-events-auto transform hover:scale-105 font-semibold"
          aria-label={`Voir ${getContentType() === 'exercise' ? 'l\'exercice' : getContentType() === 'lesson' ? 'la leçon' : 'l\'examen'}`}
        >
          <span>{getContentType() === 'exercise' ? 'Voir l\'exercice' : getContentType() === 'lesson' ? 'Voir la leçon' : 'Voir l\'examen'}</span>
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

// Define the BarChart component for difficulty indicators
const BarChart = ({ className }: { className: string }) => (
  <div className={`${className} flex items-end space-x-0.5`}>
    <div className="w-1 h-1 bg-current rounded-sm"></div>
    <div className="w-1 h-2 bg-current rounded-sm"></div>
    <div className="w-1 h-3 bg-current rounded-sm"></div>
  </div>
);