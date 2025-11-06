import React, { useState, useEffect } from 'react';
import { getClassLevels, getSubjects, getChapters, getSubfields, getTheorems } from '@/lib/api';
import { ClassLevelModel, SubjectModel, ChapterModel, Difficulty, Subfield, Theorem } from '@/types';
import { useNavigate } from 'react-router-dom';
import DualPaneEditor from '@/components/editor/DualPaneEditor';
import {
  BookOpen,
  GraduationCap,
  FileText,
  Lightbulb,
  Info,
  Tag,
  Check,
  ArrowLeft,
  Award,
  Calendar,
  BarChart3
} from 'lucide-react';

type ContentType = 'exercise' | 'lesson' | 'exam';

interface ContentEditorV2Props {
  contentType: ContentType;
  onSubmit: (data: any) => void;
  initialValues?: any;
}

const ContentEditorV2: React.FC<ContentEditorV2Props> = ({
  contentType,
  onSubmit,
  initialValues = {}
}) => {
  const navigate = useNavigate();

  // Form fields
  const [title, setTitle] = useState(initialValues.title || '');
  const [content, setContent] = useState(initialValues.content || '');
  const [selectedClassLevels, setSelectedClassLevels] = useState<string[]>(initialValues.class_levels || []);
  const [selectedSubject, setSelectedSubject] = useState(initialValues.subject || '');
  const [selectedChapters, setSelectedChapters] = useState<string[]>(initialValues.chapters || []);
  const [selectedSubfields, setSelectedSubfields] = useState<string[]>(initialValues.subfields || []);
  const [selectedTheorems, setSelectedTheorems] = useState<string[]>(initialValues.theorems || []);

  // Exercise-specific
  const [difficulty, setDifficulty] = useState<Difficulty>(initialValues.difficulty || 'easy');
  const [solution, setSolution] = useState(initialValues.solution_content || '');

  // Exam-specific
  const [isNationalExam, setIsNationalExam] = useState(initialValues.is_national_exam || false);
  const [nationalYear, setNationalYear] = useState(initialValues.national_year || '');

  // Data from API
  const [classLevels, setClassLevels] = useState<ClassLevelModel[]>([]);
  const [subjects, setSubjects] = useState<SubjectModel[]>([]);
  const [chapters, setChapters] = useState<ChapterModel[]>([]);
  const [subfields, setSubfields] = useState<Subfield[]>([]);
  const [theorems, setTheorems] = useState<Theorem[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  // Load subfields when subject is selected
  useEffect(() => {
    if (selectedClassLevels.length > 0 && selectedSubject) {
      loadSubfields();
      // Reset dependent fields when subject changes
      setSelectedSubfields([]);
      setSelectedChapters([]);
      setSelectedTheorems([]);
    }
  }, [selectedClassLevels, selectedSubject]);

  // Load chapters when subfields are selected
  useEffect(() => {
    if (selectedSubfields.length > 0) {
      loadChapters();
      // Reset dependent fields when subfields change
      setSelectedChapters([]);
      setSelectedTheorems([]);
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

  const loadInitialData = async () => {
    try {
      const [levelsData, subjectsData] = await Promise.all([
        getClassLevels(),
        getSubjects()
      ]);
      setClassLevels(levelsData);
      setSubjects(subjectsData);
    } catch (err) {
      console.error('Failed to load initial data:', err);
    }
  };

  const loadChapters = async () => {
    try {
      const chaptersData = await getChapters(
        selectedSubject,
        selectedClassLevels,
        selectedSubfields
      );
      setChapters(chaptersData);
    } catch (err) {
      console.error('Failed to load chapters:', err);
    }
  };

  const loadSubfields = async () => {
    try {
      const subfieldsData = await getSubfields(
        selectedSubject,
        selectedClassLevels
      );
      setSubfields(subfieldsData);
    } catch (err) {
      console.error('Failed to load subfields:', err);
    }
  };

  const loadTheorems = async () => {
    try {
      const theoremsData = await getTheorems(
        selectedSubject,
        selectedClassLevels,
        selectedSubfields,
        selectedChapters
      );
      setTheorems(theoremsData);
    } catch (err) {
      console.error('Failed to load theorems:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      setError('Le titre est requis');
      return;
    }
    if (selectedClassLevels.length === 0) {
      setError('Veuillez sélectionner au moins un niveau de classe');
      return;
    }
    if (!selectedSubject) {
      setError('Veuillez sélectionner une matière');
      return;
    }

    setIsLoading(true);
    setError(null);

    const baseData = {
      title,
      content,
      class_levels: selectedClassLevels,
      subject: selectedSubject,
      chapters: selectedChapters,
      subfields: selectedSubfields,
      theorems: selectedTheorems,
    };

    let submitData = baseData;

    if (contentType === 'exercise') {
      submitData = {
        ...baseData,
        difficulty,
        solution_content: solution
      };
    } else if (contentType === 'exam') {
      submitData = {
        ...baseData,
        difficulty,
        solution: solution,
        is_national_exam: isNationalExam,
        national_year: nationalYear ? parseInt(nationalYear) : null
      };
    }

    try {
      await onSubmit(submitData);
    } catch (err) {
      setError('Échec de la publication. Veuillez réessayer.');
      setIsLoading(false);
    }
  };

  const getTitle = () => {
    switch (contentType) {
      case 'exercise': return 'Créer un exercice';
      case 'lesson': return 'Créer une leçon';
      case 'exam': return 'Créer un examen';
    }
  };

  const getIcon = () => {
    switch (contentType) {
      case 'exercise': return <FileText className="w-6 h-6" />;
      case 'lesson': return <BookOpen className="w-6 h-6" />;
      case 'exam': return <Award className="w-6 h-6" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Enhanced Header with pattern background */}
      <div className="relative bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-600 text-white overflow-hidden">
        {/* Decorative background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-300 rounded-full blur-3xl"></div>
        </div>

        <div className="relative max-w-5xl mx-auto px-4 py-8">
          <button
            onClick={() => navigate(-1)}
            className="group flex items-center gap-2 text-white/80 hover:text-white transition-all mb-6 hover:gap-3"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span className="font-medium">Retour</span>
          </button>

          <div className="flex items-start gap-4">
            {/* Icon with animated background */}
            <div className="relative">
              <div className="absolute inset-0 bg-white/20 rounded-2xl blur-xl"></div>
              <div className="relative bg-white/10 backdrop-blur-sm p-4 rounded-2xl border border-white/20 shadow-2xl">
                {getIcon()}
              </div>
            </div>

            {/* Title and description */}
            <div className="flex-1">
              <h1 className="text-4xl font-bold mb-2 tracking-tight">{getTitle()}</h1>
              <p className="text-purple-100 text-lg">
                {contentType === 'exercise' && 'Partagez un exercice avec la communauté'}
                {contentType === 'lesson' && 'Partagez vos connaissances avec une leçon'}
                {contentType === 'exam' && 'Créez un examen pour tester les compétences'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 mt-8">
        {error && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-md">
            <p className="font-medium">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info Section */}
          <Section title="Informations de base" icon={<Info className="w-5 h-5" />}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Titre <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Entrez un titre clair et descriptif"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contenu <span className="text-red-500">*</span>
                </label>
                <DualPaneEditor
                  initialContent={content}
                  onChange={setContent}
                  placeholder="Rédigez le contenu ici..."
                />
              </div>
            </div>
          </Section>

          {/* Classification Section */}
          <Section title="Classification" icon={<Tag className="w-5 h-5" />}>
            <div className="grid md:grid-cols-2 gap-4">
              {/* Class Levels */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Niveaux <span className="text-red-500">*</span>
                </label>
                <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-xl p-3">
                  {classLevels.map((level) => (
                    <label key={level.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors">
                      <input
                        type="checkbox"
                        checked={selectedClassLevels.includes(level.id.toString())}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedClassLevels([...selectedClassLevels, level.id.toString()]);
                          } else {
                            setSelectedClassLevels(selectedClassLevels.filter(id => id !== level.id.toString()));
                          }
                        }}
                        className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                      />
                      <span className="text-sm text-gray-700">{level.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Subject */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Matière <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  required
                >
                  <option value="">Sélectionner une matière</option>
                  {subjects.map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Subfields - Now BEFORE Chapters */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sous-domaines
                </label>
                <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-xl p-3">
                  {subfields.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">
                      Sélectionnez un niveau et une matière d'abord
                    </p>
                  ) : (
                    subfields.map((subfield) => (
                      <label key={subfield.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors">
                        <input
                          type="checkbox"
                          checked={selectedSubfields.includes(subfield.id.toString())}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedSubfields([...selectedSubfields, subfield.id.toString()]);
                            } else {
                              setSelectedSubfields(selectedSubfields.filter(id => id !== subfield.id.toString()));
                            }
                          }}
                          className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                        />
                        <span className="text-sm text-gray-700">{subfield.name}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>

              {/* Chapters - Now AFTER Subfields */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Chapitres
                </label>
                <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-xl p-3">
                  {chapters.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">
                      {selectedSubfields.length === 0
                        ? 'Sélectionnez des sous-domaines d\'abord'
                        : 'Aucun chapitre disponible pour les sous-domaines sélectionnés'}
                    </p>
                  ) : (
                    chapters.map((chapter) => (
                      <label key={chapter.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors">
                        <input
                          type="checkbox"
                          checked={selectedChapters.includes(chapter.id.toString())}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedChapters([...selectedChapters, chapter.id.toString()]);
                            } else {
                              setSelectedChapters(selectedChapters.filter(id => id !== chapter.id.toString()));
                            }
                          }}
                          className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                        />
                        <span className="text-sm text-gray-700">{chapter.name}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>

              {/* Theorems */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Théorèmes
                </label>
                <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-xl p-3">
                  {theorems.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">
                      {selectedChapters.length === 0
                        ? 'Sélectionnez des chapitres d\'abord'
                        : 'Aucun théorème disponible pour les chapitres sélectionnés'}
                    </p>
                  ) : (
                    theorems.map((theorem) => (
                      <label key={theorem.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors">
                        <input
                          type="checkbox"
                          checked={selectedTheorems.includes(theorem.id.toString())}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedTheorems([...selectedTheorems, theorem.id.toString()]);
                            } else {
                              setSelectedTheorems(selectedTheorems.filter(id => id !== theorem.id.toString()));
                            }
                          }}
                          className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                        />
                        <span className="text-sm text-gray-700">{theorem.name}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>
            </div>
          </Section>

          {/* Difficulty (for exercises and exams only) */}
          {(contentType === 'exercise' || contentType === 'exam') && (
            <Section title="Difficulté" icon={<BarChart3 className="w-5 h-5" />}>
              <div className="flex gap-3">
                {(['easy', 'medium', 'hard'] as Difficulty[]).map((diff) => (
                  <button
                    key={diff}
                    type="button"
                    onClick={() => setDifficulty(diff)}
                    className={`flex-1 px-4 py-3 rounded-xl font-medium transition-all ${
                      difficulty === diff
                        ? 'bg-purple-600 text-white shadow-lg'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {diff === 'easy' ? 'Facile' : diff === 'medium' ? 'Moyen' : 'Difficile'}
                  </button>
                ))}
              </div>
            </Section>
          )}

          {/* Solution (exercises and exams) */}
          {(contentType === 'exercise' || contentType === 'exam') && (
            <Section title="Solution" icon={<Lightbulb className="w-5 h-5" />}>
              <DualPaneEditor
                initialContent={solution}
                onChange={setSolution}
                placeholder="Rédigez la solution détaillée..."
              />
            </Section>
          )}

          {/* Exam-specific fields */}
          {contentType === 'exam' && (
            <Section title="Informations d'examen" icon={<Award className="w-5 h-5" />}>
              <div className="space-y-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isNationalExam}
                    onChange={(e) => setIsNationalExam(e.target.checked)}
                    className="w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Ceci est un examen national officiel
                  </span>
                </label>

                {isNationalExam && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Année de l'examen
                    </label>
                    <input
                      type="number"
                      value={nationalYear}
                      onChange={(e) => setNationalYear(e.target.value)}
                      placeholder="2024"
                      min="2000"
                      max="2100"
                      className="w-full md:w-48 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                    />
                  </div>
                )}
              </div>
            </Section>
          )}

          {/* Submit Button */}
          <div className="flex gap-4 pt-6">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Publication en cours...
                </>
              ) : (
                <>
                  <Check className="w-5 h-5" />
                  Publier {contentType === 'exercise' ? "l'exercice" : contentType === 'lesson' ? "la leçon" : "l'examen"}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Section component for consistent styling
const Section: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode }> = ({ title, icon, children }) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
    <div className="bg-gradient-to-r from-purple-50 to-indigo-50 px-6 py-4 border-b border-gray-200 flex items-center gap-2">
      <span className="text-purple-600">{icon}</span>
      <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
    </div>
    <div className="p-6">
      {children}
    </div>
  </div>
);

export default ContentEditorV2;
