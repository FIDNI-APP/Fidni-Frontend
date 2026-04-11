/**
 * FlexibleExerciseEditor - Éditeur modulaire pour exercices structurés
 *
 * Permet de composer librement un exercice comme une suite de blocs:
 * - Blocs contexte/introduction
 * - Blocs question (avec sous-questions optionnelles)
 * L'utilisateur peut alterner librement contextes et questions.
 * Nomenclature totalement libre (pas de Q1, Q2 imposé).
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus, Save, Eye, EyeOff, ArrowLeft, Trash2,
  FileText, MessageSquare, ChevronDown, ChevronRight, Copy, ArrowUp, ArrowDown,
  HelpCircle, X
} from 'lucide-react';
import { TextBlockEditor } from './TextBlockEditor';
import type { ContentBlock, Difficulty } from '@/types/structured';

// =====================
// TYPES
// =====================

export type BlockType = 'context' | 'question';

export interface SubQuestionBlock {
  id: string;
  label: string;  // Libre: "a)", "1.", "i)", etc.
  content: ContentBlock;
  points?: number;
  solution?: ContentBlock;
}

export interface ExerciseBlock {
  id: string;
  type: BlockType;
  // Pour context
  content?: ContentBlock;
  // Pour question
  label?: string;  // Libre: "Question A", "1)", "Partie I", etc.
  questionContent?: ContentBlock;
  points?: number;
  solution?: ContentBlock;
  subQuestions?: SubQuestionBlock[];
}

export interface FlexibleExerciseStructure {
  version: string;
  blocks: ExerciseBlock[];
}

export interface FlexibleEditorState {
  title: string;
  difficulty?: Difficulty;
  structure: FlexibleExerciseStructure;
  // Exam specific
  isNationalExam?: boolean;
  nationalYear?: number;
  durationMinutes?: number;
}

interface FlexibleExerciseEditorProps {
  initialData?: Partial<FlexibleEditorState>;
  contentType: 'exercise' | 'exam';
  onSave: (data: FlexibleEditorState) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  showPreview: boolean;
  onTogglePreview: () => void;
}

// =====================
// HELPERS
// =====================

const generateId = () => Math.random().toString(36).substring(2, 9);

const createEmptyStructure = (): FlexibleExerciseStructure => ({
  version: '2.0',
  blocks: [],
});

const DIFFICULTY_OPTIONS: { value: Difficulty; label: string; color: string }[] = [
  { value: 'easy', label: 'Facile', color: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
  { value: 'medium', label: 'Moyen', color: 'bg-amber-100 text-amber-700 border-amber-300' },
  { value: 'hard', label: 'Difficile', color: 'bg-red-100 text-red-700 border-red-300' },
];

// =====================
// TUTORIAL (modal centré avec GIF)
// =====================

interface TutorialStep {
  title: string;
  desc: string;
  // Remplace ces chemins par tes vrais GIFs dans /public/tutorials/
  gif: string;
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    title: 'Titre & Difficulté',
    desc: 'Saisissez un titre (obligatoire) et choisissez le niveau de difficulté : Facile, Moyen ou Difficile.',
    gif: '/tutorials/tutorial-title.gif',
  },
  {
    title: 'Ajouter un bloc Contexte',
    desc: 'Cliquez sur "Contexte" pour insérer une introduction, des données ou un texte de référence avant vos questions.',
    gif: '/tutorials/tutorial-context.gif',
  },
  {
    title: 'Ajouter une Question',
    desc: 'Cliquez sur "Question" pour créer une question. Donnez-lui un libellé libre ("Q1", "A)", "Partie I"…) et assignez des points.',
    gif: '/tutorials/tutorial-question.gif',
  },
  {
    title: 'Sous-questions',
    desc: 'À l\'intérieur d\'une question, cliquez sur "Ajouter sous-question" pour décomposer en parties a), b), c)…',
    gif: '/tutorials/tutorial-subquestion.gif',
  },
  {
    title: 'Bouton Solutions',
    desc: 'Activez "Solutions" dans la barre du haut pour afficher les champs de corrigé sur chaque question.',
    gif: '/tutorials/tutorial-solutions.gif',
  },
  {
    title: 'Aperçu en temps réel',
    desc: 'Cliquez sur "Aperçu" pour voir le rendu final tel qu\'il apparaîtra aux élèves.',
    gif: '/tutorials/tutorial-preview.gif',
  },
];

// Placeholder affiché si le GIF n'existe pas encore
const GifPlaceholder: React.FC<{ title: string }> = ({ title }) => (
  <div className="w-full h-full flex flex-col items-center justify-center gap-3 bg-slate-100 rounded-lg">
    <div className="w-16 h-16 rounded-full bg-slate-200 flex items-center justify-center">
      <HelpCircle className="w-8 h-8 text-slate-400" />
    </div>
    <p className="text-sm text-slate-400 text-center px-4">
      GIF à venir — <span className="font-medium">{title}</span>
    </p>
  </div>
);

interface TutorialModalProps {
  stepIndex: number;
  total: number;
  onNext: () => void;
  onPrev: () => void;
  onClose: () => void;
}

const TutorialModal: React.FC<TutorialModalProps> = ({ stepIndex, total, onNext, onPrev, onClose }) => {
  const step = TUTORIAL_STEPS[stepIndex];
  const [gifError, setGifError] = useState(false);

  // Reset gif error when step changes
  useEffect(() => { setGifError(false); }, [stepIndex]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Barre de progression */}
        <div className="h-1 bg-slate-100">
          <div
            className="h-full bg-blue-500 transition-all duration-300"
            style={{ width: `${((stepIndex + 1) / total) * 100}%` }}
          />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
            Étape {stepIndex + 1} sur {total}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* GIF */}
        <div className="mx-5 rounded-xl overflow-hidden bg-slate-100" style={{ height: 220 }}>
          {gifError ? (
            <GifPlaceholder title={step.title} />
          ) : (
            <img
              key={step.gif}
              src={step.gif}
              alt={step.title}
              onError={() => setGifError(true)}
              className="w-full h-full object-cover"
            />
          )}
        </div>

        {/* Texte */}
        <div className="px-5 pt-4 pb-2">
          <h3 className="text-base font-bold text-slate-900 mb-1">{step.title}</h3>
          <p className="text-sm text-slate-600 leading-relaxed">{step.desc}</p>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between px-5 py-4">
          <button
            type="button"
            onClick={onPrev}
            disabled={stepIndex === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            ← Précédent
          </button>

          {/* Dots */}
          <div className="flex gap-1.5">
            {Array.from({ length: total }).map((_, i) => (
              <div
                key={i}
                className={`rounded-full transition-all duration-200 ${
                  i === stepIndex ? 'w-4 h-2 bg-blue-500' : 'w-2 h-2 bg-slate-200'
                }`}
              />
            ))}
          </div>

          {stepIndex < total - 1 ? (
            <button
              type="button"
              onClick={onNext}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              Suivant →
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              Terminer ✓
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// =====================
// SUB-QUESTION EDITOR
// =====================

interface SubQuestionEditorProps {
  subQuestion: SubQuestionBlock;
  onChange: (sq: SubQuestionBlock) => void;
  onDelete: () => void;
  showSolution: boolean;
}

const SubQuestionEditor: React.FC<SubQuestionEditorProps> = ({
  subQuestion,
  onChange,
  onDelete,
  showSolution,
}) => {
  return (
    <div className="ml-6 pl-4 border-l-2 border-indigo-200 py-3 group/sub">
      <div className="flex items-start gap-3">
        {/* Label libre */}
        <input
          type="text"
          value={subQuestion.label}
          onChange={(e) => onChange({ ...subQuestion, label: e.target.value })}
          placeholder="a)"
          className="w-16 px-2 py-1 text-sm font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 rounded focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
        />

        <div className="flex-1 space-y-2">
          <TextBlockEditor
            value={subQuestion.content}
            onChange={(content) => onChange({ ...subQuestion, content })}
            placeholder="Contenu de la sous-question..."
            minHeight="60px"
            showToolbar={false}
          />

          {/* Solution (toggle) */}
          {showSolution && (
            <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
              <label className="block text-xs font-medium text-green-700 mb-1">Solution</label>
              <TextBlockEditor
                value={subQuestion.solution}
                onChange={(solution) => onChange({ ...subQuestion, solution })}
                placeholder="Solution de cette sous-question..."
                minHeight="50px"
                showToolbar={false}
              />
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <input
            type="number"
            min="0"
            value={subQuestion.points || ''}
            onChange={(e) => onChange({ ...subQuestion, points: parseInt(e.target.value) || undefined })}
            placeholder="Pts"
            className="w-14 px-2 py-1 text-xs border border-slate-200 rounded focus:ring-1 focus:ring-indigo-500"
          />
          <button
            type="button"
            onClick={onDelete}
            className="p-1 text-slate-400 hover:text-red-500 opacity-0 group-hover/sub:opacity-100 transition-opacity"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

// =====================
// BLOCK EDITOR
// =====================

interface BlockEditorProps {
  block: ExerciseBlock;
  index: number;
  totalBlocks: number;
  onChange: (block: ExerciseBlock) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
  showSolutions: boolean;
}

const BlockEditor: React.FC<BlockEditorProps> = ({
  block,
  index,
  totalBlocks,
  onChange,
  onDelete,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  isExpanded,
  onToggleExpand,
  showSolutions,
}) => {
  const isContext = block.type === 'context';

  const addSubQuestion = () => {
    const subQuestions = block.subQuestions || [];
    const newSub: SubQuestionBlock = {
      id: generateId(),
      label: String.fromCharCode(97 + subQuestions.length) + ')', // a), b), c)...
      content: { type: 'text', html: '' },
    };
    onChange({ ...block, subQuestions: [...subQuestions, newSub] });
  };

  const updateSubQuestion = (subIndex: number, sq: SubQuestionBlock) => {
    const newSubs = [...(block.subQuestions || [])];
    newSubs[subIndex] = sq;
    onChange({ ...block, subQuestions: newSubs });
  };

  const deleteSubQuestion = (subIndex: number) => {
    const newSubs = (block.subQuestions || []).filter((_, i) => i !== subIndex);
    onChange({ ...block, subQuestions: newSubs });
  };

  return (
    <div className={`bg-white rounded-xl border shadow-sm overflow-hidden ${
      isContext ? 'border-slate-200' : 'border-blue-200'
    }`}>
      {/* Header */}
      <div
        className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${
          isContext
            ? 'bg-slate-50 hover:bg-slate-100'
            : 'bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100'
        }`}
        onClick={onToggleExpand}
      >
        <div className="flex flex-col gap-0.5">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onMoveUp(); }}
            disabled={index === 0}
            className="p-0.5 text-slate-400 hover:text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed"
            title="Monter"
          >
            <ArrowUp className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onMoveDown(); }}
            disabled={index === totalBlocks - 1}
            className="p-0.5 text-slate-400 hover:text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed"
            title="Descendre"
          >
            <ArrowDown className="w-4 h-4" />
          </button>
        </div>

        <button type="button" className="text-slate-500">
          {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
        </button>

        <span className={`text-sm font-medium px-2 py-0.5 rounded ${
          isContext ? 'bg-slate-200 text-slate-700' : 'bg-blue-100 text-blue-700'
        }`}>
          {isContext ? 'Contexte' : 'Question'}
        </span>

        {!isContext && (
          <input
            type="text"
            value={block.label || ''}
            onChange={(e) => {
              e.stopPropagation();
              onChange({ ...block, label: e.target.value });
            }}
            onClick={(e) => e.stopPropagation()}
            placeholder="Libellé (ex: Question 1, A), Partie I...)"
            className="flex-1 px-3 py-1 text-sm bg-white border border-slate-200 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />
        )}

        {isContext && (
          <span className="flex-1 text-sm text-slate-500 italic">
            Introduction / Données / Contexte
          </span>
        )}

        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          {!isContext && (
            <input
              type="number"
              min="0"
              value={block.points || ''}
              onChange={(e) => onChange({ ...block, points: parseInt(e.target.value) || undefined })}
              placeholder="Points"
              className="w-20 px-2 py-1 text-sm border border-slate-200 rounded focus:ring-1 focus:ring-blue-500"
            />
          )}
          <button
            type="button"
            onClick={onDuplicate}
            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"
            title="Dupliquer"
          >
            <Copy className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded"
            title="Supprimer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="p-4 space-y-4">
          {isContext ? (
            <TextBlockEditor
              value={block.content}
              onChange={(content) => onChange({ ...block, content })}
              placeholder="Écrivez le contexte, les données ou l'introduction..."
              minHeight="100px"
            />
          ) : (
            <>
              {/* Question content */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Énoncé
                </label>
                <TextBlockEditor
                  value={block.questionContent}
                  onChange={(questionContent) => onChange({ ...block, questionContent })}
                  placeholder="Énoncé de la question..."
                  minHeight="80px"
                />
              </div>

              {/* Solution */}
              {showSolutions && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <label className="block text-xs font-medium text-green-700 mb-1">
                    Solution
                  </label>
                  <TextBlockEditor
                    value={block.solution}
                    onChange={(solution) => onChange({ ...block, solution })}
                    placeholder="Solution de cette question..."
                    minHeight="60px"
                    showToolbar={false}
                  />
                </div>
              )}

              {/* Sub-questions */}
              {block.subQuestions && block.subQuestions.length > 0 && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700">
                    Sous-questions
                  </label>
                  {block.subQuestions.map((sq, subIndex) => (
                    <SubQuestionEditor
                      key={sq.id}
                      subQuestion={sq}
                      onChange={(updated) => updateSubQuestion(subIndex, updated)}
                      onDelete={() => deleteSubQuestion(subIndex)}
                      showSolution={showSolutions}
                    />
                  ))}
                </div>
              )}

              {/* Add sub-question */}
              <button
                type="button"
                onClick={addSubQuestion}
                className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 px-3 py-2 rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                Ajouter sous-question
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

// =====================
// MAIN EDITOR
// =====================

export const FlexibleExerciseEditor: React.FC<FlexibleExerciseEditorProps> = ({
  initialData,
  contentType,
  onSave,
  onCancel,
  isLoading = false,
  showPreview,
  onTogglePreview,
}) => {
  // State
  const [title, setTitle] = useState(initialData?.title || '');
  const [difficulty, setDifficulty] = useState<Difficulty | undefined>(initialData?.difficulty);
  const [structure, setStructure] = useState<FlexibleExerciseStructure>(
    initialData?.structure || createEmptyStructure()
  );

  // Exam specific
  const [isNationalExam, setIsNationalExam] = useState(initialData?.isNationalExam || false);
  const [nationalYear, setNationalYear] = useState(initialData?.nationalYear || new Date().getFullYear());
  const [durationMinutes, setDurationMinutes] = useState(initialData?.durationMinutes || 60);

  // UI
  const [expandedBlocks, setExpandedBlocks] = useState<Set<string>>(new Set());
  const [showSolutions, setShowSolutions] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [tutorialStep, setTutorialStep] = useState<number | null>(null);

  const startTutorial = () => setTutorialStep(0);
  const closeTutorial = () => setTutorialStep(null);
  const nextStep = () => setTutorialStep((s) => (s !== null && s < TUTORIAL_STEPS.length - 1 ? s + 1 : null));
  const prevStep = () => setTutorialStep((s) => (s !== null && s > 0 ? s - 1 : s));

  // Auto-show tutorial on first visit
  useEffect(() => {
    if (!localStorage.getItem('editor_tutorial_seen')) {
      setTutorialStep(0);
      localStorage.setItem('editor_tutorial_seen', '1');
    }
  }, []);

  // Update state when initialData changes (e.g., from JSON import)
  useEffect(() => {
    if (initialData) {
      if (initialData.title !== undefined) setTitle(initialData.title);
      if (initialData.difficulty !== undefined) setDifficulty(initialData.difficulty);
      if (initialData.structure) {
        setStructure(initialData.structure);
        // Expand all blocks when importing
        const allBlockIds = initialData.structure.blocks.map(b => b.id);
        setExpandedBlocks(new Set(allBlockIds));
      }
      if (initialData.isNationalExam !== undefined) setIsNationalExam(initialData.isNationalExam);
      if (initialData.nationalYear !== undefined) setNationalYear(initialData.nationalYear);
      if (initialData.durationMinutes !== undefined) setDurationMinutes(initialData.durationMinutes);
    }
  }, [initialData]);

  // Auto-expand new blocks
  useEffect(() => {
    if (structure.blocks.length > 0) {
      const lastBlock = structure.blocks[structure.blocks.length - 1];
      setExpandedBlocks((prev) => new Set([...prev, lastBlock.id]));
    }
  }, [structure.blocks.length]);

  // Calculate totals
  const totalPoints = structure.blocks.reduce((acc, block) => {
    if (block.type === 'question') {
      let points = block.points || 0;
      block.subQuestions?.forEach((sq) => {
        points += sq.points || 0;
      });
      return acc + points;
    }
    return acc;
  }, 0);

  const questionCount = structure.blocks.filter((b) => b.type === 'question').length;

  // Handlers
  const addBlock = (type: BlockType) => {
    const newBlock: ExerciseBlock = {
      id: generateId(),
      type,
      ...(type === 'context'
        ? { content: { type: 'text', html: '' } }
        : {
            label: '',
            questionContent: { type: 'text', html: '' },
            subQuestions: [],
          }
      ),
    };
    setStructure((prev) => ({
      ...prev,
      blocks: [...prev.blocks, newBlock],
    }));
  };

  const updateBlock = (index: number, block: ExerciseBlock) => {
    setStructure((prev) => {
      const newBlocks = [...prev.blocks];
      newBlocks[index] = block;
      return { ...prev, blocks: newBlocks };
    });
  };

  const deleteBlock = (index: number) => {
    setStructure((prev) => ({
      ...prev,
      blocks: prev.blocks.filter((_, i) => i !== index),
    }));
  };

  const duplicateBlock = (index: number) => {
    const block = structure.blocks[index];
    const newBlock: ExerciseBlock = {
      ...JSON.parse(JSON.stringify(block)),
      id: generateId(),
      subQuestions: block.subQuestions?.map((sq) => ({ ...sq, id: generateId() })),
    };
    setStructure((prev) => ({
      ...prev,
      blocks: [...prev.blocks.slice(0, index + 1), newBlock, ...prev.blocks.slice(index + 1)],
    }));
  };

  const toggleExpand = (blockId: string) => {
    setExpandedBlocks((prev) => {
      const next = new Set(prev);
      if (next.has(blockId)) {
        next.delete(blockId);
      } else {
        next.add(blockId);
      }
      return next;
    });
  };

  const moveBlockUp = (index: number) => {
    if (index === 0) return;
    const items = Array.from(structure.blocks);
    [items[index - 1], items[index]] = [items[index], items[index - 1]];
    setStructure((prev) => ({ ...prev, blocks: items }));
  };

  const moveBlockDown = (index: number) => {
    if (index >= structure.blocks.length - 1) return;
    const items = Array.from(structure.blocks);
    [items[index], items[index + 1]] = [items[index + 1], items[index]];
    setStructure((prev) => ({ ...prev, blocks: items }));
  };

  const handleSave = async () => {
    if (!title.trim()) {
      alert('Veuillez entrer un titre');
      return;
    }

    setIsSaving(true);
    try {
      await onSave({
        title,
        difficulty,
        structure,
        ...(contentType === 'exam' && {
          isNationalExam,
          nationalYear: isNationalExam ? nationalYear : undefined,
          durationMinutes,
        }),
      });
    } finally {
      setIsSaving(false);
    }
  };

  const isExam = contentType === 'exam';

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-slate-200 shadow-sm">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={onCancel}
                className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-lg font-semibold text-slate-900">
                  {initialData?.title ? 'Modifier' : 'Nouvel'} {isExam ? 'examen' : 'exercice'}
                </h1>
                <p className="text-sm text-slate-500">
                  {questionCount} question{questionCount !== 1 ? 's' : ''} • {totalPoints} pts
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={startTutorial}
                className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="Guide de l'éditeur"
              >
                <HelpCircle className="w-5 h-5" />
              </button>

              <button
                data-tutorial="btn-solutions"
                type="button"
                onClick={() => setShowSolutions(!showSolutions)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors ${
                  showSolutions
                    ? 'bg-green-50 text-green-700 border-green-300'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {showSolutions ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                Solutions
              </button>

              <button
                data-tutorial="btn-preview"
                type="button"
                onClick={onTogglePreview}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors ${
                  showPreview
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-300'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <Eye className="w-4 h-4" />
                Aperçu
              </button>

              <button
                data-tutorial="btn-save"
                type="button"
                onClick={handleSave}
                disabled={isSaving || isLoading}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                <Save className="w-4 h-4" />
                {isSaving ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tutorial Modal */}
      {tutorialStep !== null && (
        <TutorialModal
          stepIndex={tutorialStep}
          total={TUTORIAL_STEPS.length}
          onNext={nextStep}
          onPrev={prevStep}
          onClose={closeTutorial}
        />
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Title & Basic Info */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Titre *
                </label>
                <input
                  data-tutorial="title-input"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Titre de l'exercice..."
                  className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Difficulté
                  </label>
                  <div data-tutorial="difficulty-buttons" className="flex gap-2">
                    {DIFFICULTY_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setDifficulty(opt.value)}
                        className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-all ${
                          difficulty === opt.value
                            ? opt.color + ' ring-2 ring-offset-1'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {isExam && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Durée (minutes)
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={durationMinutes}
                      onChange={(e) => setDurationMinutes(parseInt(e.target.value) || 60)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}
              </div>

              {isExam && (
                <div>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isNationalExam}
                      onChange={(e) => setIsNationalExam(e.target.checked)}
                      className="w-5 h-5 text-blue-600 border-slate-300 rounded"
                    />
                    <span className="text-sm font-medium text-slate-700">Examen national</span>
                  </label>
                  {isNationalExam && (
                    <div className="mt-2 ml-8">
                      <input
                        type="number"
                        min="1990"
                        max={new Date().getFullYear()}
                        value={nationalYear}
                        onChange={(e) => setNationalYear(parseInt(e.target.value))}
                        className="w-24 px-3 py-1 border border-slate-200 rounded-lg"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Blocks */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Contenu</h2>
              <button
                type="button"
                onClick={() => {
                  if (expandedBlocks.size === structure.blocks.length) {
                    setExpandedBlocks(new Set());
                  } else {
                    setExpandedBlocks(new Set(structure.blocks.map((b) => b.id)));
                  }
                }}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                {expandedBlocks.size === structure.blocks.length ? 'Tout réduire' : 'Tout développer'}
              </button>
            </div>

            {structure.blocks.length === 0 ? (
              <div className="bg-white rounded-xl border-2 border-dashed border-slate-300 p-8 text-center">
                <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 mb-4">
                  Commencez à construire votre exercice en ajoutant des blocs.
                </p>
                <div className="flex justify-center gap-3">
                  <button
                    data-tutorial="add-context"
                    type="button"
                    onClick={() => addBlock('context')}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200"
                  >
                    <FileText className="w-4 h-4" />
                    Contexte
                  </button>
                  <button
                    data-tutorial="add-question"
                    type="button"
                    onClick={() => addBlock('question')}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    <MessageSquare className="w-4 h-4" />
                    Question
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {structure.blocks.map((block, index) => (
                  <BlockEditor
                    key={block.id}
                    block={block}
                    index={index}
                    totalBlocks={structure.blocks.length}
                    onChange={(b) => updateBlock(index, b)}
                    onDelete={() => deleteBlock(index)}
                    onDuplicate={() => duplicateBlock(index)}
                    onMoveUp={() => moveBlockUp(index)}
                    onMoveDown={() => moveBlockDown(index)}
                    isExpanded={expandedBlocks.has(block.id)}
                    onToggleExpand={() => toggleExpand(block.id)}
                    showSolutions={showSolutions}
                  />
                ))}
              </div>
            )}

            {/* Add block buttons */}
            {structure.blocks.length > 0 && (
              <div className="flex justify-center gap-3 pt-4">
                <button
                  data-tutorial="add-context"
                  type="button"
                  onClick={() => addBlock('context')}
                  className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-slate-300 text-slate-500 rounded-lg hover:border-slate-400 hover:text-slate-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Contexte
                </button>
                <button
                  data-tutorial="add-question"
                  type="button"
                  onClick={() => addBlock('question')}
                  className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-blue-300 text-blue-600 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Question
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FlexibleExerciseEditor;
