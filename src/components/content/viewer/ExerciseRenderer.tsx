/**
 * ExerciseRenderer - Rendu fluide pour exercices structurés
 *
 * Layout compact, espacements naturels.
 * Chaque question a son propre toggle solution.
 * Option globale pour tout développer/réduire.
 *
 * Auto-évaluation en un clic (06/10/2026) : deux boutons sous chaque question (Réussi / À revoir ;
 * « En partie » retiré le 08/10/2026, peu utile) ; re-cliquer le bouton actif l'efface. Discrets (Natsu : « trop intrusifs », puis les icônes seules
 * « pas intuitives ») : les trois boutons gardent leur texte, dans un groupe gris clair sans cadre ; seul le
 * choix fait prend sa couleur. La solution : une simple icône d'œil. Une question à sous-questions a en plus « Tout
 * réussi ». Avant : un menu déroulant (deux clics par question) et un second menu « Comparer » qui
 * redisait la même chose.
 *
 * 10/10/2026 : au toucher (pointer:coarse), cibles de 36 px, œil avec son libellé « Solution / Masquer », et le
 * drapeau quitte l'énoncé pour le pied de la solution ouverte. Une solution se referme même quand « Voir les
 * solutions » est actif. L'examen ajoute « En partie » (prop assessOptions). Chaque évaluation dit d'où elle
 * vient (source : question, tout, apres_solution).
 */

import React, { useEffect, useState } from 'react';
import { Check, RotateCcw, Eye, EyeOff, Flag, CheckCheck, Contrast } from 'lucide-react';
import TipTapRenderer from '@/components/editor/TipTapRenderer';
import type { ContentBlock, AssessmentStatus } from '@/types/content';
import type { ExerciseBlock, SubQuestionBlock, FlexibleExerciseStructure } from '../editor/FlexibleExerciseEditor';
import { trackAction } from '@/lib/usage';
import type { AssessSource } from '@/lib/api/contentItemApi';
import { useRegisterPrompt } from './pageHelpers';

// =====================
// TYPES
// =====================

interface ProgressData {
  [path: string]: {
    status: AssessmentStatus;
    assessed_at?: string;
  };
}

/** Plusieurs questions d'un coup : chemin → statut (null = effacer). */
export type AssessChanges = Record<string, AssessmentStatus | null>;

/** Une auto-évaluation : chemin, statut, et d'où elle vient (« apres_solution » depuis « Tu avais trouvé ? »). */
export type AssessHandler = (path: string, status: AssessmentStatus, source?: AssessSource) => void;
/** Plusieurs d'un coup (« Tout réussi » : source « tout »). */
export type AssessManyHandler = (changes: AssessChanges, source?: AssessSource) => void;

interface ExerciseRendererProps {
  structure: FlexibleExerciseStructure;
  progress?: ProgressData;
  onAssess?: AssessHandler;
  /** « Tout réussi » d'une question à sous-questions. */
  onAssessMany?: AssessManyHandler;
  /** Choix d'auto-évaluation proposés, dans l'ordre (défaut : Réussi, À revoir ; l'examen ajoute « En partie »). */
  assessOptions?: AssessmentStatus[];
  /** Une solution vient d'être ouverte (chemin de la question) : mesure, « solution vue ». */
  onSolutionOpen?: (path: string) => void;
  interactive?: boolean;
  /** External control for showing all solutions */
  showAllSolutions?: boolean;
  /**
   * Compact mode crushes vertical spacing — correct for small card previews.
   * The full reading view should pass `compact={false}` so multi-paragraph
   * statements keep their rhythm and the text sits at a comfortable measure.
   */
  compact?: boolean;
  /** Épreuve en cours : solutions et auto-évaluation masquées jusqu'à la fin. */
  locked?: boolean;
  /** Signaler une erreur sur une question (chemin « q2 », « q2.sq1 ») ; absent = pas de bouton. */
  onReport?: (path: string) => void;
}

/** Ancre d'une question (onglet Activité → « Revoir la question »). */
export const questionAnchor = (path: string) => `question-${path.replace(/[^a-zA-Z0-9_-]/g, '-')}`;

// Signaler une erreur sur une question précise : petit drapeau à droite, visible au survol de la
// question. Au toucher, il n'est pas sur l'énoncé (trop près, ouvert par erreur) : il est au pied de la
// solution ouverte (InlineSolution).
const ReportQuestionButton: React.FC<{ onClick: () => void; group: 'q' | 'sq' }> = ({ onClick, group }) => (
  <button
    type="button"
    onClick={onClick}
    title="Signaler une erreur sur cette question"
    aria-label="Signaler une erreur sur cette question"
    className={`shrink-0 -mr-1 p-1 rounded-md text-ink-faint hover:text-[#a23b34] hover:bg-[#fbecea] transition-opacity opacity-0 focus-visible:opacity-100 [@media(hover:none)]:opacity-50 [@media(pointer:coarse)]:hidden ${
      group === 'q' ? 'group-hover/q:opacity-100' : 'group-hover/sq:opacity-100'}`}
  >
    <Flag className="w-3.5 h-3.5" />
  </button>
);

// =====================
// CONTENT RENDERER
// =====================

// Global styles for compact rendering - injected once
const CompactStyles = () => (
  <style>{`
    .content-compact-view .tiptap-full-renderer,
    .content-compact-view .tiptap-full-renderer .ProseMirror {
      min-height: 0 !important;
      padding: 0 !important;
    }
    .content-compact-view .tiptap-full-renderer .ProseMirror p {
      margin: 0 !important;
    }
    .content-compact-view .tiptap-full-renderer .ProseMirror h1,
    .content-compact-view .tiptap-full-renderer .ProseMirror h2 {
      margin: 0 0 0.25rem 0 !important;
    }
    .content-compact-view .tiptap-full-renderer .ProseMirror .math-display {
      margin: 0.25em 0 !important;
    }
    .content-compact-view .tiptap-full-renderer .ProseMirror > *:last-child {
      margin-bottom: 0 !important;
    }
  `}</style>
);

const RenderContent: React.FC<{ content?: ContentBlock; className?: string }> = ({
  content,
  className = '',
}) => {
  if (!content || !content.html) return null;

  return (
    <div className={`text-ink-soft min-w-0 max-w-full ${className}`}>
      <TipTapRenderer content={content.html} />
    </div>
  );
};

const formatPoints = (n: number) => `${String(n).replace('.', ',')} pt${Number(n) > 1 ? 's' : ''}`;

/** « Partie » d'un examen (Exercice 1, Problème…) : titre, barème, et la numérotation repart à 1. */
const SectionHeading: React.FC<{ block: ExerciseBlock; first: boolean }> = ({ block, first }) => (
  <div className={`flex items-baseline justify-between gap-3 pb-2 mb-3 border-b border-line ${first ? '' : 'mt-9'}`}>
    <div className="fd-display text-lg text-ink min-w-0 [&_p]:m-0">
      <TipTapRenderer content={block.content?.html || ''} />
    </div>
    {Number(block.points) > 0 && (
      <span className="shrink-0 text-xs text-ink-faint" style={{ fontFamily: "'DM Mono', ui-monospace, monospace" }}>
        {formatPoints(Number(block.points))}
      </span>
    )}
  </div>
);

// =====================
// AUTO-ÉVALUATION EN UN CLIC
// =====================

const QUICK_OPTION: Partial<Record<AssessmentStatus, { label: string; hint?: string; icon: React.ReactNode; on: string }>> = {
  success: { label: 'Réussi', icon: <Check className="w-3.5 h-3.5" />, on: 'bg-white text-brand-hover shadow-sm' },
  partial: { label: 'En partie', hint: 'la moitié des points', icon: <Contrast className="w-3.5 h-3.5" />, on: 'bg-white text-gold-strong shadow-sm' },
  review: { label: 'À revoir', icon: <RotateCcw className="w-3.5 h-3.5" />, on: 'bg-white text-[#a23b34] shadow-sm' },
};
const DEFAULT_OPTIONS: AssessmentStatus[] = ['success', 'review'];

// Au toucher : 36 px de haut (cible confortable au pouce) ; à la souris, la version discrète.
const COARSE_CHIP = '[@media(pointer:coarse)]:h-9 [@media(pointer:coarse)]:px-3 [@media(pointer:coarse)]:text-[13px]';

/** Boutons côte à côte, discrets : un clic choisit, re-cliquer le choix actif l'efface. */
const QuickAssess: React.FC<{ current?: AssessmentStatus; onAssess: (status: AssessmentStatus) => void; options?: AssessmentStatus[] }> = ({
  current, onAssess, options = DEFAULT_OPTIONS,
}) => {
  // Anciens choix « Échoué » (et « En partie » là où il n'est plus proposé) : affichés comme « À revoir ».
  const shown = current && !options.includes(current) && (current === 'failed' || current === 'partial') ? 'review' : current;
  return (
    <div role="group" aria-label="As-tu réussi cette question ?" data-tour="auto-eval"
      className="inline-flex items-center rounded-full bg-[#f5f4f1] p-0.5">
      {options.map((value) => {
        const o = QUICK_OPTION[value];
        if (!o) return null;
        const active = shown === value;
        const title = o.hint ? `${o.label} (${o.hint})` : o.label;
        return (
          <button
            key={value}
            type="button"
            aria-pressed={active}
            title={active ? `${title} : cliquer pour effacer` : title}
            onClick={(e) => { e.stopPropagation(); onAssess(active && current ? current : value); }}
            className={`inline-flex items-center gap-1 h-6 px-2.5 rounded-full text-[12px] font-medium transition-colors whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 ${COARSE_CHIP} ${
              active ? `${o.on} font-semibold` : 'text-ink-faint hover:text-ink'}`}
          >
            {o.icon}{o.label}
          </button>
        );
      })}
    </div>
  );
};

/** Question à sous-questions : toutes réussies d'un clic (re-cliquer les efface). */
const AllSuccessChip: React.FC<{ paths: string[]; progress?: ProgressData; onAssessMany: AssessManyHandler }> = ({ paths, progress, onAssessMany }) => {
  const all = paths.length > 0 && paths.every((p) => progress?.[p]?.status === 'success');
  return (
    <button
      type="button"
      aria-pressed={all}
      onClick={() => {
        if (!all) trackAction('tout-reussi');
        onAssessMany(Object.fromEntries(paths.map((p) => [p, all ? null : 'success'])), 'tout');
      }}
      title={all ? 'Cliquer pour effacer' : 'Marquer toutes les sous-questions comme réussies'}
      className={`shrink-0 inline-flex items-center gap-1 h-6 px-2 -ml-2 rounded-full text-[12px] font-medium transition-colors whitespace-nowrap ${COARSE_CHIP} [@media(pointer:coarse)]:ml-0 ${
        all ? 'bg-brand-soft text-brand-hover' : 'text-ink-faint hover:text-brand-hover hover:bg-brand-soft'}`}
    >
      <CheckCheck className="w-3.5 h-3.5" /> Tout réussi
    </button>
  );
};

// =====================
// « TU AVAIS TROUVÉ ? » (07/10/2026)
// =====================

/**
 * Sous une solution ouverte, si la question n'est pas encore évaluée : c'est le moment où l'élève sait
 * s'il avait trouvé. Deux réponses (Oui / Non, à revoir) ; après le clic, un simple « Noté » quelques secondes.
 */
const FoundPrompt: React.FC<{ assessed: boolean; onAnswer: (status: AssessmentStatus) => void }> = ({ assessed, onAnswer }) => {
  const [noted, setNoted] = useState(false);
  useEffect(() => {
    if (!noted) return;
    const t = window.setTimeout(() => setNoted(false), 3000);
    return () => window.clearTimeout(t);
  }, [noted]);
  useRegisterPrompt(!noted && !assessed);
  if (noted) {
    return (
      <p role="status" className="mt-2 inline-flex items-center gap-1 text-[12.5px] font-medium text-brand-hover">
        <Check className="w-3.5 h-3.5" /> Noté
      </p>
    );
  }
  if (assessed) return null;
  const answer = (status: AssessmentStatus) => (e: React.MouseEvent) => {
    e.stopPropagation();
    trackAction('trouve-apres-solution');
    onAnswer(status);
    setNoted(true);
  };
  const btn = 'inline-flex items-center gap-1 h-7 px-3 rounded-full text-[12.5px] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 [@media(pointer:coarse)]:h-9 [@media(pointer:coarse)]:text-[13px]';
  return (
    <div role="group" aria-label="Tu avais trouvé ?" data-tour="trouve" className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1.5">
      <span className="text-[13px] font-medium text-ink-soft">Tu avais trouvé ?</span>
      <button type="button" onClick={answer('success')} className={`${btn} bg-brand-soft text-brand-hover hover:bg-brand hover:text-white`}>
        <Check className="w-3.5 h-3.5" /> Oui
      </button>
      <button type="button" onClick={answer('review')} className={`${btn} bg-[#fbecea] text-[#a23b34] hover:bg-[#a23b34] hover:text-white`}>
        <RotateCcw className="w-3.5 h-3.5" /> Non, à revoir
      </button>
    </div>
  );
};

// =====================
// SOLUTION TOGGLE BUTTON
// =====================

interface SolutionToggleProps {
  isOpen: boolean;
  onToggle: () => void;
  hasSolution: boolean;
}

const SolutionToggle: React.FC<SolutionToggleProps> = ({ isOpen, onToggle, hasSolution }) => {
  if (!hasSolution) return null;

  // À la souris : l'œil seul ; au toucher : l'œil et son libellé, sur 36 px de haut.
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      className={`inline-flex items-center justify-center gap-1.5 w-7 h-7 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 [@media(pointer:coarse)]:w-auto [@media(pointer:coarse)]:h-9 [@media(pointer:coarse)]:px-3 [@media(pointer:coarse)]:text-[13px] [@media(pointer:coarse)]:font-semibold [@media(pointer:coarse)]:bg-brand-soft ${
        isOpen ? 'bg-brand-soft text-brand-hover' : 'text-brand-hover/80 hover:text-brand-hover hover:bg-brand-soft [@media(pointer:coarse)]:text-brand-hover'}`}
      title={isOpen ? 'Masquer la solution' : 'Voir la solution'}
      aria-label={isOpen ? 'Masquer la solution' : 'Voir la solution'}
      aria-expanded={isOpen}
      data-tour="solution"
    >
      {isOpen ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      <span className="hidden [@media(pointer:coarse)]:inline" aria-hidden>{isOpen ? 'Masquer' : 'Solution'}</span>
    </button>
  );
};

/**
 * Solution d'une question : ouverte ou fermée ici (null = suit « Voir les solutions »), pour qu'une solution
 * se referme même quand toutes sont affichées. Chaque ouverture est mesurée.
 */
function useSolutionState(path: string, globalShow: boolean, locked: boolean, onSolutionOpen?: (path: string) => void) {
  const [local, setLocal] = useState<boolean | null>(null);
  // « Voir / Masquer les solutions » reprend la main sur toutes les questions.
  useEffect(() => { setLocal(null); }, [globalShow]);
  const shown = !locked && (local ?? globalShow);
  const toggle = () => {
    if (!shown) {
      trackAction('voir-solution');
      onSolutionOpen?.(path);
    }
    setLocal(!shown);
  };
  // Ouverte à la main (pas par « Voir les solutions ») : c'est là que « Tu avais trouvé ? » a du sens.
  return { shown, toggle, openedHere: local === true };
}

// =====================
// INLINE SOLUTION
// =====================

const InlineSolution: React.FC<{ solution?: ContentBlock; isVisible: boolean; onReport?: () => void }> = ({ solution, isVisible, onReport }) => {
  if (!isVisible || !solution || !solution.html) return null;

  return (
    <div className="mt-2 pl-3 sm:pl-4 border-l-2 border-brand bg-brand-soft py-2 pr-2 sm:pr-3 rounded-r min-w-0">
      <div className="text-xs font-semibold uppercase tracking-wide text-brand-hover mb-1">Solution</div>
      <RenderContent content={solution} className="prose-sm" />
      {/* Au toucher, le drapeau de la question est ici (il n'est plus à côté de l'énoncé). */}
      {onReport && (
        <button type="button" onClick={(e) => { e.stopPropagation(); onReport(); }}
          className="hidden [@media(pointer:coarse)]:inline-flex mt-1.5 -ml-1 h-9 items-center gap-1.5 rounded-lg px-2 text-[12.5px] font-medium text-ink-faint hover:text-[#a23b34]">
          <Flag className="w-3.5 h-3.5" /> Une erreur dans cette solution ?
        </button>
      )}
    </div>
  );
};

/** Barre d'actions d'une question : barème, solution, auto-évaluation. */
const QuestionActions: React.FC<{
  points?: number; showSolution: boolean; onToggleSolution: () => void; hasSolution: boolean;
  assess?: { current?: AssessmentStatus; onAssess: (s: AssessmentStatus) => void; options?: AssessmentStatus[] };
  className?: string;
}> = ({ points, showSolution, onToggleSolution, hasSolution, assess, className = '' }) => (
  <div className={`flex items-center flex-wrap gap-x-1.5 gap-y-1 mt-1 -ml-1.5 [@media(pointer:coarse)]:gap-y-1.5 [@media(pointer:coarse)]:ml-0 ${className}`}>
    <SolutionToggle isOpen={showSolution} onToggle={onToggleSolution} hasSolution={hasSolution} />
    {hasSolution && assess && <span className="w-px h-4 bg-line mx-1" aria-hidden />}
    {assess && <QuickAssess current={assess.current} onAssess={assess.onAssess} options={assess.options} />}
    {points ? <span className="ml-1 text-xs text-ink-faint fd-nums">{formatPoints(points)}</span> : null}
  </div>
);

// =====================
// SUB-QUESTION RENDERER
// =====================

interface SubQuestionRendererProps {
  subQuestion: SubQuestionBlock;
  questionIndex: number;
  sqIndex: number;
  questionPath: string;
  globalShowSolutions: boolean;
  progress?: ProgressData;
  onAssess?: AssessHandler;
  assessOptions?: AssessmentStatus[];
  onSolutionOpen?: (path: string) => void;
  interactive: boolean;
  locked?: boolean;
  onReport?: (path: string) => void;
}

const SubQuestionRenderer: React.FC<SubQuestionRendererProps> = ({
  subQuestion,
  questionIndex,
  sqIndex,
  questionPath,
  globalShowSolutions,
  progress,
  onAssess,
  assessOptions,
  onSolutionOpen,
  interactive,
  locked = false,
  onReport,
}) => {
  const path = `${questionPath}.${subQuestion.id}`;
  const hasSolution = Boolean(subQuestion.solution?.html) && !locked;
  const { shown: showSolution, toggle, openedHere } = useSolutionState(path, globalShowSolutions, locked, onSolutionOpen);

  return (
    <div id={questionAnchor(path)} className="group/sq ml-1 sm:ml-5 mt-1 flex items-start gap-1.5 sm:gap-2 scroll-mt-24">
      <span className="font-mono fd-nums font-semibold text-ink-faint shrink-0">
        {questionIndex}.{sqIndex + 1}.
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-1">
          <div className="flex-1 min-w-0"><RenderContent content={subQuestion.content} className="prose-sm" /></div>
          {onReport && <ReportQuestionButton group="sq" onClick={() => onReport(path)} />}
        </div>
        <QuestionActions
          points={subQuestion.points}
          showSolution={showSolution}
          onToggleSolution={toggle}
          hasSolution={hasSolution}
          assess={interactive && onAssess && !locked
            ? { current: progress?.[path]?.status, onAssess: (s) => onAssess(path, s, 'question'), options: assessOptions } : undefined}
        />
        <InlineSolution solution={subQuestion.solution} isVisible={showSolution} onReport={onReport ? () => onReport(path) : undefined} />
        {showSolution && openedHere && hasSolution && interactive && onAssess && (
          <FoundPrompt assessed={!!progress?.[path]?.status} onAnswer={(s) => onAssess(path, s, 'apres_solution')} />
        )}
      </div>
    </div>
  );
};

// =====================
// QUESTION RENDERER
// =====================

interface QuestionRendererProps {
  block: ExerciseBlock;
  questionIndex: number;
  globalShowSolutions: boolean;
  progress?: ProgressData;
  onAssess?: AssessHandler;
  onAssessMany?: AssessManyHandler;
  assessOptions?: AssessmentStatus[];
  onSolutionOpen?: (path: string) => void;
  interactive: boolean;
  isFirst?: boolean;
  locked?: boolean;
  onReport?: (path: string) => void;
}

const QuestionRenderer: React.FC<QuestionRendererProps> = ({
  block,
  questionIndex,
  globalShowSolutions,
  progress,
  onAssess,
  onAssessMany,
  assessOptions,
  onSolutionOpen,
  interactive,
  isFirst = false,
  locked = false,
  onReport,
}) => {
  const path = block.id;
  const hasSubQuestions = block.subQuestions && block.subQuestions.length > 0;
  const hasSolution = Boolean(block.solution?.html) && !locked;
  const { shown: showSolution, toggle, openedHere } = useSolutionState(path, globalShowSolutions, locked, onSolutionOpen);
  const canAssess = interactive && !!onAssess && !locked;
  const subPaths = hasSubQuestions ? block.subQuestions!.map((sq) => `${path}.${sq.id}`) : [];

  return (
    <div id={hasSubQuestions ? undefined : questionAnchor(path)} className={`scroll-mt-24 ${isFirst ? '' : 'mt-2'}`}>
      {/* Question header */}
      <div className="group/q flex items-start gap-2 flex-1 min-w-0">
        <span className="font-mono fd-nums font-semibold text-ink shrink-0">{questionIndex}.</span>
        <div className="flex-1 min-w-0">
          <RenderContent content={block.content} />
        </div>
        {/* Question à sous-questions : chaque sous-question a son propre drapeau. */}
        {onReport && <ReportQuestionButton group="q" onClick={() => onReport(path)} />}
      </div>
      {/* Points + actions — only when no sub-questions */}
      {!hasSubQuestions && (
        <QuestionActions
          className="ml-5 sm:ml-6"
          points={block.points}
          showSolution={showSolution}
          onToggleSolution={toggle}
          hasSolution={hasSolution}
          assess={canAssess ? { current: progress?.[path]?.status, onAssess: (s) => onAssess!(path, s, 'question'), options: assessOptions } : undefined}
        />
      )}

      {/* Solution — only for questions without sub-questions */}
      {!hasSubQuestions && (
        <InlineSolution solution={block.solution} isVisible={showSolution} onReport={onReport ? () => onReport(path) : undefined} />
      )}
      {!hasSubQuestions && showSolution && openedHere && hasSolution && canAssess && (
        <FoundPrompt assessed={!!progress?.[path]?.status} onAnswer={(s) => onAssess!(path, s, 'apres_solution')} />
      )}

      {/* Sub-questions */}
      {hasSubQuestions && (
        <div>
          {canAssess && onAssessMany && subPaths.length > 1 && (
            <div className="ml-1 sm:ml-5 mt-1.5 mb-1">
              <AllSuccessChip paths={subPaths} progress={progress} onAssessMany={onAssessMany} />
            </div>
          )}
          {block.subQuestions!.map((sq, sqIdx) => (
            <SubQuestionRenderer
              key={sq.id}
              subQuestion={sq}
              questionIndex={questionIndex}
              sqIndex={sqIdx}
              questionPath={path}
              globalShowSolutions={globalShowSolutions}
              progress={progress}
              onAssess={onAssess}
              assessOptions={assessOptions}
              onSolutionOpen={onSolutionOpen}
              interactive={interactive}
              locked={locked}
              onReport={onReport}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// =====================
// MAIN RENDERER
// =====================

export const ExerciseRenderer: React.FC<ExerciseRendererProps> = ({
  structure,
  progress,
  onAssess,
  onAssessMany,
  assessOptions,
  onSolutionOpen,
  interactive = false,
  showAllSolutions = false,
  compact = true,
  locked = false,
  onReport,
}) => {
  if (!structure || !structure.blocks || structure.blocks.length === 0) {
    return (
      <div className="text-center text-ink-faint py-8">
        Aucun contenu pour le moment.
      </div>
    );
  }

  return (
    <div className={compact ? 'content-compact-view bg-white rounded-xl border border-line' : ''}>
      {compact && <CompactStyles />}
      <div className={compact ? 'p-4' : ''}>
        {(() => {
          let qCount = 0;
          return structure.blocks.map((block, index) => {
            if (block.type === 'section') {
              qCount = 0;
              return <SectionHeading key={block.id} block={block} first={index === 0} />;
            }
            if (block.type === 'context') {
              return (
                <div key={block.id} className={index > 0 ? 'mt-2' : ''}>
                  <RenderContent content={block.content} />
                </div>
              );
            }
            qCount++;
            return (
              <QuestionRenderer
                key={block.id}
                block={block}
                questionIndex={qCount}
                globalShowSolutions={showAllSolutions}
                progress={progress}
                onAssess={onAssess}
                onAssessMany={onAssessMany}
                assessOptions={assessOptions}
                onSolutionOpen={onSolutionOpen}
                interactive={interactive}
                isFirst={index === 0}
                locked={locked}
                onReport={onReport}
              />
            );
          });
        })()}
      </div>
    </div>
  );
};

export default ExerciseRenderer;
