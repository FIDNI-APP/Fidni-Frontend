import React, { useState, useEffect, useRef } from 'react';
import { getClassLevels, getSubjects, getChapters, getSubfields, getTheorems } from '@/lib/api';
import { ClassLevelModel, SubjectModel, ChapterModel, Difficulty, Subfield, Theorem } from '@/types';
import { useNavigate } from 'react-router-dom';
import DualPaneEditor from './editor/DualPaneEditor';
import ContentPreview from './ContentPreview';
import { 
  BookOpen, 
  GraduationCap, 
  FileText, 
  Lightbulb, 
  ChevronRight, 
  ChevronLeft,
  Info,
  FileEdit,
  Tag,
  Check,
  BookMarked,
  Layers,
  AlertCircle,
  Search,
  X,
  Sparkles,
  Target,
  Wand2,
  Save,
  Eye
} from 'lucide-react';

interface ContentEditorProps {
  onSubmit: (data: any) => void;
  isLesson?: boolean;
  initialValues?: {
    title: string;
    content: string;
    class_level?: string[];
    subject?: string;
    subfields?: string[];
    difficulty?: Difficulty;
    chapters?: string[];
    theorems?: string[];
    solution_content?: string;
  };
}

const ContentEditor: React.FC<ContentEditorProps> = ({ 
  onSubmit, 
  isLesson = false,
  initialValues = {
    title: '',
    content: '',
    class_level: [],
    subject: '',
    subfields: [],
    difficulty: 'easy',
    chapters: [],
    theorems: [],
    solution_content: ''
  }
}) => {
  const navigate = useNavigate();
  const [title, setTitle] = useState(initialValues.title);
  const [content, setContent] = useState(initialValues.content);
  const [classLevels, setClassLevels] = useState<ClassLevelModel[]>([]);
  const [subjects, setSubjects] = useState<SubjectModel[]>([]);
  const [subfields, setSubfields] = useState<Subfield[]>([]);
  const [chapters, setChapters] = useState<ChapterModel[]>([]);
  const [theorems, setTheorems] = useState<Theorem[]>([]);
  const [selectedClassLevels, setSelectedClassLevels] = useState<string[]>(initialValues.class_level || []);
  const [selectedSubject, setSelectedSubject] = useState(initialValues.subject || '');
  const [selectedSubfields, setSelectedSubfields] = useState<string[]>(initialValues.subfields || []);
  const [selectedChapters, setSelectedChapters] = useState<string[]>(initialValues.chapters || []);
  const [selectedTheorems, setSelectedTheorems] = useState<string[]>(initialValues.theorems || []);
  const [difficulty, setDifficulty] = useState<Difficulty>(initialValues.difficulty || 'easy');
  const [solution, setSolution] = useState(initialValues.solution_content || '');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [showPreview, setShowPreview] = useState(false);
  const [searchTerms, setSearchTerms] = useState({
    subfields: '',
    chapters: '',
    theorems: ''
  });

  // Loading states
  const [isLoadingSubfields, setIsLoadingSubfields] = useState(false);
  const [isLoadingChapters, setIsLoadingChapters] = useState(false);
  const [isLoadingTheorems, setIsLoadingTheorems] = useState(false);

  // Progress calculation
  const calculateProgress = () => {
    let filled = 0;
    let total = isLesson ? 6 : 7;

    if (title.trim()) filled++;
    if (selectedClassLevels.length > 0) filled++;
    if (selectedSubject) filled++;
    if (selectedSubfields.length > 0) filled++;
    if (selectedChapters.length > 0) filled++;
    if (content.trim()) filled++;
    if (!isLesson && solution.trim()) filled++;

    return Math.round((filled / total) * 100);
  };
interface SectionFrameProps {
  title: string;
  icon: React.ReactNode;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}

const searchInputRefs = {
  subfields: useRef<HTMLInputElement>(null),
  chapters: useRef<HTMLInputElement>(null),
  theorems: useRef<HTMLInputElement>(null)
};

const handleSearchChange = (type: keyof typeof searchTerms, value: string) => {
  setSearchTerms(prev => ({
    ...prev,
    [type]: value
  }));
  
  // Maintenir le focus après le rendu
  setTimeout(() => {
    const ref = searchInputRefs[type];
    if (ref.current) {
      ref.current.focus();
      // Positionner le curseur à la fin du texte
      const length = value.length;
      ref.current.setSelectionRange(length, length);
    }
  }, 0);
};

const SectionFrame: React.FC<SectionFrameProps> = ({ 
  title, 
  icon, 
  required = false, 
  children, 
  className = '' 
}) => (
  <div className={`bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden ${className}`}>
    <div className="bg-indigo-100 px-5 py-3 border-b border-gray-200 flex items-center">
      <span className="text-indigo-600 mr-2">{icon}</span>
      <h3 className="font-semibold text-gray-900">
        {title}
        {required && <span className="text-red-500 ml-1">*</span>}
      </h3>
    </div>
    <div className="p-5">
      {children}
    </div>
  </div>
);
  // Define steps
  const steps = isLesson 
    ? [
        { id: 1, title: "Details", icon: <Info className="w-4 h-4" /> },
        { id: 2, title: "Content", icon: <FileEdit className="w-4 h-4" /> },
        { id: 3, title: "Review", icon: <Eye className="w-4 h-4" /> }
      ]
    : [
        { id: 1, title: "Details", icon: <Info className="w-4 h-4" /> },
        { id: 2, title: "Exercise", icon: <FileEdit className="w-4 h-4" /> },
        { id: 3, title: "Solution", icon: <Lightbulb className="w-4 h-4" /> },
        { id: 4, title: "Review", icon: <Eye className="w-4 h-4" /> }
      ];

  // Load data hooks (same as before)
  useEffect(() => {
    loadClassLevels();
  }, []);

  useEffect(() => {
    loadSubjects();
    setSelectedSubject('');
    setSelectedSubfields([]);
    setSelectedChapters([]);
    setSelectedTheorems([]);
  }, [selectedClassLevels]);

  useEffect(() => {
    loadSubfields();
    setSelectedSubfields([]);
    setSelectedChapters([]);
    setSelectedTheorems([]);
  }, [selectedSubject, selectedClassLevels]);

  useEffect(() => {
    loadChapters();
    setSelectedChapters([]);
    setSelectedTheorems([]);
  }, [selectedSubfields]);

  useEffect(() => {
    loadTheorems();
    setSelectedTheorems([]);
  }, [selectedChapters]);

  // Load functions (same as before)
  const loadClassLevels = async () => {
    try {
      const data = await getClassLevels();
      setClassLevels(data);
    } catch (error) {
      console.error('Failed to load class levels:', error);
    }
  };

  const getUniqueById = <T extends { id: string }>(array: T[]): T[] => {
    return Array.from(new Map(array.map(item => [item.id, item])).values());
  };

  const loadSubjects = async () => {
    if (selectedClassLevels.length === 0) {
      setSubjects([]);
      return;
    }
    
    try {
      const data = await getSubjects(selectedClassLevels);
      const uniqueSubjects = getUniqueById(data);
      setSubjects(uniqueSubjects);
    } catch (error) {
      console.error('Failed to load subjects:', error);
    }
  };

  const loadSubfields = async () => {
    if (!selectedSubject || selectedClassLevels.length === 0) {
      setSubfields([]);
      return;
    }
    
    setIsLoadingSubfields(true);
    try {
      const data = await getSubfields(selectedSubject, selectedClassLevels);
      const uniqueSubfields = getUniqueById(data);
      setSubfields(uniqueSubfields);
    } catch (error) {
      console.error('Failed to load subfields:', error);
    } finally {
      setIsLoadingSubfields(false);
    }
  };

  const loadChapters = async () => {
    if (selectedSubfields.length === 0 || !selectedSubject || selectedClassLevels.length === 0) {
      setChapters([]);
      return;
    }
    
    setIsLoadingChapters(true);
    try {
      const data = await getChapters(selectedSubject, selectedClassLevels, selectedSubfields);
      const uniqueChapters = getUniqueById(data);
      setChapters(uniqueChapters);
    } catch (error) {
      console.error('Failed to load chapters:', error);
    } finally {
      setIsLoadingChapters(false);
    }
  };

  const loadTheorems = async () => {
    if (selectedChapters.length === 0 || selectedSubfields.length === 0 || !selectedSubject || selectedClassLevels.length === 0) {
      setTheorems([]);
      return;
    }
    
    setIsLoadingTheorems(true);
    try {
      const data = await getTheorems(selectedSubject, selectedClassLevels, selectedSubfields, selectedChapters);
      const uniqueTheorems = getUniqueById(data);
      setTheorems(uniqueTheorems);
    } catch (error) {
      console.error('Failed to load theorems:', error);
    } finally {
      setIsLoadingTheorems(false);
    }
  };

  const toggleSelection = (id: string, selectedList: string[], setSelectedList: React.Dispatch<React.SetStateAction<string[]>>) => {
    setSelectedList(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSubjectSelection = (id: string) => {
    setSelectedSubject(prev => (prev === id ? '' : id));
  };

  const handleSubmit = async () => {
    if (!selectedClassLevels.length || !selectedSubject || !selectedSubfields.length || !selectedChapters.length) {
      setError('Please complete all required fields.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (!title.trim() || !content.trim()) {
      setError('Title and content are required.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (!isLesson && currentStep >= 3 && !solution.trim()) {
      setError('Solution is required for exercises.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const submissionData = {
        title,
        content,
        class_levels: selectedClassLevels,
        subject: selectedSubject,
        subfields: selectedSubfields,
        chapters: selectedChapters,
        theorems: selectedTheorems,
        ...(isLesson ? {} : {
          difficulty,
          solution_content: solution,
        })
      };
      
      await onSubmit(submissionData);
    } catch (error) {
      console.error('Failed to create content:', error);
      setError('Failed to create content. Please try again.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    navigate(-1);
  };

  const nextStep = () => {
    setError(null);
    if (currentStep === 1) {
      if (!title || !selectedClassLevels.length || !selectedSubject || !selectedSubfields.length || !selectedChapters.length) {
        setError('Please complete all required fields before continuing.');
        return;
      }
    }
    if (currentStep === 2 && !content.trim()) {
      setError('Content is required before continuing.');
      return;
    }
    
    setCurrentStep(prev => prev + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const prevStep = () => {
    setCurrentStep(prev => prev - 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Filter functions for search
  const filterItems = (items: any[], searchTerm: string) => {
    if (!searchTerm) return items;
    return items.filter(item => 
      item.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const getDifficultyInfo = (level: string) => {
    switch (level) {
      case 'easy':
        return {
          label: 'Easy',
          color: 'from-emerald-500 to-green-500',
          bgColor: 'bg-emerald-50',
          borderColor: 'border-emerald-200',
        };
      case 'medium':
        return {
          label: 'Medium',
          color: 'from-amber-500 to-yellow-500',
          bgColor: 'bg-amber-50',
          borderColor: 'border-amber-200',
        };
      case 'hard':
        return {
          label: 'Hard',
          color: 'from-red-500 to-pink-500',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
        };
      default:
        return {
          label: level,
          color: 'from-gray-500 to-gray-400',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          icon: '📝',
          description: ''
        };
    }
  };

  // Enhanced selection card component
  const SelectionCard = ({ 
    item, 
    isSelected, 
    onClick, 
    icon,
    color = 'indigo'
  }: { 
    item: { id: string; name: string };
    isSelected: boolean;
    onClick: () => void;
    icon?: React.ReactNode;
    color?: string;
  }) => (
    <button
      type="button"
      onClick={onClick}
      className={`
        relative p-3 rounded-xl border-2 transition-all duration-200 transform text-3xl font-medium
        ${isSelected 
          ? `border-${color}-500 bg-${color}-50 scale-[0.98] shadow-md` 
          : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
        }
      `}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {icon && (
            <span className={`${isSelected ? `text-${color}-600` : 'text-gray-400'}`}>
              {icon}
            </span>
          )}
          <span className={`text-base font-medium ${isSelected ? `text-${color}-900` : 'text-gray-700'}`}>
            {item.name}
          </span>
        </div>
        {isSelected && (
          <Check className={`w-4 h-4 text-${color}-600`} />
        )}
      </div>
    </button>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-indigo-50/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Enhanced Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4 bg-gradient-to-r from-indigo-700 to-purple-700 text-white p-4 rounded-2xl shadow-lg">
            <div className="flex items-center space-x-4">
              <button
                onClick={handleCancel}
                className="p-2 rounded-xl bg-white shadow-sm hover:shadow-md transition-all duration-200"
              >
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div>
                <h1 className="text-3xl font-bold flex items-center">
                  <Sparkles className="w-8 h-8 text-indigo-300 mr-3" />
                  Create {isLesson ? 'Lesson' : 'Exercise'}
                </h1>
                <p className="mt-1">Share your knowledge with the community</p>
              </div>
            </div>
            
            {/* Progress indicator */}
            <div className="hidden sm:flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm">Progress</p>
                <p className="text-2xl font-bold text-indigo-300">{calculateProgress()}%</p>
              </div>
              <div className="w-32 h-32">
                <svg className="transform -rotate-90 w-32 h-32">
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    stroke="currentColor"
                    strokeWidth="12"
                    fill="none"
                    className="text-gray-200"
                  />
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    stroke="currentColor"
                    strokeWidth="12"
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 56}`}
                    strokeDashoffset={`${2 * Math.PI * 56 * (1 - calculateProgress() / 100)}`}
                    className="text-indigo-600 transition-all duration-500"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
            </div>
          </div>

          {/* Modern Step Indicator */}
          <div className="bg-white rounded-2xl shadow-sm p-1 flex space-x-1">
            {steps.map((step, index) => (
              <button
                key={step.id}
                onClick={() => step.id <= currentStep ? setCurrentStep(step.id) : null}
                disabled={step.id > currentStep}
                className={`
                  flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-xl transition-all duration-200
                  ${currentStep === step.id 
                    ? 'bg-indigo-600 text-white shadow-md' 
                    : currentStep > step.id
                    ? 'bg-indigo-100 text-indigo-700 cursor-pointer hover:bg-indigo-200'
                    : 'bg-gray-50 text-gray-400 cursor-not-allowed'
                  }
                `}
              >
                <div className="flex items-center">
                  {currentStep > step.id ? <Check className="w-5 h-5" /> : step.icon}
                  <span className="ml-2 font-medium">{step.title}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-start animate-shake">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <p className="text-red-800 font-medium">Error</p>
              <p className="text-red-600 text-sm mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="p-6 sm:p-8">
            {/* Step 1: Basic Information */}
            {currentStep === 1 && (
                <div className="space-y-6 animate-fadeIn">
                  {/* Title Section */}
                  <SectionFrame 
                    title={isLesson ? 'Lesson Title' : 'Exercise Title'} 
                    icon={<FileText className="w-5 h-5" />} 
                    required
                  >
                    <div className="relative">
                      <input
                        autoFocus
                        type="text"
                        className="w-full px-4 py-3 text-lg bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                        placeholder={isLesson ? "e.g., Introduction to Algebra" : "e.g., Solve the quadratic equation"}
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                      />
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <span className={`text-sm ${title.length > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                          {title.length}/100
                        </span>
                      </div>
                    </div>
                  </SectionFrame>

                  {/* Class Levels and Subject in two columns */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <SectionFrame 
                      title="Class Levels" 
                      icon={<GraduationCap className="w-5 h-5" />} 
                      required
                    >
                      <div className="grid grid-cols-2 gap-3">
                        {classLevels.map((level) => (
                          <SelectionCard
                            key={level.id}
                            item={level}
                            isSelected={selectedClassLevels.includes(level.id)}
                            onClick={() => toggleSelection(level.id, selectedClassLevels, setSelectedClassLevels)}
                            icon={<GraduationCap className="w-4 h-4" />}
                          />
                        ))}
                      </div>
                    </SectionFrame>

                    <SectionFrame 
                      title="Subject" 
                      icon={<BookOpen className="w-5 h-5" />} 
                      required
                    >
                      <div className="grid grid-cols-2 gap-3">
                        {subjects.length > 0 ? (
                          subjects.map((subject) => (
                            <SelectionCard
                              key={subject.id}
                              item={subject}
                              isSelected={selectedSubject === subject.id}
                              onClick={() => handleSubjectSelection(subject.id)}
                              icon={<BookOpen className="w-4 h-4" />}
                              color="purple"
                            />
                          ))
                        ) : (
                          <p className="col-span-2 text-center py-8 text-gray-500">
                            Select a class level first
                          </p>
                        )}
                      </div>
                    </SectionFrame>
                  </div>

                  {/* Subfields Section */}
                  <SectionFrame 
                    title="Subfields" 
                    icon={<Layers className="w-5 h-5" />} 
                    required
                  >
                    <div className="mb-3">
                      {subfields.length > 5 && (
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input
                            autoFocus
                            autoComplete='on'
                            type="text"
                            placeholder="Search subfields..."
                            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            value={searchTerms.subfields}
                            onChange={(e) => setSearchTerms(prev => ({ ...prev, subfields: e.target.value }))}
                          />
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-64 overflow-y-auto pr-2">
                      {isLoadingSubfields ? (
                        <div className="col-span-full flex justify-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                        </div>
                      ) : filterItems(subfields, searchTerms.subfields).length > 0 ? (
                        filterItems(subfields, searchTerms.subfields).map((subfield) => (
                          <SelectionCard
                            key={subfield.id}
                            item={subfield}
                            isSelected={selectedSubfields.includes(subfield.id)}
                            onClick={() => toggleSelection(subfield.id, selectedSubfields, setSelectedSubfields)}
                            icon={<Layers className="w-4 h-4" />}
                            color="blue"
                          />
                        ))
                      ) : (
                        <p className="col-span-full text-center py-8 text-gray-500">
                          {searchTerms.subfields ? 'No subfields found' : 'Select a subject first'}
                        </p>
                      )}
                    </div>
                  </SectionFrame>

                  {/* Chapters Section */}
                  <SectionFrame 
                    title="Chapters" 
                    icon={<Tag className="w-5 h-5" />} 
                    required
                  >
                    <div className="mb-3">
                      {chapters.length > 5 && (
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input
                            autoFocus
                            type="text"
                            placeholder="Search chapters..."
                            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            value={searchTerms.chapters}
                            onChange={(e) => setSearchTerms(prev => ({ ...prev, chapters: e.target.value }))}
                          />
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-64 overflow-y-auto pr-2">
                      {isLoadingChapters ? (
                        <div className="col-span-full flex justify-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                        </div>
                      ) : filterItems(chapters, searchTerms.chapters).length > 0 ? (
                        filterItems(chapters, searchTerms.chapters).map((chapter) => (
                          <SelectionCard
                            key={chapter.id}
                            item={chapter}
                            isSelected={selectedChapters.includes(chapter.id)}
                            onClick={() => toggleSelection(chapter.id, selectedChapters, setSelectedChapters)}
                            icon={<Tag className="w-4 h-4" />}
                            color="green"
                          />
                        ))
                      ) : (
                        <p className="col-span-full text-center py-8 text-gray-500">
                          {searchTerms.chapters ? 'No chapters found' : 'Select subfields first'}
                        </p>
                      )}
                    </div>
                  </SectionFrame>

                  {/* Theorems and Difficulty */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Theorems Section */}
                    <SectionFrame 
                      title="Theorems" 
                      icon={<BookMarked className="w-5 h-5" />}
                    >
                      <div className="grid grid-cols-1 gap-3 max-h-48 overflow-y-auto pr-2">
                        {isLoadingTheorems ? (
                          <div className="flex justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                          </div>
                        ) : theorems.length > 0 ? (
                          theorems.map((theorem) => (
                            <SelectionCard
                              key={theorem.id}
                              item={theorem}
                              isSelected={selectedTheorems.includes(theorem.id)}
                              onClick={() => toggleSelection(theorem.id, selectedTheorems, setSelectedTheorems)}
                              icon={<BookMarked className="w-4 h-4" />}
                              color="amber"
                            />
                          ))
                        ) : (
                          <p className="text-center py-8 text-gray-500">
                            {chapters.length > 0 ? 'No theorems available' : 'Select chapters first'}
                          </p>
                        )}
                      </div>
                    </SectionFrame>

                    {/* Difficulty Section (only for exercises) */}
                    {!isLesson && (
                      <SectionFrame 
                        title="Difficulty Level" 
                        icon={<Target className="w-5 h-5" />} 
                        required
                      >
                        <div className="space-y-3">
                          {['easy', 'medium', 'hard'].map((level) => {
                            const info = getDifficultyInfo(level);
                            return (
                              <button
                                key={level}
                                type="button"
                                onClick={() => setDifficulty(level as Difficulty)}
                                className={`
                                  w-full p-4 rounded-xl border-2 transition-all duration-200
                                  ${difficulty === level
                                    ? `border-transparent bg-gradient-to-r ${info.color} text-white shadow-lg scale-[0.98]`
                                    : `border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm`
                                  }
                                `}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-3">
                                    <span className="text-2xl">{info.icon}</span>
                                    <div className="text-left">
                                      <p className={`font-semibold ${difficulty === level ? 'text-white' : 'text-gray-900'}`}>
                                        {info.label}
                                      </p>
                                      <p className={`text-sm ${difficulty === level ? 'text-white/80' : 'text-gray-500'}`}>
                                        {info.description}
                                      </p>
                                    </div>
                                  </div>
                                  {difficulty === level && (
                                    <Check className="w-5 h-5 text-white" />
                                  )}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </SectionFrame>
                    )}
                  </div>
                </div>
              )}

            {/* Step 2: Content Writing */}
            {currentStep === 2 && (
              <div className="space-y-6 animate-fadeIn">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <label className="block text-lg font-semibold text-gray-900 flex items-center">
                      <FileEdit className="w-5 h-5 text-indigo-600 mr-2" />
                      {isLesson ? 'Lesson Content' : 'Exercise Statement'}
                      <span className="text-red-500 ml-1">*</span>
                    </label>
                    <div className="flex items-center space-x-2">
                      <Wand2 className="w-4 h-4 text-purple-600" />
                      <span className="text-sm text-gray-600">LaTeX supported</span>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-1">
                    <DualPaneEditor content={content} setContent={setContent} />
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Solution Writing - Only for exercises */}
            {currentStep === 3 && !isLesson && (
              <div className="space-y-6 animate-fadeIn">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <label className="block text-lg font-semibold text-gray-900 flex items-center">
                      <Lightbulb className="w-5 h-5 text-indigo-600 mr-2" />
                      Solution
                      <span className="text-red-500 ml-1">*</span>
                    </label>
                    <div className="flex items-center space-x-2">
                      <Wand2 className="w-4 h-4 text-purple-600" />
                      <span className="text-sm text-gray-600">LaTeX supported</span>
                    </div>
                  </div>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-4">
                    <p className="text-sm text-yellow-800">
                      💡 <strong>Tip:</strong> A detailed solution helps students verify their work and understand the problem-solving process.
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-1">
                    <DualPaneEditor content={solution} setContent={setSolution} />
                  </div>
                </div>
              </div>
            )}

            {/* Step 4/3: Preview and Submit */}
            {((isLesson && currentStep === 3) || (!isLesson && currentStep === 4)) && (
              <div className="space-y-6 animate-fadeIn">
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Almost there! 🎉</h2>
                  <p className="text-gray-600">Review your {isLesson ? 'lesson' : 'exercise'} before publishing</p>
                </div>

                {/* Preview Toggle */}
                <div className="flex justify-center mb-6">
                  <button
                    onClick={() => setShowPreview(!showPreview)}
                    className="flex items-center space-x-2 px-6 py-3 bg-indigo-100 text-indigo-700 rounded-xl hover:bg-indigo-200 transition-colors duration-200"
                  >
                    <Eye className="w-5 h-5" />
                    <span>{showPreview ? 'Hide' : 'Show'} Preview</span>
                  </button>
                </div>

                {/* Content Preview */}
                {showPreview && (
                  <div className="bg-gray-50 rounded-xl p-6">
                    <ContentPreview
                      title={title}
                      selectedClassLevels={classLevels.filter(level => selectedClassLevels.includes(level.id))}
                      selectedSubject={subjects.find(subject => subject.id === selectedSubject) || {} as SubjectModel}
                      selectedSubfields={subfields.filter(subfield => selectedSubfields.includes(subfield.id))}
                      selectedChapters={chapters.filter(chapter => selectedChapters.includes(chapter.id))}
                      selectedTheorems={theorems.filter(theorem => selectedTheorems.includes(theorem.id))}
                      difficulty={isLesson ? undefined : difficulty}
                      content={content}
                      solution={isLesson ? undefined : solution}
                    />
                  </div>
                )}

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <FileText className="w-5 h-5 text-indigo-600" />
                      <Check className="w-4 h-4 text-green-600" />
                    </div>
                    <h3 className="font-semibold text-gray-900">Title</h3>
                    <p className="text-sm text-gray-600 mt-1 truncate">{title}</p>
                  </div>

                  <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <BookOpen className="w-5 h-5 text-purple-600" />
                      <Check className="w-4 h-4 text-green-600" />
                    </div>
                    <h3 className="font-semibold text-gray-900">Subject</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {subjects.find(s => s.id === selectedSubject)?.name || 'Not selected'}
                    </p>
                  </div>

                  <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <Tag className="w-5 h-5 text-green-600" />
                      <Check className="w-4 h-4 text-green-600" />
                    </div>
                    <h3 className="font-semibold text-gray-900">Chapters</h3>
                    <p className="text-sm text-gray-600 mt-1">{selectedChapters.length} selected</p>
                  </div>

                  {!isLesson && (
                    <div className="bg-white rounded-xl border border-gray-200 p-4">
                      <div className="flex items-center justify-between mb-2">
                        <Target className="w-5 h-5 text-amber-600" />
                        <Check className="w-4 h-4 text-green-600" />
                      </div>
                      <h3 className="font-semibold text-gray-900">Difficulty</h3>
                      <p className="text-sm text-gray-600 mt-1 flex items-center">
                        <span className="mr-2">{getDifficultyInfo(difficulty).icon}</span>
                        {getDifficultyInfo(difficulty).label}
                      </p>
                    </div>
                  )}

                  <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <FileEdit className="w-5 h-5 text-blue-600" />
                      <Check className="w-4 h-4 text-green-600" />
                    </div>
                    <h3 className="font-semibold text-gray-900">Content</h3>
                    <p className="text-sm text-gray-600 mt-1">{content.length} characters</p>
                  </div>

                  {!isLesson && (
                    <div className="bg-white rounded-xl border border-gray-200 p-4">
                      <div className="flex items-center justify-between mb-2">
                        <Lightbulb className="w-5 h-5 text-yellow-600" />
                        {solution ? (
                          <Check className="w-4 h-4 text-green-600" />
                        ) : (
                          <X className="w-4 h-4 text-red-600" />
                        )}
                      </div>
                      <h3 className="font-semibold text-gray-900">Solution</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {solution ? `${solution.length} characters` : 'Not provided'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Enhanced Navigation Footer */}
          <div className="bg-gray-50 px-6 py-4 sm:px-8 border-t border-gray-200">
            <div className="flex items-center justify-between">
              {/* Left side - Back button */}
              <div>
                {currentStep > 1 ? (
                  <button
                    type="button"
                    onClick={prevStep}
                    className="flex items-center space-x-2 px-5 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors duration-200"
                  >
                    <ChevronLeft className="w-5 h-5" />
                    <span>Previous</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="flex items-center space-x-2 px-5 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors duration-200"
                  >
                    <X className="w-5 h-5" />
                    <span>Cancel</span>
                  </button>
                )}
              </div>

              {/* Center - Step indicator for mobile */}
              <div className="flex sm:hidden items-center space-x-2">
                {steps.map((step, index) => (
                  <div
                    key={step.id}
                    className={`w-2 h-2 rounded-full transition-all duration-200 ${
                      currentStep === step.id
                        ? 'w-8 bg-indigo-600'
                        : currentStep > step.id
                        ? 'bg-indigo-400'
                        : 'bg-gray-300'
                    }`}
                  />
                ))}
              </div>

              {/* Right side - Next/Submit button */}
              <div>
                {((isLesson && currentStep < 3) || (!isLesson && currentStep < 4)) ? (
                  <button
                    type="button"
                    onClick={nextStep}
                    className="flex items-center space-x-2 px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 shadow-md hover:shadow-lg"
                  >
                    <span>Next</span>
                    <ChevronRight className="w-5 h-5" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={isLoading}
                    className={`
                      flex items-center space-x-2 px-6 py-2.5 rounded-xl transition-all duration-200 shadow-md
                      ${isLoading
                        ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                        : 'bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700 hover:shadow-lg'
                      }
                    `}
                  >
                    {isLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        <span>Publishing...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-5 h-5" />
                        <span>Publish {isLesson ? 'Lesson' : 'Exercise'}</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContentEditor;