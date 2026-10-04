import React, { useState, useMemo, useRef } from 'react';
import {
  Eye, EyeOff,
  Play, Pause, RotateCcw, Save, Printer, Flag
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { VoteButtons } from '@/components/interactions/VoteButtons';
import { SignupCard } from '@/components/auth/SignupPrompt';
import type { ContentExercise, ContentExam, ContentLesson, AssessmentStatus } from '@/types/content';
import ExerciseRenderer from './ExerciseRenderer';
import { countQuestionsWithSolutions } from '@/lib/utils/contentHelpers';
import { LessonRenderer } from './LessonRenderer';
import type { FlexibleExerciseStructure } from '../editor/FlexibleExerciseEditor';
import type { FlexibleLessonStructure } from '../editor/FlexibleLessonEditor';
import { AdSlot } from '@/components/ads/AdSlot';
import { NotebookPaper, paperTextStyle } from '@/components/notebook/NotebookPaper';
import { useLessonOutline } from '@/components/lesson/useLessonOutline';
import { LessonOutlineBar, LessonOutlinePanel } from '@/components/lesson/LessonOutline';
import { ExamView } from './ExamView';

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
  /** Examen : enregistre la durée d'une épreuve terminée. */
  onSaveExamSession?: (seconds: number) => Promise<void>;
  /** Ouvre « Signaler une erreur » (avec la question concernée si elle est connue). */
  onReport?: (path?: string) => void;
}

// Small uppercase label used for the study-rail panels.
const RailLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="text-[11px] font-semibold uppercase tracking-widest text-ink-faint" style={{ fontFamily: "'DM Mono', ui-monospace, monospace" }}>
    {children}
  </div>
);

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
  onValidateSolution,
  onSaveExamSession,
  onReport,
}) => {
  const [showAllSolutions, setShowAllSolutions] = useState(false);

  const isExercise = contentType !== 'lesson';

  // Sommaire de la leçon (à gauche) : dès qu'elle a au moins deux parties.
  const lessonRef = useRef<HTMLDivElement>(null);
  const withOutline = contentType === 'lesson'
    && ((content.structure as FlexibleLessonStructure | undefined)?.sections?.length ?? 0) >= 2;
  const outline = useLessonOutline({ containerRef: lessonRef, topOffset: 84, deps: [content.id, contentType] });

  // Garde : sans structure, l'opérateur « in » levait une erreur et la page de l'exercice plantait.
  const hasSolution = !!content.structure && 'solution' in content.structure && content.structure.solution;

  // Count questions with inline solutions
  const questionsWithSolutions = useMemo(
    () => countQuestionsWithSolutions(content.structure as unknown as FlexibleExerciseStructure),
    [content.structure]
  );

  // Progress: how many assessable questions exist, and how many the student
  // has self-assessed (any status). Drives the rail's progress bar.
  const { totalQuestions, assessedCount } = useMemo(() => {
    if (!isExercise) return { totalQuestions: 0, assessedCount: 0 };
    const struct = content.structure as unknown as FlexibleExerciseStructure;
    if (!struct?.blocks) return { totalQuestions: 0, assessedCount: 0 };
    const paths: string[] = [];
    struct.blocks.forEach((b: any) => {
      if (b.type !== 'question') return;
      if (b.subQuestions && b.subQuestions.length > 0) {
        b.subQuestions.forEach((sq: any) => paths.push(`${b.id}.${sq.id}`));
      } else {
        paths.push(b.id);
      }
    });
    const assessed = paths.filter(p => questionProgress?.[p]).length;
    return { totalQuestions: paths.length, assessedCount: assessed };
  }, [content.structure, isExercise, questionProgress]);

  const progressPct = totalQuestions ? Math.round((assessedCount / totalQuestions) * 100) : 0;

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

  // ── Study rail (progress + time) — rendered both in the desktop sticky
  //    column and, on mobile, stacked above the exercise. ──────────────────
  const timerBtn = 'p-1.5 rounded-lg transition-colors';
  const renderRail = () => (
    <div className="space-y-4">
      {!isAuthenticated && (
        <SignupCard title="Suis ta progression" tour="detail-inscription"
          text="Avec un compte, chaque question que tu évalues compte : tu vois ce que tu maîtrises et ce qu’il faut revoir." />
      )}
      {isAuthenticated && totalQuestions > 0 && (
        <div className="rounded-2xl border border-line bg-white p-5" data-tour="detail-progression">
          <RailLabel>Progression</RailLabel>
          <div className="flex items-baseline justify-between mt-2.5 mb-3">
            <span className="fd-display text-ink leading-none" style={{ fontSize: 30, fontWeight: 700 }}>
              {progressPct}<span className="text-lg text-ink-faint">%</span>
            </span>
            <span className="text-xs text-ink-faint fd-nums">{assessedCount} / {totalQuestions} questions</span>
          </div>
          <div className="h-2 rounded-full bg-[#f2f1ee] overflow-hidden">
            <div className="h-full bg-brand rounded-full transition-all duration-300" style={{ width: `${progressPct}%` }} />
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-line bg-white p-5" data-tour="detail-chrono">
        <RailLabel>Temps passé</RailLabel>
        <div className="flex items-center justify-between mt-2.5">
          <span className={`font-mono fd-nums text-2xl font-semibold leading-none ${isTimerRunning ? 'text-brand-hover' : timer > 0 ? 'text-amber-700' : 'text-ink'}`}>
            {formatCurrentTime()}
          </span>
          <div className="flex items-center gap-1.5">
            <button onClick={() => (isTimerRunning ? stopTimer() : startTimer())} aria-label={isTimerRunning ? 'Pause' : 'Démarrer'}
              className={`${timerBtn} ${isTimerRunning ? 'bg-brand text-white hover:bg-brand-hover' : 'bg-[#f2f1ee] text-ink-soft hover:bg-[#e7e3dc]'}`}>
              {isTimerRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>
            <button onClick={resetTimer} disabled={timer === 0 || isTimerRunning} aria-label="Réinitialiser"
              className={`${timerBtn} bg-[#f2f1ee] text-ink-soft hover:bg-[#e7e3dc] disabled:opacity-40 disabled:cursor-not-allowed`}>
              <RotateCcw className="w-4 h-4" />
            </button>
            {timer > 0 && (
              <button onClick={saveSession} disabled={saving || isTimerRunning} title="Enregistrer la session"
                className={`${timerBtn} bg-brand text-white hover:bg-brand-hover disabled:opacity-40`}>
                {saving ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
              </button>
            )}
          </div>
        </div>
        {getSessionCount() > 0 && (
          <button onClick={loadHistory} className="mt-3 text-xs font-medium text-ink-faint hover:text-ink transition-colors fd-nums">
            {getSessionCount()} session{getSessionCount() > 1 ? 's' : ''} enregistrée{getSessionCount() > 1 ? 's' : ''}
          </button>
        )}
      </div>
    </div>
  );

  // Votes : en haut à droite de la carte du contenu, visibles sans descendre jusqu'en bas.
  const votes = (
    <div data-tour="vote" className="ml-auto shrink-0">
      <VoteButtons initialVotes={voteCount} onVote={onVote} vertical={false} userVote={userVote} size="sm" />
    </div>
  );

  // Bas de la carte : signaler une erreur, discret mais toujours au même endroit.
  const reportFooter = onReport ? (
    <div className="flex justify-end px-6 sm:px-7 py-2.5 border-t border-line bg-[#fcfbf9]">
      <button type="button" onClick={() => onReport()} data-tour="signaler"
        className="inline-flex items-center gap-1.5 text-[12.5px] text-ink-faint hover:text-ink transition-colors">
        <Flag className="w-3.5 h-3.5" /> Une erreur ? Signale-la
      </button>
    </div>
  ) : null;

  // Examen : présenté comme un sujet (fiche, un bloc par exercice, épreuve chronométrée, copie).
  if (contentType === 'exam') {
    return (
      <div className="max-w-6xl mx-auto">
        <ExamView
          content={content as ContentExam}
          isAuthenticated={isAuthenticated}
          questionProgress={questionProgress}
          onQuestionAssess={onQuestionAssess}
          solutionValidations={solutionValidations}
          onValidateSolution={onValidateSolution}
          onSaveSession={onSaveExamSession}
          sessionCount={getSessionCount()}
          onOpenHistory={loadHistory}
          votes={votes}
          footer={reportFooter}
          onReport={onReport}
        />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Leçon : un peu plus large que le texte, pour la marge de la feuille de cahier. */}
      <div className={isExercise ? 'grid lg:grid-cols-[minmax(0,1fr)_300px] gap-6 items-start'
        : withOutline ? 'grid lg:grid-cols-[230px_minmax(0,1fr)] gap-8 items-start'
        : contentType === 'lesson' ? 'max-w-4xl mx-auto' : 'max-w-3xl mx-auto'}>
        {/* Leçon : sommaire collant à gauche (ordinateur). */}
        {withOutline && (
          <aside className="hidden lg:block sticky top-[84px] max-h-[calc(100vh-104px)] overflow-y-auto pr-1 pb-4" data-tour="lecon-sommaire">
            <LessonOutlinePanel outline={outline} storageKey={`lecon-${content.id}`} syncHash />
          </aside>
        )}
        {/* Left column — the exercise/lesson */}
        <div className="min-w-0">
          {/* Téléphone / tablette : sommaire repliable, collé sous la barre du site. */}
          {withOutline && (
            <LessonOutlineBar outline={outline} storageKey={`lecon-${content.id}`} tourId="lecon-sommaire-barre" className="lg:hidden sticky top-[68px] z-20 mb-3" />
          )}
          <div className="bg-white rounded-2xl border border-line overflow-hidden">
            {/* Barre de la carte : solutions (exercice) ou impression (leçon) à gauche, votes à droite. */}
            <div className="flex items-center gap-3 flex-wrap px-6 sm:px-7 py-3 border-b border-line bg-[#fcfbf9]">
              {contentType === 'lesson' ? (
                <Link to={`/lessons/${content.id}/pdf`} data-tour="lecon-imprimer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border border-line bg-white text-ink-soft hover:border-ink transition-colors whitespace-nowrap">
                  <Printer className="w-4 h-4" /> Imprimer la leçon
                </Link>
              ) : questionsWithSolutions > 0 ? (
                <button
                  onClick={() => setShowAllSolutions(!showAllSolutions)}
                  data-tour="detail-solutions"
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors whitespace-nowrap ${
                    showAllSolutions
                      ? 'bg-brand-soft text-brand-hover border-brand-line hover:bg-brand-soft'
                      : 'bg-white text-ink-soft border-line hover:border-ink'
                  }`}
                >
                  {showAllSolutions ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  {showAllSolutions ? 'Masquer les solutions' : `Voir les solutions (${questionsWithSolutions})`}
                </button>
              ) : (
                <span className="text-sm text-ink-faint">Pas encore de solution détaillée</span>
              )}
              {votes}
            </div>

            {/* Content */}
            {contentType === 'lesson' ? (
              // Même feuille que dans le cahier (NotebookPaper) : papier, marge, reliure, texte à 90 %.
              <NotebookPaper>
                <div ref={lessonRef} data-tour="lecon-contenu" className="py-8 pr-5 sm:pr-8" style={{ ...paperTextStyle(), zoom: 0.9 }}>
                  <LessonRenderer structure={content.structure as FlexibleLessonStructure} />
                </div>
              </NotebookPaper>
            ) : (
            <div className="p-6 sm:p-7">
              <ExerciseRenderer
                structure={content.structure as unknown as FlexibleExerciseStructure}
                progress={progressData}
                onAssess={onQuestionAssess}
                onValidateSolution={onValidateSolution}
                interactive={isAuthenticated}
                showAllSolutions={showAllSolutions}
                compact={false}
                onReport={onReport}
              />
            </div>
            )}

            {reportFooter}

            {/* Whole-exercise solution toggle */}
            {hasSolution && (
              <div className="border-t border-line">
                <button
                  onClick={onToggleSolution}
                  className="w-full px-6 sm:px-7 py-3 flex items-center justify-between text-left hover:bg-[#f7f6f3] transition-colors"
                >
                  <span className="font-medium text-ink">Solution</span>
                  <span className="text-sm font-medium text-brand-hover">{showSolution ? 'Masquer' : 'Afficher'}</span>
                </button>
              </div>
            )}

          </div>

          <AdSlot className="mt-6" />

          {/* Mobile : progression et temps sous l'exercice (avant, ils le repoussaient vers le bas). */}
          {isExercise && <div className="lg:hidden mt-6">{renderRail()}</div>}
        </div>

        {/* Right column — sticky study rail (desktop only) */}
        {isExercise && (
          <aside className="hidden lg:block sticky top-20">
            {renderRail()}
          </aside>
        )}
      </div>
    </div>
  );
};
