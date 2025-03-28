import React, { useState } from 'react';
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
  Lightbulb,
  Loader2,
  CheckCircle,
  Layers,
  BookMarked,
  ChevronRight
} from 'lucide-react';
import { Content, Difficulty, VoteValue } from '@/types';
import { Button } from './ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { VoteButtons } from './VoteButtons';
import TipTapRenderer from '@/components/editor/TipTapRenderer';
import { useAuthModal } from '@/components/AuthController';
import { saveExercise, unsaveExercise, getExerciseUserStatus } from '@/lib/api';

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
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const { isAuthenticated } = useAuth();
  const { openModal } = useAuthModal(); 
  
  // Check initial save status when component mounts
  React.useEffect(() => {
    const checkSaveStatus = async () => {
      if (isAuthenticated) {
        try {
          const status = await getExerciseUserStatus(content.id);
          setIsSaved(status.saved);
        } catch (error) {
          console.error("Error checking save status:", error);
        }
      }
    };
    
    checkSaveStatus();
  }, [content.id, isAuthenticated]);
  
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
      } else {
        // If not saved, save it
        await saveExercise(content.id);
      }
      
      // Update local state
      setIsSaved(!isSaved);
      
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
          color: 'from-emerald-500 to-green-500 border-emerald-400',
          className: 'bg-emerald-50 text-emerald-700 border-emerald-100',
          icon: <BarChart className="w-3 h-3" />
        };
      case 'medium':
        return {
          label: 'Moyen',
          color: 'from-amber-500 to-yellow-500 border-amber-400',
          className: 'bg-amber-50 text-amber-700 border-amber-100',
          icon: <BarChart className="w-3 h-3" />
        };
      case 'hard':
        return {
          label: 'Difficile',
          color: 'from-rose-500 to-pink-500 border-rose-400',
          className: 'bg-rose-50 text-rose-700 border-rose-100',
          icon: <BarChart className="w-3 h-3" />
        };
      default:
        return {
          label: difficulty,
          color: 'from-gray-500 to-gray-400 border-gray-400',
          className: 'bg-gray-50 text-gray-700 border-gray-100',
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

  // Check if the content has theorems and subfields
  const hasTheorems = content.theorems && content.theorems.length > 0;
  const hasSubfields = content.subfields && content.subfields.length > 0;
  const hasChapters = content.chapters && content.chapters.length > 0;
  
  // Get difficulty info
  const difficultyInfo = getDifficultyInfo(content.difficulty);
  
  // Truncate title if too long
  const truncateTitle = (title: string, maxLength = 60) => {
    if (title.length <= maxLength) return title;
    return title.substring(0, maxLength) + '...';
  };

  return (
    <div
      className="group h-full transition-all duration-300"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div 
        className="flex flex-col h-full bg-white cursor-pointer rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100 hover:border-indigo-300 transform hover:-translate-y-1"
        onClick={handleCardClick}
      >
        {/* Card Header with Advanced Styling - TITLE NOW FIRST */}
        <div className="bg-gradient-to-r from-indigo-700 to-purple-700 p-5 relative overflow-hidden">
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
          
          <div className="relative">
            {/* Title and Solution Indicator - MOVED TO TOP */}
            <div className="flex items-start gap-2 mb-4">
              {hasSolution && (
                <div className="bg-emerald-400 p-1 rounded-full mr-1 flex-shrink-0 mt-1">
                  <Lightbulb className="w-3 h-3 text-white" />
                </div>
              )}
              <h2 className="text-xl font-bold text-white leading-tight group-hover:underline">
                {truncateTitle(content.title)}
              </h2>
            </div>
            
            {/* Save Button */}
            <div className="flex justify-end mb-3">
              <button 
                onClick={handleSaveClick}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors flex-shrink-0"
                aria-label={isSaved ? "Retirer des favoris" : "Ajouter aux favoris"}
                disabled={isSaving}
              >
                {isSaving ? (
                  <Loader2 className="w-5 h-5 text-white animate-spin" />
                ) : (
                  <Bookmark className={`w-5 h-5 ${isSaved ? 'fill-yellow-300 text-yellow-300' : 'text-white/80'}`} />
                )}
              </button>
            </div>
            
            {/* Difficulty and Tags */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Subject Tag */}
              {content.subject && (
                <span className="bg-white/20 backdrop-blur-sm px-2 py-0.5 rounded-full text-xs font-medium text-white flex items-center">
                  <BookOpen className="w-3 h-3 mr-1" />
                  {content.subject.name}
                </span>
              )}
              
              {/* Difficulty Badge */}
              <span className={`bg-gradient-to-r ${difficultyInfo.color} px-2 py-0.5 rounded-full text-xs font-medium text-white flex items-center`}>
                {difficultyInfo.icon}
                <span className="ml-1">{difficultyInfo.label}</span>
              </span>
              
              {/* Class Level Badge */}
              {content.class_levels && content.class_levels.length > 0 && (
                <span className="bg-white/20 backdrop-blur-sm px-2 py-0.5 rounded-full text-xs font-medium text-white flex items-center">
                  <GraduationCap className="w-3 h-3 mr-1" />
                  {content.class_levels[0].name}
                </span>
              )}
            </div>
          </div>
        </div>
        
        {/* Content Preview */}
        <div className="px-5 py-4 flex-grow">
          <div className="prose prose-sm max-w-none text-gray-600 line-clamp-3 overflow-hidden">
            <TipTapRenderer content={content.content} />
          </div>
        </div>
        
        {/* Footer Section with Tags Integrated */}
        <div className="mt-auto px-5 py-3 border-t border-gray-100 bg-white flex items-center justify-between">
          {/* Left side - votes and tags */}
          <div className="flex items-center gap-3 overflow-hidden">
            {/* Vote Buttons */}
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
            
            {/* Tags moved from the section above */}
            <div className="flex items-center flex-wrap gap-1.5 overflow-hidden max-w-[200px]">
              {/* Chapter Tags */}
              {hasChapters && content.chapters.slice(0, 1).map(chapter => (
                <span
                  key={chapter.id}
                  className="bg-purple-50 text-purple-700 px-2 py-0.5 text-xs rounded-md flex items-center whitespace-nowrap border border-purple-100"
                >
                  <Tag className="w-3 h-3 mr-1 text-purple-500" />
                  <span className="truncate max-w-[80px]">{chapter.name}</span>
                </span>
              ))}
              
              {/* Subfield Tags */}
              {hasSubfields && content.subfields.slice(0, 1).map(subfield => (
                <span
                  key={subfield.id}
                  className="bg-blue-50 text-blue-700 px-2 py-0.5 text-xs rounded-md flex items-center whitespace-nowrap border border-blue-100"
                >
                  <Layers className="w-3 h-3 mr-1 text-blue-500" />
                  <span className="truncate max-w-[80px]">{subfield.name}</span>
                </span>
              ))}
              
              {/* Theorem Tags */}
              {hasTheorems && content.theorems.slice(0, 1).map(theorem => (
                <span
                  key={theorem.id}
                  className="bg-amber-50 text-amber-700 px-2 py-0.5 text-xs rounded-md flex items-center whitespace-nowrap border border-amber-100"
                >
                  <BookMarked className="w-3 h-3 mr-1 text-amber-500" />
                  <span className="truncate max-w-[80px]">{theorem.name}</span>
                </span>
              ))}
              
              {/* More Tag if needed */}
              {(
                (hasChapters ? Math.max(0, content.chapters.length - 1) : 0) + 
                (hasSubfields ? Math.max(0, content.subfields.length - 1) : 0) + 
                (hasTheorems ? Math.max(0, content.theorems.length - 1) : 0)
              ) > 0 && (
                <span className="bg-gray-50 text-gray-600 px-2 py-0.5 rounded-md text-xs flex-shrink-0 border border-gray-200 flex items-center">
                  <span>+{
                    (hasChapters ? Math.max(0, content.chapters.length - 1) : 0) + 
                    (hasSubfields ? Math.max(0, content.subfields.length - 1) : 0) + 
                    (hasTheorems ? Math.max(0, content.theorems.length - 1) : 0)
                  }</span>
                </span>
              )}
            </div>
          </div>
          
          {/* Right side - stats and actions */}
          <div className="flex items-center gap-3">
            {/* Views */}
            <div className="flex items-center text-xs text-gray-500">
              <Eye className="w-4 h-4 mr-1 text-gray-400" />
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
              <MessageSquare className="w-4 h-4 mr-1 text-gray-400" />
              <span>{(content.comments || []).length}</span>
            </button>
            
            {/* Author actions visible on hover */}
            {isAuthor && isHovered && (
              <div className="flex items-center gap-2 ml-2 animate-fade-in">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit?.(content.id);
                  }}
                  className="h-8 px-2 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-100"
                  title="Modifier"
                >
                  <Edit className="w-3.5 h-3.5 mr-1" />
                  <span className="text-xs">Modifier</span>
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete?.(content.id);
                  }}
                  className="h-8 px-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 border border-red-100"
                  title="Supprimer"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" />
                  <span className="text-xs">Supprimer</span>
                </Button>
              </div>
            )}
          </div>
        </div>
        
        {/* Call to action hover overlay - Completely restructured to ensure buttons remain clickable */}
        <div 
          onClick={handleCardClick}
          className={`absolute inset-0 z-10 flex items-center justify-center opacity-0 group-hover:opacity-40 transition-opacity duration-300 ${isHovered ? 'backdrop-blur-sm' : ''}`}
          style={{ 
            pointerEvents: 'none',  // Make the entire overlay non-interactive by default
          }}
        >
          <div 
            className="text-white text-center px-4 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300 bg-indigo-900/80 p-6 rounded-xl"
            style={{ pointerEvents: 'auto' }}  // Only the modal itself receives clicks
            onClick={(e) => {
              e.stopPropagation();  // Prevent propagation to parent handlers
              handleCardClick();
            }}
          >
            <CheckCircle className="w-8 h-8 mx-auto mb-2 text-white/90" />
            <p className="font-medium text-lg mb-3">Voir l'exercice</p>
            <div className="flex items-center justify-center">
              <ChevronRight className="w-5 h-5 animate-bounce-horizontal" />
            </div>
          </div>
        </div>
      </div>
      
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes bounceHorizontal {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(5px); }
        }
        
        .animate-fade-in {
          animation: fadeIn 0.3s ease-in-out;
        }
        
        .animate-bounce-horizontal {
          animation: bounceHorizontal 1s infinite;
        }
        
        .BarChart {
          display: inline-block;
        }
      `}</style>
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