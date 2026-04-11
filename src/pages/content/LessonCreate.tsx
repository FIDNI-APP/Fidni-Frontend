/**
 * LessonCreate - Dedicated page for creating/editing lessons
 * Uses FlexibleLessonEditor with section-based structure
 * NO difficulty selector, NO solution editor
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Loader2, ChevronDown, ChevronRight, Sparkles } from 'lucide-react';
import { FlexibleLessonEditor, FlexibleLessonEditorState, FlexibleLessonStructure, SectionBlock } from '@/components/content/editor/FlexibleLessonEditor';
import { LessonRenderer } from '@/components/content/viewer/LessonRenderer';
import { structuredLessonAPI, getClassLevels, getSubjects, getSubfields, getChapters, getTheorems } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import type { StructuredLesson } from '@/types/structured';
import type { ClassLevelModel, SubjectModel, ChapterModel, Subfield, Theorem } from '@/types';

// Template for prefilling lesson structure
const LESSON_TEMPLATE: FlexibleLessonStructure = {
  version: '1.0',
  sections: [
    {
      id: 'template-section-1',
      title: 'Les Fonctions du Second Degré',
      content: {
        html: '<p>Une fonction du second degré (ou fonction polynomiale de degré 2) est une fonction qui peut s\'écrire sous la forme $f(x) = ax^2 + bx + c$ où $a, b, c \\in \\mathbb{R}$ et $a \\neq 0$.</p><p>Cette leçon explore les propriétés fondamentales de ces fonctions, leur représentation graphique et leurs applications.</p>',
        text: 'Les fonctions du second degré...'
      },
      subSections: [
        {
          id: 'template-subsection-1-1',
          title: 'Forme canonique',
          content: {
            html: '<p>Toute fonction du second degré peut s\'écrire sous forme canonique :</p><p>$$f(x) = a(x - \\alpha)^2 + \\beta$$</p><p>où $\\alpha = -\\frac{b}{2a}$ et $\\beta = f(\\alpha)$ représentent les coordonnées du sommet de la parabole.</p>',
            text: 'Forme canonique...'
          },
        },
        {
          id: 'template-subsection-1-2',
          title: 'Discriminant',
          content: {
            html: '<p>Le discriminant d\'une fonction du second degré est défini par :</p><p>$$\\Delta = b^2 - 4ac$$</p><p>Il permet de déterminer le nombre de racines réelles de l\'équation $f(x) = 0$.</p>',
            text: 'Discriminant...'
          },
        },
      ],
    },
    {
      id: 'template-section-2',
      title: 'Étude des Racines',
      content: {
        html: '<p>Les racines d\'une fonction du second degré sont les valeurs de $x$ pour lesquelles $f(x) = 0$. Leur existence et leur nature dépendent du discriminant $\\Delta$.</p>',
        text: 'Étude des racines...'
      },
      subSections: [
        {
          id: 'template-subsection-2-1',
          title: 'Cas Δ > 0',
          content: {
            html: '<p>Si $\\Delta > 0$, l\'équation admet deux racines réelles distinctes :</p><p>$$x_1 = \\frac{-b - \\sqrt{\\Delta}}{2a} \\quad \\text{et} \\quad x_2 = \\frac{-b + \\sqrt{\\Delta}}{2a}$$</p>',
            text: 'Cas delta positif...'
          },
        },
        {
          id: 'template-subsection-2-2',
          title: 'Cas Δ = 0',
          content: {
            html: '<p>Si $\\Delta = 0$, l\'équation admet une racine double :</p><p>$$x_0 = -\\frac{b}{2a}$$</p><p>La parabole est tangente à l\'axe des abscisses au point de coordonnées $(x_0, 0)$.</p>',
            text: 'Cas delta nul...'
          },
        },
        {
          id: 'template-subsection-2-3',
          title: 'Cas Δ < 0',
          content: {
            html: '<p>Si $\\Delta < 0$, l\'équation n\'admet aucune racine réelle. La parabole ne coupe pas l\'axe des abscisses.</p>',
            text: 'Cas delta négatif...'
          },
        },
      ],
    },
    {
      id: 'template-section-3',
      title: 'Tableau de Variations',
      content: {
        html: '<p>Le sens de variation d\'une fonction du second degré dépend du signe du coefficient $a$ :</p><ul><li>Si $a > 0$ : la fonction est décroissante sur $]-\\infty; \\alpha]$ et croissante sur $[\\alpha; +\\infty[$</li><li>Si $a < 0$ : la fonction est croissante sur $]-\\infty; \\alpha]$ et décroissante sur $[\\alpha; +\\infty[$</li></ul><p>Le sommet $S(\\alpha, \\beta)$ correspond à l\'extremum de la fonction.</p>',
        text: 'Tableau de variations...'
      },
      subSections: [],
    },
    {
      id: 'template-section-4',
      title: 'Exemple d\'Application',
      content: {
        html: '<p>Étudions la fonction $f(x) = 2x^2 - 8x + 6$.</p>',
        text: 'Exemple...'
      },
      subSections: [
        {
          id: 'template-subsection-4-1',
          title: 'Calcul du discriminant',
          content: {
            html: '<p>On a $a = 2$, $b = -8$ et $c = 6$.</p><p>$$\\Delta = (-8)^2 - 4 \\times 2 \\times 6 = 64 - 48 = 16 > 0$$</p><p>L\'équation $f(x) = 0$ admet donc deux racines réelles distinctes.</p>',
            text: 'Calcul discriminant...'
          },
        },
        {
          id: 'template-subsection-4-2',
          title: 'Racines',
          content: {
            html: '<p>$$x_1 = \\frac{8 - \\sqrt{16}}{4} = \\frac{8-4}{4} = 1$$</p><p>$$x_2 = \\frac{8 + \\sqrt{16}}{4} = \\frac{8+4}{4} = 3$$</p><p>Les racines sont donc $x_1 = 1$ et $x_2 = 3$.</p>',
            text: 'Racines...'
          },
        },
        {
          id: 'template-subsection-4-3',
          title: 'Forme factorisée',
          content: {
            html: '<p>Connaissant les racines, on peut écrire la forme factorisée :</p><p>$$f(x) = 2(x-1)(x-3)$$</p>',
            text: 'Forme factorisée...'
          },
        },
      ],
    },
    {
      id: 'template-section-5',
      title: 'Résumé',
      content: {
        html: '<p><strong>Points clés à retenir :</strong></p><ul><li>Forme générale : $f(x) = ax^2 + bx + c$ avec $a \\neq 0$</li><li>Forme canonique : $f(x) = a(x-\\alpha)^2 + \\beta$</li><li>Discriminant : $\\Delta = b^2 - 4ac$</li><li>Le signe de $a$ détermine la concavité de la parabole</li><li>Le sommet est situé en $x = -\\frac{b}{2a}$</li></ul>',
        text: 'Résumé...'
      },
      subSections: [],
    },
  ],
};

export const LessonCreate: React.FC = () => {
  const navigate = useNavigate();
  const { id: lessonId } = useParams<{ id: string }>();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const isEditMode = Boolean(lessonId);

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [error, setError] = useState<string>('');

  // Editor state
  const [editorData, setEditorData] = useState<Partial<FlexibleLessonEditorState>>({});

  // Classification options
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

  // Expanded sections for UI
  const [expandedSections, setExpandedSections] = useState({
    classLevels: true,
    subject: true,
    subfields: true,
    chapters: true,
    theorems: false,
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections({ ...expandedSections, [section]: !expandedSections[section] });
  };

  // Load initial classification data
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login');
      return;
    }

    if (isAuthenticated) {
      loadInitialData();
    }
  }, [isAuthenticated, authLoading]);

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

  // Load subfields when subject is selected
  useEffect(() => {
    if (selectedClassLevels.length > 0 && selectedSubject) {
      loadSubfields();
      if (!isEditMode) {
        setSelectedSubfields([]);
        setSelectedChapters([]);
        setSelectedTheorems([]);
      }
    } else {
      setSubfields([]);
      setChapters([]);
      setTheorems([]);
    }
  }, [selectedClassLevels, selectedSubject]);

  // Load chapters when subfields are selected
  useEffect(() => {
    if (selectedSubfields.length > 0) {
      loadChapters();
      if (!isEditMode) {
        setSelectedChapters([]);
        setSelectedTheorems([]);
      }
    } else {
      setChapters([]);
      setTheorems([]);
    }
  }, [selectedSubfields]);

  // Load theorems when chapters are selected
  useEffect(() => {
    if (selectedChapters.length > 0 && selectedSubfields.length > 0) {
      loadTheorems();
      if (!isEditMode) {
        setSelectedTheorems([]);
      }
    } else {
      setTheorems([]);
    }
  }, [selectedChapters]);

  // Load existing lesson for edit mode
  useEffect(() => {
    if (isEditMode && lessonId) {
      loadLesson(lessonId);
    }
  }, [isEditMode, lessonId]);

  const loadSubfields = async () => {
    try {
      const data = await getSubfields(
        parseInt(selectedSubject),
        selectedClassLevels.map((id) => parseInt(id))
      );
      setSubfields(data);
    } catch (err) {
      console.error('Failed to load subfields:', err);
    }
  };

  const loadChapters = async () => {
    try {
      const data = await getChapters(
        parseInt(selectedSubject),
        selectedClassLevels.map((id) => parseInt(id)),
        selectedSubfields.map((id) => parseInt(id))
      );
      setChapters(data);
    } catch (err) {
      console.error('Failed to load chapters:', err);
    }
  };

  const loadTheorems = async () => {
    try {
      const data = await getTheorems(
        parseInt(selectedSubject),
        selectedClassLevels.map((id) => parseInt(id)),
        selectedSubfields.map((id) => parseInt(id)),
        selectedChapters.map((id) => parseInt(id))
      );
      setTheorems(data);
    } catch (err) {
      console.error('Failed to load theorems:', err);
    }
  };

  const loadLesson = async (id: string) => {
    try {
      setIsLoading(true);
      const lesson: StructuredLesson = await structuredLessonAPI.get(id);

      // Set editor data
      setEditorData({
        title: lesson.title,
        structure: lesson.structure as any,
      });

      // Set classification
      const classLevelIds = lesson.class_levels?.map((l) => l.id.toString()) || [];
      setSelectedClassLevels(classLevelIds);
      setSelectedSubject(lesson.subject?.id.toString() || '');

      // Load dependent data
      if (lesson.subject && classLevelIds.length > 0) {
        const subfieldsData = await getSubfields(lesson.subject.id, classLevelIds.map(id => parseInt(id)));
        setSubfields(subfieldsData);

        const subfieldIds = lesson.subfields?.map((s) => s.id.toString()) || [];
        setSelectedSubfields(subfieldIds);

        if (subfieldIds.length > 0) {
          const chaptersData = await getChapters(lesson.subject.id, classLevelIds.map(id => parseInt(id)), subfieldIds.map(id => parseInt(id)));
          setChapters(chaptersData);

          const chapterIds = lesson.chapters?.map((c) => c.id.toString()) || [];
          setSelectedChapters(chapterIds);

          if (chapterIds.length > 0) {
            const theoremsData = await getTheorems(lesson.subject.id, classLevelIds.map(id => parseInt(id)), subfieldIds.map(id => parseInt(id)), chapterIds.map(id => parseInt(id)));
            setTheorems(theoremsData);
            setSelectedTheorems(lesson.theorems?.map((t) => t.id.toString()) || []);
          }
        }
      }
    } catch (err: any) {
      console.error('Failed to load lesson:', err);
      setError('Échec du chargement de la leçon');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (data: FlexibleLessonEditorState) => {
    // Validation
    if (!data.title.trim()) {
      setError('Le titre est requis');
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

    if (data.structure.sections.length === 0) {
      setError('Ajoutez au moins une section');
      return;
    }

    try {
      setIsSaving(true);
      setError('');

      const payload = {
        title: data.title,
        content: '', // Legacy field
        structure: data.structure,
        subject_id: parseInt(selectedSubject),
        class_level_ids: selectedClassLevels.map(id => parseInt(id)),
        subfield_ids: selectedSubfields.map(id => parseInt(id)),
        chapter_ids: selectedChapters.map(id => parseInt(id)),
        theorem_ids: selectedTheorems.map(id => parseInt(id)),
      };

      let lessonResponse;

      if (isEditMode && lessonId) {
        // Update existing lesson
        lessonResponse = await structuredLessonAPI.update(lessonId, payload);
      } else {
        // Create new lesson
        lessonResponse = await structuredLessonAPI.create(payload);
      }

      // Navigate to lesson detail page
      navigate(`/lessons/${lessonResponse.id}`);
    } catch (err: any) {
      console.error('Failed to save lesson:', err);
      setError(err.response?.data?.message || 'Échec de l\'enregistrement');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (isEditMode && lessonId) {
      navigate(`/lessons/${lessonId}`);
    } else {
      navigate('/lessons');
    }
  };

  const handleLoadTemplate = () => {
    setEditorData({
      title: '',
      structure: LESSON_TEMPLATE,
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-3" />
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Classification */}
          <div className="lg:col-span-1 space-y-4">
            {/* Template Button */}
            {!isEditMode && (!editorData.structure || (editorData.structure.sections && editorData.structure.sections.length === 0)) && (
              <button
                type="button"
                onClick={handleLoadTemplate}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all shadow-md hover:shadow-lg"
              >
                <Sparkles className="w-5 h-5" />
                <span className="font-semibold">Charger un modèle</span>
              </button>
            )}

            <div className="bg-white rounded-xl border border-gray-200 p-6 sticky top-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Classification
              </h3>

              <div className="space-y-3">
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
                    <div className="p-3 space-y-2">
                      {classLevels.map((level) => (
                        <label key={level.id} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedClassLevels.includes(level.id.toString())}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedClassLevels([...selectedClassLevels, level.id.toString()]);
                              } else {
                                setSelectedClassLevels(selectedClassLevels.filter((id) => id !== level.id.toString()));
                              }
                            }}
                            className="rounded border-gray-300"
                          />
                          <span className="text-sm">{level.name}</span>
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
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
                      <div className="p-3 space-y-2 max-h-48 overflow-y-auto">
                        {subfields.map((sf) => (
                          <label key={sf.id} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedSubfields.includes(sf.id.toString())}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedSubfields([...selectedSubfields, sf.id.toString()]);
                                } else {
                                  setSelectedSubfields(selectedSubfields.filter((id) => id !== sf.id.toString()));
                                }
                              }}
                              className="rounded border-gray-300"
                            />
                            <span className="text-sm">{sf.name}</span>
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
                              checked={selectedChapters.includes(ch.id.toString())}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedChapters([...selectedChapters, ch.id.toString()]);
                                } else {
                                  setSelectedChapters(selectedChapters.filter((id) => id !== ch.id.toString()));
                                }
                              }}
                              className="rounded border-gray-300"
                            />
                            <span className="text-sm">{ch.name}</span>
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
                      <div className="p-3 space-y-2 max-h-48 overflow-y-auto">
                        {theorems.map((th) => (
                          <label key={th.id} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedTheorems.includes(th.id.toString())}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedTheorems([...selectedTheorems, th.id.toString()]);
                                } else {
                                  setSelectedTheorems(selectedTheorems.filter((id) => id !== th.id.toString()));
                                }
                              }}
                              className="rounded border-gray-300"
                            />
                            <span className="text-sm">{th.name}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Editor or Preview */}
          <div className="lg:col-span-2">
            {showPreview && editorData.structure ? (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-xl font-bold text-gray-900">
                    Aperçu: {editorData.title || 'Sans titre'}
                  </h3>
                  <button
                    onClick={() => setShowPreview(false)}
                    className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Retour à l'éditeur
                  </button>
                </div>
                <LessonRenderer structure={editorData.structure} />
              </div>
            ) : (
              <FlexibleLessonEditor
                initialData={editorData}
                onSave={handleSave}
                onCancel={handleCancel}
                isLoading={isSaving}
                showPreview={showPreview}
                onTogglePreview={() => setShowPreview(!showPreview)}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
