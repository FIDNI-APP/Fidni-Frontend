import React, { useState, useEffect, useRef } from 'react';
import { FloatingPanel } from '@/components/ui/FloatingPanel';
import {
  Plus,
  Save,
  Eye,
  EyeOff,
  ArrowLeft,
  Trash2,
  FileText,
  MessageSquare,
  Copy,
  ArrowUp,
  ArrowDown,
  X as XIcon,
  ChevronDown,
  SlidersHorizontal,
  Heading,
} from 'lucide-react';
import { TextBlockEditor } from './TextBlockEditor';
import { api } from '@/lib/api/apiClient';
import type { ContentBlock } from '@/types/content';
import type { Difficulty } from '@/types';

// =====================
// TYPES
// =====================

// « section » : une partie d'examen (Exercice 1, Problème…) ; la numérotation des questions repart à 1.
export type BlockType = 'context' | 'question' | 'section';

// Schéma v2.1 — métadonnées pédagogiques par question (toutes optionnelles,
// rétro-compatible v2.0). `skills` alimente le diagnostic « maîtrise par notion ».
export interface QuestionMeta {
  skills?: string[];
  difficulty?: Difficulty;
  expected_seconds?: number;
  common_mistakes?: string[];
  hint?: string;
}

export interface SubQuestionBlock {
  id: string;
  content: ContentBlock;
  points?: number;
  solution?: ContentBlock;
  meta?: QuestionMeta;
}

export interface ExerciseBlock {
  id: string;
  type: BlockType;
  content?: ContentBlock;
  points?: number;
  solution?: ContentBlock;
  subQuestions?: SubQuestionBlock[];
  meta?: QuestionMeta;
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
  version: '2.1',
  blocks: [],
});

const DIFFICULTY_OPTIONS: { value: Difficulty; label: string; active: string }[] = [
  { value: 'easy',   label: 'Facile',    active: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
  { value: 'medium', label: 'Moyen',     active: 'bg-amber-100 text-amber-700 border-amber-300' },
  { value: 'hard',   label: 'Difficile', active: 'bg-red-100 text-red-700 border-red-300' },
];

// =====================
// META EDITOR (v2.1 — notions/difficulté/temps par question)
// =====================

const slugify = (s: string) =>
  s.trim().toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

// Référentiel des notions (liste fermée côté serveur, apps/caracteristics/notions.py) — chargé une
// fois, partagé par tous les MetaEditor. On ne crée pas de notion ici : même notion = même
// identifiant partout, sinon les statistiques se dispersent.
interface NotionRef { slug: string; label: string; chapter: string | null; count: number }
let SKILL_CACHE: NotionRef[] | null = null;
const fold = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const MetaEditor: React.FC<{ meta?: QuestionMeta; onChange: (m: QuestionMeta) => void }> = ({ meta, onChange }) => {
  const skills = meta?.skills || [];
  const count = skills.length + (meta?.difficulty ? 1 : 0) + (meta?.expected_seconds ? 1 : 0);
  // Ouvert d'emblée si des métadonnées existent déjà (à l'édition d'un exercice existant).
  const [open, setOpen] = useState(count > 0);
  const [draft, setDraft] = useState('');
  const [vocab, setVocab] = useState<NotionRef[]>(SKILL_CACHE || []);
  const [focused, setFocused] = useState(false);
  const skillInputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || SKILL_CACHE) return;
    api.get('/skills/').then(r => { SKILL_CACHE = r.data || []; setVocab(SKILL_CACHE ?? []); }).catch(() => {});
  }, [open]);

  const addSkill = (slug: string) => {
    if (slug && !skills.includes(slug)) onChange({ ...meta, skills: [...skills, slug] });
    setDraft('');
  };
  const removeSkill = (s: string) => onChange({ ...meta, skills: skills.filter(x => x !== s) });
  const labelOf = (slug: string) => vocab.find(v => v.slug === slug)?.label ?? slug;

  const q = fold(draft.trim());
  const qSlug = slugify(draft);
  const suggestions = vocab
    .filter(v => !skills.includes(v.slug) && (!q || fold(v.label).includes(q) || v.slug.includes(qSlug)))
    .slice(0, 8);

  return (
    <div className="mt-2" style={{ background: '#faf9f7', border: '1px solid #f0efea', borderRadius: 8, overflow: 'hidden' }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2"
        style={{ padding: '7px 11px', background: 'transparent', border: 'none', cursor: 'pointer' }}
      >
        <SlidersHorizontal className="w-3.5 h-3.5" style={{ color: '#6b6862' }} />
        <span style={{ fontSize: 12, fontWeight: 600, color: '#33302b' }}>Métadonnées pédagogiques</span>
        <span style={{ fontSize: 11, color: '#9a958c' }}>notions · difficulté · temps</span>
        {count > 0 && (
          <span style={{ fontSize: 10.5, fontWeight: 700, color: '#15633c', background: '#eaf3ed', padding: '1px 7px', borderRadius: 99 }}>{count}</span>
        )}
        <ChevronDown className="w-4 h-4" style={{ color: '#9a958c', marginLeft: 'auto', transition: 'transform .18s', transform: open ? 'rotate(180deg)' : 'none' }} />
      </button>

      {open && (
        <div className="flex flex-col gap-2.5" style={{ padding: '4px 11px 12px' }}>
          {/* Notions — autocomplete sur le vocabulaire existant */}
          <div>
            <div className="flex flex-wrap gap-1.5 items-center">
              {skills.map(s => (
                <span key={s} className="inline-flex items-center gap-1" style={chipStyle}>
                  {labelOf(s)}
                  <button type="button" onClick={() => removeSkill(s)} aria-label={`Retirer ${labelOf(s)}`} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', color: '#6b6862' }}>
                    <XIcon className="w-3 h-3" />
                  </button>
                </span>
              ))}
              <div className="relative" ref={skillInputRef}>
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setTimeout(() => setFocused(false), 150)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (suggestions[0]) addSkill(suggestions[0].slug); } }}
                  placeholder="+ notion (cherche dans la liste)"
                  style={{ fontSize: 12, border: '1px solid #e7e3dc', borderRadius: 8, padding: '4px 9px', outline: 'none', minWidth: 210 }}
                />
                {focused && (suggestions.length > 0 || q) && (
                  <FloatingPanel anchorRef={skillInputRef} open offset={4}
                    style={{ minWidth: 220, background: '#fff', border: '1px solid #e7e3dc', borderRadius: 10, boxShadow: '0 8px 24px rgba(20,18,16,.12)', padding: 4, maxHeight: 220, overflowY: 'auto' }}
                  >
                    {suggestions.map(v => (
                      <button
                        key={v.slug}
                        type="button"
                        onMouseDown={(e) => { e.preventDefault(); addSkill(v.slug); }}
                        className="w-full flex items-center justify-between gap-3 text-left"
                        style={{ padding: '6px 9px', borderRadius: 7, border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 12, color: '#33302b' }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = '#f7f6f3'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                      >
                        <span>{v.label}</span>
                        <span style={{ fontSize: 10.5, color: '#9a958c', whiteSpace: 'nowrap' }}>{v.chapter ?? 'Transversal'}</span>
                      </button>
                    ))}
                    {q && suggestions.length === 0 && (
                      <p style={{ padding: '6px 9px', fontSize: 12, color: '#6b6862', margin: 0 }}>
                        Aucune notion ne correspond. Choisis la plus proche, ou signale-la pour qu’on l’ajoute.
                      </p>
                    )}
                  </FloatingPanel>
                )}
              </div>
            </div>
            <p style={{ fontSize: 10.5, color: '#9a958c', marginTop: 4 }}>
              Notions tirées d’une liste commune à tout le site : les statistiques restent cohérentes d’un exercice à l’autre.
            </p>
          </div>

          {/* Difficulté + temps estimé */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-1.5">
              {DIFFICULTY_OPTIONS.map(d => {
                const active = meta?.difficulty === d.value;
                return (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => onChange({ ...meta, difficulty: active ? undefined : d.value })}
                    style={{
                      fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 99, cursor: 'pointer',
                      border: `1px solid ${active ? '#1a7a4a' : '#e7e3dc'}`,
                      background: active ? '#eaf3ed' : '#fff',
                      color: active ? '#15633c' : '#6b6862',
                    }}
                  >
                    {d.label}
                  </button>
                );
              })}
            </div>
            <label className="inline-flex items-center gap-1.5" style={{ fontSize: 11.5, color: '#6b6862' }}>
              Temps cible
              <input
                type="number" min="0"
                value={meta?.expected_seconds ? Math.round(meta.expected_seconds / 60) : ''}
                onChange={(e) => {
                  const min = parseInt(e.target.value);
                  onChange({ ...meta, expected_seconds: min > 0 ? min * 60 : undefined });
                }}
                placeholder="min"
                style={{ width: 52, fontSize: 12, textAlign: 'center', border: '1px solid #e7e3dc', borderRadius: 8, padding: '3px 6px', outline: 'none' }}
              />
              min
            </label>
          </div>
        </div>
      )}
    </div>
  );
};

const chipStyle: React.CSSProperties = {
  fontSize: 11.5, fontWeight: 500, color: '#33302b',
  background: '#f2f1ee', border: '1px solid #e7e3dc',
  padding: '3px 8px', borderRadius: 99, fontFamily: 'DM Mono, monospace',
};

// =====================
// ADD BLOCK BUTTON (between blocks)
// =====================

interface AddBlockRowProps {
  onAdd: (type: BlockType) => void;
}

const AddBlockRow: React.FC<AddBlockRowProps> = ({ onAdd }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  return (
    <div ref={ref} className="relative flex items-center gap-2 group/add py-1">
      <div className="flex-1 h-px bg-slate-100 group-hover/add:bg-slate-200 transition-colors" />
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 px-2 py-0.5 text-xs text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors opacity-0 group-hover/add:opacity-100"
      >
        <Plus className="w-3.5 h-3.5" />
        Ajouter
      </button>
      <div className="flex-1 h-px bg-slate-100 group-hover/add:bg-slate-200 transition-colors" />

      <FloatingPanel anchorRef={buttonRef} open={open} onClose={() => setOpen(false)} placement="bottom" offset={4}
        className="bg-white border border-slate-200 rounded-xl shadow-lg p-1 flex gap-1">
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
          <button
            type="button"
            onClick={() => { onAdd('section'); setOpen(false); }}
            className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <Heading className="w-4 h-4 text-slate-500" />
            Partie
          </button>
      </FloatingPanel>
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
        <MetaEditor meta={sq.meta} onChange={(meta) => onChange({ ...sq, meta })} />
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <input
          type="number"
          min="0"
          step="0.25"
          value={sq.points ?? ''}
          onChange={(e) => onChange({ ...sq, points: parseFloat(e.target.value) || undefined })}
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
  // Une « partie » n'a ni énoncé riche ni solution : on la traite comme un contexte pour le reste.
  const isSection = block.type === 'section';
  const isContext = block.type === 'context' || isSection;
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
          {isSection ? (
            <>
              <span className="text-xs font-semibold px-1.5 py-0.5 rounded text-slate-600 bg-slate-100 shrink-0">
                Partie
              </span>
              <input
                type="text"
                value={(block.content?.html || '').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')}
                onChange={(e) => onChange({
                  ...block,
                  content: { type: 'text', html: e.target.value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') },
                })}
                placeholder="Exercice 1, Problème…"
                className="flex-1 min-w-0 px-2 py-1 text-sm font-semibold border border-slate-200 rounded focus:ring-1 focus:ring-blue-400 focus:outline-none"
              />
              <input
                type="number"
                min="0"
                step="0.25"
                value={block.points ?? ''}
                onChange={(e) => onChange({ ...block, points: parseFloat(e.target.value) || undefined })}
                placeholder="pts"
                title="Barème de la partie (affichage)"
                className="w-16 px-1.5 py-0.5 text-xs text-center border border-slate-200 rounded focus:ring-1 focus:ring-blue-400 focus:outline-none"
              />
            </>
          ) : isContext ? (
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
                step="0.25"
                value={block.points ?? ''}
                onChange={(e) => onChange({ ...block, points: parseFloat(e.target.value) || undefined })}
                placeholder="pts"
                className="w-14 px-1.5 py-0.5 text-xs text-center border border-slate-200 rounded focus:ring-1 focus:ring-blue-400 focus:outline-none ml-auto"
              />
            </>
          )}
        </div>

        {/* Content editor */}
        {!isSection && (
          <TextBlockEditor
            value={block.content}
            onChange={(content) => onChange({ ...block, content })}
            placeholder={isContext ? 'Contexte, données, introduction...' : 'Énoncé de la question...'}
            minHeight={isContext ? '80px' : '60px'}
          />
        )}

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

        {/* Métadonnées v2.1 — au niveau question quand pas de sous-questions */}
        {!isContext && !(block.subQuestions?.length) && (
          <MetaEditor meta={block.meta} onChange={(meta) => onChange({ ...block, meta })} />
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
          <button type="button" onClick={onTogglePreview} data-tour="creer-apercu"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm transition-colors ${
              showPreview ? 'bg-indigo-50 text-indigo-700 border-indigo-300' : 'text-slate-500 border-slate-200 hover:bg-slate-50'
            }`}>
            <Eye className="w-4 h-4" />
            Aperçu
          </button>
          <button type="button" onClick={handleSave} data-tour="creer-enregistrer" disabled={isSaving || isLoading}
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
            data-tour="creer-titre"
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
          <div className="pt-4 space-y-0" data-tour="creer-blocs">
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
                    if (block.type === 'section') qCount = 0;
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
