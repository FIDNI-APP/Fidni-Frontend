/**
 * ContentCreate — unified creation/edit page for exercise, exam, lesson.
 *
 * Chrome design — "ink & paper": flat + bordered, warm neutrals (no cool
 * slate), green only for selection / primary action, Fraunces for the page
 * title. The editor pane is a separate component and keeps its own toolbar.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  getClassLevels, getSubjects, getChapters, getSubfields, getTheorems,
  exerciseContentAPI, examContentAPI, lessonContentAPI,
} from '@/lib/api';
import { FlexibleExerciseEditor, FlexibleEditorState, FlexibleExerciseStructure } from '@/components/content/editor/FlexibleExerciseEditor';
import { FlexibleLessonEditor, FlexibleLessonEditorState } from '@/components/content/editor/FlexibleLessonEditor';
import { ExerciseRenderer } from '@/components/content/viewer/ExerciseRenderer';
import { LessonRenderer } from '@/components/content/viewer/LessonRenderer';
import { JsonImportModal } from '@/components/common/JsonImportModal';
import { useAuth } from '@/contexts/AuthContext';
import type { ClassLevelModel, SubjectModel, ChapterModel, Subfield, Theorem } from '@/types';
import {
  ChevronDown, ChevronRight, FileJson, Check, AlertCircle,
  GraduationCap, BookOpen, Tag, FolderOpen, Layers,
} from 'lucide-react';

type ContentType = 'exercise' | 'exam' | 'lesson';

const TYPE_CONFIG: Record<ContentType, { label: string; basePath: string; newTitle: string; editTitle: string }> = {
  exercise: { label: 'Exercice', basePath: '/exercises', newTitle: 'Nouvel exercice', editTitle: "Modifier l'exercice" },
  exam:     { label: 'Examen',   basePath: '/exams',     newTitle: 'Nouvel examen',   editTitle: "Modifier l'examen" },
  lesson:   { label: 'Leçon',    basePath: '/lessons',   newTitle: 'Nouvelle leçon',  editTitle: 'Modifier la leçon' },
};

const DIFFICULTIES = ['easy', 'medium', 'hard'] as const;
type DifficultyValue = (typeof DIFFICULTIES)[number];
const isDifficulty = (v: unknown): v is DifficultyValue => DIFFICULTIES.includes(v as DifficultyValue);

/** Message d'un refus du serveur (400) : celui du champ difficulté d'abord, sinon le premier message lisible. */
function saveErrorMessage(err: unknown): string {
  const res = (err as { response?: { status?: number; data?: unknown } } | null)?.response;
  const data = res?.status === 400 && res.data && typeof res.data === 'object' ? res.data as Record<string, unknown> : null;
  const text = (v: unknown) => (Array.isArray(v) ? (typeof v[0] === 'string' ? v[0] : null) : typeof v === 'string' ? v : null);
  if (data) {
    const difficulty = text(data.difficulty);
    if (difficulty) return `Difficulté : ${difficulty}`;
    const other = text(data.detail) ?? text(data.error) ?? text(data.non_field_errors);
    if (other) return other;
  }
  return 'L’enregistrement a échoué. Réessaie.';
}

const getAPI = (t: ContentType) => {
  if (t === 'exam')   return examContentAPI;
  if (t === 'lesson') return lessonContentAPI;
  return exerciseContentAPI;
};

// =====================
// CLASSIFICATION SIDEBAR
// =====================

interface SidebarSectionProps {
  icon: React.ReactNode;
  label: string;
  badge?: number;
  required?: boolean;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

const SidebarSection: React.FC<SidebarSectionProps> = ({
  icon, label, badge, required, open, onToggle, children,
}) => (
  <div className="rounded-xl border border-line overflow-hidden">
    <button
      type="button"
      onClick={onToggle}
      className="w-full flex items-center gap-3 px-4 py-3 bg-paper hover:bg-[#f2f1ee] transition-colors text-left"
    >
      <span className="text-[#9a958c] shrink-0">{icon}</span>
      <span className="flex-1 text-sm font-medium text-ink-soft">
        {label}
        {required && <span className="text-[#c2564f] ml-0.5">*</span>}
      </span>
      {badge !== undefined && badge > 0 && (
        <span className="px-1.5 py-0.5 text-xs font-semibold bg-brand-soft text-brand-hover rounded-full">
          {badge}
        </span>
      )}
      {open
        ? <ChevronDown className="w-4 h-4 text-[#9a958c] shrink-0" />
        : <ChevronRight className="w-4 h-4 text-[#9a958c] shrink-0" />}
    </button>
    {open && <div className="p-3 bg-white border-t border-line">{children}</div>}
  </div>
);

interface CheckboxListProps {
  items: { id: string; name: string }[];
  selected: string[];
  onToggle: (id: string) => void;
}

const CheckboxList: React.FC<CheckboxListProps> = ({ items, selected, onToggle }) => (
  <div className="space-y-1 max-h-44 overflow-y-auto">
    {items.map((item) => {
      const checked = selected.includes(item.id);
      return (
        <label
          key={item.id}
          onClick={() => onToggle(item.id)}
          className={`flex items-center gap-2.5 px-2 py-1.5 rounded-lg cursor-pointer transition-colors ${
            checked ? 'bg-brand-soft' : 'hover:bg-paper'
          }`}
        >
          <span className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
            checked ? 'bg-brand border-brand' : 'border-[#cfcdc8] bg-white'
          }`}>
            {checked && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
          </span>
          <span className={`text-sm ${checked ? 'text-brand-hover font-medium' : 'text-ink-muted'}`}>
            {item.name}
          </span>
        </label>
      );
    })}
  </div>
);

// =====================
// MAIN PAGE
// =====================

interface ContentCreateProps {
  contentType?: ContentType;
}

export const ContentCreate: React.FC<ContentCreateProps> = ({ contentType = 'exercise' }) => {
  const config = TYPE_CONFIG[contentType];
  const contentAPI = getAPI(contentType);
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user, isLoading: authLoading } = useAuth();
  const isEditing = Boolean(id);

  // Loading / error
  const [isLoading, setIsLoading]   = useState(false);
  const [isSaving, setIsSaving]     = useState(false);
  const [error, setError]           = useState<string | null>(null);

  // Preview / modal
  const [showPreview, setShowPreview]     = useState(false);
  const [showJsonImport, setShowJsonImport] = useState(false);

  // Classification data
  const [classLevels, setClassLevels] = useState<ClassLevelModel[]>([]);
  const [subjects, setSubjects]       = useState<SubjectModel[]>([]);
  const [subfields, setSubfields]     = useState<Subfield[]>([]);
  const [chapters, setChapters]       = useState<ChapterModel[]>([]);
  const [theorems, setTheorems]       = useState<Theorem[]>([]);

  // Selected classification
  const [selectedClassLevels, setSelectedClassLevels] = useState<string[]>([]);
  const [selectedSubject, setSelectedSubject]         = useState<string>('');
  const [selectedSubfields, setSelectedSubfields]     = useState<string[]>([]);
  const [selectedChapters, setSelectedChapters]       = useState<string[]>([]);
  const [selectedTheorems, setSelectedTheorems]       = useState<string[]>([]);

  // Editor data
  const [exerciseData, setExerciseData] = useState<Partial<FlexibleEditorState> | null>(null);
  const [lessonData, setLessonData]     = useState<Partial<FlexibleLessonEditorState>>({});

  // Live state for preview
  const [liveExercise, setLiveExercise] = useState<FlexibleEditorState | null>(null);
  const [liveLesson, setLiveLesson]     = useState<FlexibleLessonEditorState | null>(null);

  // Sidebar sections open/close
  const [open, setOpen] = useState({
    classLevels: true, subject: true, subfields: true, chapters: true, theorems: false,
  });
  const toggleOpen = (k: keyof typeof open) => setOpen(p => ({ ...p, [k]: !p[k] }));

  // ─── Load initial data ───────────────────────────────────────────────────
  useEffect(() => { loadInitialData(); }, []);

  const loadInitialData = async () => {
    try {
      const [levelsData, subjectsData] = await Promise.all([getClassLevels(), getSubjects()]);
      setClassLevels(levelsData);
      setSubjects(subjectsData);
    } catch { /* silent */ }
  };

  // ─── Cascading filters ───────────────────────────────────────────────────
  useEffect(() => {
    if (selectedClassLevels.length > 0 && selectedSubject) {
      getSubfields(selectedSubject, selectedClassLevels).then(setSubfields).catch(() => {});
      if (!isEditing) { setSelectedSubfields([]); setSelectedChapters([]); setSelectedTheorems([]); }
    } else {
      setSubfields([]); setChapters([]); setTheorems([]);
    }
  }, [selectedClassLevels, selectedSubject]);

  useEffect(() => {
    if (selectedSubfields.length > 0) {
      getChapters(selectedSubject, selectedClassLevels, selectedSubfields).then(setChapters).catch(() => {});
      if (!isEditing) { setSelectedChapters([]); setSelectedTheorems([]); }
    } else {
      setChapters([]); setTheorems([]);
    }
  }, [selectedSubfields]);

  useEffect(() => {
    if (selectedChapters.length > 0 && selectedSubfields.length > 0) {
      getTheorems(selectedSubject, selectedClassLevels, selectedSubfields, selectedChapters)
        .then(setTheorems).catch(() => {});
    } else {
      setTheorems([]);
    }
  }, [selectedChapters, selectedSubfields]);

  // ─── Load existing content ───────────────────────────────────────────────
  useEffect(() => {
    if (id) loadExistingContent();
  }, [id]);

  const loadExistingContent = async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const data = await contentAPI.get(id);
      const classLevelIds = data.class_levels?.map((l: any) => String(l.id)) || [];
      setSelectedClassLevels(classLevelIds);
      setSelectedSubject(String(data.subject?.id || ''));

      if (data.subject && classLevelIds.length > 0) {
        const sfs = await getSubfields(data.subject.id, classLevelIds);
        setSubfields(sfs);
        const sfIds = data.subfields?.map((s: any) => String(s.id)) || [];
        setSelectedSubfields(sfIds);
        if (sfIds.length > 0) {
          const chs = await getChapters(data.subject.id, classLevelIds, sfIds);
          setChapters(chs);
          const chIds = data.chapters?.map((c: any) => String(c.id)) || [];
          setSelectedChapters(chIds);
          if (chIds.length > 0) {
            const ths = await getTheorems(data.subject.id, classLevelIds, sfIds, chIds);
            setTheorems(ths);
            setSelectedTheorems(data.theorems?.map((t: any) => String(t.id)) || []);
          }
        }
      }

      if (contentType === 'lesson') {
        setLessonData({ title: data.title, structure: data.structure as any });
      } else {
        setExerciseData({
          title: data.title,
          difficulty: (data as any).difficulty,
          structure: data.structure as unknown as FlexibleExerciseStructure,
        });
      }
    } catch {
      setError('Le contenu n’a pas pu être chargé. Réessaie.');
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Save ────────────────────────────────────────────────────────────────
  const buildPayloadBase = () => ({
    class_level_ids: selectedClassLevels.map(Number),
    subject_id: Number(selectedSubject),
    chapter_ids: selectedChapters.map(Number),
    subfield_ids: selectedSubfields.map(Number),
    theorem_ids: selectedTheorems.map(Number),
  });

  const handleSaveExercise = async (editorState: FlexibleEditorState) => {
    if (!validate(editorState.difficulty)) return;
    setIsSaving(true); setError(null);
    try {
      const payload: any = { ...buildPayloadBase(), title: editorState.title, structure: editorState.structure, difficulty: editorState.difficulty };
      const result = isEditing && id ? await contentAPI.update(id, payload) : await contentAPI.create(payload);
      navigate(`${config.basePath}/${result.id}`);
    } catch (err) { setError(saveErrorMessage(err)); }
    finally { setIsSaving(false); }
  };

  const handleSaveLesson = async (editorState: FlexibleLessonEditorState) => {
    if (!validate()) return;
    setIsSaving(true); setError(null);
    try {
      const payload: any = { ...buildPayloadBase(), title: editorState.title, structure: editorState.structure };
      const result = isEditing && id ? await contentAPI.update(id, payload) : await contentAPI.create(payload);
      navigate(`${config.basePath}/${result.id}`);
    } catch (err) { setError(saveErrorMessage(err)); }
    finally { setIsSaving(false); }
  };

  // Exercice ou examen : la difficulté est obligatoire (plus de « Moyen » par défaut, souvent faux ;
  // les élèves voient aussi leur ressenti, mais l'étiquette annoncée reste celle de l'auteur).
  const validate = (difficulty?: string) => {
    if (!selectedSubject) { setError('Choisis une matière.'); return false; }
    if (selectedClassLevels.length === 0) { setError('Choisis au moins un niveau.'); return false; }
    if (contentType !== 'lesson' && !isDifficulty(difficulty)) {
      setError('Choisis une difficulté sous le titre (Facile, Moyen ou Difficile), pour un élève du niveau qui découvre le chapitre.');
      return false;
    }
    return true;
  };

  // ─── JSON import ─────────────────────────────────────────────────────────
  // Difficulté : seulement celle du fichier (sinon l'auteur la choisit ; plus de « Moyen » par défaut).
  const handleJsonImport = useCallback((data: any) => {
    if (!data) return;
    if (contentType === 'lesson') {
      setLessonData({ title: data.title || '', structure: data.structure || { sections: [] } });
    } else {
      setExerciseData({
        title: data.title || '',
        difficulty: isDifficulty(data.difficulty) ? data.difficulty : undefined,
        structure: data.structure || { blocks: [] },
      });
    }
  }, [contentType]);

  // ─── Toggle helpers ───────────────────────────────────────────────────────
  const toggleId = (setter: React.Dispatch<React.SetStateAction<string[]>>) => (id: string) =>
    setter(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  // ─── Guards ───────────────────────────────────────────────────────────────
  if (authLoading || isLoading) return (
    <div className="min-h-screen bg-paper flex items-center justify-center">
      <div className="animate-spin w-8 h-8 border-2 border-brand border-t-transparent rounded-full" />
    </div>
  );

  if (!user) return (
    <div className="min-h-screen bg-paper flex items-center justify-center">
      <div className="text-center">
        <p className="text-ink-muted mb-4">Connecte-toi pour créer du contenu.</p>
        <button onClick={() => navigate('/login')} className="fd-btn-primary">
          Se connecter
        </button>
      </div>
    </div>
  );

  // ─── Classification sidebar ───────────────────────────────────────────────
  const classLevelItems  = classLevels.map(l  => ({ id: String(l.id),  name: l.name }));
  const subfieldItems    = subfields.map(s    => ({ id: String(s.id),  name: s.name }));
  const chapterItems     = chapters.map(c     => ({ id: String(c.id),  name: c.name }));
  const theoremItems     = theorems.map(t     => ({ id: String(t.id),  name: t.name }));

  const selectionCount =
    selectedClassLevels.length +
    (selectedSubject ? 1 : 0) +
    selectedSubfields.length +
    selectedChapters.length +
    selectedTheorems.length;

  const sidebar = (
    <div className="w-72 shrink-0 bg-white border-r border-line flex flex-col h-full">
      {/* Identity — what am I creating? */}
      <div className="px-5 pt-5 pb-4 border-b border-line">
        <span className="inline-block text-[11px] font-medium tracking-wide uppercase px-2 py-0.5 rounded-full bg-[#f2f1ee] text-ink-faint" style={{ fontFamily: "'DM Mono', ui-monospace, monospace" }}>
          {config.label}
        </span>
        <h1 className="fd-display mt-2.5" style={{ fontSize: 21, fontWeight: 600, color: '#1a1a1a', letterSpacing: '-0.015em' }}>
          {isEditing ? config.editTitle : config.newTitle}
        </h1>
      </div>

      {/* Classification meta + import */}
      <div className="px-5 py-3.5 border-b border-line flex items-center justify-between">
        <div>
          <p className="text-[11px] font-semibold text-[#9a958c] uppercase tracking-widest mb-0.5">Classification</p>
          <p className="text-xs text-ink-faint">
            {selectionCount === 0 ? 'Rien de sélectionné' : `${selectionCount} sélection${selectionCount > 1 ? 's' : ''}`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowJsonImport(true)}
          data-tour="creer-importer"
          title="Importer depuis un JSON ou un PDF"
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-ink-soft bg-white border border-[#d8d4cc] hover:border-[#1a1a1a] hover:bg-[#f7f6f3] rounded-lg transition-colors"
        >
          <FileJson className="w-3.5 h-3.5" />
          Importer
        </button>
      </div>

      {/* Sections */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2" data-tour="creer-classement">
        {error && (
          <div className="flex items-start gap-2 p-3 bg-[#fdeceb] border border-[#f3c9c5] rounded-xl text-sm text-[#a23b34]">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        <SidebarSection
          icon={<GraduationCap className="w-4 h-4" />}
          label="Niveaux" required
          badge={selectedClassLevels.length}
          open={open.classLevels} onToggle={() => toggleOpen('classLevels')}
        >
          <CheckboxList
            items={classLevelItems}
            selected={selectedClassLevels}
            onToggle={toggleId(setSelectedClassLevels)}
          />
        </SidebarSection>

        <SidebarSection
          icon={<BookOpen className="w-4 h-4" />}
          label="Matière" required
          badge={selectedSubject ? 1 : 0}
          open={open.subject} onToggle={() => toggleOpen('subject')}
        >
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="w-full px-3 py-2 border border-line rounded-lg focus:border-brand focus:outline-none text-sm bg-white text-ink-soft"
          >
            <option value="">— Sélectionner —</option>
            {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </SidebarSection>

        {subfields.length > 0 && (
          <SidebarSection
            icon={<Layers className="w-4 h-4" />}
            label="Sous-domaines"
            badge={selectedSubfields.length}
            open={open.subfields} onToggle={() => toggleOpen('subfields')}
          >
            <CheckboxList
              items={subfieldItems}
              selected={selectedSubfields}
              onToggle={toggleId(setSelectedSubfields)}
            />
          </SidebarSection>
        )}

        {chapters.length > 0 && (
          <SidebarSection
            icon={<FolderOpen className="w-4 h-4" />}
            label="Chapitres"
            badge={selectedChapters.length}
            open={open.chapters} onToggle={() => toggleOpen('chapters')}
          >
            <CheckboxList
              items={chapterItems}
              selected={selectedChapters}
              onToggle={toggleId(setSelectedChapters)}
            />
          </SidebarSection>
        )}

        {theorems.length > 0 && (
          <SidebarSection
            icon={<Tag className="w-4 h-4" />}
            label="Théorèmes"
            badge={selectedTheorems.length}
            open={open.theorems} onToggle={() => toggleOpen('theorems')}
          >
            <CheckboxList
              items={theoremItems}
              selected={selectedTheorems}
              onToggle={toggleId(setSelectedTheorems)}
            />
          </SidebarSection>
        )}
      </div>

      {/* Summary footer */}
      <div className="px-5 py-3 border-t border-line bg-paper">
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-ink-faint">
          <span><span className="fd-nums font-semibold text-ink">{selectedClassLevels.length}</span> niveau(x)</span>
          <span><span className="fd-nums font-semibold text-ink">{selectedSubfields.length}</span> sous-dom.</span>
          <span className="col-span-2 truncate text-ink-soft">
            {subjects.find(s => String(s.id) === selectedSubject)?.name || '—'}
          </span>
          <span><span className="fd-nums font-semibold text-ink">{selectedChapters.length}</span> chapitre(s)</span>
          <span><span className="fd-nums font-semibold text-ink">{selectedTheorems.length}</span> théorème(s)</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-paper overflow-hidden">
      <JsonImportModal
        isOpen={showJsonImport}
        onClose={() => setShowJsonImport(false)}
        onImport={handleJsonImport}
        contentType={contentType === 'lesson' ? 'lesson' : contentType}
      />

      {/* Classification sidebar */}
      {sidebar}

      {/* Editor area */}
      <div className={`${showPreview ? 'w-1/2' : 'flex-1'} min-w-0 overflow-hidden transition-all duration-200`}>
        {contentType === 'lesson' ? (
          <FlexibleLessonEditor
            initialData={lessonData}
            onSave={handleSaveLesson}
            onCancel={() => navigate(config.basePath)}
            isLoading={isSaving}
            showPreview={showPreview}
            onTogglePreview={() => setShowPreview(!showPreview)}
            onChange={setLiveLesson}
          />
        ) : (
          <FlexibleExerciseEditor
            initialData={exerciseData || undefined}
            contentType={contentType}
            onSave={handleSaveExercise}
            onCancel={() => navigate(config.basePath)}
            isLoading={isSaving}
            showPreview={showPreview}
            onTogglePreview={() => setShowPreview(!showPreview)}
            onChange={setLiveExercise}
          />
        )}
      </div>

      {/* Preview panel */}
      {showPreview && (
        <div className="w-1/2 border-l border-line bg-paper flex flex-col overflow-hidden">
          <div className="px-5 py-3 border-b border-line bg-white flex items-center justify-between shrink-0">
            <span className="fd-display" style={{ fontSize: 15, fontWeight: 600, color: '#1a1a1a' }}>Aperçu</span>
            <button
              type="button"
              onClick={() => setShowPreview(false)}
              className="text-xs font-medium text-ink-faint hover:text-ink transition-colors"
            >
              Fermer
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-6">
            {contentType === 'lesson' ? (
              liveLesson?.structure ? (
                <LessonRenderer structure={liveLesson.structure} />
              ) : (
                <p className="text-[#9a958c] text-sm text-center mt-12">Ajoute des sections pour voir l'aperçu.</p>
              )
            ) : (
              liveExercise?.structure?.blocks?.length ? (
                <ExerciseRenderer structure={liveExercise.structure} interactive={false} showAllSolutions={false} />
              ) : (
                <p className="text-[#9a958c] text-sm text-center mt-12">Ajoute des blocs pour voir l'aperçu.</p>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ContentCreate;
