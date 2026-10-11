/**
 * La feuille d'un contenu (refaite le 11/10/2026) : une colonne de lecture calme, sans colonne de côté.
 *  - Exercice : une barre fine (toutes les solutions, chrono), l'énoncé en variante « lecture », puis le pied
 *    de la feuille (j'aime, signaler). La progression est au-dessus de la feuille (« Où en es-tu ? », rappel
 *    « Tu as fini ? » en bas), le chrono dans la barre (avant : deux cartes à droite, sous l'exercice sur téléphone).
 *  - Leçon : feuille de cours (LessonReader, police et encadrés de la leçon imprimée), sommaire collant à
 *    gauche (ordinateur) ou en barre (téléphone).
 *  - Examen : ExamView (fiche du sujet, épreuve chronométrée, copie).
 * `children` : ce qui suit la feuille (« Tu as fini ? », pour continuer, discussion), dans la même colonne.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Eye, EyeOff, Flag } from 'lucide-react';
import { VoteButtons } from '@/components/interactions/VoteButtons';
import type { ContentExercise, ContentExam, ContentLesson, AssessmentStatus, ContentBlock } from '@/types/content';
import ExerciseRenderer, { type AssessHandler, type AssessManyHandler } from './ExerciseRenderer';
import TipTapRenderer from '@/components/editor/TipTapRenderer';
import { countQuestionsWithSolutions } from '@/lib/utils/contentHelpers';
import type { FlexibleExerciseStructure } from '../editor/FlexibleExerciseEditor';
import type { FlexibleLessonStructure } from '../editor/FlexibleLessonEditor';
import { AdSlot } from '@/components/ads/AdSlot';
import { useLessonOutline } from '@/components/lesson/useLessonOutline';
import { LessonOutlineBar, LessonOutlinePanel } from '@/components/lesson/LessonOutline';
import { ExamView } from './ExamView';
import { LessonReader } from './LessonReader';
import { ReadingStyles } from './ReadingStyles';
import { SHEET_TEXT_PX } from './pageHelpers';
import { Chrono } from './Chrono';
import { FoldedSolution } from './FoldedSolution';
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
  // Chronomètre (exercice)
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
  // Progression question par question
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
  /** Sous la feuille, dans la même colonne (« Tu as fini ? », pour continuer, discussion). */
  children?: React.ReactNode;
}

export const ContentMainCard: React.FC<ContentMainCardProps> = ({
  content, contentType, voteCount, likeCount, dislikeCount, userVote, onVote, isAuthenticated,
  timer, isTimerRunning, startTimer, stopTimer, resetTimer, saveSession, formatCurrentTime, getSessionCount, loadHistory, saving,
  questionProgress, questionDates, onQuestionAssess, onAssessMany, onSaveExamSession, onSaveExamScore, onSolutionOpen,
  onReport, onExamAttemptChange, children,
}) => {
  const [showAllSolutions, setShowAllSolutions] = useState(false);
  const toggleAllSolutions = () => {
    if (!showAllSolutions) { trackAction('toutes-solutions'); onSolutionOpen?.('*'); }
    setShowAllSolutions(!showAllSolutions);
  };
  const isLesson = contentType === 'lesson';

  // Sommaire de la leçon : dès qu'elle a au moins deux parties.
  const lessonRef = useRef<HTMLDivElement>(null);
  const withOutline = isLesson && ((content.structure as FlexibleLessonStructure | undefined)?.sections?.length ?? 0) >= 2;
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
  // Ouverte ou fermée ici (null = suit « Toutes les solutions »), comme les solutions des questions.
  const [wholeLocal, setWholeLocal] = useState<boolean | null>(null);
  useEffect(() => { setWholeLocal(null); }, [showAllSolutions]);
  const wholeSolutionShown = hasSolution && (wholeLocal ?? showAllSolutions);

  const questionsWithSolutions = useMemo(
    () => countQuestionsWithSolutions(content.structure as unknown as FlexibleExerciseStructure),
    [content.structure],
  );

  const progressData = useMemo(() => (questionProgress
    ? Object.fromEntries(Object.entries(questionProgress).map(([path, status]) => [path, { status, assessed_at: questionDates?.[path] }]))
    : undefined), [questionProgress, questionDates]);

  // Pied de la feuille : « t'a aidé ? » (j'aime) à gauche, signaler une erreur à droite, toujours au même endroit.
  const votes = (
    <div data-tour="vote" className="flex items-center gap-2.5">
      <span className="hidden text-[13px] text-ink-faint sm:inline">
        {isLesson ? 'Cette leçon t’a aidé ?' : contentType === 'exam' ? 'Ce sujet t’a aidé ?' : 'Cet exercice t’a aidé ?'}
      </span>
      <VoteButtons likes={likeCount} dislikes={dislikeCount} initialVotes={voteCount} onVote={onVote} userVote={userVote} size="md" />
    </div>
  );
  const sheetFooter = (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line bg-[#fcfbf9] px-4 py-2 sm:px-8 print:hidden">
      {votes}
      {onReport && (
        <button type="button" onClick={() => onReport()} data-tour="signaler"
          className="inline-flex min-h-10 items-center gap-1.5 text-[12.5px] text-ink-faint transition-colors hover:text-ink">
          <Flag className="h-3.5 w-3.5" aria-hidden /> Une erreur ? Signale-la
        </button>
      )}
    </div>
  );

  // Examen : présenté comme un sujet (fiche, épreuve chronométrée, copie).
  if (contentType === 'exam') {
    return (
      <>
        <ReadingStyles />
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
          footer={sheetFooter}
          onReport={onReport}
          onAttemptChange={onExamAttemptChange}
        >
          {children}
        </ExamView>
      </>
    );
  }

  if (isLesson) {
    return (
      <div className={withOutline ? 'grid items-start gap-10 lg:grid-cols-[200px_minmax(0,1fr)]' : ''}>
        <ReadingStyles />
        {/* Ordinateur : sommaire collant à gauche. */}
        {withOutline && (
          <aside className="sticky top-[84px] hidden max-h-[calc(100vh-104px)] overflow-y-auto pb-4 pr-1 lg:block print:!hidden" data-tour="lecon-sommaire"
            onClickCapture={trackOutline}>
            <LessonOutlinePanel outline={outline} storageKey={`lecon-${content.id}`} syncHash />
          </aside>
        )}
        {/* La feuille garde la largeur du PDF, sommaire ou non (pageHelpers). */}
        <div className="flex min-w-0 flex-col gap-8 sm:gap-10" style={{ maxWidth: SHEET_TEXT_PX + 2 * 48 + 2 }}>
          <div>
            {/* Téléphone / tablette : sommaire repliable, collé sous la barre du site. */}
            {withOutline && (
              <div className="sticky top-[68px] z-20 mb-3 lg:hidden print:hidden" onClickCapture={trackOutline}>
                <LessonOutlineBar outline={outline} storageKey={`lecon-${content.id}`} tourId="lecon-sommaire-barre" />
              </div>
            )}
            <article className="overflow-hidden rounded-2xl border border-line bg-white sm:rounded-3xl print:rounded-none print:border-0">
              <div ref={lessonRef} data-tour="lecon-contenu" className="px-5 pb-10 pt-8 sm:px-12 sm:pb-14 sm:pt-12">
                <LessonReader structure={content.structure as FlexibleLessonStructure} />
              </div>
              {sheetFooter}
            </article>
          </div>
          <AdSlot />
          {/* Impression (Ctrl + P) : la leçon seule. */}
          <div className="flex flex-col gap-8 sm:gap-10 print:hidden">{children}</div>
        </div>
      </div>
    );
  }

  const canToggle = questionsWithSolutions > 0 || hasSolution;
  return (
    <div className="flex flex-col gap-8 sm:gap-10">
      <ReadingStyles />
      <article className="overflow-hidden rounded-2xl border border-line bg-white sm:rounded-3xl">
        {/* Barre de la feuille : toutes les solutions à gauche, chrono à droite. */}
        <div className="flex min-h-[52px] items-center justify-between gap-2 border-b border-line bg-[#fcfbf9] px-2.5 py-1.5 sm:px-6 print:hidden">
          {canToggle ? (
            <button type="button" onClick={toggleAllSolutions} data-tour="detail-solutions" aria-pressed={showAllSolutions}
              className={`inline-flex h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-3 text-[13.5px] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 ${
                showAllSolutions ? 'bg-brand-soft text-brand-hover' : 'text-ink-soft hover:bg-[#f2f1ee] hover:text-ink'}`}>
              {showAllSolutions ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
              {/* Téléphone : libellé court, pour laisser la place au chrono. */}
              {showAllSolutions
                ? <><span className="sm:hidden">Masquer</span><span className="hidden sm:inline">{questionsWithSolutions > 1 ? 'Masquer les solutions' : 'Masquer la solution'}</span></>
                : questionsWithSolutions > 1
                  ? <><span className="sm:hidden">Solutions</span><span className="hidden sm:inline">Toutes les solutions</span></>
                  : 'Voir la solution'}
              {!showAllSolutions && questionsWithSolutions > 1 && (
                <span className="rounded-full bg-[#f2f1ee] px-1.5 text-[11.5px] text-ink-faint fd-nums">{questionsWithSolutions}</span>
              )}
            </button>
          ) : (
            <span className="px-2 text-[13px] text-ink-faint">Pas encore de solution détaillée</span>
          )}
          <Chrono timer={timer} isRunning={isTimerRunning} start={startTimer} stop={stopTimer} reset={resetTimer}
            save={isAuthenticated ? saveSession : undefined} saving={saving} format={formatCurrentTime}
            sessionCount={getSessionCount()} onOpenHistory={loadHistory} />
        </div>

        <div className="px-4 pb-8 pt-6 sm:px-10 sm:pb-10 sm:pt-9">
          <ExerciseRenderer
            structure={content.structure as unknown as FlexibleExerciseStructure}
            progress={progressData}
            onAssess={onQuestionAssess}
            onAssessMany={onAssessMany}
            interactive={isAuthenticated}
            showAllSolutions={showAllSolutions}
            compact={false}
            variant="reading"
            onSolutionOpen={onSolutionOpen}
            onReport={onReport}
          />
        </div>

        {/* Solution d'ensemble (anciens contenus) : s'ouvre ici, ou avec « Voir la solution ». */}
        {hasSolution && (
          <div className="border-t border-line px-4 py-3 sm:px-10">
            <button type="button" aria-expanded={wholeSolutionShown}
              onClick={() => {
                if (!wholeSolutionShown) { trackAction('voir-solution'); onSolutionOpen?.('solution'); }
                setWholeLocal(!wholeSolutionShown);
              }}
              className={`inline-flex h-10 items-center gap-1.5 rounded-full px-3.5 text-[13.5px] font-semibold transition-colors ${
                wholeSolutionShown ? 'bg-[#f2f1ee] text-ink-soft' : 'bg-brand-soft text-brand-hover hover:bg-brand-line'}`}>
              {wholeSolutionShown ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
              {wholeSolutionShown ? 'Masquer la solution' : 'Voir la solution'}
            </button>
            {!wholeSolutionShown && <FoldedSolution html={wholeSolution?.html} />}
            {wholeSolutionShown && wholeSolution?.html && (
              <div className="fd-read relative mt-3 overflow-hidden rounded-xl border border-line bg-[#fcfbf9]">
                <span className="absolute inset-y-0 left-0 w-[3px] bg-brand" aria-hidden />
                <div className="fd-sol px-4 py-3.5 sm:px-5"><TipTapRenderer content={wholeSolution.html} /></div>
              </div>
            )}
          </div>
        )}

        {sheetFooter}
      </article>
      <AdSlot />
      <div className="flex flex-col gap-8 sm:gap-10 print:hidden">{children}</div>
    </div>
  );
};
