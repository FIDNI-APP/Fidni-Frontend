import React, { useState, useEffect, useRef } from 'react';
import {
  Plus, Save, Eye, EyeOff, ArrowLeft, Trash2,
  FileText, MessageSquare, Copy, ArrowUp, ArrowDown, GripVertical
} from 'lucide-react';
import { TextBlockEditor } from './TextBlockEditor';
import type { ContentBlock, Difficulty } from '@/types/content';

// =====================
// TYPES
// =====================

export type BlockType = 'context' | 'question';

export interface SubQuestionBlock {
  id: string;
  content: ContentBlock;
  points?: number;
  solution?: ContentBlock;
}

export interface ExerciseBlock {
  id: string;
  type: BlockType;
  content?: ContentBlock;
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
  onChange?: (state: FlexibleEditorState) => void;
}

// =====================
// HELPERS
// =====================

const generateId = () => Math.random().toString(36).substring(2, 9);

const createEmptyStructure = (): FlexibleExerciseStructure => ({
  version: '2.0',
  blocks: [],
});

const DIFFICULTY_OPTIONS: { value: Difficulty; label: string; active: string }[] = [
  { value: 'easy',   label: 'Facile',    active: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
  { value: 'medium', label: 'Moyen',     active: 'bg-amber-100 text-amber-700 border-amber-300' },
  { value: 'hard',   label: 'Difficile', active: 'bg-red-100 text-red-700 border-red-300' },
];

// =====================
// ADD BLOCK BUTTON (between blocks)
// =====================

interface AddBlockRowProps {
  onAdd: (type: BlockType) => void;
}

const AddBlockRow: React.FC<AddBlockRowProps> = ({ onAdd }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} className="relative flex items-center gap-2 group/add py-1">
      <div className="flex-1 h-px bg-slate-100 group-hover/add:bg-slate-200 transition-colors" />
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 px-2 py-0.5 text-xs text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors opacity-0 group-hover/add:opacity-100"
      >
        <Plus className="w-3.5 h-3.5" />
        Ajouter
      </button>
      <div className="flex-1 h-px bg-slate-100 group-hover/add:bg-slate-200 transition-colors" />

      {open && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20 bg-white border border-slate-200 rounded-xl shadow-lg p-1 flex gap-1">
          <button
            type="button"
            onClick={() => { onAdd('context'); setOpen(false); }}
            className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <FileText className="w-4 h-4 text-slate-500" />
            Contexte
          </button>
          <button
            type="button"
            onClick={() => { onAdd('question'); setOpen(false); }}
            className="flex items-center gap-2 px-3 py-2 text-sm text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <MessageSquare className="w-4 h-4 text-blue-500" />
            Question
          </button>
        </div>
      )}
    </div>
  );
};

// =====================
// SUB-QUESTION ROW (flattened)
// =====================

interface SubQuestionRowProps {
  sq: SubQuestionBlock;
  questionIndex: number;
  sqIndex: number;
  onChange: (sq: SubQuestionBlock) => void;
  onDelete: () => void;
  showSolution: boolean;
  onToggleSolution: () => void;
  solutionVisible: boolean;
}

const SubQuestionRow: React.FC<SubQuestionRowProps> = ({
  sq, questionIndex, sqIndex, onChange, onDelete, showSolution, onToggleSolution, solutionVisible,
}) => (
  <div className="group/sq pl-6 border-l-2 border-blue-100">
    <div className="flex items-start gap-3 py-2">
      <span className="text-sm font-mono font-medium text-blue-400 shrink-0 pt-0.5 w-12">
        {questionIndex}.{sqIndex + 1}.
      </span>
      <div className="flex-1 min-w-0">
        <TextBlockEditor
          value={sq.content}
          onChange={(content) => onChange({ ...sq, content })}
          placeholder="Sous-question..."
          minHeight="40px"
          showToolbar={false}
        />
        {(showSolution || solutionVisible) && (
          <div className="mt-2 pl-3 border-l-2 border-emerald-200">
            <TextBlockEditor
              value={sq.solution}
              onChange={(solution) => onChange({ ...sq, solution })}
              placeholder="Solution..."
              minHeight="32px"
              showToolbar={false}
            />
          </div>
        )}
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <input
          type="number"
          min="0"
          value={sq.points ?? ''}
          onChange={(e) => onChange({ ...sq, points: parseInt(e.target.value) || undefined })}
          placeholder="pts"
          className="w-12 px-1.5 py-0.5 text-xs text-center border border-slate-200 rounded focus:ring-1 focus:ring-blue-400 focus:outline-none"
        />
        {showSolution && (
          <button
            type="button"
            onClick={onToggleSolution}
            className="p-1 text-slate-300 hover:text-emerald-500 opacity-0 group-hover/sq:opacity-100 transition-opacity"
            title="Afficher/masquer solution"
          >
            {solutionVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
        )}
        <button
          type="button"
          onClick={onDelete}
          className="p-1 text-slate-300 hover:text-red-500 opacity-0 group-hover/sq:opacity-100 transition-opacity"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  </div>
);

// =====================
// BLOCK ROW (Notion-style)
// =====================

interface BlockRowProps {
  block: ExerciseBlock;
  index: number;
  questionIndex: number; // 1-based index among question blocks only
  totalBlocks: number;
  onChange: (block: ExerciseBlock) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  showSolutions: boolean;
}

const BlockRow: React.FC<BlockRowProps> = ({
  block, index, questionIndex, totalBlocks, onChange, onDelete, onDuplicate, onMoveUp, onMoveDown, showSolutions,
}) => {
  const isContext = block.type === 'context';
  const [perBlockSolution, setPerBlockSolution] = useState(false);
  const [sqSolutionVisible, setSqSolutionVisible] = useState<Record<string, boolean>>({});

  const showSol = showSolutions || perBlockSolution;

  const addSubQuestion = () => {
    const subs = block.subQuestions || [];
    onChange({
      ...block,
      subQuestions: [...subs, { id: generateId(), content: { type: 'text', html: '' } }],
    });
  };

  const updateSq = (i: number, sq: SubQuestionBlock) => {
    const subs = [...(block.subQuestions || [])];
    subs[i] = sq;
    onChange({ ...block, subQuestions: subs });
  };

  const deleteSq = (i: number) => {
    onChange({ ...block, subQuestions: (block.subQuestions || []).filter((_, j) => j !== i) });
  };

  return (
    <div className={`group/block flex gap-3 relative ${isContext ? '' : ''}`}>
      {/* Left accent */}
      <div className={`w-0.5 rounded-full shrink-0 mt-2 ${isContext ? 'bg-slate-300' : 'bg-blue-400'}`} />

      {/* Main content */}
      <div className="flex-1 min-w-0 py-2">
        {/* Type badge + number row */}
        <div className="flex items-center gap-2 mb-2">
          {isContext ? (
            <span className="text-xs font-semibold px-1.5 py-0.5 rounded text-slate-500 bg-slate-100">
              Contexte
            </span>
          ) : (
            <>
              <span className="text-sm font-mono font-semibold text-blue-600 shrink-0">
                {questionIndex}.
              </span>
              <input
                type="number"
                min="0"
                value={block.points ?? ''}
                onChange={(e) => onChange({ ...block, points: parseInt(e.target.value) || undefined })}
                placeholder="pts"
                className="w-14 px-1.5 py-0.5 text-xs text-center border border-slate-200 rounded focus:ring-1 focus:ring-blue-400 focus:outline-none ml-auto"
              />
            </>
          )}
        </div>

        {/* Content editor */}
        <TextBlockEditor
          value={block.content}
          onChange={(content) => onChange({ ...block, content })}
          placeholder={isContext ? 'Contexte, données, introduction...' : 'Énoncé de la question...'}
          minHeight={isContext ? '80px' : '60px'}
        />

        {/* Solution (question level) — only when no sub-questions */}
        {!isContext && !(block.subQuestions?.length) && showSol && (
          <div className="mt-2 pl-3 border-l-2 border-emerald-200">
            <span className="text-xs font-medium text-emerald-600 mb-1 block">Solution</span>
            <TextBlockEditor
              value={block.solution}
              onChange={(solution) => onChange({ ...block, solution })}
              placeholder="Solution..."
              minHeight="48px"
              showToolbar={false}
            />
          </div>
        )}

        {/* Sub-questions */}
        {!isContext && (
          <div className="mt-3 space-y-0">
            {(block.subQuestions || []).map((sq, i) => (
              <SubQuestionRow
                key={sq.id}
                sq={sq}
                questionIndex={questionIndex}
                sqIndex={i}
                onChange={(updated) => updateSq(i, updated)}
                onDelete={() => deleteSq(i)}
                showSolution={showSol}
                onToggleSolution={() => setSqSolutionVisible((prev) => ({ ...prev, [sq.id]: !prev[sq.id] }))}
                solutionVisible={!!sqSolutionVisible[sq.id]}
              />
            ))}
            <button
              type="button"
              onClick={addSubQuestion}
              className="mt-1 flex items-center gap-1.5 text-xs text-slate-400 hover:text-blue-600 transition-colors pl-6"
            >
              <Plus className="w-3 h-3" />
              Sous-question
            </button>
          </div>
        )}
      </div>

      {/* Hover actions (right side) */}
      <div className="flex flex-col items-center gap-1 pt-2 opacity-0 group-hover/block:opacity-100 transition-opacity shrink-0">
        <button type="button" onClick={onMoveUp} disabled={index === 0}
          className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-20 disabled:cursor-not-allowed">
          <ArrowUp className="w-3.5 h-3.5" />
        </button>
        <button type="button" onClick={onMoveDown} disabled={index === totalBlocks - 1}
          className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-20 disabled:cursor-not-allowed">
          <ArrowDown className="w-3.5 h-3.5" />
        </button>
        <button type="button" onClick={onDuplicate}
          className="p-1 text-slate-400 hover:text-blue-600">
          <Copy className="w-3.5 h-3.5" />
        </button>
        {!isContext && (
          <button type="button" onClick={() => setPerBlockSolution((v) => !v)}
            className={`p-1 transition-colors ${perBlockSolution ? 'text-emerald-500' : 'text-slate-400 hover:text-emerald-500'}`}
            title="Solution">
            <Eye className="w-3.5 h-3.5" />
          </button>
        )}
        <button type="button" onClick={onDelete}
          className="p-1 text-slate-400 hover:text-red-500">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
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
  onChange,
}) => {
  const [title, setTitle] = useState(initialData?.title || '');
  const [difficulty, setDifficulty] = useState<Difficulty | undefined>(initialData?.difficulty);
  const [structure, setStructure] = useState<FlexibleExerciseStructure>(
    initialData?.structure || createEmptyStructure()
  );
  const [isNationalExam, setIsNationalExam] = useState(initialData?.isNationalExam || false);
  const [nationalYear, setNationalYear] = useState(initialData?.nationalYear || new Date().getFullYear());
  const [durationMinutes, setDurationMinutes] = useState(initialData?.durationMinutes || 60);
  const [showSolutions, setShowSolutions] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Notify parent of state changes for live preview
  useEffect(() => {
    onChange?.({ title, difficulty, structure, isNationalExam, nationalYear, durationMinutes });
  }, [title, difficulty, structure, isNationalExam, nationalYear, durationMinutes]);

  useEffect(() => {
    if (initialData) {
      if (initialData.title !== undefined) setTitle(initialData.title);
      if (initialData.difficulty !== undefined) setDifficulty(initialData.difficulty);
      if (initialData.structure) setStructure(initialData.structure);
      if (initialData.isNationalExam !== undefined) setIsNationalExam(initialData.isNationalExam);
      if (initialData.nationalYear !== undefined) setNationalYear(initialData.nationalYear);
      if (initialData.durationMinutes !== undefined) setDurationMinutes(initialData.durationMinutes);
    }
  }, [initialData]);

  const totalPoints = structure.blocks.reduce((acc, b) => {
    if (b.type !== 'question') return acc;
    const sub = (b.subQuestions || []).reduce((s, sq) => s + (sq.points || 0), 0);
    return acc + (sub > 0 ? sub : (b.points || 0));
  }, 0);

  const questionCount = structure.blocks.filter((b) => b.type === 'question').length;
  const isExam = contentType === 'exam';

  const addBlock = (type: BlockType, afterIndex?: number) => {
    const newBlock: ExerciseBlock = {
      id: generateId(),
      type,
      content: { type: 'text', html: '' },
      ...(type === 'question' ? { label: '', subQuestions: [] } : {}),
    };
    setStructure((prev) => {
      const blocks = [...prev.blocks];
      if (afterIndex !== undefined) {
        blocks.splice(afterIndex + 1, 0, newBlock);
      } else {
        blocks.push(newBlock);
      }
      return { ...prev, blocks };
    });
  };

  const updateBlock = (index: number, block: ExerciseBlock) => {
    setStructure((prev) => {
      const blocks = [...prev.blocks];
      blocks[index] = block;
      return { ...prev, blocks };
    });
  };

  const deleteBlock = (index: number) =>
    setStructure((prev) => ({ ...prev, blocks: prev.blocks.filter((_, i) => i !== index) }));

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

  const moveBlock = (index: number, dir: -1 | 1) => {
    const ni = index + dir;
    if (ni < 0 || ni >= structure.blocks.length) return;
    setStructure((prev) => {
      const blocks = [...prev.blocks];
      [blocks[index], blocks[ni]] = [blocks[ni], blocks[index]];
      return { ...prev, blocks };
    });
  };

  const handleSave = async () => {
    if (!title.trim()) { alert('Veuillez entrer un titre'); return; }
    setIsSaving(true);
    try {
      await onSave({
        title, difficulty, structure,
        ...(isExam && { isNationalExam, nationalYear: isNationalExam ? nationalYear : undefined, durationMinutes }),
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* ── Sticky header ── */}
      <div className="sticky top-0 z-10 bg-white border-b border-slate-100 px-6 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button type="button" onClick={onCancel}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">
              {isExam ? 'Examen' : 'Exercice'}
            </p>
            <p className="text-sm text-slate-600">
              {questionCount} question{questionCount !== 1 ? 's' : ''} · {totalPoints} pts
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setShowSolutions((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm transition-colors ${
              showSolutions ? 'bg-emerald-50 text-emerald-700 border-emerald-300' : 'text-slate-500 border-slate-200 hover:bg-slate-50'
            }`}>
            {showSolutions ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            Solutions
          </button>
          <button type="button" onClick={onTogglePreview}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm transition-colors ${
              showPreview ? 'bg-indigo-50 text-indigo-700 border-indigo-300' : 'text-slate-500 border-slate-200 hover:bg-slate-50'
            }`}>
            <Eye className="w-4 h-4" />
            Aperçu
          </button>
          <button type="button" onClick={handleSave} disabled={isSaving || isLoading}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm transition-colors">
            <Save className="w-4 h-4" />
            {isSaving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </div>

      {/* ── Scrollable body ── */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-8 space-y-1">

          {/* Title */}
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={`Titre de l'${isExam ? 'examen' : 'exercice'}...`}
            className="w-full text-3xl font-bold text-slate-900 bg-transparent border-none outline-none placeholder:text-slate-300 mb-2"
          />

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-3 pb-4 border-b border-slate-100">
            {/* Difficulty */}
            <div className="flex gap-1">
              {DIFFICULTY_OPTIONS.map((opt) => (
                <button key={opt.value} type="button"
                  onClick={() => setDifficulty(difficulty === opt.value ? undefined : opt.value)}
                  className={`px-2.5 py-1 rounded-lg border text-xs font-medium transition-all ${
                    difficulty === opt.value ? opt.active : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                  }`}>
                  {opt.label}
                </button>
              ))}
            </div>

            {isExam && (
              <>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-500">Durée</span>
                  <input type="number" min="1" value={durationMinutes}
                    onChange={(e) => setDurationMinutes(parseInt(e.target.value) || 60)}
                    className="w-16 px-2 py-0.5 text-sm border border-slate-200 rounded focus:ring-1 focus:ring-blue-400 focus:outline-none" />
                  <span className="text-xs text-slate-400">min</span>
                </div>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" checked={isNationalExam}
                    onChange={(e) => setIsNationalExam(e.target.checked)}
                    className="rounded text-blue-600" />
                  <span className="text-xs text-slate-600">Examen national</span>
                </label>
                {isNationalExam && (
                  <input type="number" min="1990" max={new Date().getFullYear()} value={nationalYear}
                    onChange={(e) => setNationalYear(parseInt(e.target.value))}
                    className="w-20 px-2 py-0.5 text-sm border border-slate-200 rounded focus:ring-1 focus:ring-blue-400 focus:outline-none" />
                )}
              </>
            )}
          </div>

          {/* Blocks */}
          <div className="pt-4 space-y-0">
            {structure.blocks.length === 0 ? (
              <div className="py-16 text-center">
                <p className="text-slate-400 text-sm mb-4">Commencez à construire votre {isExam ? 'examen' : 'exercice'}</p>
                <div className="flex justify-center gap-2">
                  <button type="button" onClick={() => addBlock('context')}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors">
                    <FileText className="w-4 h-4" /> Contexte
                  </button>
                  <button type="button" onClick={() => addBlock('question')}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700 transition-colors">
                    <MessageSquare className="w-4 h-4" /> Question
                  </button>
                </div>
              </div>
            ) : (
              <>
                {(() => {
                  let qCount = 0;
                  return structure.blocks.map((block, index) => {
                    if (block.type === 'question') qCount++;
                    const qi = qCount;
                    return (
                      <React.Fragment key={block.id}>
                        <BlockRow
                          block={block}
                          index={index}
                          questionIndex={qi}
                          totalBlocks={structure.blocks.length}
                          onChange={(b) => updateBlock(index, b)}
                          onDelete={() => deleteBlock(index)}
                          onDuplicate={() => duplicateBlock(index)}
                          onMoveUp={() => moveBlock(index, -1)}
                          onMoveDown={() => moveBlock(index, 1)}
                          showSolutions={showSolutions}
                        />
                        <AddBlockRow onAdd={(type) => addBlock(type, index)} />
                      </React.Fragment>
                    );
                  });
                })()}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
