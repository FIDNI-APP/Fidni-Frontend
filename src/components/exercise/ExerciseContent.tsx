import React, { useState } from 'react';
import { Eye, CheckCircle, XCircle, Printer, Layers, Tag, BookMarked, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Content, Difficulty, VoteValue } from '@/types';
import { VoteButtons } from '@/components/VoteButtons';
import TipTapRenderer from '@/components/editor/TipTapRenderer';

interface ExerciseContentProps {
  exercise: Content;
  completed: 'success' | 'review' | null;
  markAsCompleted: (status: 'success' | 'review') => Promise<void>;
  loadingStates: {
    progress: boolean;
    save: boolean;
  };
  handleVote: (value: VoteValue, target?: 'exercise' | 'solution') => Promise<void>;
  handlePrint: () => void;
  userViewedSolution?: boolean;
  onRemoveSolutionFlag?: () => Promise<void>;
}

export const ExerciseContent: React.FC<ExerciseContentProps> = ({
  exercise,
  completed,
  markAsCompleted,
  loadingStates,
  handleVote,
  handlePrint,
  userViewedSolution,
  onRemoveSolutionFlag
}) => {
  const [showAllTags, setShowAllTags] = useState<boolean>(false);
  const [animatingBtn, setAnimatingBtn] = useState<'success' | 'review' | null>(null);

  const handleMarkAsCompleted = async (status: 'success' | 'review') => {
    setAnimatingBtn(status);
    await markAsCompleted(status);

    // Clear button animation
    setTimeout(() => setAnimatingBtn(null), 500);
  };

  // Check if the content has theorems and subfields
  const hasTheorems = exercise.theorems && exercise.theorems.length > 0;
  const hasSubfields = exercise.subfields && exercise.subfields.length > 0;
  const hasChapters = exercise.chapters && exercise.chapters.length > 0;

  return (
    <div className="bg-white rounded-xl shadow-lg border-2 border-gray-100 overflow-hidden mb-6">
      {/* Colored top accent bar */}
      <div className="h-1.5 bg-gradient-to-r from-gray-700 to-purple-800"></div>

      <div className="p-6">
        <div className="prose max-w-none text-gray-800 mb-6">
          <TipTapRenderer content={exercise.content} />
        </div>

        {/* Footer with votes, progress tracking, etc */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-gray-100">
          <div className="flex items-center gap-4">
            {/* Vote Buttons */}
            <VoteButtons
              initialVotes={exercise.vote_count}
              onVote={(value) => handleVote(value, 'exercise')}
              vertical={false}
              userVote={exercise.user_vote}
              size="sm"
            />

            {/* Views count */}
            <span className="flex items-center gap-1 text-sm text-gray-500">
              <Eye className="w-4 h-4 text-gray-400" />
              <span>{exercise.view_count} vues</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Completion status buttons */}
            <Button
              onClick={() => handleMarkAsCompleted('success')}
              variant={completed === 'success' ? "default" : "ghost"}
              size="sm"
              className={`btn-validation ${
                animatingBtn === 'success' ? 'btn-success-active btn-animating' : ''
              } ${completed === 'success' ? 'btn-active' : ''} rounded-lg ${
                completed === 'success'
                  ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/30'
                  : 'border-gray-200 hover:border-emerald-300 hover:text-emerald-600 hover:shadow-md'
              }`}
              disabled={loadingStates.progress}
            >
              {loadingStates.progress ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : (
                <span className="icon-wrapper">
                  <CheckCircle className="w-4 h-4 mr-1.5" />
                </span>
              )}
              <span className="relative z-10">{completed === 'success' ? 'Réussi' : 'Réussir'}</span>
            </Button>

            <Button
              onClick={() => handleMarkAsCompleted("review")}
              variant={completed === "review" ? "default" : "ghost"}
              size="sm"
              className={`btn-validation ${
                animatingBtn === 'review' ? 'btn-fail-active btn-animating' : ''
              } ${completed === 'review' ? 'btn-active' : ''} rounded-lg ${
                completed === "review"
                  ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-lg shadow-rose-500/30'
                  : 'border-gray-200 hover:border-rose-300 hover:text-rose-600 hover:shadow-md'
              }`}
              disabled={loadingStates.progress}
            >
              {loadingStates.progress ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : (
                <span className="icon-wrapper">
                  <XCircle className="w-4 h-4 mr-1.5" />
                </span>
              )}
              <span className="relative z-10">{completed === 'review' ? 'Échoué' : 'Échoué'}</span>
            </Button>

            {/* Viewed Solution Badge */}
            {userViewedSolution && (
              <div className="flex items-center gap-1.5 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
                <Eye className="w-4 h-4" />
                <span className="font-medium">Solution consultée</span>
                {onRemoveSolutionFlag && (
                  <button
                    onClick={onRemoveSolutionFlag}
                    className="ml-1 p-0.5 hover:bg-amber-200 rounded transition-colors"
                    title="Annuler - Supprimer le marquage"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};