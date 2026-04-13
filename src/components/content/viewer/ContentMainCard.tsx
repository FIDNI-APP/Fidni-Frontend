import React, { useState, useMemo } from 'react';
import {
  User, Calendar, Eye, EyeOff, Clock,
  Play, Pause, RotateCcw, Save, Hash, PlayCircle
} from 'lucide-react';
import type { Difficulty } from '@/types';
import type { ContentExercise, ContentExam, ContentLesson, AssessmentStatus } from '@/types/content';
import { VoteButtons } from '@/components/interactions/VoteButtons';
import ExerciseRenderer from './ExerciseRenderer';
import { countQuestionsWithSolutions } from '@/lib/utils/contentHelpers';
import { LessonRenderer } from './LessonRenderer';
import type { FlexibleExerciseStructure } from '../editor/FlexibleExerciseEditor';
import type { FlexibleLessonStructure } from '../editor/FlexibleLessonEditor';

type ContentItem = ContentExercise | ContentExam | ContentLesson;

interface ContentMainCardProps {
  content: ContentItem;
  contentType: 'exercise' | 'exam' | 'lesson';
  voteCount: number;
  userVote: 1 | -1 | 0;
  onVote: (value: 1 | -1 | 0) => Promise<void>;
  showSolution: boolean;
  onToggleSolution: () => void;
  isAuthenticated: boolean;
  // Timer props
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
  // Question-level progress
  questionProgress?: Record<string, AssessmentStatus>;
  onQuestionAssess?: (path: string, status: AssessmentStatus) => void;
  // Solution validation
  solutionValidations?: Record<string, string | null>;
  onValidateSolution?: (path: string, validation: string | null) => void;
}

const getDifficultyConfig = (difficulty: Difficulty) => {
  switch (difficulty) {
    case 'easy':
      return { label: 'Facile', bgClass: 'bg-emerald-50', textClass: 'text-emerald-700', dotClass: 'bg-emerald-500' };
    case 'medium':
      return { label: 'Moyen', bgClass: 'bg-amber-50', textClass: 'text-amber-700', dotClass: 'bg-amber-500' };
    case 'hard':
      return { label: 'Difficile', bgClass: 'bg-rose-50', textClass: 'text-rose-700', dotClass: 'bg-rose-500' };
    default:
      return { label: difficulty, bgClass: 'bg-slate-50', textClass: 'text-slate-700', dotClass: 'bg-slate-500' };
  }
};

const formatTimeAgo = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Aujourd'hui";
  if (diffDays === 1) return 'Hier';
  if (diffDays < 7) return `Il y a ${diffDays} jours`;
  if (diffDays < 30) return `Il y a ${Math.floor(diffDays / 7)} semaines`;
  if (diffDays < 365) return `Il y a ${Math.floor(diffDays / 30)} mois`;
  return `Il y a ${Math.floor(diffDays / 365)} ans`;
};

export const ContentMainCard: React.FC<ContentMainCardProps> = ({
  content,
  contentType,
  voteCount,
  userVote,
  onVote,
  showSolution,
  onToggleSolution,
  isAuthenticated,
  timer,
  isTimerRunning,
  startTimer,
  stopTimer,
  resetTimer,
  saveSession,
  formatCurrentTime,
  getSessionCount,
  loadHistory,
  saving,
  questionProgress,
  onQuestionAssess,
  solutionValidations,
  onValidateSolution
}) => {
  const [showAllSolutions, setShowAllSolutions] = useState(false);

  const hasDifficulty = 'difficulty' in content && content.difficulty;
  const difficultyConfig = hasDifficulty ? getDifficultyConfig(content.difficulty!) : null;

  const hasSolution = 'solution' in content.structure && content.structure.solution;

  // Count questions with inline solutions
  const questionsWithSolutions = useMemo(
    () => countQuestionsWithSolutions(content.structure as FlexibleExerciseStructure),
    [content.structure]
  );

  // Convert questionProgress to the format expected by ExerciseRenderer
  const progressData = questionProgress
    ? Object.fromEntries(
        Object.entries(questionProgress).map(([path, status]) => [
          path,
          {
            status,
            solution_validation: solutionValidations?.[path] || null,
            assessed_at: new Date().toISOString()
          }
        ])
      )
    : undefined;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="p-6 pb-4">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-3">
                
                {difficultyConfig && (
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${difficultyConfig.bgClass} ${difficultyConfig.textClass}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${difficultyConfig.dotClass}`} />
                    {difficultyConfig.label}
                  </span>
                )}
              </div>
              <h1 className="text-2xl font-bold text-slate-900 leading-tight">
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-mono">
                  <Hash className="w-3 h-3" />
                  {content.id}
                </span>
                {content.title}
              </h1>
              {/* Show All Solutions Toggle */}
              {questionsWithSolutions > 0 && (
                <button
                  onClick={() => setShowAllSolutions(!showAllSolutions)}
                  className={`mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                    showAllSolutions
                      ? 'bg-green-100 text-green-700 hover:bg-green-200'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {showAllSolutions ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  {showAllSolutions ? 'Masquer solutions' : `Voir solutions (${questionsWithSolutions})`}
                </button>
              )}
            </div>

            {/* Timer Widget - only show for exercises/exams */}
            {contentType !== 'lesson' && (
              <div className="flex-shrink-0">
                <div className={`
                  flex items-center gap-2 px-3 py-2 rounded-xl border-2 transition-all
                  ${isTimerRunning
                    ? 'bg-emerald-50 border-emerald-200'
                    : timer > 0
                      ? 'bg-amber-50 border-amber-200'
                      : 'bg-slate-50 border-slate-200'
                  }
                `}>
                  <Clock className={`w-4 h-4 ${isTimerRunning ? 'text-emerald-600' : timer > 0 ? 'text-amber-600' : 'text-slate-400'}`} />
                  <span className={`font-mono text-lg font-semibold ${isTimerRunning ? 'text-emerald-700' : timer > 0 ? 'text-amber-700' : 'text-slate-500'}`}>
                    {formatCurrentTime()}
                  </span>

                  <div className="w-px h-5 bg-slate-300 mx-1" />

                  <button
                    onClick={() => (isTimerRunning ? stopTimer() : startTimer())}
                    className={`p-1.5 rounded-lg transition-colors ${
                      isTimerRunning
                        ? 'bg-emerald-200 text-emerald-700 hover:bg-emerald-300'
                        : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                    }`}
                  >
                    {isTimerRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </button>

                  <button
                    onClick={resetTimer}
                    disabled={timer === 0 || isTimerRunning}
                    className="p-1.5 rounded-lg bg-slate-200 text-slate-600 hover:bg-slate-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>

                  {timer > 0 && (
                    <button
                      onClick={saveSession}
                      disabled={saving || isTimerRunning}
                      className="p-1.5 rounded-lg bg-blue-100 text-blue-600 hover:bg-blue-200 transition-colors disabled:opacity-40"
                    >
                      {saving ? (
                        <div className="w-4 h-4 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                    </button>
                  )}

                  {getSessionCount() > 0 && (
                    <button
                      onClick={loadHistory}
                      className="px-2 py-1 text-xs font-medium bg-slate-200 text-slate-600 rounded-md hover:bg-slate-300 transition-colors"
                    >
                      {getSessionCount()}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Metadata */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
            <span className="flex items-center gap-1.5">
              <User className="w-4 h-4" />
              {content.author?.username}
            </span>
            <span className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              {formatTimeAgo(content.created_at)}
            </span>
            <span className="flex items-center gap-1.5">
              <Eye className="w-4 h-4" />
              {content.view_count} vues
            </span>
          </div>
        </div>

        <div className="border-t border-slate-100" />

        {/* Content */}
        <div className="p-6">
          {contentType === 'lesson' ? (
            <LessonRenderer
              structure={content.structure as FlexibleLessonStructure}
            />
          ) : (
            <ExerciseRenderer
              structure={content.structure as FlexibleExerciseStructure}
              progress={progressData}
              onAssess={onQuestionAssess}
              onValidateSolution={onValidateSolution}
              interactive={isAuthenticated}
              showAllSolutions={showAllSolutions}
            />
          )}
        </div>

        {/* Solution Toggle */}
        {hasSolution && (
          <div className="border-t border-slate-100">
            <button
              onClick={onToggleSolution}
              className="w-full px-6 py-3 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
            >
              <span className="font-medium text-slate-900">
                Solution
              </span>
              <span className="text-sm text-blue-600">
                {showSolution ? 'Masquer' : 'Afficher'}
              </span>
            </button>
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-slate-100 px-6 py-4 bg-slate-50/50">
          <VoteButtons
            initialVotes={voteCount}
            onVote={onVote}
            vertical={false}
            userVote={userVote}
            size="sm"
          />
        </div>
      </div>
    </div>
  );
};
