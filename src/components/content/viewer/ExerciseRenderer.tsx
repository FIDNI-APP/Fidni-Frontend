/**
 * ExerciseRenderer - Rendu fluide pour exercices structurés
 *
 * Layout compact, espacements naturels.
 * Chaque question a son propre toggle solution.
 * Option globale pour tout développer/réduire.
 */

import React, { useState, useRef, useEffect } from 'react';
import { Check, X, RotateCcw, HelpCircle, Eye, EyeOff, ThumbsUp, GitCompare, AlertCircle, ClipboardCheck } from 'lucide-react';
import TipTapRenderer from '@/components/editor/TipTapRenderer';
import type { ContentBlock, AssessmentStatus } from '@/types/structured';
import type { ExerciseBlock, SubQuestionBlock, FlexibleExerciseStructure } from '../editor/FlexibleExerciseEditor';

// =====================
// TYPES
// =====================

interface ProgressData {
  [path: string]: {
    status: AssessmentStatus;
    assessed_at?: string;
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
}

// =====================
// CONTENT RENDERER
// =====================

// Global styles for compact rendering - injected once
const CompactStyles = () => (
  <style>{`
    .structured-compact-view .tiptap-full-renderer,
    .structured-compact-view .tiptap-full-renderer .ProseMirror {
      min-height: 0 !important;
      padding: 0 !important;
    }
    .structured-compact-view .tiptap-full-renderer .ProseMirror p {
      margin: 0 !important;
    }
    .structured-compact-view .tiptap-full-renderer .ProseMirror h1,
    .structured-compact-view .tiptap-full-renderer .ProseMirror h2 {
      margin: 0 0 0.25rem 0 !important;
    }
    .structured-compact-view .tiptap-full-renderer .ProseMirror .math-display {
      margin: 0.25em 0 !important;
    }
    .structured-compact-view .tiptap-full-renderer .ProseMirror > *:last-child {
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
    <div className={`text-slate-700 min-w-0 max-w-full ${className}`}>
      <TipTapRenderer content={content.html} />
    </div>
  );
};

// =====================
// ASSESSMENT BUTTONS
// =====================

interface AssessmentButtonsProps {
  path: string;
  currentStatus?: AssessmentStatus;
  onAssess: (status: AssessmentStatus) => void;
}

const assessmentOptions: {
  status: AssessmentStatus;
  icon: React.ReactNode;
  label: string;
  color: string;
  activeColor: string;
  activeBg: string;
}[] = [
  {
    status: 'success',
    icon: <Check className="w-3.5 h-3.5" />,
    label: 'Réussi',
    color: 'text-emerald-600',
    activeColor: 'bg-emerald-100 text-emerald-700',
    activeBg: 'bg-emerald-100 text-emerald-700 border-emerald-200'
  },
  {
    status: 'partial',
    icon: <HelpCircle className="w-3.5 h-3.5" />,
    label: 'Partiel',
    color: 'text-amber-600',
    activeColor: 'bg-amber-100 text-amber-700',
    activeBg: 'bg-amber-100 text-amber-700 border-amber-200'
  },
  {
    status: 'review',
    icon: <RotateCcw className="w-3.5 h-3.5" />,
    label: 'À revoir',
    color: 'text-blue-600',
    activeColor: 'bg-blue-100 text-blue-700',
    activeBg: 'bg-blue-100 text-blue-700 border-blue-200'
  },
  {
    status: 'failed',
    icon: <X className="w-3.5 h-3.5" />,
    label: 'Échoué',
    color: 'text-red-600',
    activeColor: 'bg-red-100 text-red-700',
    activeBg: 'bg-red-100 text-red-700 border-red-200'
  },
];

const AssessmentButtons: React.FC<AssessmentButtonsProps> = ({
  currentStatus,
  onAssess,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const activeBtn = assessmentOptions.find(b => b.status === currentStatus);

  const handleOpen = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 4, left: rect.left });
    }
    setIsOpen(!isOpen);
  };

  return (
    <div className="relative inline-flex ml-2">
      <button
        ref={btnRef}
        type="button"
        onClick={handleOpen}
        className={`p-1.5 rounded-md transition-all ${
          activeBtn
            ? activeBtn.activeBg + ' border'
            : 'text-slate-400 opacity-40 hover:opacity-100 hover:bg-slate-100'
        }`}
        title="Évaluer"
      >
        {activeBtn ? activeBtn.icon : <ClipboardCheck className="w-3.5 h-3.5" />}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed z-50 bg-white rounded-lg shadow-lg border border-slate-200 py-1 min-w-[140px]"
            style={{ top: pos.top, left: pos.left }}
          >
            {assessmentOptions.map((btn) => (
              <button
                key={btn.status}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onAssess(btn.status);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm transition-colors ${
                  currentStatus === btn.status
                    ? btn.activeColor
                    : `text-slate-600 hover:bg-slate-50 ${btn.color}`
                }`}
              >
                {btn.icon}
                <span>{btn.label}</span>
              </button>
            ))}
          </div>
          {/* Click-outside backdrop — AFTER dropdown per CLAUDE.md */}
          <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setIsOpen(false); }} />
        </>
      )}
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

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      className={`p-1.5 rounded-md transition-all opacity-40 hover:opacity-100 ${
        isOpen
          ? 'bg-green-100 text-green-700'
          : 'text-slate-400 hover:bg-green-50 hover:text-green-600'
      }`}
      title={isOpen ? 'Masquer la solution' : 'Afficher la solution'}
    >
      {isOpen ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
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

const SolutionValidationButtons: React.FC<SolutionValidationButtonsProps> = ({
  currentValidation,
  onValidate,
}) => {
  const buttons: {
    status: ValidationStatus;
    icon: React.ReactNode;
    label: string;
    shortLabel: string;
    color: string;
    activeColor: string;
    borderColor: string;
  }[] = [
    {
      status: 'compatible',
      icon: <ThumbsUp className="w-3.5 h-3.5" />,
      label: 'Ma solution est compatible',
      shortLabel: 'Compatible',
      color: 'text-green-600 bg-white border-green-200 hover:bg-green-50',
      activeColor: 'bg-green-500 text-white border-green-600',
      borderColor: 'border-green-600'
    },
    {
      status: 'different',
      icon: <GitCompare className="w-3.5 h-3.5" />,
      label: 'Ma solution est différente',
      shortLabel: 'Différente',
      color: 'text-blue-600 bg-white border-blue-200 hover:bg-blue-50',
      activeColor: 'bg-blue-500 text-white border-blue-600',
      borderColor: 'border-blue-600'
    },
    {
      status: 'not-understood',
      icon: <AlertCircle className="w-3.5 h-3.5" />,
      label: 'Je n\'ai pas compris',
      shortLabel: 'Pas compris',
      color: 'text-amber-600 bg-white border-amber-200 hover:bg-amber-50',
      activeColor: 'bg-amber-500 text-white border-amber-600',
      borderColor: 'border-amber-600'
    },
  ];

  return (
    <div className="inline-flex items-center gap-1.5 flex-wrap">
      {buttons.map((btn) => (
        <button
          key={btn.status}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onValidate(currentValidation === btn.status ? null : btn.status);
          }}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
            currentValidation === btn.status ? btn.activeColor : btn.color
          }`}
          title={btn.label}
        >
          {btn.icon}
          <span>{btn.shortLabel}</span>
        </button>
      ))}
    </div>
  );
};

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
    <div className="mt-2 pl-4 border-l-2 border-green-400 bg-green-50/50 py-2 pr-3 rounded-r">
      <div className="flex items-center justify-between mb-1">
        <div className="text-xs font-medium text-green-700">Solution</div>
        {onValidate && (
          <SolutionValidationButtons
            currentValidation={validationStatus}
            onValidate={onValidate}
          />
        )}
      </div>
      <RenderContent content={solution} className="prose-sm text-green-900" />
    </div>
  );
};

// =====================
// SUB-QUESTION RENDERER
// =====================

interface SubQuestionRendererProps {
  subQuestion: SubQuestionBlock;
  questionPath: string;
  globalShowSolutions: boolean;
  progress?: ProgressData;
  onAssess?: (path: string, status: AssessmentStatus) => void;
  onValidateSolution?: (path: string, validation: string | null) => void;
  interactive: boolean;
}

const SubQuestionRenderer: React.FC<SubQuestionRendererProps> = ({
  subQuestion,
  questionPath,
  globalShowSolutions,
  progress,
  onAssess,
  onValidateSolution,
  interactive,
}) => {
  const [localShowSolution, setLocalShowSolution] = useState(false);
  const path = `${questionPath}.${subQuestion.id}`;
  const currentStatus = progress?.[path]?.status;
  const validationStatus = progress?.[path]?.solution_validation as ValidationStatus;
  const hasSolution = Boolean(subQuestion.solution?.html);
  const showSolution = globalShowSolutions || localShowSolution;

  return (
    <div className="ml-5 mt-1">
      <div className="flex items-start gap-2 flex-1 min-w-0">
        <span className="font-medium text-indigo-600 shrink-0 text-sm">{subQuestion.label}</span>
        <div className="flex-1 min-w-0">
          <RenderContent content={subQuestion.content} className="prose-sm" />
        </div>
      </div>
      <div className="flex items-center gap-1 mt-1 ml-6">
        {subQuestion.points && (
          <span className="text-xs text-slate-400">({subQuestion.points}pts)</span>
        )}
        <SolutionToggle
          isOpen={showSolution}
          onToggle={() => setLocalShowSolution(!localShowSolution)}
          hasSolution={hasSolution}
        />
        {interactive && onAssess && (
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
  );
};

// =====================
// QUESTION RENDERER
// =====================

interface QuestionRendererProps {
  block: ExerciseBlock;
  globalShowSolutions: boolean;
  progress?: ProgressData;
  onAssess?: (path: string, status: AssessmentStatus) => void;
  onValidateSolution?: (path: string, validation: string | null) => void;
  interactive: boolean;
  isFirst?: boolean;
}

const QuestionRenderer: React.FC<QuestionRendererProps> = ({
  block,
  globalShowSolutions,
  progress,
  onAssess,
  onValidateSolution,
  interactive,
  isFirst = false,
}) => {
  const [localShowSolution, setLocalShowSolution] = useState(false);
  const path = block.id;
  const currentStatus = progress?.[path]?.status;
  const validationStatus = progress?.[path]?.solution_validation as ValidationStatus;
  const hasSubQuestions = block.subQuestions && block.subQuestions.length > 0;
  const hasSolution = Boolean(block.solution?.html);
  const showSolution = globalShowSolutions || localShowSolution;

  return (
    <div className={isFirst ? '' : 'mt-2'}>
      {/* Question header */}
      <div className="flex items-start gap-2 flex-1 min-w-0">
        {block.label && (
          <span className="font-semibold text-blue-700 shrink-0">{block.label}</span>
        )}
        <div className="flex-1 min-w-0">
          <RenderContent content={block.questionContent} />
        </div>
      </div>
      {!hasSubQuestions && (
        <div className="flex items-center gap-1 mt-1 ml-6">
          {block.points && (
            <span className="text-xs text-slate-400">({block.points}pts)</span>
          )}
          <SolutionToggle
            isOpen={showSolution}
            onToggle={() => setLocalShowSolution(!localShowSolution)}
            hasSolution={hasSolution}
          />
          {interactive && onAssess && (
            <AssessmentButtons
              path={path}
              currentStatus={currentStatus}
              onAssess={(status) => onAssess(path, status)}
            />
          )}
        </div>
      )}

      {/* Solution (si pas de sous-questions) */}
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
          {block.subQuestions!.map((sq) => (
            <SubQuestionRenderer
              key={sq.id}
              subQuestion={sq}
              questionPath={path}
              globalShowSolutions={globalShowSolutions}
              progress={progress}
              onAssess={onAssess}
              onValidateSolution={onValidateSolution}
              interactive={interactive}
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
}) => {
  if (!structure || !structure.blocks || structure.blocks.length === 0) {
    return (
      <div className="text-center text-slate-400 py-8">
        Aucun contenu
      </div>
    );
  }

  return (
    <div className="structured-compact-view bg-white rounded-xl border border-slate-200 shadow-sm">
      <CompactStyles />
      {/* Content */}
      <div className="p-4">
        {structure.blocks.map((block, index) => {
          if (block.type === 'context') {
            return (
              <div key={block.id} className={index > 0 ? 'mt-2' : ''}>
                <RenderContent content={block.content} />
              </div>
            );
          }

          return (
            <QuestionRenderer
              key={block.id}
              block={block}
              globalShowSolutions={showAllSolutions}
              progress={progress}
              onAssess={onAssess}
              onValidateSolution={onValidateSolution}
              interactive={interactive}
              isFirst={index === 0}
            />
          );
        })}
      </div>
    </div>
  );
};

/** Helper to count questions with solutions in a structure */
export const countQuestionsWithSolutions = (structure: FlexibleExerciseStructure | null | undefined): number => {
  if (!structure || !structure.blocks) return 0;
  return structure.blocks.filter(
    (b) => b.type === 'question' && (b.solution?.html || b.subQuestions?.some((sq) => sq.solution?.html))
  ).length;
};

export default ExerciseRenderer;
