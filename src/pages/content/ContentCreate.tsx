/**
 * ContentCreate — unified creation/edit page for exercise, exam, lesson.
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
  ChevronDown, ChevronRight, FileJson, CheckSquare, AlertCircle,
  GraduationCap, BookOpen, Tag, FolderOpen, Layers,
} from 'lucide-react';

type ContentType = 'exercise' | 'exam' | 'lesson';

const TYPE_CONFIG: Record<ContentType, { label: string; color: string; basePath: string }> = {
  exercise: { label: 'Exercice',  color: 'indigo', basePath: '/exercises' },
  exam:     { label: 'Examen',    color: 'violet', basePath: '/exams' },
  lesson:   { label: 'Leçon',    color: 'emerald', basePath: '/lessons' },
};

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
  <div className="rounded-xl border border-slate-200 overflow-hidden">
    <button
      type="button"
      onClick={onToggle}
      className="w-full flex items-center gap-3 px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
    >
      <span className="text-slate-400 shrink-0">{icon}</span>
      <span className="flex-1 text-sm font-medium text-slate-700">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </span>
      {badge !== undefined && badge > 0 && (
        <span className="px-1.5 py-0.5 text-xs font-semibold bg-indigo-100 text-indigo-700 rounded-full">
          {badge}
        </span>
      )}
      {open
        ? <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
        : <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />}
    </button>
    {open && <div className="p-3 bg-white">{children}</div>}
  </div>
);

interface CheckboxListProps {
  items: { id: string; name: string }[];
  selected: string[];
  onToggle: (id: string) => void;
}

const CheckboxList: React.FC<CheckboxListProps> = ({ items, selected, onToggle }) => (
  <div className="space-y-1.5 max-h-44 overflow-y-auto">
    {items.map((item) => {
      const checked = selected.includes(item.id);
      return (
        <label
          key={item.id}
          onClick={() => onToggle(item.id)}
          className={`flex items-center gap-2.5 px-2 py-1.5 rounded-lg cursor-pointer transition-colors ${
            checked ? 'bg-indigo-50' : 'hover:bg-slate-50'
          }`}
        >
          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
            checked ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'
          }`}>
            {checked && <CheckSquare className="w-3 h-3 text-white" strokeWidth={3} />}
          </div>
          <span className={`text-sm ${checked ? 'text-indigo-700 font-medium' : 'text-slate-600'}`}>
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
      setError('Erreur lors du chargement');
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
    if (!validate()) return;
    setIsSaving(true); setError(null);
    try {
      const payload: any = { ...buildPayloadBase(), title: editorState.title, structure: editorState.structure, difficulty: editorState.difficulty };
      const result = isEditing && id ? await contentAPI.update(id, payload) : await contentAPI.create(payload);
      navigate(`${config.basePath}/${result.id}`);
    } catch { setError("Erreur lors de l'enregistrement"); }
    finally { setIsSaving(false); }
  };

  const handleSaveLesson = async (editorState: FlexibleLessonEditorState) => {
    if (!validate()) return;
    setIsSaving(true); setError(null);
    try {
      const payload: any = { ...buildPayloadBase(), title: editorState.title, structure: editorState.structure };
      const result = isEditing && id ? await contentAPI.update(id, payload) : await contentAPI.create(payload);
      navigate(`${config.basePath}/${result.id}`);
    } catch { setError("Erreur lors de l'enregistrement"); }
    finally { setIsSaving(false); }
  };

  const validate = () => {
    if (!selectedSubject) { setError('Veuillez sélectionner une matière'); return false; }
    if (selectedClassLevels.length === 0) { setError('Veuillez sélectionner au moins un niveau'); return false; }
    return true;
  };

  // ─── JSON import ─────────────────────────────────────────────────────────
  const handleJsonImport = useCallback((data: any) => {
    if (!data) return;
    if (contentType === 'lesson') {
      setLessonData({ title: data.title || '', structure: data.structure || { sections: [] } });
    } else {
      setExerciseData({ title: data.title || '', difficulty: data.difficulty || 'medium', structure: data.structure || { blocks: [] } });
    }
  }, [contentType]);

  // ─── Toggle helpers ───────────────────────────────────────────────────────
  const toggleId = (setter: React.Dispatch<React.SetStateAction<string[]>>) => (id: string) =>
    setter(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  // ─── Guards ───────────────────────────────────────────────────────────────
  if (authLoading || isLoading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
    </div>
  );

  if (!user) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center">
        <p className="text-slate-600 mb-4">Vous devez être connecté</p>
        <button onClick={() => navigate('/login')} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
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
    <div className="w-72 shrink-0 bg-white border-r border-slate-200 flex flex-col h-full">
      {/* Sidebar header */}
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-0.5">Classification</p>
          <p className="text-xs text-slate-500">
            {selectionCount === 0 ? 'Rien de sélectionné' : `${selectionCount} sélection(s)`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowJsonImport(true)}
          title="Importer JSON / PDF"
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
        >
          <FileJson className="w-3.5 h-3.5" />
          Import
        </button>
      </div>

      {/* Sections */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        {error && (
          <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
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
            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-400 focus:border-transparent text-sm bg-white text-slate-700"
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
      <div className="px-5 py-3 border-t border-slate-100 bg-slate-50">
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-500">
          <span>{selectedClassLevels.length} niveau(x)</span>
          <span>{selectedSubfields.length} sous-dom.</span>
          <span className="col-span-2 truncate">
            {subjects.find(s => String(s.id) === selectedSubject)?.name || '—'}
          </span>
          <span>{selectedChapters.length} chapitre(s)</span>
          <span>{selectedTheorems.length} théorème(s)</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
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
        <div className="w-1/2 border-l border-slate-200 bg-slate-50 flex flex-col overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-200 bg-white flex items-center justify-between shrink-0">
            <span className="text-sm font-semibold text-slate-700">Aperçu</span>
            <button
              type="button"
              onClick={() => setShowPreview(false)}
              className="text-xs text-slate-400 hover:text-slate-600"
            >
              Fermer
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-6">
            {contentType === 'lesson' ? (
              liveLesson?.structure ? (
                <LessonRenderer structure={liveLesson.structure} />
              ) : (
                <p className="text-slate-400 text-sm text-center mt-12">Ajoutez des sections pour voir l'aperçu</p>
              )
            ) : (
              liveExercise?.structure?.blocks?.length ? (
                <ExerciseRenderer structure={liveExercise.structure} interactive={false} showAllSolutions={false} />
              ) : (
                <p className="text-slate-400 text-sm text-center mt-12">Ajoutez des blocs pour voir l'aperçu</p>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ContentCreate;
