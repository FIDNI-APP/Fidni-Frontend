import React, { useEffect, useState, useMemo, useRef } from 'react';
import {
  Eye, EyeOff,
  Play, Pause, RotateCcw, Save, Printer, Flag
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { VoteButtons } from '@/components/interactions/VoteButtons';
import { SignupCard } from '@/components/auth/SignupPrompt';
import type { ContentExercise, ContentExam, ContentLesson, AssessmentStatus, ContentBlock } from '@/types/content';
import ExerciseRenderer, { type AssessHandler, type AssessManyHandler } from './ExerciseRenderer';
import TipTapRenderer from '@/components/editor/TipTapRenderer';
import { countQuestionsWithSolutions } from '@/lib/utils/contentHelpers';
import { LessonRenderer } from './LessonRenderer';
import type { FlexibleExerciseStructure } from '../editor/FlexibleExerciseEditor';
import type { FlexibleLessonStructure } from '../editor/FlexibleLessonEditor';
import { AdSlot } from '@/components/ads/AdSlot';
import { NotebookPaper, paperTextStyle } from '@/components/notebook/NotebookPaper';
import { useLessonOutline } from '@/components/lesson/useLessonOutline';
import { LessonOutlineBar, LessonOutlinePanel } from '@/components/lesson/LessonOutline';
import { ExamView } from './ExamView';
import { trackAction } from '@/lib/usage';

type ContentItem = ContentExercise | ContentExam | ContentLesson;

interface ContentMainCardProps {
  content: ContentItem;
  contentType: 'exercise' | 'exam' | 'lesson';
  voteCount: number;
  likeCount?: number;
  dislikeCount?: number;
  userVote: 1 | -1 | 0;
  onVote: (value: 1 | -1 | 0) => Promise<void>;
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
  /** Date de chaque auto-évaluation (ISO), pour la note d'une épreuve refaite. */
  questionDates?: Record<string, string>;
  onQuestionAssess?: AssessHandler;
  /** Plusieurs questions d'un coup (« Tout réussi » d'une question à sous-questions). */
  onAssessMany?: AssessManyHandler;
  /** Examen : enregistre la durée d'une épreuve terminée (renvoie l'id de la session). */
  onSaveExamSession?: (seconds: number) => Promise<string | number | null | void>;
  /** Examen : note du passage, rattachée à sa session. */
  onSaveExamScore?: (sessionId: string | number, score: number, maxScore: number) => Promise<unknown>;
  /** Une solution vient d'être ouverte (« * » : toutes d'un coup). */
  onSolutionOpen?: (path: string) => void;
  /** Ouvre « Signaler une erreur » (avec la question concernée si elle est connue). */
  onReport?: (path?: string) => void;
  /** Examen : épreuve chronométrée en cours ou non. */
  onExamAttemptChange?: (running: boolean) => void;
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
  likeCount,
  dislikeCount,
  userVote,
  onVote,
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
  questionDates,
  onQuestionAssess,
  onAssessMany,
  onSaveExamSession,
  onSaveExamScore,
  onSolutionOpen,
  onReport,
  onExamAttemptChange,
}) => {
  const [showAllSolutions, setShowAllSolutions] = useState(false);
  const toggleAllSolutions = () => {
    if (!showAllSolutions) { trackAction('toutes-solutions'); onSolutionOpen?.('*'); }
    setShowAllSolutions(!showAllSolutions);
  };

  const isExercise = contentType !== 'lesson';

  // Sommaire de la leçon (à gauche) : dès qu'elle a au moins deux parties.
  const lessonRef = useRef<HTMLDivElement>(null);
  const withOutline = contentType === 'lesson'
    && ((content.structure as FlexibleLessonStructure | undefined)?.sections?.length ?? 0) >= 2;
  const outline = useLessonOutline({ containerRef: lessonRef, topOffset: 84, deps: [content.id, contentType] });
  // Sommaire de la leçon utilisé (une fois par leçon ouverte).
  const outlineUsed = useRef<string | number | null>(null);
  const trackOutline = (e: React.MouseEvent) => {
    if (outlineUsed.current === content.id || !(e.target as HTMLElement).closest('a,button')) return;
    outlineUsed.current = content.id;
    trackAction('sommaire-lecon');
  };

  // Ancienne solution d'ensemble (structure.solution, avant les solutions par question). Garde : sans
  // structure, l'opérateur « in » levait une erreur et la page de l'exercice plantait.
  const wholeSolution: ContentBlock | null = content.structure && 'solution' in content.structure
    ? ((content.structure as { solution?: ContentBlock }).solution ?? null) : null;
  const hasSolution = !!wholeSolution?.html;
  // Ouverte ou fermée ici (null = suit « Voir la solution »), comme les solutions des questions.
  const [wholeLocal, setWholeLocal] = useState<boolean | null>(null);
  useEffect(() => { setWholeLocal(null); }, [showAllSolutions]);
  const wholeSolutionShown = hasSolution && (wholeLocal ?? showAllSolutions);

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
  const progressData = useMemo(() => (questionProgress
    ? Object.fromEntries(Object.entries(questionProgress).map(([path, status]) => [path, { status, assessed_at: questionDates?.[path] }]))
    : undefined), [questionProgress, questionDates]);

  // ── Study rail (progress + time) — rendered both in the desktop sticky
  //    column and, on mobile, stacked above the exercise. ──────────────────
  const timerBtn = 'p-1.5 rounded-lg transition-colors [@media(pointer:coarse)]:p-2.5';
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
      <VoteButtons likes={likeCount} dislikes={dislikeCount} initialVotes={voteCount} onVote={onVote} userVote={userVote} size="sm" />
    </div>
  );

  // Bas de la carte : signaler une erreur, discret mais toujours au même endroit.
  const reportFooter = onReport ? (
    <div className="flex justify-end px-4 sm:px-7 py-1 sm:py-2.5 border-t border-line bg-[#fcfbf9]">
      <button type="button" onClick={() => onReport()} data-tour="signaler"
        className="inline-flex items-center gap-1.5 min-h-9 sm:min-h-0 text-[12.5px] text-ink-faint hover:text-ink transition-colors">
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
          questionDates={questionDates}
          onQuestionAssess={onQuestionAssess}
          onAssessMany={onAssessMany}
          onSaveSession={onSaveExamSession}
          onSaveScore={onSaveExamScore}
          onSolutionOpen={onSolutionOpen}
          sessionCount={getSessionCount()}
          onOpenHistory={loadHistory}
          votes={votes}
          footer={reportFooter}
          onReport={onReport}
          onAttemptChange={onExamAttemptChange}
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
          <aside className="hidden lg:block sticky top-[84px] max-h-[calc(100vh-104px)] overflow-y-auto pr-1 pb-4" data-tour="lecon-sommaire"
            onClickCapture={trackOutline}>
            <LessonOutlinePanel outline={outline} storageKey={`lecon-${content.id}`} syncHash />
          </aside>
        )}
        {/* Left column — the exercise/lesson */}
        <div className="min-w-0">
          {/* Téléphone / tablette : sommaire repliable, collé sous la barre du site. */}
          {withOutline && (
            <div className="lg:hidden sticky top-[68px] z-20 mb-3" onClickCapture={trackOutline}>
              <LessonOutlineBar outline={outline} storageKey={`lecon-${content.id}`} tourId="lecon-sommaire-barre" />
            </div>
          )}
          <div className="bg-white rounded-2xl border border-line overflow-hidden">
            {/* Barre de la carte : solutions (exercice) ou impression (leçon) à gauche, votes à droite. */}
            <div className="flex items-center gap-3 flex-wrap px-4 sm:px-7 py-2 sm:py-3 border-b border-line bg-[#fcfbf9]">
              {contentType === 'lesson' ? (
                <Link to={`/lessons/${content.id}/pdf`} data-tour="lecon-imprimer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border border-line bg-white text-ink-soft hover:border-ink transition-colors whitespace-nowrap">
                  <Printer className="w-4 h-4" /> Imprimer la leçon
                </Link>
              ) : questionsWithSolutions > 0 || hasSolution ? (
                <button
                  onClick={toggleAllSolutions}
                  data-tour="detail-solutions"
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors whitespace-nowrap ${
                    showAllSolutions
                      ? 'bg-brand-soft text-brand-hover border-brand-line hover:bg-brand-soft'
                      : 'bg-white text-ink-soft border-line hover:border-ink'
                  }`}
                >
                  {showAllSolutions ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  {showAllSolutions
                    ? (questionsWithSolutions > 0 ? 'Masquer les solutions' : 'Masquer la solution')
                    : questionsWithSolutions > 0 ? `Voir les solutions (${questionsWithSolutions})` : 'Voir la solution'}
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
            <div className="px-4 py-5 sm:p-7">
              <ExerciseRenderer
                structure={content.structure as unknown as FlexibleExerciseStructure}
                progress={progressData}
                onAssess={onQuestionAssess}
                onAssessMany={onAssessMany}
                interactive={isAuthenticated}
                showAllSolutions={showAllSolutions}
                compact={false}
                onSolutionOpen={onSolutionOpen}
                onReport={onReport}
              />
            </div>
            )}

            {/* Solution d'ensemble (anciens contenus) : s'ouvre ici, ou avec « Voir la solution ». */}
            {hasSolution && isExercise && (
              <div className="border-t border-line">
                <button
                  type="button"
                  onClick={() => {
                    if (!wholeSolutionShown) { trackAction('voir-solution'); onSolutionOpen?.('solution'); }
                    setWholeLocal(!wholeSolutionShown);
                  }}
                  aria-expanded={wholeSolutionShown}
                  className="w-full px-4 sm:px-7 py-3 flex items-center justify-between text-left hover:bg-[#f7f6f3] transition-colors"
                >
                  <span className="font-medium text-ink">Solution</span>
                  <span className="text-sm font-medium text-brand-hover">{wholeSolutionShown ? 'Masquer' : 'Afficher'}</span>
                </button>
                {wholeSolutionShown && wholeSolution?.html && (
                  <div className="mx-4 sm:mx-7 mb-4 pl-3 sm:pl-4 border-l-2 border-brand bg-brand-soft py-2 pr-2 sm:pr-3 rounded-r min-w-0 text-ink-soft">
                    <TipTapRenderer content={wholeSolution.html} />
                  </div>
                )}
              </div>
            )}

            {reportFooter}

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
