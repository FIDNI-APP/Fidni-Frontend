import React from 'react';
import { Timer, BarChart3, BookOpen, User, Eye, MessageSquare, Award } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Difficulty } from '@/types';

interface ExamSidebarProps {
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

export const ExamSidebar: React.FC<ExamSidebarProps> = ({
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
      <div className="bg-gradient-to-r from-green-900 to-green-800 text-white p-4">
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
    </div>
  );
};