import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Plus, Search, X, Book, CornerDownRight, Layers, Bookmark } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import TipTapRenderer from '@/components/editor/TipTapRenderer';
import { Button } from '@/components/ui/button';
import { getClassLevels, getSubjects, getChapters, getLessons, saveExercise, unsaveExercise } from '@/lib/api';

// Available colors for the notebook
const notebookColors = [
  { bg: "bg-rose-100", text: "text-rose-900", border: "border-rose-300", accent: "#d4526e" },
  { bg: "bg-blue-100", text: "text-blue-900", border: "border-blue-300", accent: "#4a6fd6" },
  { bg: "bg-green-100", text: "text-green-900", border: "border-green-300", accent: "#3e9f6b" },
  { bg: "bg-yellow-100", text: "text-yellow-900", border: "border-yellow-300", accent: "#d4a72c" },
  { bg: "bg-purple-100", text: "text-purple-900", border: "border-purple-300", accent: "#9e67d4" }
];

export default function StudentNotebook() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // UI states
  const [notebookColor, setNotebookColor] = useState(notebookColors[0]);
  const [currentPage, setCurrentPage] = useState(0);
  const [showLessonLibrary, setShowLessonLibrary] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterChapter, setFilterChapter] = useState(null);
  const [userNotes, setUserNotes] = useState({});
  const [activeSubject, setActiveSubject] = useState(null);
  const [printMode, setPrintMode] = useState(false);
  
  // Data states
  const [classLevels, setClassLevels] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [allLessons, setAllLessons] = useState([]);
  const [savedLessons, setSavedLessons] = useState([]);
  const [activeLessonId, setActiveLessonId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load saved state from localStorage on component mount
  useEffect(() => {
    const savedState = localStorage.getItem('studentNotebook');
    if (savedState) {
      try {
        const state = JSON.parse(savedState);
        if (state.userNotes) setUserNotes(state.userNotes);
        if (state.notebookColor) setNotebookColor(state.notebookColor);
        if (state.activeSubject) setActiveSubject(state.activeSubject);
      } catch (e) {
        console.error('Error loading notebook state', e);
      }
    }
  }, []);

  // Save state to localStorage whenever relevant state changes
  useEffect(() => {
    const stateToSave = {
      userNotes,
      notebookColor,
      activeSubject
    };
    localStorage.setItem('studentNotebook', JSON.stringify(stateToSave));
  }, [userNotes, notebookColor, activeSubject]);

  // Load user class level, subjects, and chapters
  useEffect(() => {
    const loadUserData = async () => {
      if (!user) return;
      
      try {
        setIsLoading(true);
        
        // Step 1: Get user's class level
        const classLevelData = await getClassLevels();
        setClassLevels(classLevelData);
        
        // Find user's class level ID
        const userClassLevel = user.profile.class_level?.id;
        
        if (!userClassLevel) {
          setError("No class level set in your profile. Please update your profile settings.");
          setIsLoading(false);
          return;
        }
        
        // Step 2: Get subjects for this class level
        const subjectsData = await getSubjects([userClassLevel]);
        setSubjects(subjectsData);
        
        // Set active subject to first one if not already set
        if (!activeSubject && subjectsData.length > 0) {
          setActiveSubject(subjectsData[0].id);
        }
        
        // Step 3: Load chapters for active subject
        if (activeSubject || subjectsData.length > 0) {
          const subjectId = activeSubject || subjectsData[0].id;
          const chaptersData = await getChapters(subjectId, [userClassLevel], []);
          setChapters(chaptersData);
          
          // Step 4: Get all lessons for this subject and class level
          const lessonsData = await getLessons({
            classLevels: [userClassLevel],
            subjects: [subjectId]
          });
          setAllLessons(lessonsData.results || []);
          
          // Get saved lessons for the user
          // This would normally come from an API but we'll simulate with local storage for now
          const savedLessonsIds = JSON.parse(localStorage.getItem('savedLessons') || '[]');
          const savedLessonsData = lessonsData.results?.filter(lesson => 
            savedLessonsIds.includes(lesson.id)
          ) || [];
          setSavedLessons(savedLessonsData);
        }
      } catch (err) {
        console.error('Error loading user data:', err);
        setError('Failed to load notebook data. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadUserData();
  }, [user, activeSubject]);

  // Filter lessons based on search and chapter filter
  const filteredLessons = allLessons.filter(lesson => {
    const matchesSearch = !searchTerm || lesson.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesChapter = !filterChapter || lesson.chapters.some(ch => ch.id === filterChapter);
    return matchesSearch && matchesChapter;
  });

  // Get the active lesson content
  const getActiveLessonContent = () => {
    if (!activeLessonId) return null;
    
    const lesson = savedLessons.find(l => l.id === activeLessonId);
    if (!lesson) return null;
    
    return {
      id: lesson.id,
      title: lesson.title,
      content: lesson.content,
      chapterTitle: lesson.chapters.length > 0 ? lesson.chapters[0].name : 'Uncategorized'
    };
  };

  // Add a lesson to the notebook
  const addLessonToNotebook = async (lessonId) => {
    try {
      // In a real implementation, you would call an API endpoint
      // For now, we'll simulate with localStorage
      const currentSaved = JSON.parse(localStorage.getItem('savedLessons') || '[]');
      if (!currentSaved.includes(lessonId)) {
        const newSaved = [...currentSaved, lessonId];
        localStorage.setItem('savedLessons', JSON.stringify(newSaved));
        
        // Add the lesson to savedLessons
        const lessonToAdd = allLessons.find(l => l.id === lessonId);
        if (lessonToAdd) {
          setSavedLessons(prev => [...prev, lessonToAdd]);
        }
        
        // In a real app, call the API
        // await saveExercise(lessonId);
      }
      setShowLessonLibrary(false);
    } catch (err) {
      console.error('Error saving lesson:', err);
    }
  };

  // Remove a lesson from the notebook
  const removeLessonFromNotebook = async (lessonId) => {
    try {
      // Update local storage
      const currentSaved = JSON.parse(localStorage.getItem('savedLessons') || '[]');
      const newSaved = currentSaved.filter(id => id !== lessonId);
      localStorage.setItem('savedLessons', JSON.stringify(newSaved));
      
      // Update state
      setSavedLessons(prev => prev.filter(lesson => lesson.id !== lessonId));
      
      if (activeLessonId === lessonId) {
        setActiveLessonId(null);
        setCurrentPage(0);
      }
      
      // In a real app, call the API
      // await unsaveExercise(lessonId);
    } catch (err) {
      console.error('Error removing lesson:', err);
    }
  };

  // Save user notes for a lesson
  const saveNotes = (lessonId, notes) => {
    setUserNotes({
      ...userNotes,
      [lessonId]: notes
    });
  };

  // Get the total pages in the notebook
  const getTotalPages = () => {
    return savedLessons.length === 0 ? 1 : savedLessons.length;
  };

  // Navigate to the next page
  const nextPage = () => {
    const totalPages = getTotalPages();
    if (currentPage < totalPages - 1) {
      setCurrentPage(currentPage + 1);
      if (savedLessons.length > 0) {
        setActiveLessonId(savedLessons[currentPage + 1].id);
      }
    }
  };

  // Navigate to the previous page
  const prevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
      if (savedLessons.length > 0) {
        setActiveLessonId(savedLessons[currentPage - 1].id);
      }
    }
  };

  // Change the notebook color
  const changeNotebookColor = (color) => {
    setNotebookColor(color);
  };

  // Open a specific lesson
  const openLesson = (lessonId) => {
    const lessonIndex = savedLessons.findIndex(lesson => lesson.id === lessonId);
    if (lessonIndex !== -1) {
      setCurrentPage(lessonIndex);
      setActiveLessonId(lessonId);
    }
  };

  // Change subject
  const handleSubjectChange = (subjectId) => {
    setActiveSubject(subjectId);
    setActiveLessonId(null);
    setCurrentPage(0);
  };

  // Print the current lesson
  const handlePrint = () => {
    setPrintMode(true);
    setTimeout(() => {
      window.print();
      setPrintMode(false);
    }, 300);
  };

  const activeLessonContent = getActiveLessonContent();

  // Group saved lessons by chapter
  const lessonsByChapter = chapters.map(chapter => ({
    ...chapter,
    lessons: savedLessons.filter(lesson => 
      lesson.chapters.some(ch => ch.id === chapter.id)
    )
  }));

  // Handle lessons without chapters
  const uncategorizedLessons = savedLessons.filter(lesson => 
    !lesson.chapters || lesson.chapters.length === 0
  );

  if (uncategorizedLessons.length > 0) {
    lessonsByChapter.push({
      id: 'uncategorized',
      name: 'Uncategorized',
      lessons: uncategorizedLessons
    });
  }

  if (isLoading) {
    return (
      <div className="flex flex-col h-screen bg-gray-100 items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mb-4"></div>
        <p className="text-gray-600">Loading your notebook...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col h-screen bg-gray-100 items-center justify-center p-4">
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md max-w-lg">
          <p className="font-bold">Error</p>
          <p>{error}</p>
        </div>
        <Button 
          onClick={() => navigate('/profile')}
          className="mt-4 bg-indigo-600 hover:bg-indigo-700"
        >
          Return to Profile
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Print View - only shown during printing */}
      {printMode && activeLessonContent && (
        <div className="hidden print:block p-8">
          <h1 className="text-3xl font-bold mb-2">{activeLessonContent.title}</h1>
          <p className="text-gray-600 mb-6">{activeLessonContent.chapterTitle}</p>
          <div className="prose max-w-none">
            <TipTapRenderer content={activeLessonContent.content} />
          </div>
          {userNotes[activeLessonContent.id] && (
            <div className="mt-8 border-t pt-4">
              <h2 className="text-xl font-bold mb-4">My Notes</h2>
              <div className="whitespace-pre-wrap">{userNotes[activeLessonContent.id]}</div>
            </div>
          )}
        </div>
      )}

      {/* Notebook Header */}
      <div className="print:hidden bg-gray-800 text-white p-3 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <span className="text-lg font-semibold">Cahier de Cours</span>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex space-x-1">
            {notebookColors.map((color, index) => (
              <button
                key={index}
                className={`w-6 h-6 rounded-full ${color.bg} ${
                  notebookColor === color ? 'ring-2 ring-white' : ''
                }`}
                onClick={() => changeNotebookColor(color)}
              />
            ))}
          </div>
          <Button
            onClick={() => setShowLessonLibrary(true)}
            className="bg-white text-gray-800 px-3 py-1 rounded-md text-sm font-medium"
          >
            Ajouter un cours
          </Button>
        </div>
      </div>

      {/* Subject Tabs */}
      <div className="print:hidden bg-gray-700 text-white px-3 py-2 flex overflow-x-auto hide-scrollbar">
        {subjects.map(subject => (
          <button
            key={subject.id}
            className={`px-4 py-1.5 rounded-t-lg mr-2 transition-colors ${
              activeSubject === subject.id 
                ? 'bg-white text-gray-800 font-medium' 
                : 'bg-gray-600 hover:bg-gray-500'
            }`}
            onClick={() => handleSubjectChange(subject.id)}
          >
            {subject.name}
          </button>
        ))}
      </div>

      {/* Notebook Content */}
      <div className={`print:hidden flex-1 flex flex-col items-center justify-center ${notebookColor.bg} p-4`}>
        <div className="w-full max-w-5xl h-full flex flex-col bg-white shadow-lg rounded-lg overflow-hidden border-t-8" style={{ borderColor: notebookColor.accent }}>
          {/* Notebook Navigation */}
          <div className="flex justify-between items-center px-4 py-2 border-b">
            <button
              className="text-gray-600 hover:text-gray-900 disabled:text-gray-300"
              onClick={prevPage}
              disabled={currentPage === 0}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="text-sm text-gray-600">
              Page {currentPage + 1} sur {getTotalPages()}
            </div>
            <button
              className="text-gray-600 hover:text-gray-900 disabled:text-gray-300"
              onClick={nextPage}
              disabled={currentPage >= getTotalPages() - 1}
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Notebook Pages */}
          <div className="flex-1 overflow-y-auto">
            {savedLessons.length === 0 || !activeLessonId ? (
              // Table of contents
              <div className="h-full flex flex-col">
                {/* Notebook paper styling with lines */}
                <div 
                  className="flex-1 p-6 relative overflow-y-auto"
                  style={{
                    backgroundImage: 'linear-gradient(#e5e7eb 1px, transparent 1px)',
                    backgroundSize: '100% 28px',
                    backgroundPosition: '0 14px',
                    paddingTop: '28px'
                  }}
                >
                  <div className="text-center mb-8">
                    <h1 className={`text-xl font-bold ${notebookColor.text}`}>Table des Matières</h1>
                  </div>
                  
                  {lessonsByChapter.map((chapter) => (
                    <div key={chapter.id} className="mb-6">
                      <h2 className={`text-lg font-semibold mb-2 ${notebookColor.text}`}>
                        {chapter.name}
                      </h2>
                      
                      {/* List saved lessons for this chapter */}
                      <ul className="list-disc list-inside pl-4">
                        {chapter.lessons.map(lesson => (
                          <li key={lesson.id} className="mb-1 flex items-start group">
                            <button
                              className="text-blue-600 hover:underline text-left flex-grow"
                              onClick={() => openLesson(lesson.id)}
                            >
                              {lesson.title}
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                removeLessonFromNotebook(lesson.id);
                              }}
                              className="text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Remove from notebook"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </li>
                        ))}
                      </ul>
                      
                      {/* If no lessons saved for this chapter */}
                      {chapter.lessons.length === 0 && (
                        <p className="text-gray-500 text-sm italic pl-4">
                          Aucun cours enregistré
                        </p>
                      )}
                    </div>
                  ))}
                  
                  {/* Empty state prompt */}
                  {savedLessons.length === 0 && (
                    <div className="text-center mt-10">
                      <p className="text-gray-500 italic mb-4">
                        Votre cahier est vide. Ajoutez des cours pour commencer à prendre des notes.
                      </p>
                      <Button
                        onClick={() => setShowLessonLibrary(true)}
                        style={{ backgroundColor: notebookColor.accent }}
                        className="px-4 py-2 rounded-md text-white font-medium"
                      >
                        Parcourir les cours disponibles
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              // Lesson content page
              <div className="h-full flex flex-col">
                {/* Header with print button */}
                <div className={`p-4 ${notebookColor.bg} ${notebookColor.text} flex justify-between items-center`}>
                  <div>
                    <div className="font-bold text-lg">Titre du cours:</div>
                    <div className="text-xl">{activeLessonContent?.title}</div>
                    <div className="mt-1 text-sm">{activeLessonContent?.chapterTitle}</div>
                  </div>
                  <button
                    onClick={handlePrint}
                    className="bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-lg flex items-center"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                    Imprimer
                  </button>
                </div>
                
                {/* Lesson content */}
                <div 
                  className="flex-1 p-6 overflow-y-auto"
                  style={{
                    backgroundImage: 'linear-gradient(#e5e7eb 1px, transparent 1px)',
                    backgroundSize: '100% 28px',
                    backgroundPosition: '0 14px',
                    paddingTop: '28px'
                  }}
                >
                  <div className="prose max-w-none">
                    <TipTapRenderer content={activeLessonContent?.content} />
                  </div>
                  
                  {/* User notes area */}
                  <div className="mt-8 pt-8 border-t border-gray-200">
                    <div className="font-bold mb-2">Mes notes personnelles:</div>
                    <textarea
                      className="w-full min-h-32 p-2 border rounded"
                      style={{ 
                        backgroundImage: 'linear-gradient(#e5e7eb 1px, transparent 1px)',
                        backgroundSize: '100% 28px' 
                      }}
                      value={userNotes[activeLessonId] || ''}
                      onChange={(e) => saveNotes(activeLessonId, e.target.value)}
                      placeholder="Écrivez vos notes personnelles ici..."
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Lesson Library Modal */}
      {showLessonLibrary && (
        <div className="print:hidden fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="text-xl font-semibold">Bibliothèque de Cours</h2>
              <button
                className="text-gray-500 hover:bg-gray-100 p-1 rounded-full"
                onClick={() => setShowLessonLibrary(false)}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search and Filter */}
            <div className="p-4 border-b">
              <div className="flex space-x-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    placeholder="Rechercher des cours..."
                    className="w-full pl-10 pr-4 py-2 border rounded"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                </div>
                <select
                  className="border rounded px-3 py-2"
                  value={filterChapter || ''}
                  onChange={(e) => setFilterChapter(e.target.value ? Number(e.target.value) : null)}
                >
                  <option value="">Tous les chapitres</option>
                  {chapters.map(chapter => (
                    <option key={chapter.id} value={chapter.id}>{chapter.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Lesson List */}
            <div className="flex-1 overflow-y-auto p-4">
              {filteredLessons.length > 0 ? (
                <div className="space-y-3">
                  {filteredLessons.map(lesson => {
                    const firstChapter = lesson.chapters.length > 0 ? lesson.chapters[0] : null;
                    const isAlreadySaved = savedLessons.some(l => l.id === lesson.id);

                    return (
                      <div 
                        key={lesson.id} 
                        className={`border rounded p-3 ${isAlreadySaved ? 'bg-green-50 border-green-200' : 'hover:bg-gray-50'}`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="text-sm text-gray-500">{firstChapter?.name || 'Uncategorized'}</div>
                            <div className="font-medium">{lesson.title}</div>
                            <div className="mt-1 text-xs text-gray-500 flex items-center">
                              <Book className="w-3 h-3 mr-1" />
                              {lesson.author.username}
                            </div>
                          </div>
                          <button
                            className={`px-3 py-1 rounded text-sm ${
                              isAlreadySaved 
                                ? 'bg-green-100 text-green-800'
                                : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                            }`}
                            onClick={() => !isAlreadySaved && addLessonToNotebook(lesson.id)}
                            disabled={isAlreadySaved}
                          >
                            {isAlreadySaved ? 'Ajouté' : 'Ajouter'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-gray-400 mb-2">Aucun cours trouvé</div>
                  <div className="text-sm text-gray-500">Essayez d'ajuster votre recherche</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @media print {
          @page {
            size: A4;
            margin: 2cm;
          }
          
          body {
            font-family: 'Times New Roman', Times, serif !important;
          }
          
          .prose {
            font-size: 12pt;
            line-height: 1.5;
          }
          
          /* Enhanced LaTeX rendering in print */
          .katex-display {
            margin: 1.5em 0 !important;
            overflow: visible !important;
          }
        }
        
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}