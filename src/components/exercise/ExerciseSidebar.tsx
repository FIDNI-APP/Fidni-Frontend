import React from 'react';
import { Timer, BarChart3, BookOpen, User, Eye, MessageSquare, ThumbsUp } from 'lucide-react';
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
  markAsCompleted?: (status: 'success' | 'review') => void;
  loadingStates?: {
    save: boolean;
    progress: boolean;
  };
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
  commentsCount,
  markAsCompleted,
  loadingStates = { save: false, progress: false }
}) => {
  return (
    <div className="bg-white rounded-xl shadow-lg border-2 border-gray-100 overflow-hidden divide-y-2 divide-gray-100">
      {/* Gradient top accent */}
      <div className="h-1.5 bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-400"></div>

      {/* Timer Section - Redesigned */}
      <div className="p-6 bg-gradient-to-br from-white to-blue-50/20">
        <h3 className="font-bold text-gray-900 text-base mb-5 flex items-center gap-2">
          <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-lg">
            <Timer className="w-5 h-5 text-white" />
          </div>
          <span>Chronomètre</span>
        </h3>

        {/* Large Timer Display with Animation */}
        <div
          className={`text-center mb-6 p-8 rounded-2xl transition-all duration-300 ${
            timerActive
              ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-3 border-green-400 shadow-lg shadow-green-100'
              : timer > 0
                ? 'bg-gradient-to-br from-red-50 to-orange-50 border-3 border-red-400 shadow-lg shadow-red-100'
                : 'bg-gradient-to-br from-gray-50 to-slate-50 border-3 border-gray-300'
          }`}
        >
          <div className={`font-mono text-6xl font-black tracking-tight ${
            timerActive ? 'text-green-600' : timer > 0 ? 'text-red-600' : 'text-gray-400'
          }`}>
            {formatTime(timer)}
          </div>
          <p className={`text-sm font-semibold mt-3 ${
            timerActive ? 'text-green-600' : timer > 0 ? 'text-red-600' : 'text-gray-500'
          }`}>
            {timerActive ? '⏱️ En cours...' : timer > 0 ? '⏸️ Pausé' : '▶️ Prêt'}
          </p>
        </div>

        {/* Control Buttons with Better Styling */}
        <div className="flex gap-3 mb-6">
          <Button
            onClick={toggleTimer}
            className={`flex-1 h-14 text-base font-bold shadow-lg transition-all duration-300 ${
              timerActive
                ? 'bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700'
                : 'bg-gradient-to-r from-emerald-400 via-green-400 to-teal-400 hover:from-emerald-500 hover:via-green-500 hover:to-teal-500 text-gray-900'
            }`}
          >
            {timerActive ? '⏸ Pause' : '▶ Démarrer'}
          </Button>
          <Button
            onClick={resetTimer}
            variant="outline"
            className="h-14 border-2 border-gray-300 hover:border-gray-400 hover:bg-gray-50"
          >
            🔄
          </Button>
        </div>

        {/* Status Buttons - Colorful */}
        {markAsCompleted && (
          <div className="space-y-3 pt-5 border-t-2 border-gray-200">
            <h4 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
              <span className="w-2 h-2 bg-indigo-500 rounded-full"></span>
              Marquer comme:
            </h4>
            <Button
              onClick={() => markAsCompleted('success')}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white h-12 font-bold shadow-md hover:shadow-lg transition-all"
              disabled={loadingStates.progress}
            >
              ✓ Réussi
            </Button>
            <Button
              onClick={() => markAsCompleted('review')}
              className="w-full bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white h-12 font-bold shadow-md hover:shadow-lg transition-all"
              disabled={loadingStates.progress}
            >
              ✗ Échoué
            </Button>
          </div>
        )}
      </div>

      {/* Difficulty Rating */}
      <div className="p-6 bg-gradient-to-br from-white to-purple-50/20">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg">
            <BarChart3 className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-gray-900 text-sm">Évaluer la difficulté</span>
        </div>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map(rating => (
            <button
              key={rating}
              onClick={() => rateDifficulty(rating)}
              className={`flex-1 p-2.5 rounded-lg text-sm font-bold transition-all ${
                difficultyRating === rating
                  ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg scale-110'
                  : 'bg-gradient-to-br from-gray-100 to-gray-50 hover:from-indigo-50 hover:to-purple-50 text-gray-700 hover:text-indigo-700 border-2 border-gray-200 hover:border-indigo-300'
              }`}
            >
              {rating}
            </button>
          ))}
        </div>
      </div>

      {/* Exercise Statistics */}
      <div className="p-6 bg-gradient-to-br from-white to-indigo-50/20">
        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
          <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg">
            <BarChart3 className="w-4 h-4 text-white" />
          </div>
          <span>Statistiques</span>
        </h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-blue-50 to-cyan-50 border-2 border-blue-100">
            <span className="text-gray-700 font-medium flex items-center gap-2">
              <div className="p-1.5 bg-blue-500 rounded-lg">
                <Eye className="w-4 h-4 text-white" />
              </div>
              Vues
            </span>
            <span className="font-bold text-blue-700 text-lg">{viewCount}</span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-emerald-50 to-green-50 border-2 border-emerald-100">
            <span className="text-gray-700 font-medium flex items-center gap-2">
              <div className="p-1.5 bg-emerald-500 rounded-lg">
                <ThumbsUp className="w-4 h-4 text-white" />
              </div>
              Votes
            </span>
            <span className="font-bold text-emerald-700 text-lg">{voteCount}</span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-100">
            <span className="text-gray-700 font-medium flex items-center gap-2">
              <div className="p-1.5 bg-purple-500 rounded-lg">
                <MessageSquare className="w-4 h-4 text-white" />
              </div>
              Commentaires
            </span>
            <span className="font-bold text-purple-700 text-lg">{commentsCount}</span>
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
    <div className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors border border-gray-200">
      <h4 className="text-sm font-medium text-gray-900 mb-2 line-clamp-2">{title}</h4>
      <div className="flex justify-between items-center text-xs">
        <span className="text-gray-600">{subject}</span>
        <span className={`px-2 py-0.5 rounded ${getDifficultyColor(difficulty)}`}>
          {getDifficultyLabel(difficulty)}
        </span>
      </div>
    </div>
  );
};
