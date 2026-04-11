/**
 * ContentCreate - Page de création/édition avec classification complète
 *
 * Reproduit exactement la logique de classification existante:
 * - Niveau de classe → Matière → Sous-domaine → Chapitre → Théorèmes
 * Avec le système d'édition flexible.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  getClassLevels, getSubjects, getChapters, getSubfields, getTheorems,
  structuredExerciseAPI, structuredExamAPI, structuredLessonAPI
} from '@/lib/api';
import { FlexibleExerciseEditor, FlexibleEditorState, FlexibleExerciseStructure } from '@/components/content/editor/FlexibleExerciseEditor';
import { ExerciseRenderer } from '@/components/content/viewer/ExerciseRenderer';
import { JsonImportModal } from '@/components/common/JsonImportModal';
import { useAuth } from '@/contexts/AuthContext';
import type { ClassLevelModel, SubjectModel, ChapterModel, Subfield, Theorem } from '@/types';
import { Info, ChevronDown, ChevronRight, FileJson } from 'lucide-react';

type ContentType = 'exercise' | 'exam' | 'lesson';

const CONTENT_TYPE_CONFIG: Record<ContentType, {
  title: string;
  createTitle: string;
  editTitle: string;
  basePath: string;
}> = {
  exercise: {
    title: 'exercice',
    createTitle: 'Créer un exercice',
    editTitle: 'Modifier l\'exercice',
    basePath: '/exercises',
  },
  exam: {
    title: 'examen',
    createTitle: 'Créer un examen',
    editTitle: 'Modifier l\'examen',
    basePath: '/exams',
  },
  lesson: {
    title: 'leçon',
    createTitle: 'Créer une leçon',
    editTitle: 'Modifier la leçon',
    basePath: '/lessons',
  },
};

// Get API based on content type
const getAPI = (contentType: ContentType) => {
  switch (contentType) {
    case 'exam': return structuredExamAPI;
    case 'lesson': return structuredLessonAPI;
    default: return structuredExerciseAPI;
  }
};

interface ContentCreateProps {
  contentType?: ContentType;
}

export const ContentCreate: React.FC<ContentCreateProps> = ({
  contentType = 'exercise',
}) => {
  const config = CONTENT_TYPE_CONFIG[contentType];
  const contentAPI = getAPI(contentType);
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user, isLoading: authLoading } = useAuth();
  const isEditing = Boolean(id);

  // Loading states
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Preview
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState<FlexibleEditorState | null>(null);

  // JSON Import
  const [showJsonImport, setShowJsonImport] = useState(false);

  // Classification data from API
  const [classLevels, setClassLevels] = useState<ClassLevelModel[]>([]);
  const [subjects, setSubjects] = useState<SubjectModel[]>([]);
  const [subfields, setSubfields] = useState<Subfield[]>([]);
  const [chapters, setChapters] = useState<ChapterModel[]>([]);
  const [theorems, setTheorems] = useState<Theorem[]>([]);

  // Selected classification
  const [selectedClassLevels, setSelectedClassLevels] = useState<string[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedSubfields, setSelectedSubfields] = useState<string[]>([]);
  const [selectedChapters, setSelectedChapters] = useState<string[]>([]);
  const [selectedTheorems, setSelectedTheorems] = useState<string[]>([]);

  // Existing exercise data (for editing)
  const [existingData, setExistingData] = useState<Partial<FlexibleEditorState> | null>(null);

  // UI
  const [expandedSections, setExpandedSections] = useState({
    classLevels: true,
    subject: true,
    subfields: true,
    chapters: true,
    theorems: false,
  });

  // =====================
  // LOAD INITIAL DATA
  // =====================

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const [levelsData, subjectsData] = await Promise.all([
        getClassLevels(),
        getSubjects(),
      ]);
      setClassLevels(levelsData);
      setSubjects(subjectsData);
    } catch (err) {
      console.error('Failed to load initial data:', err);
    }
  };

  // =====================
  // CASCADING FILTER LOGIC (identique à ContentEditorV2)
  // =====================

  // Load subfields when subject is selected
  useEffect(() => {
    if (selectedClassLevels.length > 0 && selectedSubject) {
      loadSubfields();
      // Reset dependent fields when subject changes
      if (!isEditing) {
        setSelectedSubfields([]);
        setSelectedChapters([]);
        setSelectedTheorems([]);
      }
    } else {
      setSubfields([]);
    }
  }, [selectedClassLevels, selectedSubject]);

  // Load chapters when subfields are selected
  useEffect(() => {
    if (selectedSubfields.length > 0) {
      loadChapters();
      if (!isEditing) {
        setSelectedChapters([]);
        setSelectedTheorems([]);
      }
    } else {
      setChapters([]);
    }
  }, [selectedSubfields]);

  // Load theorems when chapters are selected
  useEffect(() => {
    if (selectedChapters.length > 0 && selectedSubfields.length > 0) {
      loadTheorems();
    } else {
      setTheorems([]);
    }
  }, [selectedChapters, selectedSubfields]);

  const loadSubfields = async () => {
    try {
      const data = await getSubfields(selectedSubject, selectedClassLevels);
      setSubfields(data);
    } catch (err) {
      console.error('Failed to load subfields:', err);
    }
  };

  const loadChapters = async () => {
    try {
      const data = await getChapters(selectedSubject, selectedClassLevels, selectedSubfields);
      setChapters(data);
    } catch (err) {
      console.error('Failed to load chapters:', err);
    }
  };

  const loadTheorems = async () => {
    try {
      const data = await getTheorems(selectedSubject, selectedClassLevels, selectedSubfields, selectedChapters);
      setTheorems(data);
    } catch (err) {
      console.error('Failed to load theorems:', err);
    }
  };

  // =====================
  // LOAD EXISTING EXERCISE (editing mode)
  // =====================

  useEffect(() => {
    if (id) {
      loadExistingContent();
    }
  }, [id, contentAPI]);

  const loadExistingContent = async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const data = await contentAPI.get(id);

      // Set classification
      const classLevelIds = data.class_levels?.map((l) => l.id) || [];
      setSelectedClassLevels(classLevelIds);
      setSelectedSubject(data.subject?.id || '');

      // Load dependent data first
      if (data.subject && classLevelIds.length > 0) {
        const subfieldsData = await getSubfields(data.subject.id, classLevelIds);
        setSubfields(subfieldsData);

        const subfieldIds = data.subfields?.map((s) => s.id) || [];
        setSelectedSubfields(subfieldIds);

        if (subfieldIds.length > 0) {
          const chaptersData = await getChapters(data.subject.id, classLevelIds, subfieldIds);
          setChapters(chaptersData);

          const chapterIds = data.chapters?.map((c) => c.id) || [];
          setSelectedChapters(chapterIds);

          if (chapterIds.length > 0) {
            const theoremsData = await getTheorems(data.subject.id, classLevelIds, subfieldIds, chapterIds);
            setTheorems(theoremsData);
            setSelectedTheorems(data.theorems?.map((t) => t.id) || []);
          }
        }
      }

      // Convert structure to flexible format if needed
      // Handle difficulty which might not exist for lessons
      const difficulty = 'difficulty' in data ? data.difficulty : undefined;
      setExistingData({
        title: data.title,
        difficulty,
        structure: data.structure as unknown as FlexibleExerciseStructure,
      });
    } catch (err) {
      setError('Erreur lors du chargement');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // =====================
  // SAVE
  // =====================

  const handleSave = async (editorState: FlexibleEditorState) => {
    if (!user) {
      setError('Vous devez être connecté');
      return;
    }

    if (!selectedSubject) {
      setError('Veuillez sélectionner une matière');
      return;
    }

    if (selectedClassLevels.length === 0) {
      setError('Veuillez sélectionner au moins un niveau');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const data: any = {
        title: editorState.title,
        structure: editorState.structure as any,
        class_level_ids: selectedClassLevels.map((id) => parseInt(id)),
        subject_id: parseInt(selectedSubject),
        chapter_ids: selectedChapters.map((id) => parseInt(id)),
        subfield_ids: selectedSubfields.map((id) => parseInt(id)),
        theorem_ids: selectedTheorems.map((id) => parseInt(id)),
      };

      // Add difficulty only for exercises/exams (not lessons)
      if (contentType !== 'lesson') {
        data.difficulty = editorState.difficulty;
      }

      let result;
      if (isEditing && id) {
        result = await contentAPI.update(id, data);
      } else {
        result = await contentAPI.create(data);
      }

      navigate(`${config.basePath}/${result.id}`);
    } catch (err) {
      setError('Erreur lors de l\'enregistrement');
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  // =====================
  // TOGGLE HELPERS
  // =====================

  const toggleClassLevel = (id: string) => {
    setSelectedClassLevels((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleSubfield = (id: string) => {
    setSelectedSubfields((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleChapter = (id: string) => {
    setSelectedChapters((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleTheorem = (id: string) => {
    setSelectedTheorems((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  // Handle JSON import - wrapped in useCallback to avoid stale closures
  const handleJsonImport = useCallback((data: any) => {
    if (!data) return;

    // Set existing data for editor (structure is already transformed by JsonImportModal)
    setExistingData({
      title: data.title || '',
      difficulty: data.difficulty || 'medium',
      structure: data.structure || { blocks: [] },
    });
  }, []);

  // =====================
  // RENDER
  // =====================

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-600 mb-4">Vous devez être connecté</p>
          <button
            onClick={() => navigate('/login')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Se connecter
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50">
      {/* JSON Import Modal */}
      <JsonImportModal
        isOpen={showJsonImport}
        onClose={() => setShowJsonImport(false)}
        onImport={handleJsonImport}
        contentType="structured-exercise"
      />

      {/* Sidebar - Classification */}
      <div className="w-80 bg-white border-r border-slate-200 flex flex-col">
        <div className="p-4 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Classification</h2>
              <p className="text-xs text-slate-500 mt-1">
                Sélectionnez la classification
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowJsonImport(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
              title="Importer depuis JSON"
            >
              <FileJson className="w-4 h-4" />
              JSON
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Class Levels */}
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection('classLevels')}
              className="w-full flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 transition-colors"
            >
              <span className="text-sm font-medium text-slate-700">
                Niveaux de classe *
              </span>
              {expandedSections.classLevels ? (
                <ChevronDown className="w-4 h-4 text-slate-500" />
              ) : (
                <ChevronRight className="w-4 h-4 text-slate-500" />
              )}
            </button>
            {expandedSections.classLevels && (
              <div className="p-3 space-y-2 max-h-40 overflow-y-auto">
                {classLevels.map((level) => (
                  <label key={level.id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedClassLevels.includes(level.id)}
                      onChange={() => toggleClassLevel(level.id)}
                      className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-slate-700">{level.name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Subject */}
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection('subject')}
              className="w-full flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 transition-colors"
            >
              <span className="text-sm font-medium text-slate-700">
                Matière *
              </span>
              {expandedSections.subject ? (
                <ChevronDown className="w-4 h-4 text-slate-500" />
              ) : (
                <ChevronRight className="w-4 h-4 text-slate-500" />
              )}
            </button>
            {expandedSections.subject && (
              <div className="p-3">
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  <option value="">Sélectionner une matière</option>
                  {subjects.map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Subfields */}
          {subfields.length > 0 && (
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSection('subfields')}
                className="w-full flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 transition-colors"
              >
                <span className="text-sm font-medium text-slate-700">
                  Sous-domaines
                </span>
                {expandedSections.subfields ? (
                  <ChevronDown className="w-4 h-4 text-slate-500" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                )}
              </button>
              {expandedSections.subfields && (
                <div className="p-3 space-y-2 max-h-40 overflow-y-auto">
                  {subfields.map((sf) => (
                    <label key={sf.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedSubfields.includes(sf.id)}
                        onChange={() => toggleSubfield(sf.id)}
                        className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-slate-700">{sf.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Chapters */}
          {chapters.length > 0 && (
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSection('chapters')}
                className="w-full flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 transition-colors"
              >
                <span className="text-sm font-medium text-slate-700">
                  Chapitres
                </span>
                {expandedSections.chapters ? (
                  <ChevronDown className="w-4 h-4 text-slate-500" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                )}
              </button>
              {expandedSections.chapters && (
                <div className="p-3 space-y-2 max-h-48 overflow-y-auto">
                  {chapters.map((ch) => (
                    <label key={ch.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedChapters.includes(ch.id)}
                        onChange={() => toggleChapter(ch.id)}
                        className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-slate-700">{ch.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Theorems */}
          {theorems.length > 0 && (
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSection('theorems')}
                className="w-full flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 transition-colors"
              >
                <span className="text-sm font-medium text-slate-700">
                  Théorèmes
                </span>
                {expandedSections.theorems ? (
                  <ChevronDown className="w-4 h-4 text-slate-500" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                )}
              </button>
              {expandedSections.theorems && (
                <div className="p-3 space-y-2 max-h-40 overflow-y-auto">
                  {theorems.map((th) => (
                    <label key={th.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedTheorems.includes(th.id)}
                        onChange={() => toggleTheorem(th.id)}
                        className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-slate-700">{th.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Info */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex gap-2">
              <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <p className="text-xs text-blue-700">
                Les filtres sont dynamiques. Sélectionnez un niveau et une matière pour voir les sous-domaines, puis les chapitres.
              </p>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="p-4 border-t border-slate-200 bg-slate-50">
          <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
            Résumé
          </h3>
          <ul className="text-xs text-slate-600 space-y-1">
            <li>{selectedClassLevels.length} niveau(x)</li>
            <li>Matière: {subjects.find((s) => s.id === selectedSubject)?.name || '-'}</li>
            <li>{selectedSubfields.length} sous-domaine(s)</li>
            <li>{selectedChapters.length} chapitre(s)</li>
            <li>{selectedTheorems.length} théorème(s)</li>
          </ul>
        </div>
      </div>

      {/* Main Area */}
      <div className="flex-1 flex">
        {/* Editor */}
        <div className={`${showPreview ? 'w-1/2' : 'flex-1'} transition-all`}>
          <FlexibleExerciseEditor
            initialData={existingData || undefined}
            contentType={contentType}
            onSave={handleSave}
            onCancel={() => navigate(config.basePath)}
            isLoading={isSaving}
            showPreview={showPreview}
            onTogglePreview={() => setShowPreview(!showPreview)}
          />
        </div>

        {/* Preview */}
        {showPreview && (
          <div className="w-1/2 border-l border-slate-200 bg-slate-100 overflow-y-auto">
            <div className="p-4">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Aperçu</h2>
              {previewData ? (
                <ExerciseRenderer
                  structure={previewData.structure}
                  showSolutions={false}
                  interactive={false}
                />
              ) : (
                <div className="text-center text-slate-400 py-8">
                  Modifiez l'exercice pour voir l'aperçu
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ContentCreate;
