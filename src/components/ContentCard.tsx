import React, { useState, useEffect } from 'react';
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
  Clock,
  Loader2,
  FileText
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
  const [showActions, setShowActions] = useState<boolean>(false);
  const { isAuthenticated } = useAuth();
  const { openModal } = useAuthModal(); 
  
  // Check initial save status when component mounts
  useEffect(() => {
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

  const getDifficultyColor = (difficulty: Difficulty): string => {
    switch (difficulty) {
      case 'easy':
        return 'bg-emerald-100 text-emerald-800';
      case 'medium':
        return 'bg-amber-100 text-amber-800';
      case 'hard':
        return 'bg-rose-100 text-rose-800';
      default:
        return 'bg-gray-100 text-gray-800';
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
        className="flex flex-col h-full bg-white cursor-pointer rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100 hover:border-indigo-300"
        onClick={handleCardClick}
      >
        {/* Header with gradient background */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-5 pb-4 text-white">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              {/* Title with solution indicator */}
              <div className="flex items-center">
                {hasSolution && (
                  <div className="bg-emerald-400 p-1 rounded-full mr-2 flex-shrink-0">
                    <Lightbulb className="w-3 h-3 text-white" />
                  </div>
                )}
                <h2 className="text-xl font-bold text-white leading-tight truncate group-hover:underline">
                  {content.title}
                </h2>
              </div>
              
              <div className="flex flex-wrap items-center gap-2 mt-2">
                {/* User info */}
                <div className="flex items-center text-xs text-white/90">
                  <User className="w-3 h-3 mr-1 text-white/70" />
                  <span>{content.author.username}</span>
                </div>
                
                {/* Time info */}
                <div className="flex items-center text-xs text-white/90">
                  <Clock className="w-3 h-3 mr-1 text-white/70" />
                  <span>{getTimeAgo(content.created_at)}</span>
                </div>
                
                {/* Difficulty badge - with colors */}
                {content.difficulty === 'easy' && (
                  <span className="bg-emerald-500 px-2 py-0.5 rounded-full text-xs font-medium flex items-center">
                    <BarChart3 className="w-3 h-3 mr-1" />
                    <span>Facile</span>
                  </span>
                )}
                {content.difficulty === 'medium' && (
                  <span className="bg-amber-500 px-2 py-0.5 rounded-full text-xs font-medium flex items-center">
                    <BarChart3 className="w-3 h-3 mr-1" />
                    <span>Moyen</span>
                  </span>
                )}
                {content.difficulty === 'hard' && (
                  <span className="bg-rose-500 px-2 py-0.5 rounded-full text-xs font-medium flex items-center">
                    <BarChart3 className="w-3 h-3 mr-1" />
                    <span>Difficile</span>
                  </span>
                )}
              </div>
            </div>
            
            {/* Save button */}
            <button 
              onClick={handleSaveClick}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors flex-shrink-0"
              aria-label={isSaved ? "Retirer des favoris" : "Ajouter aux favoris"}
              disabled={isSaving}
            >
              {isSaving ? (
                <Loader2 className="w-5 h-5 text-white animate-spin" />
              ) : (
                <Bookmark className={`w-5 h-5 ${isSaved ? 'fill-yellow-400 text-yellow-400' : 'text-white/80'}`} />
              )}
            </button>
          </div>
        </div>
        
        {/* Content preview area */}
        <div className="px-5 py-4 flex-grow">
          <div className="prose prose-sm max-w-none text-gray-600 line-clamp-3">
            <TipTapRenderer content={content.content} />
          </div>
        </div>
        
        {/* Footer with stats, metadata, and actions */}
        <div className="px-5 py-3 bg-gray-50 border-t border-gray-100">
          <div className="flex items-center justify-between">
            {/* Left side - votes and metadata tags */}
            <div className="flex items-center gap-3 overflow-x-auto">
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
              
              {/* Metadata tags next to votes */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                {/* Subject tag */}
                {content.subject && (
                  <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-md text-xs font-medium">
                    {content.subject.name}
                  </span>
                )}
                
                {/* Class Level Badges */}
                {content.class_levels && content.class_levels.map((level) => (
                  <span
                    key={level.id}
                    className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded-md text-xs font-medium flex items-center"
                  >
                    <GraduationCap className="w-3 h-3 mr-1 text-indigo-500" />
                    {level.name}
                  </span>
                ))}
                
                {/* Chapter tags */}
                {hasChapters && content.chapters.slice(0, 2).map(chapter => (
                  <span
                    key={chapter.id}
                    className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded-md text-xs flex-shrink-0 flex items-center whitespace-nowrap"
                  >
                    <Tag className="w-3 h-3 mr-1 text-purple-500" />
                    {chapter.name}
                  </span>
                ))}
                
                {/* Subfield tags */}
                {hasSubfields && content.subfields.slice(0, 1).map(subfield => (
                  <span
                    key={subfield.id}
                    className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md text-xs flex-shrink-0 flex items-center whitespace-nowrap"
                  >
                    <Layers className="w-3 h-3 mr-1 text-blue-500" />
                    {subfield.name}
                  </span>
                ))}
                
                {/* Theorem tags */}
                {hasTheorems && content.theorems.slice(0, 1).map(theorem => (
                  <span
                    key={theorem.id}
                    className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded-md text-xs flex-shrink-0 flex items-center whitespace-nowrap"
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
                  <span className="bg-gray-50 text-gray-600 px-2 py-0.5 rounded-md text-xs flex-shrink-0 border border-gray-200">
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
            <div className="flex items-center gap-4">
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
              
              {/* Author actions */}
              {isAuthor && showActions && (
                <div className="flex items-center ml-1 gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit?.(content.id);
                    }}
                    className="h-8 px-2 rounded-lg bg-white text-indigo-600 hover:bg-indigo-50 border border-indigo-100"
                    title="Modifier"
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    <span className="text-xs">Modifier</span>
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete?.(content.id);
                    }}
                    className="h-8 px-2 rounded-lg bg-white text-red-600 hover:bg-red-50 border border-red-100"
                    title="Supprimer"
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    <span className="text-xs">Supprimer</span>
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