import React from 'react';
import { Timer, BarChart3, BookOpen, User, Eye, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Difficulty } from '@/types';

interface ExerciseSidebarProps {
  timer: number;
  timerActive: boolean;
  toggleTimer: () => void;
  resetTimer: () => void;
  difficultyRating: number | null;
  rateDifficulty: (rating: number) => void;
  formatTime: (seconds: number) => string;
  viewCount: number;
  voteCount: number;
  commentsCount: number;
}

export const ExerciseSidebar: React.FC<ExerciseSidebarProps> = ({
  timer,
  timerActive,
  toggleTimer,
  resetTimer,
  difficultyRating,
  rateDifficulty,
  formatTime,
  viewCount,
  voteCount,
  commentsCount
}) => {
  return (
    <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden divide-y divide-gray-100">
      {/* Timer Section */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium flex items-center text-sm">
            <Timer className="w-4 h-4 mr-1.5" />
            Chronomètre
          </h3>
          <div className="font-mono text-xl font-bold">{formatTime(timer)}</div>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={toggleTimer} 
            className={`flex-1 h-9 text-sm ${
              timerActive 
                ? 'bg-red-500 hover:bg-red-600 border-red-400' 
                : 'bg-white text-indigo-700 hover:bg-indigo-50'
            }`}
          >
            {timerActive ? 'Pause' : 'Démarrer'}
          </Button>
          <Button 
            onClick={resetTimer} 
            variant="outline" 
            className="flex-1 h-9 text-sm bg-indigo-500/20 border-indigo-300/30 text-white hover:bg-indigo-500/30"
          >
            Réinitialiser
          </Button>
        </div>
      </div>
      
      {/* Status Buttons Section included in ExerciseContent component */}
      
      {/* Difficulty Rating */}
      <div className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <BarChart3 className="w-4 h-4 text-indigo-600" />
          <span className="font-medium text-gray-800 text-sm">Évaluer la difficulté</span>
        </div>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map(rating => (
            <button 
              key={rating}
              onClick={() => rateDifficulty(rating)}
              className={`flex-1 p-1.5 rounded text-sm transition-all ${
                difficultyRating === rating 
                  ? 'bg-indigo-600 text-white shadow-sm' 
                  : 'bg-gray-50 hover:bg-gray-100 text-gray-700'
              }`}
            >
              {rating}
            </button>
          ))}
        </div>
      </div>
      
      {/* Exercise Statistics */}
      <div className="p-4">
        <h3 className="font-medium text-gray-800 text-sm mb-2">Statistiques</h3>
        <div className="space-y-1.5">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Vues</span>
            <span className="font-medium">{viewCount}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Votes</span>
            <span className="font-medium">{voteCount}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Commentaires</span>
            <span className="font-medium">{commentsCount}</span>
          </div>
        </div>
      </div>
      
      {/* Related Exercises Section */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-medium text-gray-800 text-sm flex items-center gap-1.5">
            <BookOpen className="w-4 h-4 text-indigo-600" />
            Exercices similaires
          </h3>
          <Button 
            variant="ghost" 
            size="sm"
            className="text-indigo-600 h-6 p-0 text-xs hover:bg-transparent hover:text-indigo-800"
          >
            Voir plus
          </Button>
        </div>
        
      </div>
    </div>
  );
};

// Related Exercise Card Component
interface RelatedExerciseCardProps {
  title: string;
  subject: string;
  difficulty: Difficulty;
}

export const RelatedExerciseCard: React.FC<RelatedExerciseCardProps> = ({ 
  title, 
  subject, 
  difficulty 
}) => {
  const getDifficultyColor = (diff: Difficulty): string => {
    switch (diff) {
      case 'easy': return 'bg-emerald-100 text-emerald-700';
      case 'medium': return 'bg-amber-100 text-amber-700';
      case 'hard': return 'bg-rose-100 text-rose-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };
  
  const getDifficultyLabel = (diff: Difficulty): string => {
    switch (diff) {
      case 'easy': return 'Facile';
      case 'medium': return 'Moyen';
      case 'hard': return 'Difficile';
      default: return diff;
    }
  };
  
  return (
    <div className="group p-2 rounded-lg border border-gray-100 hover:border-indigo-200 hover:shadow-sm transition-all cursor-pointer">
      <h4 className="font-medium text-gray-800 text-sm group-hover:text-indigo-600 transition-colors line-clamp-1">{title}</h4>
      <div className="mt-1.5 flex items-center gap-1.5">
        <span className="bg-indigo-100 text-indigo-700 text-xs px-1.5 py-0.5 rounded">{subject}</span>
        <span className={`text-xs px-1.5 py-0.5 rounded ${getDifficultyColor(difficulty)}`}>
          {getDifficultyLabel(difficulty)}
        </span>
      </div>
    </div>
  );
};