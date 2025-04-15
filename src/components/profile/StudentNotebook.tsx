import React, { useState, useEffect, useRef } from 'react';
import { 
  Book, BookOpen, Plus, Trash2, Edit, Save, X, 
  ChevronLeft, Loader2, PenLine, Bookmark
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import TipTapRenderer from '@/components/editor/TipTapRenderer';
import api from '@/lib/api';
import { getClassLevels, getSubjects } from '@/lib/api';
import { toast } from 'react-toastify';
import { SubjectModel, ClassLevelModel, Notebook, Section } from '@/types';

const StudentNotebook = () => {
  // State
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [loading, setLoading] = useState(true);
  const [sectionsLoading, setSectionsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentNotebookId, setCurrentNotebookId] = useState<string | null>(null);
  const [currentSectionId, setCurrentSectionId] = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState(false);
  const [noteContent, setNoteContent] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showNotebooksList, setShowNotebooksList] = useState(true);
  const [currentNotebook, setCurrentNotebook] = useState<Notebook | null>(null);
  
  // Create notebook form state
  const [subjects, setSubjects] = useState<SubjectModel[]>([]);
  const [classLevels, setClassLevels] = useState<ClassLevelModel[]>([]);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedClassLevel, setSelectedClassLevel] = useState("");
  const [notebookTitle, setNotebookTitle] = useState("");
  const [notebookColor, setNotebookColor] = useState("blue");

  // References
  const contentRef = useRef<HTMLDivElement>(null);
  
  // Available notebook colors
  const notebookColors = [
    { name: "blue", bg: "bg-blue-50", accent: "bg-blue-600", text: "text-blue-800" },
    { name: "green", bg: "bg-green-50", accent: "bg-green-600", text: "text-green-800" },
    { name: "purple", bg: "bg-purple-50", accent: "bg-purple-600", text: "text-purple-800" },
    { name: "red", bg: "bg-red-50", accent: "bg-red-600", text: "text-red-800" },
    { name: "yellow", bg: "bg-yellow-50", accent: "bg-yellow-600", text: "text-yellow-800" },
  ];
  
  
  // Load notebooks on component mount
  useEffect(() => {
    loadNotebooks();
  }, []);

  // Load class levels for create form
  useEffect(() => {
    if (showCreateForm) {
      loadClassLevels();
    }
  }, [showCreateForm]);

  // Load subjects when class level is selected
  useEffect(() => {
    if (selectedClassLevel) {
      loadSubjects();
    }
  }, [selectedClassLevel]);

  // Scroll to top of content when changing sections
  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = 0;
    }
  }, [currentSectionId]);

  // Load detailed notebook data when selecting a notebook
  useEffect(() => {
    if (currentNotebookId) {
      loadNotebookDetails(currentNotebookId);
    }
  }, [currentNotebookId]);

  // Auto-generate notebook title when subject and class level are selected
  useEffect(() => {
    if (selectedSubject && selectedClassLevel && !notebookTitle) {
      const subjectName = subjects.find(s => s.id === selectedSubject)?.name || '';
      const levelName = classLevels.find(c => c.id === selectedClassLevel)?.name || '';
      
      if (subjectName && levelName) {
        setNotebookTitle(`${subjectName} - ${levelName}`);
      }
    }
  }, [selectedSubject, selectedClassLevel, subjects, classLevels, notebookTitle]);

  // Main data loading functions
  const loadNotebooks = async () => {
    try {
      setLoading(true);
      // Log to debug
      console.log('Loading notebooks...');
      const response = await api.get('/notebooks/get_notebooks/');
      console.log('Notebooks response:', response.data);
      setNotebooks(response.data);
    } catch (err) {
      console.error('Failed to load notebooks:', err);
      setError('Failed to load notebooks');
    } finally {
      setLoading(false);
    }
  };

  const loadNotebookDetails = async (notebookId: string) => {
    try {
      setSectionsLoading(true);
      console.log(`Loading detailed data for notebook ${notebookId}`);
      
      // Get detailed notebook data including sections
      const response = await api.get(`/notebooks/${notebookId}/`);
      console.log('Notebook details response:', response.data);
      
      // Update the current notebook with full details
      setCurrentNotebook(response.data);
      
      // Also update the notebook in the notebooks array
      setNotebooks(prev => 
        prev.map(notebook => 
          notebook.id === notebookId ? response.data : notebook
        )
      );
    } catch (err) {
      console.error('Error loading notebook details:', err);
      toast.error('Failed to load notebook details');
    } finally {
      setSectionsLoading(false);
    }
  };

  const loadClassLevels = async () => {
    try {
      const data = await getClassLevels();
      console.log('Class levels:', data);
      setClassLevels(data);
    } catch (err) {
      console.error('Error loading class levels:', err);
      toast.error('Failed to load class levels');
    }
  };

  const loadSubjects = async () => {
    try {
      const data = await getSubjects([selectedClassLevel]);
      console.log('Subjects:', data);
      setSubjects(data);
    } catch (err) {
      console.error('Error loading subjects:', err);
      toast.error('Failed to load subjects');
    }
  };

  // Event handlers
  const handleNotebookSelect = (notebookId: string) => {
    console.log('Selecting notebook:', notebookId);
    setCurrentNotebookId(notebookId);
    setCurrentSectionId(null); // Reset section when changing notebooks
    setShowNotebooksList(false);
  };

  const handleSectionSelect = async (sectionId: string) => {
    console.log('Selecting section:', sectionId);
    
    if (!currentNotebook) {
      console.error('No current notebook selected');
      return;
    }
    
    const section = currentNotebook.sections.find(s => s.id === sectionId);
    
    // Check if section has a lesson
    if (!section?.lesson) {
      console.log('Section has no lesson');
      return;
    }
  
    try {
      // Set current section immediately for UI feedback
      setCurrentSectionId(sectionId);
      
      // Optional: Fetch fresh section data
      console.log(`Fetching section data for section ${sectionId}`);
      const response = await api.get(`/sections/${sectionId}/`);
      console.log('Section data response:', response.data);
      
      if (response.data && response.data.lesson) {
        // Update the currentNotebook state with fresh section data
        setCurrentNotebook(prev => {
          if (!prev) return null;
          
          return {
            ...prev,
            sections: prev.sections.map(s => 
              s.id === sectionId 
                ? { ...s, lesson: response.data.lesson }
                : s
            )
          };
        });
        
        // Also update in the notebooks array
        setNotebooks(prev => prev.map(notebook => {
          if (notebook.id === currentNotebookId) {
            return {
              ...notebook,
              sections: notebook.sections.map(s => 
                s.id === sectionId 
                  ? { ...s, lesson: response.data.lesson }
                  : s
              )
            };
          }
          return notebook;
        }));
      }
    } catch (error) {
      console.error('Error fetching section data:', error);
      toast.error('Failed to load section content');
    }
  };

  const handleGoBackToNotebooks = () => {
    setShowNotebooksList(true);
    setCurrentNotebookId(null);
    setCurrentSectionId(null);
    setCurrentNotebook(null);
  };

  const handleStartEditNotes = (notes: string) => {
    setNoteContent(notes);
    setEditingNotes(true);
  };

  const handleSaveNotes = async () => {
    if (!currentNotebookId || !currentSectionId) return;
    
    try {
      await api.post(`/notebooks/${currentNotebookId}/update_section_notes/`, {
        section_id: currentSectionId,
        user_notes: noteContent
      });
      
      // Update local state in both places
      setCurrentNotebook(prev => {
        if (!prev) return null;
        
        return {
          ...prev,
          sections: prev.sections.map(section => 
            section.id === currentSectionId 
              ? { ...section, user_notes: noteContent } 
              : section
          )
        };
      });
      
      setNotebooks(prev => 
        prev.map(notebook => {
          if (notebook.id === currentNotebookId) {
            return {
              ...notebook,
              sections: notebook.sections.map(section => 
                section.id === currentSectionId 
                  ? { ...section, user_notes: noteContent } 
                  : section
              )
            };
          }
          return notebook;
        })
      );
      
      setEditingNotes(false);
      toast.success('Notes saved successfully');
    } catch (err) {
      console.error('Error saving notes:', err);
      toast.error('Failed to save notes');
    }
  };

  const handleCancelEditNotes = () => {
    setEditingNotes(false);
    setNoteContent("");
  };

  const handleCreateNotebook = async () => {
    if (!selectedSubject || !selectedClassLevel) {
      toast.info('Please select a subject and class level');
      return;
    }
    
    if (!notebookTitle) {
      toast.info('Please enter a title for your notebook');
      return;
    }
    
    try {
      setLoading(true);
      
      console.log('Creating notebook with:', {
        subject_id: selectedSubject,
        class_level_id: selectedClassLevel,
        title: notebookTitle
      });
      
      const response = await api.post('/notebooks/create_notebook/', {
        subject_id: selectedSubject,
        class_level_id: selectedClassLevel,
        title: notebookTitle
      });
      
      console.log('Notebook created:', response.data);
      
      setNotebooks(prev => [...prev, response.data]);
      setCurrentNotebookId(response.data.id);
      setCurrentNotebook(response.data);
      setShowNotebooksList(false);
      setShowCreateForm(false);
      
      // Reset form
      setSelectedSubject("");
      setSelectedClassLevel("");
      setNotebookTitle("");
      
      toast.success('Notebook created successfully');
    } catch (err) {
      console.error('Error creating notebook:', err);
      toast.error('Failed to create notebook');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveLesson = async (sectionId: string, event?: React.MouseEvent) => {
    if (event) {
      event.stopPropagation(); // Prevent triggering section selection
    }
    
    if (!window.confirm('Are you sure you want to remove this lesson?')) return;
    
    try {
      await api.post(`/sections/${sectionId}/remove_lesson/`);
      
      // Update local state in both places
      setCurrentNotebook(prev => {
        if (!prev) return null;
        
        return {
          ...prev,
          sections: prev.sections.map(section => 
            section.id === sectionId 
              ? { ...section, lesson: null } 
              : section
          )
        };
      });
      
      setNotebooks(prev => 
        prev.map(notebook => {
          if (notebook.id === currentNotebookId) {
            return {
              ...notebook,
              sections: notebook.sections.map(section => 
                section.id === sectionId 
                  ? { ...section, lesson: null } 
                  : section
              )
            };
          }
          return notebook;
        })
      );
      
      // If we just removed the active section, clear the selection
      if (currentSectionId === sectionId) {
        setCurrentSectionId(null);
      }
      
      toast.success('Lesson removed successfully');
    } catch (err) {
      console.error('Error removing lesson:', err);
      toast.error('Failed to remove lesson');
    }
  };

  const handleDeleteNotebook = async (notebookId: string, event?: React.MouseEvent) => {
    if (event) {
      event.stopPropagation(); // Prevent triggering notebook selection
    }
    
    if (!window.confirm('Are you sure you want to delete this notebook?')) return;
    
    try {
      await api.delete(`/notebooks/${notebookId}/`);
      
      // Update local state
      setNotebooks(prev => prev.filter(notebook => notebook.id !== notebookId));
      
      // If we just deleted the current notebook, go back to notebooks list
      if (currentNotebookId === notebookId) {
        setShowNotebooksList(true);
        setCurrentNotebookId(null);
        setCurrentNotebook(null);
      }
      
      toast.success('Notebook deleted successfully');
    } catch (err) {
      console.error('Error deleting notebook:', err);
      toast.error('Failed to delete notebook');
    }
  };

  // Helper functions
  const getCurrentNotebook = () => {
    return currentNotebook || notebooks.find(notebook => notebook.id === currentNotebookId);
  };

  const getCurrentSection = () => {
    const notebook = getCurrentNotebook();
    if (!notebook) return null;
    
    return notebook.sections.find(section => section.id === currentSectionId);
  };

  const getProgressPercentage = (notebook: Notebook) => {
    if (notebook.sections.length === 0) return 0;
    const lessonsCount = notebook.sections.filter(s => s.lesson).length;
    return Math.round((lessonsCount / notebook.sections.length) * 100);
  };

  // Render functions for different views
  const renderNotebooksList = () => {
    if (notebooks.length === 0) {
      return (
        <div className="text-center p-8">
          <BookOpen className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-800 mb-2">No notebooks yet</h3>
          <p className="text-gray-500 mb-6">Create your first notebook to get started</p>
          <Button 
            onClick={() => setShowCreateForm(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create First Notebook
          </Button>
        </div>
      );
    }

    return (
      <div>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900">My Notebooks</h2>
          <Button 
            onClick={() => setShowCreateForm(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Notebook
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {notebooks.map((notebook) => (
            <div 
              key={notebook.id}
              className="cursor-pointer group transform transition-all duration-300 hover:-translate-y-1"
              onClick={() => handleNotebookSelect(notebook.id)}
            >
              {/* Notebook cover design */}
              <div className="relative bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg rounded-lg overflow-hidden h-64 flex flex-col">
                {/* Spiral binding */}
                <div className="absolute left-0 top-0 bottom-0 w-6 flex flex-col justify-between py-4 items-center pointer-events-none">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div key={i} className="w-4 h-2 bg-white rounded-full opacity-80"></div>
                  ))}
                </div>
                
                {/* Cover content */}
                <div className="flex-1 p-6 pl-10">
                  <div className="flex justify-between">
                    <h3 className="font-bold text-white text-xl mb-2">{notebook.title}</h3>
                    <button
                      onClick={(e) => handleDeleteNotebook(notebook.id, e)}
                      className="text-white/70 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Delete notebook"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-blue-100 text-sm">{notebook.subject.name}</p>
                  <p className="text-blue-100 text-sm">{notebook.class_level.name}</p>
                  
                  <div className="mt-6 bg-blue-800/30 rounded-full h-2.5">
                    <div 
                      className="bg-yellow-300 h-2.5 rounded-full" 
                      style={{ width: `${getProgressPercentage(notebook)}%` }}
                    ></div>
                  </div>
                  
                  <div className="mt-2 flex justify-between text-xs text-blue-100">
                    <span>Progress</span>
                    <span>
                      {notebook.sections?.filter(s => s.lesson).length || 0} / {notebook.sections?.length || 0} lessons
                    </span>
                  </div>
                </div>
                
                {/* Label on the cover */}
                <div className="bg-white/90 p-3 text-center shadow-inner">
                  <p className="font-medium text-blue-800">{notebook.subject.name}</p>
                </div>
              </div>
            </div>
          ))}
          
          {/* New notebook button card */}
          <div
            className="cursor-pointer transform transition-all duration-300 hover:-translate-y-1"
            onClick={() => setShowCreateForm(true)}
          >
            <div className="border-2 border-dashed border-gray-300 rounded-lg h-64 flex flex-col items-center justify-center hover:border-indigo-500 transition-colors">
              <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
                <Plus className="w-8 h-8 text-indigo-600" />
              </div>
              <h3 className="font-medium text-gray-800 mb-1">Create New Notebook</h3>
              <p className="text-sm text-gray-500">Add a new subject notebook</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderCreateNotebookForm = () => {
    return (
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900">Create New Notebook</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowCreateForm(false)}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="space-y-6">
          <div>
            <label htmlFor="notebookTitle" className="block text-sm font-medium text-gray-700 mb-1">
              Notebook Title
            </label>
            <input
              type="text"
              id="notebookTitle"
              value={notebookTitle}
              onChange={(e) => setNotebookTitle(e.target.value)}
              className="w-full p-2.5 bg-gray-50 border border-gray-300 text-gray-900 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Enter a title for your notebook"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notebook Color</label>
            <div className="flex gap-2">
              {notebookColors.map(color => (
                <button 
                  key={color.name}
                  type="button"
                  className={`w-8 h-8 rounded-full ${color.accent} ${notebookColor === color.name ? 'ring-2 ring-offset-2 ring-gray-500' : ''}`}
                  onClick={() => setNotebookColor(color.name)}
                  title={color.name}
                />
              ))}
            </div>
          </div>
          
          <div>
            <label htmlFor="classLevel" className="block text-sm font-medium text-gray-700 mb-1">Class Level</label>
            <select
              id="classLevel"
              value={selectedClassLevel}
              onChange={(e) => setSelectedClassLevel(e.target.value)}
              className="w-full p-2.5 bg-gray-50 border border-gray-300 text-gray-900 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">Select a class level</option>
              {classLevels.map(level => (
                <option key={level.id} value={level.id}>{level.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
            <select
              id="subject"
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full p-2.5 bg-gray-50 border border-gray-300 text-gray-900 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
              disabled={!selectedClassLevel || subjects.length === 0}
            >
              <option value="">
                {!selectedClassLevel 
                  ? "Select a class level first" 
                  : subjects.length === 0 
                    ? "No subjects available for this level" 
                    : "Select a subject"}
              </option>
              {subjects.map(subject => (
                <option key={subject.id} value={subject.id}>{subject.name}</option>
              ))}
            </select>
          </div>

          <div className="flex justify-end space-x-3 mt-4">
            <Button
              variant="outline"
              onClick={() => setShowCreateForm(false)}
              className="border-gray-300"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateNotebook}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
              disabled={!selectedSubject || !selectedClassLevel || !notebookTitle || loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Notebook
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const renderNotebookContent = () => {
    const notebook = getCurrentNotebook();
    if (!notebook) {
      console.log('No current notebook found');
      return (
        <div className="flex justify-center items-center h-full">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <Loader2 className="w-8 h-8 mx-auto text-blue-600 animate-spin mb-4" />
            <p className="text-gray-600 text-center">Loading notebook content...</p>
          </div>
        </div>
      );
    }
    
    console.log('Rendering notebook content for:', notebook);
    console.log('Current section ID:', currentSectionId);
    console.log('Available sections:', notebook.sections);
    
    return (
      <div className="h-full flex flex-col">
        {/* Notebook Header */}
        <div className="bg-blue-600 text-white p-3 flex justify-between items-center border-b border-blue-800">
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleGoBackToNotebooks}
              className="mr-2 text-white hover:bg-white/20"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
            <h2 className="font-bold">{notebook.title}</h2>
          </div>
          <div className="text-sm">
            {notebook.subject.name} • {notebook.class_level.name}
          </div>
        </div>

        {/* Notebook Body with Loading State */}
        {sectionsLoading ? (
          <div className="flex-1 flex items-center justify-center bg-blue-50">
            <div className="text-center">
              <Loader2 className="w-10 h-10 mx-auto text-blue-600 animate-spin mb-4" />
              <p className="text-blue-700">Loading notebook sections...</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-1 overflow-hidden bg-indigo-50">
            {/* Side Tabs */}
            <div className={'sidebarContainer'}>
            <div className={`sidebarContent absolute inset-0 overflow-y-auto py-6 px-2 }`}>
    {!notebook.sections || notebook.sections.length === 0 ? (
      <div className="p-4 text-center">
        <p className="text-gray-500">No chapters available</p>
      </div>
    ) : (
      <div className="space-y-1">
        {notebook.sections.map((section) => {
          // Determine if this section has a lesson
          const hasLesson = !!section.lesson;
          
          return (
            <div 
              key={section.id}
              className={`relative ${hasLesson ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}
              onClick={() => hasLesson && handleSectionSelect(section.id)}
            >
              {/* Index tab */}
              <div 
                className={`relative rounded-r-lg mb-1 py-2 pl-3 pr-4 
                  ${currentSectionId === section.id 
                    ? 'bg-white shadow-md border-l-4 border-blue-600' 
                    : hasLesson 
                      ? 'bg-white/80 hover:bg-white border-l-4 border-transparent' 
                      : 'bg-gray-100 border-l-4 border-transparent'}
                `}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <div className={`font-medium ${currentSectionId === section.id ? 'text-blue-800' : 'text-gray-800'}`}>
                      {section.chapter.name}
                    </div>
                    {section.lesson && (
                      <div className="text-xs text-gray-500 mt-0.5">
                        {section.lesson.title}
                      </div>
                    )}
                  </div>
                  {hasLesson && (
                    <button
                      onClick={(e) => handleRemoveLesson(section.id, e)}
                      className="text-red-500 hover:text-red-700 opacity-0 hover:opacity-100 transition-opacity"
                      title="Remove lesson"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                
                {/* Tab divider */}
                <div 
                  className={`absolute -right-4 top-0 bottom-0 w-4 
                    ${currentSectionId === section.id 
                      ? 'bg-white' 
                      : hasLesson 
                        ? 'bg-transparent' 
                        : 'bg-transparent'}`
                  }
                ></div>
              </div>
              
              {/* Tab bookmark design */}
              <div 
                className={`absolute -left-2 top-1 w-2 h-8 rounded-l-sm
                  ${hasLesson ? 'bg-blue-600' : 'bg-gray-400'}`}
              ></div>
            </div>
          );
        })}
      </div>
    )}
  </div>
</div>
            
            {/* Notebook pages with lined paper */}
            <div 
              ref={contentRef}
              className="flex-1 relative"
            >
              <div className="notebook-paperabsolute inset-0 overflow-y-auto p-6 bg-white shadow-md">
                {currentSectionId ? (
                  renderSectionContent()
                ) : (
                  <div className="flex flex-col items-center justify-center h-full">
                    <div className="bg-blue-50 p-6 rounded-lg max-w-md text-center">
                      <Bookmark className="w-16 h-16 mx-auto text-blue-400 mb-4" />
                      <h3 className="text-lg font-medium text-gray-800 mb-2">Select a chapter</h3>
                      <p className="text-gray-600">
                        Choose a chapter from the tabs on the left to view its content.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderSectionContent = () => {
    const section = getCurrentSection();
    
    if (!section || !section.lesson) {
      return (
        <div className="flex flex-col items-center justify-center h-full">
          <div className="bg-yellow-50 p-6 rounded-lg max-w-md text-center">
            <h3 className="text-lg font-medium text-gray-800 mb-2">
              No lesson content available
            </h3>
            <p className="text-gray-600">
              This chapter doesn't have any lesson content yet.
            </p>
          </div>
        </div>
      );
    }
  
    return (
      <div className="relative z-10 bg-transparent">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-900 bg-white inline-block px-1">
            {section.lesson.title}
          </h2>
          <p className="text-sm text-gray-500 mt-1 bg-white inline-block px-1">
            Chapter: {section.chapter.name}
          </p>
        </div>
  
        {section.lesson.content && (
          <div className="prose max-w-none mb-8">
            <div className="bg-white/80 p-4 rounded">
              <TipTapRenderer content={section.lesson.content} />
            </div>
          </div>
        )}
  
        {/* Notes section */}
        <div className="bg-amber-50 border-l-4 border-amber-500 rounded-md p-4 mt-8">
          <div className="flex justify-between items-center mb-4">
            <h4 className="font-medium flex items-center text-amber-800 bg-white px-1">
              <PenLine className="w-4 h-4 mr-2" />
              My Notes
            </h4>
            
            {editingNotes ? (
              <div className="flex space-x-2">
                <Button
                  size="sm"
                  onClick={handleSaveNotes}
                  className="bg-amber-600 hover:bg-amber-700 text-white"
                >
                  <Save className="w-4 h-4 mr-1" />
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCancelEditNotes}
                  className="text-gray-600"
                >
                  <X className="w-4 h-4 mr-1" />
                  Cancel
                </Button>
              </div>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleStartEditNotes(section.user_notes)}
                className="text-amber-700 border-amber-300 hover:bg-amber-100"
              >
               <Edit className="w-4 h-4 mr-1" />
              Edit Notes
            </Button>
            )}
          </div>

          {editingNotes ? (
            <textarea
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white"
              rows={6}
              placeholder="Write your personal notes here..."
            />
          ) : (
            <div className="prose prose-sm max-w-none text-gray-700 bg-white p-3 rounded-md">
              {section.user_notes ? (
                <div dangerouslySetInnerHTML={{ __html: section.user_notes }} />
              ) : (
                <p className="text-gray-500 italic">No notes added yet.</p>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Main render
  return (
    <div className="h-full flex flex-col bg-gray-100">
      {/* App Header */}
      <div className="bg-white shadow-sm p-4 border-b border-gray-200">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-xl font-semibold text-gray-900 flex items-center">
            <Book className="w-5 h-5 mr-2" />
            My Student Notebook
          </h1>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto p-6">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : error ? (
            <div className="text-center text-red-600 p-4">{error}</div>
          ) : showCreateForm ? (
            renderCreateNotebookForm()
          ) : showNotebooksList ? (
            renderNotebooksList()
          ) : (
            renderNotebookContent()
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentNotebook;