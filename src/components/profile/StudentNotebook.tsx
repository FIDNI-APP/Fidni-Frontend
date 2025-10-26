import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, Loader2, FileText, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import api from '@/lib/api';
import { getClassLevels, getSubjects } from '@/lib/api';
import { toast } from 'react-toastify';
import { SubjectModel, ClassLevelModel, Notebook, Section } from '@/types';

// Import separated components
import NotebooksListView from '@/components/notebook/NotebookListView';
import NotebookSections from '@/components/notebook/NotebookSections';
import SectionContent from '@/components/notebook/SectionContent';
import CreateNotebookForm from '@/components/notebook/CreateNotebookForm';


// Structure pour les notes modulaires
interface ModularNote {
  id: string; // Identifiant unique pour la note
  content: string; // Contenu de la note
  position: {
    topPercent: number; // Position verticale en pourcentage
    leftPercent: number; // Position horizontale en pourcentage relative au contenu
  };
  color: string; // Couleur de la note (pour catégoriser visuellement)
}
const StudentNotebook: React.FC = () => {
  // States
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
  
  // References
  const contentRef = useRef<HTMLDivElement>(null);
  
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
      
      // Get detailed notebook data including sections
      const response = await api.get(`/notebooks/${notebookId}/`);
      
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
      setClassLevels(data);
    } catch (err) {
      console.error('Error loading class levels:', err);
      toast.error('Failed to load class levels');
    }
  };

  const loadSubjects = async () => {
    try {
      const data = await getSubjects([selectedClassLevel]);
      setSubjects(data);
    } catch (err) {
      console.error('Error loading subjects:', err);
      toast.error('Failed to load subjects');
    }
  };

  const handleSaveModularNotes = async (sectionId: string, notes: ModularNote[]) => {
    if (!currentNotebookId) return;
    
    try {
      // Dans un environnement de production, vous appelleriez votre API ici
      // Exemple:
      // await api.post(`/notebooks/${currentNotebookId}/sections/${sectionId}/modular_notes`, { notes });
      
      // Pour le moment, nous utilisons le localStorage pour la démo
      localStorage.setItem(`modular_notes_${sectionId}`, JSON.stringify(notes));
      
      toast.success('Notes modulaires sauvegardées');
    } catch (err) {
      console.error('Error saving modular notes:', err);
      toast.error('Failed to save modular notes');
      throw err; // Rethrow pour que le composant SectionContent puisse le gérer
    }
  };

  // Event handlers
  const handleNotebookSelect = (notebookId: string) => {
    setCurrentNotebookId(notebookId);
    setCurrentSectionId(null); // Reset section when changing notebooks
    setShowNotebooksList(false);
  };

  // Critical function for fixing the lesson content loading issue
  const handleSectionSelect = async (sectionId: string) => {
    if (!currentNotebook) return;
    
    try {
      // Set current section ID immediately for UI feedback
      setCurrentSectionId(sectionId);
      
      // Important: Directly fetch the section data to ensure we get the complete and latest data
      // This is the key fix: fetching the full section details separately instead of relying on 
      // previously loaded data that might be incomplete
      const response = await api.get(`/sections/${sectionId}/`);
      console.log("Section data response:", response.data);
      
      if (response.data) {
        // Find existing section to update
        const updatedSections = currentNotebook.sections.map(section => {
          if (section.id === sectionId) {
            // Create a new section object with updated data
            // The critical part is ensuring lesson.content is correctly populated
            return {
              ...section,
              user_notes: response.data.user_notes || section.user_notes,
              lesson: response.data.lesson ? {
                ...response.data.lesson,
                // Ensure content is definitely included
                content: response.data.lesson.content || ""
              } : null
            };
          }
          return section;
        });
        
        // Update the current notebook with these updated sections
        setCurrentNotebook(prev => {
          if (!prev) return null;
          return {
            ...prev,
            sections: updatedSections
          };
        });
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
      
      // Update local state
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
      
      const response = await api.post('/notebooks/create_notebook/', {
        subject_id: selectedSubject,
        class_level_id: selectedClassLevel,
        title: notebookTitle
      });
      
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

  const handleRemoveLesson = async (sectionId: string) => {
    if (!window.confirm('Are you sure you want to remove this lesson?')) return;
    
    try {
      await api.post(`/sections/${sectionId}/remove_lesson/`);
      
      // Update local state
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

  const handleDeleteNotebook = async (notebookId: string) => {
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

  // Helper function to get current section
  const getCurrentSection = () => {
    if (!currentNotebook) return null;
    return currentNotebook.sections.find(section => section.id === currentSectionId) || null;
  };

  // Main render
  return (
    <div className="flex flex-col bg-gray-50">
      {/* Main Content Area */}
      <div className="flex-1">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="flex flex-col items-center">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-3" />
              <p className="text-gray-600">Loading notebooks...</p>
            </div>
          </div>
        ) : error ? (
          <div className="text-center text-red-600 p-4 bg-red-50 rounded-lg">{error}</div>
        ) : showCreateForm ? (
          <CreateNotebookForm 
            onClose={() => setShowCreateForm(false)}
            onSubmit={handleCreateNotebook}
            loading={loading}
            classLevels={classLevels}
            subjects={subjects}
            setSelectedClassLevel={setSelectedClassLevel}
            selectedClassLevel={selectedClassLevel}
            setSelectedSubject={setSelectedSubject}
            selectedSubject={selectedSubject}
            notebookTitle={notebookTitle}
            setNotebookTitle={setNotebookTitle}
          />
        ) : showNotebooksList ? (
          <NotebooksListView 
            notebooks={notebooks}
            onSelectNotebook={handleNotebookSelect}
            onDeleteNotebook={handleDeleteNotebook}
            onCreateNotebook={() => setShowCreateForm(true)}
          />
        ) : (
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200/50 flex flex-col min-h-[calc(100vh-200px)]">
            {/* Notebook Header */}
            <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-800 px-6 py-4 flex justify-between items-center text-white rounded-t-2xl shadow-lg">
              <div className="flex items-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleGoBackToNotebooks}
                  className="mr-3 text-white hover:bg-white/20 rounded-lg px-3 py-2 transition-all duration-200 hover:scale-105"
                >
                  <ChevronLeft className="w-5 h-5 mr-2" />
                  Retour
                </Button>
                <h2 className="text-xl font-bold">
                  {currentNotebook?.title || "Chargement..."}
                </h2>
              </div>
              {currentNotebook && (
                <div className="text-sm bg-white/20 backdrop-blur-sm px-3 py-1 rounded-lg">
                  {currentNotebook.subject.name} • {currentNotebook.class_level.name}
                </div>
              )}
            </div>
            
            {/* Notebook Content */}
            {sectionsLoading ? (
              <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-gray-50 to-indigo-50">
                <div className="text-center bg-white/80 backdrop-blur-sm p-8 rounded-2xl shadow-xl">
                  <Loader2 className="w-12 h-12 mx-auto text-indigo-600 animate-spin mb-4" />
                  <p className="text-indigo-700 font-medium text-lg">Chargement du contenu...</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-1">
                {/* Sections sidebar */}
                {currentNotebook && (
                  <NotebookSections 
                    sections={currentNotebook.sections}
                    activeSectionId={currentSectionId}
                    onSelectSection={handleSectionSelect}
                    onRemoveLesson={handleRemoveLesson}
                  />
                )}
                
                {/* Main content area */}
                <div 
                  ref={contentRef}
                  className="flex-1 bg-gradient-to-br from-gray-50 to-indigo-50 notebook-paper"
                >
                  {currentSectionId ? (
                    <SectionContent 
                      section={getCurrentSection()}
                      onStartEditNotes={handleStartEditNotes}
                      onSaveNotes={handleSaveNotes}
                      onCancelEditNotes={handleCancelEditNotes}
                      editingNotes={editingNotes}
                      noteContent={noteContent}
                      setNoteContent={setNoteContent}
                      onSaveModularNotes={handleSaveModularNotes}
                      notebookId={currentNotebookId || undefined}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full p-8">
                      <div className="bg-white p-6 rounded-lg max-w-md text-center shadow-md">
                        <FileText className="w-16 h-16 mx-auto text-indigo-300 mb-4" />
                        <h3 className="text-lg font-medium text-gray-800 mb-2">Sélectionner un chapitre</h3>
                        <p className="text-gray-600 mb-4">
                          Choisir un chapitre à partir de la liste de chapitres disponibles.
                        </p>
                        <p className="text-sm text-indigo-600">
                          <ChevronRight className="w-4 h-4 inline mr-1" />
                          Les chapitres contenant des leçons sont cliquables.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* CSS for animations and paper styling */}
      <style jsx>{`
        .fade-in {
          animation: fadeIn 0.3s ease-out forwards;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .notebook-paper {
          background-image: linear-gradient(#e5e7eb 1px, transparent 1px);
          background-size: 100% 2rem;
          background-position: 0 1rem;
          box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.05);
        }
      `}</style>
    </div>
  );
};

export default StudentNotebook;