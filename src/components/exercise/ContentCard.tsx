import React, { useState, useEffect, memo } from 'react';
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
  Layers,
  BookMarked,
  ChevronRight,
  Share2,
  Award,
  Calendar,
} from 'lucide-react';
import { Content, Difficulty, VoteValue } from '@/types';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { VoteButtons } from '@/components/VoteButtons';
import TipTapRenderer from '@/components/editor/TipTapRenderer';
import { useAuthModal } from '@/components/AuthController';
import {
  saveExercise, unsaveExercise,
  saveLesson, unsaveLesson,
  saveExam, unsaveExam
} from '@/lib/api';
import '@/lib/styles.css';

// Memoize TipTapRenderer to improve performance but keep the onReady callback capability
const MemoizedTipTapRenderer = memo(
  ({ content, onReady }: { content: string; onReady?: () => void }) => (
    <TipTapRenderer content={content} onReady={onReady} />
  ),
  (prevProps, nextProps) => prevProps.content === nextProps.content
);

interface ContentCardProps {
  content: Content | any; // Accept Content, Lesson, or Exam
  onVote: (id: string, value: VoteValue) => void;
  onDelete?: (id: string) => void;
  onEdit?: (id: string) => void;
  onSave?: (id: string, saved: boolean) => void;
  contentType?: 'exercise' | 'lesson' | 'exam'; // Optional type specification
  compact?: boolean; // Compact mode for recommendations
}

export const ContentCard: React.FC<ContentCardProps> = ({
  content,
  onVote,
  onDelete,
  onEdit,
  onSave,
  contentType = 'exercise', // Default to exercise for backward compatibility
  compact = false,
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAuthor = user?.id === content.author.id;
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const { isAuthenticated } = useAuth();
  const { openModal } = useAuthModal(); 
  
  // Add a loading state for content rendering - default to false to hide content initially
  const [contentLoaded, setContentLoaded] = useState<boolean>(false);
  
  // Handler for when TipTap is ready
  const handleTipTapReady = () => {
    setContentLoaded(true);
  };
  
  // Check if solution exists
  const hasSolution = !!content.solution;

  // Get navigation path based on content type
  const getNavigationPath = () => {
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

    // Navigate to the appropriate content page (allow unauthenticated users to view)
    navigate(getNavigationPath());
  };

  useEffect(() => {
    if (content && content.user_save !== undefined) {
      setIsSaved(content.user_save);
    }
  }, [content]);
  
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
            const unsaveFn = contentType === 'lesson' ? unsaveLesson : contentType === 'exam' ? unsaveExam : unsaveExercise;
            await unsaveFn(content.id);
            setIsSaved(false);
        } else {
            // If not saved, save it (API factory handles "already saved" case)
            const saveFn = contentType === 'lesson' ? saveLesson : contentType === 'exam' ? saveExam : saveExercise;
            await saveFn(content.id);
            setIsSaved(true);
        }

        // Call the callback if provided
        if (onSave) {
            onSave(content.id, !isSaved);
        }
    } catch (error) {
        console.error('Error toggling save status:', error);
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
          bgColor: 'bg-emerald-50',
          textColor: 'text-emerald-700',
          borderColor: 'border-emerald-100',
          icon: <BarChart className="w-3 h-3" />
        };
      case 'medium':
        return {
          label: 'Moyen',
          color: 'from-amber-500 to-yellow-500',
          bgColor: 'bg-amber-50',
          textColor: 'text-amber-700',
          borderColor: 'border-amber-100',
          icon: <BarChart className="w-3 h-3" />
        };
      case 'hard':
        return {
          label: 'Difficile',
          color: 'from-rose-500 to-pink-500',
          bgColor: 'bg-rose-50',
          textColor: 'text-rose-700',
          borderColor: 'border-rose-100',
          icon: <BarChart className="w-3 h-3" />
        };
      default:
        return {
          label: difficulty,
          color: 'from-gray-500 to-gray-400',
          bgColor: 'bg-gray-50',
          textColor: 'text-gray-700',
          borderColor: 'border-gray-100',
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

  // Check if content has difficulty (exercises and exams have it, lessons don't)
  const hasDifficulty = content.difficulty !== undefined && content.difficulty !== null;

  // Get difficulty info
  const difficultyInfo = hasDifficulty ? getDifficultyInfo(content.difficulty) : null;
  
  // Truncate title if too long
  const truncateTitle = (title: string, maxLength = 60) => {
    if (title.length <= maxLength) return title;
    return title.substring(0, maxLength) + '...';
  };

  // Calculate total tags for the "+X" indicator
  const totalMoreTags = (
    (hasChapters ? Math.max(0, content.chapters.length - 1) : 0) + 
    (hasSubfields ? Math.max(0, content.subfields.length - 1) : 0) + 
    (hasTheorems ? Math.max(0, content.theorems.length - 1) : 0)
  );

  // Get color scheme based on content type
  const getContentTypeColors = () => {
    switch (contentType) {
      case 'lesson':
        return {
          gradient: 'from-gray-900 to-blue-800',
          hoverColor: 'text-blue-600',
          tagBgColor: 'bg-blue-50',
          tagTextColor: 'text-blue-900',
          tagBorderColor: 'border-blue-100',
          iconColor: 'text-blue-500',
          hoverBg: 'group-hover:bg-blue-50',
          hoverText: 'group-hover:text-blue-600',
          hoverBorder: 'group-hover:border-blue-100'
        };
      case 'exam':
        return {
          gradient: 'from-gray-900 to-green-800',
          hoverColor: 'text-green-700',
          tagBgColor: 'bg-green-90',
          tagTextColor: 'text-green-900',
          tagBorderColor: 'border-green-100',
          iconColor: 'text-green-500',
          hoverBg: 'group-hover:bg-green-50',
          hoverText: 'group-hover:text-green-600',
          hoverBorder: 'group-hover:border-green-100'
        };
      default: // exercise
        return {
          gradient: 'from-gray-700 to-purple-700',
          hoverColor: 'text-purple-600',
          tagBgColor: 'bg-purple-50',
          tagTextColor: 'text-purple-700',
          tagBorderColor: 'border-purple-100',
          iconColor: 'text-purple-500',
          hoverBg: 'group-hover:bg-indigo-50',
          hoverText: 'group-hover:text-indigo-600',
          hoverBorder: 'group-hover:border-indigo-100'
        };
    }
  };
  
  // Get colors for current content type
  const colors = getContentTypeColors();

  // Check if content has been viewed (has completion status)
  const isViewed = content.user_complete === 'success' || content.user_complete === 'review';

  return (
      <div
      className={`group h-full transition-all duration-300 ${compact ? 'hover:scale-[1.01]' : 'hover:scale-[1.02]'} ${isViewed ? 'opacity-60 hover:opacity-80' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={`flex flex-col h-full cursor-pointer rounded-xl overflow-hidden transform ${compact ? 'shadow hover:shadow-lg' : 'shadow-md hover:shadow-2xl'} transition-shadow duration-300 bg-white border border-gray-200`}
        onClick={handleCardClick}
      >
        {/* Card Header with Improved Styling */}
            <div className={`liquid-glass bg-gradient-to-r ${colors.gradient} ${compact ? 'p-2.5' : 'p-4'} relative overflow-hidden`}>
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
            {/* Title and Bookmark Section */}
            <div className={`flex justify-between items-start ${compact ? 'mb-1.5' : 'mb-3'}`}>
              <div className="flex items-start gap-2">
                {hasSolution && !compact && (
                  <div className="bg-emerald-400 p-1 rounded-full flex-shrink-0 mt-1 transition-transform duration-300 transform group-hover:scale-110">
                    <Lightbulb className="w-3 h-3 text-white" />
                  </div>
                )}
                <h2 className={`${compact ? 'text-sm' : 'text-2xl'} font-extrabold text-white ${compact ? 'leading-tight line-clamp-2' : 'leading-snug'} group-hover:underline decoration-2 decoration-white/60`}>
                  {compact ? content.title : truncateTitle(content.title)}
                </h2>
              </div>

              {/* Save Button with improved hover effect */}
              {!compact && (
              <div className="flex items-center gap-2 relative group/bookmark">
                <button
                  onClick={handleSaveClick}
                  className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-all hover:scale-110 flex-shrink-0"
                  aria-label={isSaved ? "Retirer des favoris" : "Ajouter aux favoris"}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <Loader2 className="w-5 h-5 text-white animate-spin" />
                  ) : (
                    <Bookmark className={`w-5 h-5 ${isSaved ? 'fill-yellow-300 text-yellow-300' : 'text-white/80'}`} />
                  )}
                </button>
                {/* Tooltip */}
                <span className="absolute -top-10 right-0 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover/bookmark:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                  {isSaved ? "Retirer des favoris" : "Sauvegarder cet exercice"}
                </span>
              </div>
              )}
            </div>

            {/* Tags Section - Made More Compact & Consistent */}
            {!compact && (
            <div className="flex flex-wrap items-center gap-2.5">
              {/* National Exam Badge - For exams only */}
              {contentType === 'exam' && (content as any).is_national_exam && (
                <span className="bg-blue-500 backdrop-blur-sm px-2 py-0.5 rounded-full text-xs font-bold text-white flex items-center shadow-md">
                  <Award className="w-3 h-3 mr-1" />
                  Examen National
                </span>
              )}

              {/* National Exam Year - For national exams only */}
              {contentType === 'exam' && (content as any).is_national_exam && (content as any).national_exam_date && (
                <span className="bg-white/30 backdrop-blur-sm px-2 py-0.5 rounded-full text-xs font-semibold text-white flex items-center">
                  <Calendar className="w-3 h-3 mr-1" />
                  {new Date((content as any).national_exam_date).getFullYear()}
                </span>
              )}

              {/* Subject Tag */}
              {content.subject && (
                <span className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-medium text-white flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5" />
                  {content.subject.name}
                </span>
              )}

              {/* Difficulty Badge - Only for content with difficulty (exercises and exams) */}
              {hasDifficulty && difficultyInfo && (
                <span className={`bg-gradient-to-r ${difficultyInfo.color} px-3 py-1 rounded-full text-xs font-semibold text-white flex items-center gap-1.5`}>
                  {difficultyInfo.icon}
                  <span>{difficultyInfo.label}</span>
                </span>
              )}

              {/* Class Level Badge */}
              {content.class_levels && content.class_levels.length > 0 && (
                <span className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-medium text-white flex items-center gap-1.5">
                  <GraduationCap className="w-3.5 h-3.5" />
                  {content.class_levels[0].name}
                </span>
              )}
            </div>
            )}
          </div>
        </div>

        {/* Content Preview with Loading State */}
        {!compact && (
        <div className="px-5 py-5 flex-grow relative">
          <div className={`transition-opacity duration-150 ${!contentLoaded ? 'opacity-0 absolute' : 'opacity-100'}`}>
            <div className={`prose prose-sm max-w-none text-gray-700 overflow-hidden leading-relaxed transition-all duration-300 ${isHovered ? 'line-clamp-6' : 'line-clamp-3'}`}>
              <MemoizedTipTapRenderer content={content.content} onReady={handleTipTapReady} />
            </div>
          </div>
          
          {!contentLoaded && (
            <div className="prose prose-sm max-w-none">
              <div className="h-4 w-full bg-gray-100 rounded animate-pulse mb-2"></div>
              <div className="h-4 w-3/4 bg-gray-100 rounded animate-pulse mb-2"></div>
              <div className="h-4 w-5/6 bg-gray-100 rounded animate-pulse"></div>
            </div>
          )}
        </div>
        )}

        {/* Footer Section with Integration - More Dynamic on Hover */}
        <div className={`mt-auto ${compact ? 'px-2.5 py-1.5' : 'px-5 py-3'} border-t border-gray-100 bg-gray-50 flex items-center justify-between transition-colors duration-300 group-hover:bg-white`}>
          {/* Left side - votes and tags */}
          <div className={`flex items-center ${compact ? 'gap-1.5 text-xs' : 'gap-3'} overflow-hidden flex-1`}>
            {/* Vote count (compact) or Vote Buttons (full) */}
            {compact ? (
              <span className="text-gray-600 font-medium flex items-center gap-1">
                ↑ {content.vote_count}
              </span>
            ) : (
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
            )}

            {/* Tags - More consistent styling between tag types */}
            {!compact && (
            <div className="flex items-center flex-wrap gap-1.5 overflow-hidden max-w-xs">
              {/* Chapter Tags */}
              {hasChapters && content.chapters.slice(0, 1).map((chapter: { id: string; name: string }) => (
                <span
                  key={chapter.id}
                  className={`${colors.tagBgColor} ${colors.tagTextColor} px-2 py-0.5 text-xs rounded-md flex items-center whitespace-nowrap ${colors.tagBorderColor} transition-transform duration-300 group-hover:scale-105`}
                >
                  <Tag className={`w-3 h-3 mr-1 ${colors.iconColor}`} />
                  <span className="truncate max-w-[80px]">{chapter.name}</span>
                </span>
              ))}
              
              {/* Subfield Tags */}
              {hasSubfields && content.subfields.slice(0, 1).map((subfield: { id: string; name: string }) => (
                <span
                  key={subfield.id}
                  className={`${colors.tagBgColor} ${colors.tagTextColor} px-2 py-0.5 text-xs rounded-md flex items-center whitespace-nowrap ${colors.tagBorderColor} transition-transform duration-300 group-hover:scale-105`}
                >
                  <Layers className={`w-3 h-3 mr-1 ${colors.iconColor}`} />
                  <span className="truncate max-w-[80px]">{subfield.name}</span>
                </span>
              ))}
              
              {/* Theorem Tags */}
              {hasTheorems && content.theorems.slice(0, 1).map((theorem: { id: string; name: string }) => (
                <span
                  key={theorem.id}
                  className={`${colors.tagBgColor} ${colors.tagTextColor} px-2 py-0.5 text-xs rounded-md flex items-center whitespace-nowrap ${colors.tagBorderColor} transition-transform duration-300 group-hover:scale-105`}
                >
                  <BookMarked className={`w-3 h-3 mr-1 ${colors.iconColor}`} />
                  <span className="truncate max-w-[80px]">{theorem.name}</span>
                </span>
              ))}
              
              {/* More Tag with nicer styling */}
              {totalMoreTags > 0 && (
                <span className={`bg-gray-50 text-gray-600 px-2 py-0.5 rounded-md text-xs flex-shrink-0 border border-gray-200 flex items-center ${colors.hoverBg} ${colors.hoverText} ${colors.hoverBorder} transition-colors duration-300`}>
                  <span>+{totalMoreTags}</span>
                </span>
              )}
            </div>
            )}
          </div>

          {/* Right side - stats and actions with improved interaction */}
          {!compact && (
          <div className="flex items-center gap-3">
            {/* Views */}
            <div className={`flex items-center text-xs text-gray-500 ${colors.hoverText} transition-colors duration-300 relative group/views`}>
              <Eye className={`w-4 h-4 mr-1 text-gray-400 ${colors.hoverText} transition-colors duration-300`} />
              <span>{content.view_count}</span>
              {/* Tooltip */}
              <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover/views:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                Vues
              </span>
            </div>

            {/* Divider */}
            <div className="h-4 w-px bg-gray-300"></div>

            {/* Comments Button - Improved hover effect */}
            <div className="relative group/comments">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`${getNavigationPath()}#comments`);
                }}
                className={`flex items-center text-xs text-gray-500 hover:${colors.hoverColor} transition-all duration-300 hover:scale-105`}
              >
                <MessageSquare className={`w-4 h-4 mr-1 text-gray-400 ${colors.hoverText} transition-colors duration-300`} />
                <span>{(content.comments || []).length}</span>
              </button>
              {/* Tooltip */}
              <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover/comments:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                Commentaires
              </span>
            </div>

            {/* Divider */}
            <div className="h-4 w-px bg-gray-300"></div>

            {/* Share Button - New Feature */}
            <div className="relative group/share">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigator.clipboard.writeText(window.location.origin + getNavigationPath());
                  // Add a toast notification here in a real implementation
                }}
                className="flex items-center text-xs text-gray-500 hover:text-indigo-600 transition-all duration-300 hover:scale-105"
              >
                <Share2 className="w-4 h-4 text-gray-400 group-hover:text-indigo-500 transition-colors duration-300" />
              </button>
              {/* Tooltip */}
              <span className="absolute -top-8 right-0 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover/share:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                Partager
              </span>
            </div>
            
            {/* Author actions - Always visible on hover with higher z-index */}
            {isAuthor && (
              <div className={`flex items-center gap-2 ml-2 transition-all duration-300 z-20 ${isHovered ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4 pointer-events-none'}`}>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit?.(content.id);
                  }}
                  className="h-8 px-2 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-100 transition-all duration-300 hover:shadow-md"
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
                  className="h-8 px-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 border border-red-100 transition-all duration-300 hover:shadow-md"
                  title="Supprimer"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" />
                  <span className="text-xs">Supprimer</span>
                </Button>
              </div>
            )}
          </div>
          )}
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
            className={`liquid-glass-button ${contentType === 'lesson' ? 'bg-blue-800/80 hover:bg-blue-900/90' : contentType === 'exam' ? 'bg-green-800/80 hover:bg-green-900/90' : 'bg-purple-600/80 hover:bg-purple-700/90'} text-white p-4 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 backdrop-blur-sm pointer-events-auto ${isHovered ? 'scale-10 opacity-80' : 'scale-40 opacity-100 hover:opacity-100'}`}
            aria-label={`Voir ${contentType === 'exercise' ? 'l\'exercice' : contentType === 'lesson' ? 'la leçon' : 'l\'examen'}`}
          >
            <ChevronRight className="w-8 h-8" />
            <p className="font-medium text-lg mb-1 text-white">
              {contentType === 'exercise' ? 'Voir l\'exercice' : contentType === 'lesson' ? 'Voir la leçon' : 'Voir l\'examen'}
            </p>
          </button>
        </div>
      </div>
      
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes bounceHorizontal {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(8px); }
        }
        
        .animate-fade-in {
          animation: fadeIn 0.3s ease-in-out;
        }
        
        .animate-bounce-horizontal {
          animation: bounceHorizontal 1s infinite;
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