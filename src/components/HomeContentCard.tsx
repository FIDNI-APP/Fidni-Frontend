// src/components/HomeContentCard.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  MessageSquare, 
  Tag, 
  Eye, 
  BarChart3, 
  GraduationCap,
  Bookmark,
  Lightbulb,
  ChevronRight,
  BookOpen,
  Layers,
  Share2,
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
  onVote: (id: string, value: VoteValue) => void;
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
            // If currently saved, unsave it
            await unsaveExercise(content.id);
            setIsSaved(false);
        } else {
            // If not saved, save it
            try {
                await saveExercise(content.id);
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
            onSave(content.id, !isSaved);
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
      className="relative group bg-white rounded-xl shadow-md transition-all duration-300 border border-gray-200 overflow-hidden h-full transform hover:-translate-y-1 hover:shadow-xl hover:border-indigo-300"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Card Header with Improved Styling */}
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
        
        {/* Header Content with Save Button */}
        <div className="flex justify-between items-start mb-3 relative z-10">
          {/* Title with Solution Indicator */}
          <div className="flex items-start gap-1.5">
            {hasSolution && (
              <div className="flex-shrink-0 bg-emerald-400 p-1 rounded-full mt-1 transform transition-transform group-hover:scale-110">
                <Lightbulb className="w-3 h-3 text-white" />
              </div>
            )}
            <h3 
              className="text-lg font-bold text-white leading-tight cursor-pointer hover:underline" 
              onClick={handleCardClick}
            >
              {truncateTitle(content.title)}
            </h3>
          </div>
          
          {/* Save Button */}
          <button 
            onClick={handleSaveClick}
            className="p-1.5 rounded-full bg-white/10 hover:bg-white/30 transition-all cursor-pointer hover:scale-110"
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
        <div className="flex flex-wrap gap-1.5 mb-2">
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
      
      {/* Content Preview - Added click handler */}
      <div className="px-4 py-4 flex-grow cursor-pointer" onClick={handleCardClick}>
        <div className="prose prose-sm max-w-none text-gray-700 line-clamp-3 overflow-hidden">
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
              className="bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded text-xs flex items-center border border-purple-100 hover:bg-purple-100 transition-colors cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                // Navigate to chapter filter
              }}
            >
              <Tag className="w-2.5 h-2.5 mr-0.5" />
              <span className="truncate max-w-[80px]">{chapter.name}</span>
            </span>
          ))}
          
          {hasSubfields && content.subfields.slice(0, 1).map(subfield => (
            <span
              key={subfield.id}
              className="bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded text-xs flex items-center border border-blue-100 hover:bg-blue-100 transition-colors cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                // Navigate to subfield filter
              }}
            >
              <Layers className="w-2.5 h-2.5 mr-0.5" />
              <span className="truncate max-w-[80px]">{subfield.name}</span>
            </span>
          ))}
        </div>
      </div>
      
      {/* Centered Action Button */}
      
      <div 
        className={`absolute inset-0 flex items-center justify-center z-10 pointer-events-none ${isHovered ? 'translate-x-0 opacity-100' : 'translate-x-4 opacity-0'}`}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleCardClick(e);
          }}
          className={`bg-indigo-600/80 hover:bg-indigo-700/90 text-white p-4 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 backdrop-blur-sm pointer-events-auto ${isHovered ? 'scale-10 opacity-100' : 'scale-40 opacity-40 hover:opacity-10'}`}
          aria-label="Voir l'exercice"
        >
          <ChevronRight className="w-8 h-8" />
          <p className="font-medium text-lg mb-1 text-white">Voir l'exercice</p>
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