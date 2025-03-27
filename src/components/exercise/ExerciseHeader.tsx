import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Calendar, Eye, Share2, Bookmark, MoreHorizontal, GraduationCap, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Content, Difficulty } from '@/types';

interface ExerciseHeaderProps {
  exercise: Content;
  savedForLater: boolean;
  loadingStates: {
    save: boolean;
    progress: boolean;
  };
  toggleSavedForLater: () => Promise<void>;
  formatTimeAgo: (dateString: string) => string;
  isAuthor: boolean;
}

export const ExerciseHeader: React.FC<ExerciseHeaderProps> = ({
  exercise,
  savedForLater,
  loadingStates,
  toggleSavedForLater,
  formatTimeAgo,
  isAuthor
}) => {
  const navigate = useNavigate();

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

  return (
    <div className="bg-gradient-to-r from-blue-800 to-indigo-900 text-white rounded-xl overflow-hidden shadow-lg mb-6">
      <div className="px-6 pt-6 pb-4">
        {/* Navigation row */}
        <div className="flex justify-between items-center mb-6">
          <Button 
            onClick={() => navigate('/exercises')}
            variant="ghost"
            className="text-white/80 hover:text-white hover:bg-white/10 rounded-lg"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Retour
          </Button>
          
          <div className="flex items-center gap-2">
            {/* Save button */}
            <Button 
              onClick={toggleSavedForLater}
              variant="ghost"
              className={`rounded-lg text-white/80 hover:text-white hover:bg-white/10 ${savedForLater ? 'bg-white/20' : ''}`}
              disabled={loadingStates.save}
            >
              {loadingStates.save ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : (
                <Bookmark className={`w-5 h-5 mr-1.5 ${savedForLater ? 'fill-white' : ''}`} />
              )}
              {savedForLater ? 'Enregistré' : 'Enregistrer'}
            </Button>
            
            {/* Share button */}
            <Button 
              variant="ghost"
              className="rounded-lg text-white/80 hover:text-white hover:bg-white/10"
            >
              <Share2 className="w-5 h-5 mr-1.5" />
              Partager
            </Button>
            
            {/* More options dropdown for author */}
            {isAuthor && (
              <div className="relative">
                <Button 
                  variant="ghost"
                  className="rounded-lg text-white/80 hover:text-white hover:bg-white/10"
                >
                  <MoreHorizontal className="w-5 h-5" />
                </Button>
                {/* Dropdown menu would be implemented here */}
              </div>
            )}
          </div>
        </div>
        
        {/* Exercise title and metadata */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-6">
          <div className="max-w-3xl">
            <h1 className="text-3xl font-bold mb-3">{exercise.title}</h1>
            
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <div className="flex items-center">
                <User className="w-4 h-4 mr-1.5 text-indigo-300" />
                <span className="text-indigo-100">{exercise.author.username}</span>
              </div>
              
              <div className="flex items-center">
                <Calendar className="w-4 h-4 mr-1.5 text-indigo-300" />
                <span className="text-indigo-100">{formatTimeAgo(exercise.created_at)}</span>
              </div>
              
              <div className="flex items-center">
                <Eye className="w-4 h-4 mr-1.5 text-indigo-300" />
                <span className="text-indigo-100">{exercise.view_count} vues</span>
              </div>
            </div>
          </div>
          
          {/* Main Category Tags in header */}
          <div className="flex flex-wrap gap-2">
            {exercise.subject && (
              <span className="bg-white/20 backdrop-blur-sm text-white px-3 py-1.5 rounded-md text-sm font-medium flex items-center">
                <BookOpen className="w-4 h-4 mr-1.5 text-indigo-300" />
                {exercise.subject.name}
              </span>
            )}
            
            {exercise.class_levels && exercise.class_levels.length > 0 && (
              <span className="bg-white/20 backdrop-blur-sm text-white px-3 py-1.5 rounded-md text-sm font-medium flex items-center">
                <GraduationCap className="w-4 h-4 mr-1.5 text-indigo-300" />
                {exercise.class_levels[0].name}
              </span>
            )}
            
            <span className={`bg-gradient-to-r ${getDifficultyColor(exercise.difficulty)} px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-1.5`}>
              <DifficultyIcon difficulty={exercise.difficulty} />
              <span>{getDifficultyLabel(exercise.difficulty)}</span>
            </span>
          </div>
        </div>
        
        {/* We don't include the tab navigation here as it's being rendered in the parent component */}
      </div>
    </div>
  );
};

// Helper components
export const DifficultyIcon = ({ difficulty }: { difficulty: Difficulty }) => {
  return (
    <svg 
      viewBox="0 0 24 24" 
      className="w-4 h-4"
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <path d="M3 3v18h18"/>
      <path d={
        difficulty === 'easy' 
          ? "M18 17H9V8" 
          : difficulty === 'medium' 
            ? "M18 12H9v-4M9 16v-4" 
            : "M18 8H9v4M9 16v-4M18 12h-4"
      }/>
    </svg>
  );
};

export const getDifficultyLabel = (difficulty: Difficulty): string => {
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