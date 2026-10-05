/**
 * ExerciseRenderer - Rendu fluide pour exercices structurés
 *
 * Layout compact, espacements naturels.
 * Chaque question a son propre toggle solution.
 * Option globale pour tout développer/réduire.
 */

import React, { useState, useRef } from 'react';
import { FloatingPanel } from '@/components/ui/FloatingPanel';
import { Check, X, RotateCcw, HelpCircle, Eye, EyeOff, ThumbsUp, GitCompare, AlertCircle, ClipboardCheck, ChevronDown, Flag } from 'lucide-react';
import TipTapRenderer from '@/components/editor/TipTapRenderer';
import type { ContentBlock, AssessmentStatus } from '@/types/content';
import type { ExerciseBlock, SubQuestionBlock, FlexibleExerciseStructure } from '../editor/FlexibleExerciseEditor';

// =====================
// TYPES
// =====================

interface ProgressData {
  [path: string]: {
    status: AssessmentStatus;
    assessed_at?: string;
    /** Validation de la solution par l'élève (renvoyée par l'API de progression). */
    solution_validation?: string | null;
  };
}

interface ExerciseRendererProps {
  structure: FlexibleExerciseStructure;
  progress?: ProgressData;
  onAssess?: (path: string, status: AssessmentStatus) => void;
  onValidateSolution?: (path: string, validation: string | null) => void;
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

// Signaler une erreur sur une question précise : petit drapeau à droite, visible au survol de la
// question (toujours discret sur écran tactile, où le survol n'existe pas).
const ReportQuestionButton: React.FC<{ onClick: () => void; group: 'q' | 'sq' }> = ({ onClick, group }) => (
  <button
    type="button"
    onClick={onClick}
    title="Signaler une erreur sur cette question"
    aria-label="Signaler une erreur sur cette question"
    className={`shrink-0 -mr-1 p-1 rounded-md text-ink-faint hover:text-[#a23b34] hover:bg-[#fbecea] transition-opacity opacity-0 focus-visible:opacity-100 [@media(hover:none)]:opacity-50 ${
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
// ASSESSMENT BUTTONS
// =====================

interface AssessmentButtonsProps {
  path: string;
  currentStatus?: AssessmentStatus;
  onAssess: (status: AssessmentStatus) => void;
}

// Shared "pill + dropdown" control used by both the self-assessment and the
// solution-comparison. One option can be selected; selecting the active one
// (or the "Effacer" row) clears it — so a choice is always cancellable.
interface PillOption {
  value: string;
  icon: React.ReactNode;
  label: string;
  activeClass: string; // bg/text/border for the selected state
}

const PillDropdown: React.FC<{
  current?: string | null;
  options: PillOption[];
  placeholderIcon: React.ReactNode;
  placeholderLabel: string;
  title?: string;
  onSelect: (value: string) => void;
  onClear: () => void;
}> = ({ current, options, placeholderIcon, placeholderLabel, title, onSelect, onClear }) => {
  const [isOpen, setIsOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const active = options.find(o => o.value === current);

  const toggleOpen = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(v => !v);
  };

  return (
    <div className="relative inline-flex">
      <button
        ref={btnRef}
        type="button"
        onClick={toggleOpen}
        title={title}
        className={`inline-flex items-center gap-1.5 pl-2.5 pr-2 py-1 rounded-full text-xs font-medium border transition-colors whitespace-nowrap ${
          active ? active.activeClass : 'bg-white text-[#33302b] border-[#e7e3dc] hover:bg-[#f7f6f3]'
        }`}
      >
        {active ? <>{active.icon}{active.label}</> : <>{placeholderIcon}{placeholderLabel}</>}
        <ChevronDown className={`w-3 h-3 opacity-60 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <FloatingPanel anchorRef={btnRef} open={isOpen} onClose={() => setIsOpen(false)} offset={4}
        className="bg-white rounded-lg shadow-lg border border-[#e7e3dc] py-1 min-w-[160px]">
            {options.map(o => {
              const isActive = o.value === current;
              return (
                <button
                  key={o.value}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isActive) onClear(); else onSelect(o.value);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm transition-colors ${
                    isActive ? o.activeClass : 'text-[#33302b] hover:bg-[#f7f6f3]'
                  }`}
                >
                  {o.icon}
                  <span className="flex-1 text-left">{o.label}</span>
                  {isActive && <Check className="w-3.5 h-3.5" />}
                </button>
              );
            })}
            {active && (
              <>
                <div className="my-1 border-t border-[#f0efea]" />
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onClear(); setIsOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-[#6b6862] hover:bg-[#f7f6f3]"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Effacer</span>
                </button>
              </>
            )}
      </FloatingPanel>
    </div>
  );
};

const ASSESS_OPTIONS: PillOption[] = [
  { value: 'success', icon: <Check className="w-3.5 h-3.5" />,      label: 'Réussi',   activeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { value: 'partial', icon: <HelpCircle className="w-3.5 h-3.5" />, label: 'Partiel',  activeClass: 'bg-amber-50 text-amber-700 border-amber-200' },
  { value: 'review',  icon: <RotateCcw className="w-3.5 h-3.5" />,  label: 'À revoir', activeClass: 'bg-[#f2f1ee] text-ink-soft border-line' },
  { value: 'failed',  icon: <X className="w-3.5 h-3.5" />,          label: 'Échoué',   activeClass: 'bg-rose-50 text-rose-700 border-rose-200' },
];

const AssessmentButtons: React.FC<AssessmentButtonsProps> = ({ currentStatus, onAssess }) => (
  <div className="inline-flex" data-tour="auto-eval">
    <PillDropdown
      current={currentStatus}
      options={ASSESS_OPTIONS}
      placeholderIcon={<ClipboardCheck className="w-3.5 h-3.5" />}
      placeholderLabel="Auto-évaluation"
      title="M'auto-évaluer"
      onSelect={(v) => onAssess(v as AssessmentStatus)}
      onClear={() => { if (currentStatus) onAssess(currentStatus); }} // same status toggles it off
    />
  </div>
);

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

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors whitespace-nowrap ${
        isOpen
          ? 'bg-white text-ink-soft border-line hover:border-ink'
          : 'bg-white text-brand-hover border-brand-line hover:bg-brand-soft'
      }`}
      title={isOpen ? 'Masquer la solution' : 'Afficher la solution'}
      data-tour="solution"
    >
      {isOpen ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
      {isOpen ? 'Masquer la solution' : 'Voir la solution'}
    </button>
  );
};

// =====================
// SOLUTION VALIDATION BUTTONS
// =====================

type ValidationStatus = 'compatible' | 'different' | 'not-understood' | null;

interface SolutionValidationButtonsProps {
  currentValidation?: ValidationStatus;
  onValidate: (status: ValidationStatus) => void;
}

const VALIDATION_OPTIONS: PillOption[] = [
  { value: 'compatible',     icon: <ThumbsUp className="w-3.5 h-3.5" />,    label: 'Compatible',  activeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { value: 'different',      icon: <GitCompare className="w-3.5 h-3.5" />,  label: 'Différente',  activeClass: 'bg-[#f2f1ee] text-ink-soft border-line' },
  { value: 'not-understood', icon: <AlertCircle className="w-3.5 h-3.5" />, label: 'Pas compris', activeClass: 'bg-amber-50 text-amber-700 border-amber-200' },
];

const SolutionValidationButtons: React.FC<SolutionValidationButtonsProps> = ({
  currentValidation,
  onValidate,
}) => (
  <PillDropdown
    current={currentValidation ?? undefined}
    options={VALIDATION_OPTIONS}
    placeholderIcon={<GitCompare className="w-3.5 h-3.5" />}
    placeholderLabel="Comparer"
    title="Comparer ma solution à la correction"
    onSelect={(v) => onValidate(v as ValidationStatus)}
    onClear={() => onValidate(null)}
  />
);

/** Barème à la française : « 1 pt », « 0,5 pt », « 2 pts ». */

// =====================
// INLINE SOLUTION
// =====================

interface InlineSolutionProps {
  solution?: ContentBlock;
  isVisible: boolean;
  validationStatus?: ValidationStatus;
  onValidate?: (status: ValidationStatus) => void;
}

const InlineSolution: React.FC<InlineSolutionProps> = ({
  solution,
  isVisible,
  validationStatus,
  onValidate
}) => {
  if (!isVisible || !solution || !solution.html) return null;

  return (
    <div className="mt-2 pl-3 sm:pl-4 border-l-2 border-brand bg-brand-soft py-2 pr-2 sm:pr-3 rounded-r min-w-0">
      <div className="flex items-center justify-between mb-1">
        <div className="text-xs font-semibold uppercase tracking-wide text-brand-hover">Solution</div>
        {onValidate && (
          <SolutionValidationButtons
            currentValidation={validationStatus}
            onValidate={onValidate}
          />
        )}
      </div>
      <RenderContent content={solution} className="prose-sm" />
    </div>
  );
};

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
  onAssess?: (path: string, status: AssessmentStatus) => void;
  onValidateSolution?: (path: string, validation: string | null) => void;
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
  onValidateSolution,
  interactive,
  locked = false,
  onReport,
}) => {
  const [localShowSolution, setLocalShowSolution] = useState(false);
  const path = `${questionPath}.${subQuestion.id}`;
  const currentStatus = progress?.[path]?.status;
  const validationStatus = progress?.[path]?.solution_validation as ValidationStatus;
  const hasSolution = Boolean(subQuestion.solution?.html) && !locked;
  const showSolution = !locked && (globalShowSolutions || localShowSolution);

  return (
    <div className="group/sq ml-1 sm:ml-5 mt-1 flex items-start gap-1.5 sm:gap-2">
      <span className="font-mono fd-nums font-semibold text-ink-faint shrink-0">
        {questionIndex}.{sqIndex + 1}.
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-1">
          <div className="flex-1 min-w-0"><RenderContent content={subQuestion.content} className="prose-sm" /></div>
          {onReport && <ReportQuestionButton group="sq" onClick={() => onReport(path)} />}
        </div>
        <div className="flex items-center flex-wrap gap-x-2 gap-y-1.5 mt-1.5">
          {subQuestion.points && (
            <span className="text-xs text-ink-faint fd-nums">{formatPoints(subQuestion.points)}</span>
          )}
          <SolutionToggle
            isOpen={showSolution}
            onToggle={() => setLocalShowSolution(v => !v)}
            hasSolution={hasSolution}
          />
          {interactive && onAssess && !locked && (
            <AssessmentButtons
              path={path}
              currentStatus={currentStatus}
              onAssess={(status) => onAssess(path, status)}
            />
          )}
        </div>
        <InlineSolution
          solution={subQuestion.solution}
          isVisible={showSolution}
          validationStatus={validationStatus}
          onValidate={onValidateSolution ? (status) => onValidateSolution(path, status) : undefined}
        />
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
  onAssess?: (path: string, status: AssessmentStatus) => void;
  onValidateSolution?: (path: string, validation: string | null) => void;
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
  onValidateSolution,
  interactive,
  isFirst = false,
  locked = false,
  onReport,
}) => {
  const [localShowSolution, setLocalShowSolution] = useState(false);
  const path = block.id;
  const currentStatus = progress?.[path]?.status;
  const validationStatus = progress?.[path]?.solution_validation as ValidationStatus;
  const hasSubQuestions = block.subQuestions && block.subQuestions.length > 0;
  const hasSolution = Boolean(block.solution?.html) && !locked;
  const showSolution = !locked && (globalShowSolutions || localShowSolution);

  return (
    <div className={isFirst ? '' : 'mt-2'}>
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
        <div className="flex items-center flex-wrap gap-x-2 gap-y-1.5 mt-1.5 ml-5 sm:ml-6">
          {block.points && (
            <span className="text-xs text-ink-faint fd-nums">{formatPoints(block.points)}</span>
          )}
          <SolutionToggle
            isOpen={showSolution}
            onToggle={() => setLocalShowSolution(v => !v)}
            hasSolution={hasSolution}
          />
          {interactive && onAssess && !locked && (
            <AssessmentButtons
              path={path}
              currentStatus={currentStatus}
              onAssess={(status) => onAssess(path, status)}
            />
          )}
        </div>
      )}

      {/* Solution — only for questions without sub-questions */}
      {!hasSubQuestions && (
        <InlineSolution
          solution={block.solution}
          isVisible={showSolution}
          validationStatus={validationStatus}
          onValidate={onValidateSolution ? (status) => onValidateSolution(path, status) : undefined}
        />
      )}

      {/* Sub-questions */}
      {hasSubQuestions && (
        <div>
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
              onValidateSolution={onValidateSolution}
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
  onValidateSolution,
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
                onValidateSolution={onValidateSolution}
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
