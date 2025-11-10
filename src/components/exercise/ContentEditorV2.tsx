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

  // Load initial dependent data when editing (initialValues provided)
  useEffect(() => {
    const loadInitialDependentData = async () => {
      if (initialValues.subject && initialValues.class_levels?.length > 0) {
        // Load subfields
        try {
          const subfieldsData = await getSubfields(
            initialValues.subject,
            initialValues.class_levels
          );
          setSubfields(subfieldsData);
        } catch (err) {
          console.error('Failed to load initial subfields:', err);
        }

        // Load chapters if subfields exist
        if (initialValues.subfields?.length > 0) {
          try {
            const chaptersData = await getChapters(
              initialValues.subject,
              initialValues.class_levels,
              initialValues.subfields
            );
            setChapters(chaptersData);
          } catch (err) {
            console.error('Failed to load initial chapters:', err);
          }

          // Load theorems if chapters exist
          if (initialValues.chapters?.length > 0) {
            try {
              const theoremsData = await getTheorems(
                initialValues.subject,
                initialValues.class_levels,
                initialValues.subfields,
                initialValues.chapters
              );
              setTheorems(theoremsData);
            } catch (err) {
              console.error('Failed to load initial theorems:', err);
            }
          }
        }
      }
    };

    loadInitialDependentData();
  }, []);

  // Load subfields when subject is selected
  useEffect(() => {
    if (selectedClassLevels.length > 0 && selectedSubject) {
      loadSubfields();
      // Reset dependent fields when subject changes ONLY if not in initial load
      if (!initialValues.subject) {
        setSelectedSubfields([]);
        setSelectedChapters([]);
        setSelectedTheorems([]);
      }
    }
  }, [selectedClassLevels, selectedSubject]);

  // Load chapters when subfields are selected
  useEffect(() => {
    if (selectedSubfields.length > 0) {
      loadChapters();
      // Reset dependent fields when subfields change ONLY if not in initial load
      if (!initialValues.subfields?.length) {
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

  const getThemeColors = () => {
    switch (contentType) {
      case 'exercise': return {
        gradient: 'from-purple-900 to-purple-800',
        button: 'bg-purple-600 hover:bg-purple-700',
        headerText: 'text-purple-100',
        sectionHeader: 'from-purple-50 to-indigo-50',
        sectionHeaderIcon: 'text-purple-600',
        classificationHeader: 'from-purple-600 to-indigo-600',
        classificationBorder: 'border-purple-300',
        classificationRing: 'ring-purple-100',
        focusRing: 'focus:ring-purple-500',
        tabActive: 'bg-purple-600 text-white',
        tabHover: 'hover:bg-purple-50'
      };
      case 'lesson': return {
        gradient: 'from-blue-900 to-blue-800',
        button: 'bg-blue-600 hover:bg-blue-700',
        headerText: 'text-blue-100',
        sectionHeader: 'from-blue-50 to-cyan-50',
        sectionHeaderIcon: 'text-blue-600',
        classificationHeader: 'from-blue-600 to-cyan-600',
        classificationBorder: 'border-blue-300',
        classificationRing: 'ring-blue-100',
        focusRing: 'focus:ring-blue-500',
        tabActive: 'bg-blue-600 text-white',
        tabHover: 'hover:bg-blue-50'
      };
      case 'exam': return {
        gradient: 'from-green-900 to-green-800',
        button: 'bg-green-600 hover:bg-green-700',
        headerText: 'text-green-100',
        sectionHeader: 'from-green-50 to-emerald-50',
        sectionHeaderIcon: 'text-green-600',
        classificationHeader: 'from-green-800 to-emerald-900',
        classificationBorder: 'border-green-800',
        classificationRing: 'ring-green-100',
        focusRing: 'focus:ring-green-500',
        tabActive: 'bg-green-600 text-white',
        tabHover: 'hover:bg-green-50'
      };
    }
  };

  const themeColors = getThemeColors();

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Enhanced Header matching webapp design */}
      <div className={`relative bg-gradient-to-br ${themeColors.gradient} text-white overflow-hidden`}>
        {/* Decorative hexagon pattern background */}
        <div className="absolute inset-0 opacity-5">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="hexagons" width="50" height="43.4" patternUnits="userSpaceOnUse" patternTransform="scale(2)">
                <path d="M25 0l12.5 7.2v14.5L25 28.9 12.5 21.7V7.2z" fill="none" stroke="white" strokeWidth="0.5"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#hexagons)"/>
          </svg>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 py-6">
          <button
            onClick={() => navigate(-1)}
            className="group flex items-center gap-2 text-white/80 hover:text-white transition-all mb-4"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-medium">Retour</span>
          </button>

          <div className="flex items-center gap-3">
            <div className="bg-white/10 backdrop-blur-sm p-3 rounded-xl border border-white/20">
              {getIcon()}
            </div>
            <div>
              <h1 className="text-3xl font-extrabold mb-1">{getTitle()}</h1>
              <p className={`${themeColors.headerText} text-sm`}>
                {contentType === 'exercise' && 'Partagez un exercice avec la communauté'}
                {contentType === 'lesson' && 'Partagez vos connaissances avec une leçon'}
                {contentType === 'exam' && 'Créez un examen pour tester les compétences'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 mt-6">
        {error && (
          <div className="mb-4 bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-xl">
            <p className="font-medium text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Main Content Grid - 2 columns */}
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Left Column - Content Editors (2/3 width) */}
            <div className="lg:col-span-2 space-y-6">
              {/* Title */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Titre <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Entrez un titre clair et descriptif"
                  className={`w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 ${themeColors.focusRing} focus:border-transparent transition-all text-sm`}
                  required
                />
              </div>

              {/* Content Editor */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className={`bg-gradient-to-r ${themeColors.sectionHeader} px-4 py-3 border-b border-gray-200 flex items-center gap-2`}>
                  <FileText className={`w-4 h-4 ${themeColors.sectionHeaderIcon}`} />
                  <h2 className="text-sm font-semibold text-gray-900">Contenu <span className="text-red-500">*</span></h2>
                </div>
                <div className="p-4">
                  <DualPaneEditor
                    initialContent={content}
                    onChange={setContent}
                    placeholder="Rédigez le contenu ici..."
                  />
                </div>
              </div>

              {/* Solution Editor (for exercises and exams) */}
              {(contentType === 'exercise' || contentType === 'exam') && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className={`bg-gradient-to-r ${themeColors.sectionHeader} px-4 py-3 border-b border-gray-200 flex items-center gap-2`}>
                    <Lightbulb className={`w-4 h-4 ${themeColors.sectionHeaderIcon}`} />
                    <h2 className="text-sm font-semibold text-gray-900">Solution</h2>
                  </div>
                  <div className="p-4">
                    <DualPaneEditor
                      initialContent={solution}
                      onChange={setSolution}
                      placeholder="Rédigez la solution détaillée..."
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Right Column - Classification & Metadata (1/3 width) */}
            <div className="space-y-6">
              {/* Classification Section - Highlighted as important */}
              <div className={`bg-white rounded-xl shadow-lg border-2 ${themeColors.classificationBorder} overflow-hidden ring-4 ${themeColors.classificationRing}`}>
                <div className={`bg-gradient-to-r ${themeColors.classificationHeader} px-4 py-3 border-b flex items-center gap-2`}>
                  <Tag className="w-4 h-4 text-white" />
                  <h2 className="text-sm font-bold text-white">Classification</h2>
                  <span className="ml-auto text-xs bg-yellow-400 text-gray-900 px-2 py-0.5 rounded-full font-bold">Important</span>
                </div>
                <div className="p-4 space-y-4">
                  {/* Class Levels */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-2">
                      Niveaux <span className="text-red-500">*</span>
                    </label>
                    <div className="space-y-1 max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-2">
                      {classLevels.map((level) => (
                        <label key={level.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1.5 rounded transition-colors">
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
                            className={`w-3.5 h-3.5 ${themeColors.sectionHeaderIcon} border-gray-300 rounded ${themeColors.focusRing}`}
                          />
                          <span className="text-xs text-gray-700">{level.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Subject */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-2">
                      Matière <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={selectedSubject}
                      onChange={(e) => setSelectedSubject(e.target.value)}
                      className={`w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 ${themeColors.focusRing} focus:border-transparent transition-all`}
                      required
                    >
                      <option value="">Sélectionner</option>
                      {subjects.map((subject) => (
                        <option key={subject.id} value={subject.id}>
                          {subject.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Subfields */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-2">
                      Sous-domaines
                    </label>
                    <div className="space-y-1 max-h-32 overflow-y-auto border border-gray-200 rounded-lg p-2">
                      {subfields.length === 0 ? (
                        <p className="text-xs text-gray-500 text-center py-2">
                          Sélectionnez niveau et matière
                        </p>
                      ) : (
                        subfields.map((subfield) => (
                          <label key={subfield.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1.5 rounded transition-colors">
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
                              className={`w-3.5 h-3.5 ${themeColors.sectionHeaderIcon} border-gray-300 rounded ${themeColors.focusRing}`}
                            />
                            <span className="text-xs text-gray-700">{subfield.name}</span>
                          </label>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Chapters */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-2">
                      Chapitres
                    </label>
                    <div className="space-y-1 max-h-32 overflow-y-auto border border-gray-200 rounded-lg p-2">
                      {chapters.length === 0 ? (
                        <p className="text-xs text-gray-500 text-center py-2">
                          {selectedSubfields.length === 0 ? 'Sélectionnez sous-domaines' : 'Aucun disponible'}
                        </p>
                      ) : (
                        chapters.map((chapter) => (
                          <label key={chapter.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1.5 rounded transition-colors">
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
                              className={`w-3.5 h-3.5 ${themeColors.sectionHeaderIcon} border-gray-300 rounded ${themeColors.focusRing}`}
                            />
                            <span className="text-xs text-gray-700">{chapter.name}</span>
                          </label>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Theorems */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-2">
                      Théorèmes
                    </label>
                    <div className="space-y-1 max-h-32 overflow-y-auto border border-gray-200 rounded-lg p-2">
                      {theorems.length === 0 ? (
                        <p className="text-xs text-gray-500 text-center py-2">
                          {selectedChapters.length === 0 ? 'Sélectionnez chapitres' : 'Aucun disponible'}
                        </p>
                      ) : (
                        theorems.map((theorem) => (
                          <label key={theorem.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1.5 rounded transition-colors">
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
                              className={`w-3.5 h-3.5 ${themeColors.sectionHeaderIcon} border-gray-300 rounded ${themeColors.focusRing}`}
                            />
                            <span className="text-xs text-gray-700">{theorem.name}</span>
                          </label>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Difficulty (for exercises and exams only) */}
              {(contentType === 'exercise' || contentType === 'exam') && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className={`bg-gradient-to-r ${themeColors.sectionHeader} px-4 py-3 border-b border-gray-200 flex items-center gap-2`}>
                    <BarChart3 className={`w-4 h-4 ${themeColors.sectionHeaderIcon}`} />
                    <h2 className="text-sm font-semibold text-gray-900">Difficulté</h2>
                  </div>
                  <div className="p-4">
                    <div className="space-y-2">
                      {/* Easy - Green */}
                      <button
                        type="button"
                        onClick={() => setDifficulty('easy')}
                        className={`w-full px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                          difficulty === 'easy'
                            ? 'bg-green-600 text-white shadow-md ring-2 ring-green-300'
                            : 'bg-green-50 text-green-700 border-2 border-green-200 hover:bg-green-100'
                        }`}
                      >
                        ● Facile
                      </button>

                      {/* Medium - Amber */}
                      <button
                        type="button"
                        onClick={() => setDifficulty('medium')}
                        className={`w-full px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                          difficulty === 'medium'
                            ? 'bg-amber-600 text-white shadow-md ring-2 ring-amber-300'
                            : 'bg-amber-50 text-amber-700 border-2 border-amber-200 hover:bg-amber-100'
                        }`}
                      >
                        ● Moyen
                      </button>

                      {/* Hard - Red/Orange */}
                      <button
                        type="button"
                        onClick={() => setDifficulty('hard')}
                        className={`w-full px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                          difficulty === 'hard'
                            ? 'bg-red-600 text-white shadow-md ring-2 ring-red-300'
                            : 'bg-red-50 text-red-700 border-2 border-red-200 hover:bg-red-100'
                        }`}
                      >
                        ● Difficile
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Exam-specific fields */}
              {contentType === 'exam' && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className={`bg-gradient-to-r ${themeColors.sectionHeader} px-4 py-3 border-b border-gray-200 flex items-center gap-2`}>
                    <Award className={`w-4 h-4 ${themeColors.sectionHeaderIcon}`} />
                    <h2 className="text-sm font-semibold text-gray-900">Infos examen</h2>
                  </div>
                  <div className="p-4 space-y-3">
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isNationalExam}
                        onChange={(e) => setIsNationalExam(e.target.checked)}
                        className="w-4 h-4 mt-0.5 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                      />
                      <span className="text-xs text-gray-700">
                        Examen national officiel
                      </span>
                    </label>

                    {isNationalExam && (
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Année
                        </label>
                        <input
                          type="number"
                          value={nationalYear}
                          onChange={(e) => setNationalYear(e.target.value)}
                          placeholder="2024"
                          min="2000"
                          max="2100"
                          className={`w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 ${themeColors.focusRing} focus:border-transparent transition-all`}
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Submit Buttons - Sticky at bottom */}
          <div className="sticky bottom-0 bg-white border-t-2 border-gray-200 p-4 rounded-xl shadow-lg flex gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-5 py-2.5 border-2 border-gray-300 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-all"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className={`flex-1 px-5 py-2.5 ${themeColors.button} text-white rounded-xl text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg`}
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Publication...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
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

// Section component for consistent styling (not currently used but keeping for reference)
const Section: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode }> = ({ title, icon, children }) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
    <div className="bg-gradient-to-r from-gray-50 to-gray-50 px-6 py-4 border-b border-gray-200 flex items-center gap-2">
      <span>{icon}</span>
      <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
    </div>
    <div className="p-6">
      {children}
    </div>
  </div>
);

export default ContentEditorV2;
