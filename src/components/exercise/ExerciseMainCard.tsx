/**
 * Unified Exercise Card - Combines Title + Content
 * Eye-friendly design for students with reduced visual clutter
 */

import React, { useState } from 'react';
import { User, Calendar, Eye, CheckCircle, XCircle, Clock, Play, Pause, RotateCcw, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Content, Difficulty, VoteValue } from '@/types';
import { VoteButtons } from '@/components/VoteButtons';
import RealPaginatedRenderer from '@/components/editor/RealPaginatedRenderer';

interface ExerciseMainCardProps {
  exercise: Content;
  completed: 'success' | 'review' | null;
  markAsCompleted: (status: 'success' | 'review') => Promise<void>;
  loadingStates: { progress: boolean; save: boolean };
  handleVote: (value: VoteValue, target?: 'exercise' | 'solution') => Promise<void>;
  formatTimeAgo: (dateString: string) => string;
  timer: number;
  isTimerRunning: boolean;
  startTimer: () => void;
  stopTimer: () => void;
  resetTimer: () => void;
  saveSession: () => Promise<void>;
  formatCurrentTime: () => string;
  getSessionCount: () => number;
  loadHistory: () => void;
  saving: boolean;
}

const getDifficultyColor = (difficulty: Difficulty): string => {
  switch (difficulty) {
    case 'easy': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'medium': return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'hard': return 'bg-rose-50 text-rose-700 border-rose-200';
    default: return 'bg-gray-50 text-gray-700 border-gray-200';
  }
};

const getDifficultyLabel = (difficulty: Difficulty): string => {
  switch (difficulty) {
    case 'easy': return 'Facile';
    case 'medium': return 'Moyen';
    case 'hard': return 'Difficile';
    default: return difficulty;
  }
};

export const ExerciseMainCard: React.FC<ExerciseMainCardProps> = ({
  exercise,
  completed,
  markAsCompleted,
  loadingStates,
  handleVote,
  formatTimeAgo,
  timer,
  isTimerRunning,
  startTimer,
  stopTimer,
  resetTimer,
  saveSession,
  formatCurrentTime,
  getSessionCount,
  loadHistory,
  saving
}) => {
  const [animatingBtn, setAnimatingBtn] = useState<'success' | 'review' | null>(null);
  const [showMotivation, setShowMotivation] = useState(false);

  const handleMarkAsCompleted = async (status: 'success' | 'review') => {
    setAnimatingBtn(status);
    await markAsCompleted(status);
    setTimeout(() => setAnimatingBtn(null), 500);

    // Show motivation message for success
    if (status === 'success') {
      setShowMotivation(true);
      setTimeout(() => setShowMotivation(false), 4000);
    }
  };

  return (
    <div>
      {/* Header - Matches ExerciseHeader purple gradient style */}
      <div className="liquid-glass liquid-effect bg-gradient-to-r from-purple-900 to-purple-800 text-white rounded-xl overflow-hidden shadow-lg mb-6 relative">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="titleGrid" width="10" height="10" patternUnits="userSpaceOnUse">
                <path d="M 10 0 L 0 0 0 10" fill="none" stroke="white" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#titleGrid)" />
          </svg>
        </div>

        <div className="px-6 py-6 relative">
          {/* Title and difficulty - only what matters */}
          <div className="flex items-start justify-between gap-4 mb-4">
            <h1 className="text-3xl font-bold text-white leading-tight flex-1">
              {exercise.title}
            </h1>

            {/* Right side: Difficulty badge + Timer */}
            <div className="flex flex-col items-end gap-2">
              {/* Difficulty badge - only badge shown */}
              {exercise.difficulty && (
                <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold border ${getDifficultyColor(exercise.difficulty)} bg-white`}>
                  {getDifficultyLabel(exercise.difficulty)}
                </span>
              )}

              {/* Inline Timer Controls - All visible */}
              <div className="flex items-center gap-1.5 bg-white/20 backdrop-blur-sm text-white rounded-lg px-2 py-1.5">
              {/* Time display */}
              <div className="flex items-center gap-1 px-1">
                <Clock className="w-3.5 h-3.5" />
                <span className="font-mono text-sm font-medium">{formatCurrentTime()}</span>
              </div>

              {/* Divider */}
              <div className="w-px h-4 bg-white/30" />

              {/* Play/Pause */}
              <button
                onClick={() => (isTimerRunning ? stopTimer() : startTimer())}
                className="p-1 hover:bg-white/20 rounded transition-colors"
                title={isTimerRunning ? 'Pause' : 'Démarrer'}
              >
                {isTimerRunning ? (
                  <Pause className="w-3.5 h-3.5" />
                ) : (
                  <Play className="w-3.5 h-3.5 fill-current" />
                )}
              </button>

              {/* Reset */}
              <button
                onClick={resetTimer}
                disabled={timer === 0 || isTimerRunning}
                className="p-1 hover:bg-white/20 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                title="Réinitialiser"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>

              {/* Save session */}
              {timer > 0 && (
                <>
                  <div className="w-px h-4 bg-white/30" />
                  <button
                    onClick={saveSession}
                    disabled={saving || isTimerRunning}
                    className="p-1 hover:bg-white/20 rounded transition-colors disabled:opacity-30"
                    title="Terminer"
                  >
                    {saving ? (
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Save className="w-3.5 h-3.5" />
                    )}
                  </button>
                </>
              )}

              {/* History */}
              {getSessionCount() > 0 && (
                <>
                  <div className="w-px h-4 bg-white/30" />
                  <button
                    onClick={loadHistory}
                    className="text-xs px-2 py-0.5 hover:bg-white/20 rounded transition-colors"
                    title={`${getSessionCount()} session${getSessionCount() > 1 ? 's' : ''}`}
                  >
                    {getSessionCount()}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

          {/* Compact metadata row - white text on purple */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-white/80">
            <span className="flex items-center gap-1.5">
              <User className="w-4 h-4 text-white/60" />
              {exercise.author.username}
            </span>

            <span className="text-white/40">•</span>

            <span className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-white/60" />
              {formatTimeAgo(exercise.created_at)}
            </span>

            <span className="text-white/40">•</span>

            <span className="flex items-center gap-1.5">
              <Eye className="w-4 h-4 text-white/60" />
              {exercise.view_count} vues
            </span>
          </div>
        </div>
      </div>


      {/* Content - Clean view */}
      <div className="mb-6">
        <RealPaginatedRenderer content={exercise.content} />
      </div>

      {/* Footer actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-6 pb-4">
        {/* Vote buttons */}
        <VoteButtons
          initialVotes={exercise.vote_count}
          onVote={(value) => handleVote(value, 'exercise')}
          vertical={false}
          userVote={exercise.user_vote}
          size="sm"
        />

        {/* Completion buttons - vibrant when active */}
        <div className="flex items-center gap-3">
          <Button
            onClick={() => handleMarkAsCompleted('success')}
            disabled={loadingStates.progress}
            size="sm"
            className={`transition-all ${
              completed === 'success'
                ? 'bg-green-600 hover:bg-green-700 text-white shadow-md scale-105'
                : 'bg-white border-2 border-green-500 text-green-600 hover:bg-green-50 hover:border-green-600'
            } ${animatingBtn === 'success' ? 'animate-bounce' : ''}`}
          >
            <CheckCircle className="w-4 h-4 mr-1.5" />
            Réussi
          </Button>

          <Button
            onClick={() => handleMarkAsCompleted('review')}
            disabled={loadingStates.progress}
            size="sm"
            className={`transition-all ${
              completed === 'review'
                ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-md scale-105'
                : 'bg-white border-2 border-amber-500 text-amber-600 hover:bg-amber-50 hover:border-amber-600'
            } ${animatingBtn === 'review' ? 'animate-bounce' : ''}`}
          >
            <XCircle className="w-4 h-4 mr-1.5" />
            À revoir
          </Button>
        </div>
      </div>

      {/* Motivation Toast */}
      {showMotivation && (
        <div className="fixed bottom-8 right-8 bg-green-600 text-white px-6 py-4 rounded-lg shadow-2xl animate-bounce z-50 max-w-sm">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-6 h-6 flex-shrink-0" />
            <div>
              <p className="font-bold text-lg">Bravo ! 🎉</p>
              <p className="text-sm text-green-50">Exercice terminé avec succès ! Continue comme ça !</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
