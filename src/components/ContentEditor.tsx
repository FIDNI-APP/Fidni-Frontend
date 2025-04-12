import React, { useState, useEffect } from 'react';
import { getClassLevels, getSubjects, getChapters, getSubfields, getTheorems } from '@/lib/api';
import { ClassLevelModel, SubjectModel, ChapterModel, Difficulty, Subfield, Theorem } from '@/types';
import { useNavigate } from 'react-router-dom';
import DualPaneEditor from './editor/DualPaneEditor';
import ContentPreview from './ContentPreview';
import { 
  BookOpen, 
  GraduationCap, 
  BarChart3, 
  FileText, 
  Lightbulb, 
  ChevronRight, 
  ChevronLeft,
  Info,
  FileEdit,
  Tag,
  CheckCircle,
  Layout,
  Check,
  Menu,
  BookMarked,
  Layers
} from 'lucide-react';

interface ContentEditorProps {
  onSubmit: (data: any) => void;
  isLesson?: boolean; // New prop to indicate if this is for a lesson
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
  isLesson = false, // Default to false for backward compatibility
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
  const [currentStep, setCurrentStep] = useState(1); // Step management
  const [showStepDetails, setShowStepDetails] = useState(true);
  const [showStepMenu, setShowStepMenu] = useState(false);

  // Loading states
  const [isLoadingSubfields, setIsLoadingSubfields] = useState(false);
  const [isLoadingChapters, setIsLoadingChapters] = useState(false);
  const [isLoadingTheorems, setIsLoadingTheorems] = useState(false);

  // Responsive handling - hide step details on small screens
  useEffect(() => {
    const handleResize = () => {
      setShowStepDetails(window.innerWidth >= 640);
    };
    
    // Set initial value
    handleResize();
    
    // Add event listener
    window.addEventListener('resize', handleResize);
    
    // Clean up
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Define steps based on content type (exercise or lesson)
  const steps = isLesson 
    ? [
        { id: 1, title: "Information", description: "Basic details", icon: <Info className="w-5 h-5" /> },
        { id: 2, title: "Content", description: "Lesson content", icon: <FileEdit className="w-5 h-5" /> },
        { id: 3, title: "Publication", description: "Final review", icon: <CheckCircle className="w-5 h-5" /> }
      ]
    : [
        { id: 1, title: "Information", description: "Basic details", icon: <Info className="w-5 h-5" /> },
        { id: 2, title: "Content", description: "Exercise", icon: <FileEdit className="w-5 h-5" /> },
        { id: 3, title: "Solution", description: "Detailed solution", icon: <Lightbulb className="w-5 h-5" /> },
        { id: 4, title: "Publication", description: "Final review", icon: <CheckCircle className="w-5 h-5" /> }
      ];

  // Load class levels, subjects, subfields, chapters, and theorems
  useEffect(() => {
    loadClassLevels();
  }, []);

  useEffect(() => {
    loadSubjects();
    // Clear subject and dependencies when class level changes
    setSelectedSubject('');
    setSelectedSubfields([]);
    setSelectedChapters([]);
    setSelectedTheorems([]);
  }, [selectedClassLevels]);

  useEffect(() => {
    loadSubfields();
    // Clear subfields and dependencies when subject changes
    setSelectedSubfields([]);
    setSelectedChapters([]);
    setSelectedTheorems([]);
  }, [selectedSubject, selectedClassLevels]);

  useEffect(() => {
    loadChapters();
    // Clear chapters and theorems when subfields change
    setSelectedChapters([]);
    setSelectedTheorems([]);
  }, [selectedSubfields]);

  useEffect(() => {
    loadTheorems();
    // Clear theorems when chapters change
    setSelectedTheorems([]);
  }, [selectedChapters]);

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
      console.log("Subjects data:", data);
      const uniqueSubjects = getUniqueById(data);
      setSubjects(uniqueSubjects);
    } catch (error) {
      console.error('Failed to load subjects:', error);
    }
  };

  const loadSubfields = async () => {
    // Skip if necessary conditions aren't met
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
      setError('Please select class levels, a subject, at least one subfield, and at least one chapter.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (!title.trim() || !content.trim()) {
      setError('Title and content are required.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // For exercises, ensure solution is filled unless we're creating a lesson
    if (!isLesson && currentStep >= 3 && !solution.trim()) {
      setError('Solution is required for exercises.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Create the submission data based on whether this is a lesson or exercise
      const submissionData = {
        title,
        content,
        class_levels: selectedClassLevels,
        subject: selectedSubject,
        subfields: selectedSubfields,
        chapters: selectedChapters,
        theorems: selectedTheorems,
        // Only include these fields for exercises
        ...(isLesson ? {} : {
          difficulty,
          solution_content: solution,
        })
      };
      
      await onSubmit(submissionData);
      console.log('Content submitted successfully');
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
    if (currentStep === 1 && (!title || !selectedClassLevels.length || !selectedSubject || !selectedSubfields.length || !selectedChapters.length)) {
      setError('Please fill in all required fields before continuing.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (currentStep === 2 && !content.trim()) {
      setError('Content is required before continuing.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setError(null);
    setCurrentStep(prev => prev + 1);
    setShowStepMenu(false);
    // Scroll to top when changing steps
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const prevStep = () => {
    setCurrentStep(prev => prev - 1);
    setShowStepMenu(false);
    // Scroll to top when changing steps
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const jumpToStep = (step: number) => {
    setCurrentStep(step);
    setShowStepMenu(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getDifficultyColor = (level: string): string => {
    switch (level) {
      case 'easy':
        return 'from-emerald-600 to-green-600';
      case 'medium':
        return 'from-amber-600 to-yellow-600';
      case 'hard':
        return 'from-red-600 to-pink-600';
      default:
        return 'from-gray-600 to-gray-500';
    }
  };

  const getDifficultyLabel = (level: string): string => {
    switch (level) {
      case 'easy':
        return 'Easy';
      case 'medium':
        return 'Medium';
      case 'hard':
        return 'Difficult';
      default:
        return level;
    }
  };

  const getDifficultyIcon = (level: string) => {
    switch (level) {
      case 'easy':
        return <BarChart3 className="w-4 h-4" />;
      case 'medium':
        return (
          <div className="flex">
            <BarChart3 className="w-4 h-4" />
          </div>
        );
      case 'hard':
        return (
          <div className="flex">
            <BarChart3 className="w-4 h-4" />
          </div>
        );
      default:
        return <BarChart3 className="w-4 h-4" />;
    }
  };

  // Render a selection button with consistent styling
  const renderSelectionButton = (item: { id: string, name: string }, isSelected: boolean, onClick: () => void) => (
    <div key={item.id} className="min-w-fit">
      <button
        type="button"
        className={`min-h-[34px] px-3 py-1.5 text-sm rounded-full transition-all ${
          isSelected
            ? "bg-indigo-600 text-white"
            : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-100"
        }`}
        onClick={onClick}
      >
        {item.name}
      </button>
    </div>
  );

  // Render loading or empty state message
  const renderEmptyStateMessage = (message: string, isLoading: boolean = false) => (
    <p className="text-xs sm:text-sm text-gray-500 italic">
      {isLoading ? "Loading..." : message}
    </p>
  );

  return (
    <div className="w-full max-w-6xl mx-auto pt-4 sm:pt-8 lg:pt-16 pb-6 sm:pb-10 px-3 sm:px-4">
      <div className="bg-white rounded-xl shadow-md overflow-hidden mb-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-700 to-purple-700 px-4 sm:px-6 py-3 sm:py-4 text-white">
          <h1 className="text-xl sm:text-2xl font-bold">
            {isLesson ? 'Create a Lesson' : 'Create an Exercise'}
          </h1>
          <p className="text-indigo-100 text-sm">Share your knowledge with the community</p>
        </div>

        {/* Mobile Step Indicator */}
        <div className="sm:hidden p-3 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                currentStep === 1 ? 'bg-indigo-600 text-white' : 
                currentStep > 1 ? 'bg-indigo-500 text-white' : 
                'bg-gray-200 text-gray-500'
              }`}>
                {steps[currentStep - 1].icon}
              </div>
              <div>
                <p className="font-medium text-sm">{steps[currentStep - 1].title}</p>
                <p className="text-xs text-gray-500">{steps[currentStep - 1].description}</p>
              </div>
            </div>
            
            <button 
              onClick={() => setShowStepMenu(!showStepMenu)}
              className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
              aria-label="Steps menu"
              title="Steps menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
          
          {/* Mobile Step Menu */}
          {showStepMenu && (
            <div className="mt-3 bg-white rounded-lg shadow-lg border border-gray-200">
              {steps.map((step) => (
                <button
                  key={step.id}
                  className={`w-full flex items-center space-x-3 p-3 text-left ${
                    currentStep === step.id ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700'
                  } ${currentStep > step.id ? 'opacity-100' : (step.id > (currentStep + 1) ? 'opacity-50' : 'opacity-100')}`}
                  onClick={() => step.id <= (currentStep + 1) ? jumpToStep(step.id) : null}
                  disabled={step.id > (currentStep + 1)}
                >
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center ${
                    currentStep === step.id ? 'bg-indigo-600 text-white' : 
                    currentStep > step.id ? 'bg-indigo-500 text-white' : 
                    'bg-gray-200 text-gray-500'
                  }`}>
                    {currentStep > step.id ? <Check className="w-4 h-4" /> : step.icon}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{step.title}</p>
                    <p className="text-xs text-gray-500">{step.description}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Desktop Progress Steps */}
        <div className="hidden sm:block px-3 sm:px-6 py-3 sm:py-4 border-b border-gray-200 overflow-x-auto">
          <div className="flex justify-between min-w-max sm:min-w-0">
            {steps.map((step, index) => (
              <div key={step.id} className="relative flex-1 px-1 sm:px-0">
                {/* Connector line */}
                {index > 0 && (
                  <div 
                    className={`absolute left-0 right-0 top-1/2 h-1 -translate-y-1/2 ${
                      currentStep > index ? 'bg-indigo-500' : 'bg-gray-200'
                    }`} 
                    style={{ left: '-50%', right: '50%' }}
                  ></div>
                )}
                {/* Step circle */}
                <div className="flex flex-col items-center">
                  <button 
                    onClick={() => step.id <= (currentStep + 1) ? jumpToStep(step.id) : null}
                    disabled={step.id > (currentStep + 1)}
                    className={`flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full mb-1 sm:mb-2 transition-colors ${
                      currentStep === step.id 
                        ? 'bg-indigo-600 text-white' 
                        : currentStep > step.id 
                        ? 'bg-indigo-500 text-white' 
                        : 'bg-gray-200 text-gray-500'
                    } ${step.id > (currentStep + 1) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    {currentStep > step.id ? <Check className="w-4 h-4 sm:w-5 sm:h-5" /> : step.icon}
                  </button>
                  {showStepDetails && (
                    <div className="text-center">
                      <p className={`font-medium text-xs sm:text-sm ${currentStep === step.id ? 'text-indigo-700' : 'text-gray-700'}`}>
                        {step.title}
                      </p>
                      <p className="text-xs text-gray-500">{step.description}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mx-3 sm:mx-6 my-3 sm:my-4 bg-red-50 border-l-4 border-red-500 p-3 sm:p-4 text-red-700 text-sm">
            <p>{error}</p>
          </div>
        )}

        {/* Form Content */}
        <div className="p-3 sm:p-6">
          {/* Step 1: Basic Information */}
          {currentStep === 1 && (
            <div className="space-y-4 sm:space-y-6">
              {/* Title Input */}
              <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
                <label className="block text-gray-800 text-base sm:text-lg font-medium mb-2 flex items-center">
                  <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600 mr-2" />
                  {isLesson ? 'Lesson Title' : 'Exercise Title'}
                </label>
                <input
                  type="text"
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 text-gray-800 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                  placeholder={isLesson ? "Enter the lesson title" : "Enter the exercise title"}
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                />
              </div>

              {/* Class Levels and Subjects */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                {/* Class Levels Section */}
                <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
                  <label className="block text-gray-800 text-base sm:text-lg font-medium mb-2 flex items-center">
                    <GraduationCap className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600 mr-2" />
                    Class Levels
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {classLevels.map((level) => 
                      renderSelectionButton(
                        level, 
                        selectedClassLevels.includes(level.id), 
                        () => toggleSelection(level.id, selectedClassLevels, setSelectedClassLevels)
                      )
                    )}
                  </div>
                </div>

                {/* Subjects Section */}
                <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
                  <label className="block text-gray-800 text-base sm:text-lg font-medium mb-2 flex items-center">
                    <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600 mr-2" />
                    Subject
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {subjects.map((subject) => 
                      renderSelectionButton(
                        subject, 
                        selectedSubject === subject.id, 
                        () => handleSubjectSelection(subject.id)
                      )
                    )}
                    {subjects.length === 0 && 
                      renderEmptyStateMessage("Please select a class level first")
                    }
                  </div>
                </div>
              </div>

              {/* Subfields and Chapters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                {/* Subfields Section */}
                <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
                  <label className="block text-gray-800 text-base sm:text-lg font-medium mb-2 flex items-center">
                    <Layers className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600 mr-2" />
                    Subfields
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {subfields.map((subfield) => 
                      renderSelectionButton(
                        subfield, 
                        selectedSubfields.includes(subfield.id), 
                        () => toggleSelection(subfield.id, selectedSubfields, setSelectedSubfields)
                      )
                    )}
                    {isLoadingSubfields && renderEmptyStateMessage("Loading subfields...", true)}
                    {!isLoadingSubfields && subfields.length === 0 && 
                      renderEmptyStateMessage("Please select a subject and class level first")
                    }
                  </div>
                </div>

                {/* Chapters Section */}
                <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
                  <label className="block text-gray-800 text-base sm:text-lg font-medium mb-2 flex items-center">
                    <Tag className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600 mr-2" />
                    Chapters
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {chapters.map((chapter) => 
                      renderSelectionButton(
                        chapter, 
                        selectedChapters.includes(chapter.id), 
                        () => toggleSelection(chapter.id, selectedChapters, setSelectedChapters)
                      )
                    )}
                    {isLoadingChapters && renderEmptyStateMessage("Loading chapters...", true)}
                    {!isLoadingChapters && chapters.length === 0 && 
                      renderEmptyStateMessage("Please select a subfield first")
                    }
                  </div>
                </div>
              </div>

              {/* Theorems */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                {/* Theorems Section */}
                <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
                  <label className="block text-gray-800 text-base sm:text-lg font-medium mb-2 flex items-center">
                    <BookMarked className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600 mr-2" />
                    Theorems (Optional)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {theorems.map((theorem) => 
                      renderSelectionButton(
                        theorem, 
                        selectedTheorems.includes(theorem.id), 
                        () => toggleSelection(theorem.id, selectedTheorems, setSelectedTheorems)
                      )
                    )}
                    {isLoadingTheorems && renderEmptyStateMessage("Loading theorems...", true)}
                    {!isLoadingTheorems && theorems.length === 0 && chapters.length > 0 && 
                      renderEmptyStateMessage("No theorems available for this selection")
                    }
                    {!isLoadingTheorems && chapters.length === 0 && 
                      renderEmptyStateMessage("Please select a chapter first")
                    }
                  </div>
                </div>

                {/* Difficulty Section - Only show for exercises */}
                {!isLesson && (
                  <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
                    <label className="block text-gray-800 text-base sm:text-lg font-medium mb-2 flex items-center">
                      <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600 mr-2" />
                      Difficulty
                    </label>
                    <div className="space-y-2">
                      {['easy', 'medium', 'hard'].map((level) => (
                        <button
                          key={level}
                          type="button"
                          className={`w-full py-1.5 sm:py-2 px-3 sm:px-4 rounded-lg flex items-center justify-between transition-all ${
                            difficulty === level
                              ? `bg-gradient-to-r ${getDifficultyColor(level)} text-white`
                              : `bg-white text-gray-700 border border-gray-300 hover:bg-gray-100`
                          }`}
                          onClick={() => setDifficulty(level as Difficulty)}
                        >
                          <div className="flex items-center">
                            {getDifficultyIcon(level)}
                            <span className="ml-2 text-sm sm:text-base">{getDifficultyLabel(level)}</span>
                          </div>
                          {difficulty === level && <Check className="w-4 h-4" />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

         
          {/* Step 2: Content Writing */}
          {currentStep === 2 && (
            <div className="space-y-4 sm:space-y-6">
              <div className="bg-gray-50 p-3 sm:p-4 rounded-lg mb-3 sm:mb-4">
                <label className="block text-gray-800 text-base sm:text-lg font-medium mb-2 flex items-center">
                  <FileEdit className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600 mr-2" />
                  {isLesson ? 'Lesson Content (LaTeX supported)' : 'Exercise Content (LaTeX supported)'}
                </label>
                <p className="text-xs sm:text-sm text-gray-500 mb-2">
                  Use $...$ for inline equations and $...$ for mathematical formulas.
                </p>
                <DualPaneEditor content={content} setContent={setContent} />
              </div>
            </div>
          )}

          {/* Step 3: Solution Writing - Only for exercises */}
          {currentStep === 3 && !isLesson && (
            <div className="space-y-4 sm:space-y-6">
              <div className="bg-gray-50 p-3 sm:p-4 rounded-lg mb-3 sm:mb-4">
                <label className="block text-gray-800 text-base sm:text-lg font-medium mb-2 flex items-center">
                  <Lightbulb className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600 mr-2" />
                  Solution (LaTeX supported)
                </label>
                <p className="text-xs sm:text-sm text-gray-500 mb-2">
                  The solution is optional but highly recommended. It helps students verify their work.
                </p>
                <DualPaneEditor content={solution} setContent={setSolution} />
              </div>
            </div>
          )}

          {/* Step 4 for Exercises / Step 3 for Lessons: Preview and Submit */}
          {((isLesson && currentStep === 3) || (!isLesson && currentStep === 4)) && (
            <div className="space-y-4 sm:space-y-6">
              <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
                <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-3 sm:mb-4 flex items-center">
                  <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600 mr-2" />
                  Final Preview
                </h2>
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
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-6 sm:mt-8">
            {currentStep > 1 ? (
              <button
                type="button"
                onClick={prevStep}
                className="flex items-center px-3 sm:px-5 py-2 sm:py-2.5 bg-gray-200 text-gray-700 text-sm sm:text-base rounded-lg hover:bg-gray-300 transition-colors"
              >
                <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 mr-1" /> 
                Previous
              </button>
            ) : (
              <button
                type="button"
                onClick={handleCancel}
                className="flex items-center px-3 sm:px-5 py-2 sm:py-2.5 bg-gray-200 text-gray-700 text-sm sm:text-base rounded-lg hover:bg-gray-300 transition-colors"
              >
                <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 mr-1" /> 
                Cancel
              </button>
            )}

            {((isLesson && currentStep < 3) || (!isLesson && currentStep < 4)) ? (
              <button
                type="button"
                onClick={nextStep}
                className="flex items-center px-3 sm:px-5 py-2 sm:py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm sm:text-base rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-colors"
              >
                Next 
                <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 ml-1" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isLoading}
                className={`flex items-center px-3 sm:px-5 py-2 sm:py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm sm:text-base rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-colors ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isLoading ? 'Publishing...' : `Publish ${isLesson ? 'Lesson' : 'Exercise'}`}
                <Check className="w-4 h-4 sm:w-5 sm:h-5 ml-1" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContentEditor;