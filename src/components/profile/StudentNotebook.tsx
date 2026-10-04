import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Loader2, FileText, ChevronRight } from 'lucide-react';
import api from '@/lib/api';
import { getClassLevels, getSubjects } from '@/lib/api';
import { toast } from 'react-toastify';
import { SubjectModel, ClassLevelModel, Notebook } from '@/types';
import { useBreadcrumb } from '@/contexts/BreadcrumbContext';

// Import separated components
import NotebooksListView from '@/components/notebook/NotebookListView';
import NotebookSections from '@/components/notebook/NotebookSections';
import SectionContent from '@/components/notebook/SectionContent';
import { normalizeNotebookPayload } from '@/lib/api/notebookApi';
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
  const paneRef = useRef<HTMLDivElement>(null);

  // The reading pane must fill exactly what the shell leaves below the TopBar.
  // Hardcoding `100vh - 60px` assumed the TopBar was the only chrome above it,
  // so the OnboardingBanner pushed the pane past the viewport and scrolled its
  // header out of view. Measure the real offset instead — it also covers the
  // banner wrapping to two lines on narrow screens.
  const [paneHeight, setPaneHeight] = useState('calc(100dvh - 60px)');

  useLayoutEffect(() => {
    const el = paneRef.current;
    if (!el) return;

    const measure = () => {
      const top = el.getBoundingClientRect().top + window.scrollY;
      setPaneHeight(`calc(100dvh - ${Math.round(top)}px)`);
    };

    measure();
    window.addEventListener('resize', measure);
    // The banner can appear, disappear or reflow after mount.
    const observer = new ResizeObserver(measure);
    observer.observe(document.body);

    return () => {
      window.removeEventListener('resize', measure);
      observer.disconnect();
    };
  }, [currentNotebookId]);

  const { setCrumbs } = useBreadcrumb();
  const [searchParams, setSearchParams] = useSearchParams();

  // The open notebook lives in the URL (?nb=<id>) so the breadcrumb link to
  // /notebooks (no query) returns to the list, and refresh/back keep state.
  useEffect(() => {
    const nb = searchParams.get('nb');
    if (nb) {
      if (nb !== currentNotebookId) {
        setCurrentNotebookId(nb);
        setCurrentSectionId(null);
      }
      setShowNotebooksList(false);
    } else {
      setShowNotebooksList(true);
      setCurrentNotebookId(null);
      setCurrentSectionId(null);
      setCurrentNotebook(null);
    }
  }, [searchParams]);

  // Push "Cahiers › <notebook>" into the app TopBar while reading a notebook.
  useEffect(() => {
    if (!showNotebooksList && currentNotebook) {
      setCrumbs([{ label: 'Cahiers', to: '/notebooks' }, { label: currentNotebook.title }]);
    } else {
      setCrumbs(null);
    }
    return () => setCrumbs(null);
  }, [showNotebooksList, currentNotebook?.title]);

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

  // Add a refresh function that can be called from outside
  useEffect(() => {
    const handleNotebookRefresh = () => {
      if (currentNotebookId) {
        loadNotebookDetails(currentNotebookId);
      }
    };

    // Listen for custom refresh events
    window.addEventListener('refreshNotebook', handleNotebookRefresh);
    
    return () => {
      window.removeEventListener('refreshNotebook', handleNotebookRefresh);
    };
  }, [currentNotebookId]);

  // Propose « Matière - Niveau » quand le champ est vide ; ne pas le re-remplir si l'élève l'efface pour écrire son nom.
  useEffect(() => {
    if (selectedSubject && selectedClassLevel) {
      const subjectName = subjects.find(s => s.id === selectedSubject)?.name || '';
      const levelName = classLevels.find(c => c.id === selectedClassLevel)?.name || '';

      if (subjectName && levelName) {
        setNotebookTitle(t => t || `${subjectName} - ${levelName}`);
      }
    }
  }, [selectedSubject, selectedClassLevel, subjects, classLevels]);

  // Main data loading functions
  const loadNotebooks = async () => {
    try {
      setLoading(true);
      const response = await api.get('/notebooks/get_notebooks/');
      setNotebooks(normalizeNotebookPayload(response.data));
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
      
      // Get detailed notebook data including sections. The lesson body arrives
      // as `json_content`; the readers expect `structure`, so normalize here —
      // this page talks to `api` directly rather than through notebookApi.
      const response = await api.get(`/notebooks/${notebookId}/`);
      const notebookData = normalizeNotebookPayload(response.data);

      // Update the current notebook with full details
      setCurrentNotebook(notebookData);

      // Also update the notebook in the notebooks array
      setNotebooks(prev =>
        prev.map(notebook =>
          notebook.id === notebookId ? notebookData : notebook
        )
      );
    } catch (err) {
      console.error('Error loading notebook details:', err);
      toast.error('Impossible de charger ce cahier.');
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
      toast.error('Impossible de charger les niveaux.');
    }
  };

  const loadSubjects = async () => {
    try {
      const data = await getSubjects([selectedClassLevel]);
      setSubjects(data);
    } catch (err) {
      console.error('Error loading subjects:', err);
      toast.error('Impossible de charger les matières.');
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
      toast.error('Tes notes n’ont pas pu être enregistrées.');
      throw err; // Rethrow pour que le composant SectionContent puisse le gérer
    }
  };

  // Event handlers
  const handleNotebookSelect = (notebookId: string) => {
    setSearchParams({ nb: notebookId });
  };

  // Critical function for fixing the lesson content loading issue
  const handleSectionSelect = async (sectionId: string) => {
    if (!currentNotebook) return;
    
    try {
      // Set current section ID immediately for UI feedback
      setCurrentSectionId(sectionId);
      
      // Important: Directly fetch the chapter data to ensure we get the complete and latest data
      // This is the key fix: fetching the full chapter details separately instead of relying on 
      // previously loaded data that might be incomplete
      let response;
      try {
        // Try the new nested API first
        response = await api.get(`/notebooks/${currentNotebook.id}/chapters/${sectionId}/`);
      } catch (error: any) {
        if (error.response?.status === 404) {
          // Fallback to old API if new one doesn't exist yet (server not restarted)
          response = await api.get(`/sections/${sectionId}/`);
        } else {
          throw error;
        }
      }
      response = { ...response, data: normalizeNotebookPayload(response.data) };

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
      toast.error('Impossible de charger ce chapitre.');
    }
  };

  const handleGoBackToNotebooks = () => {
    setSearchParams({});
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
      toast.success('Notes enregistrées');
    } catch (err) {
      console.error('Error saving notes:', err);
      toast.error('Tes notes n’ont pas pu être enregistrées.');
    }
  };

  const handleCancelEditNotes = () => {
    setEditingNotes(false);
    setNoteContent("");
  };

  const handleCreateNotebook = async () => {
    if (!selectedSubject || !selectedClassLevel) {
      toast.info('Choisis une matière et un niveau.');
      return;
    }
    
    if (!notebookTitle.trim()) {
      toast.info('Donne un titre à ton cahier.');
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
      setCurrentNotebook(response.data);
      setShowCreateForm(false);
      setSearchParams({ nb: response.data.id });
      
      // Reset form
      setSelectedSubject("");
      setSelectedClassLevel("");
      setNotebookTitle("");
      
      toast.success('Cahier créé');
    } catch (err: any) {
      console.error('Error creating notebook:', err);
      toast.error(err?.response?.data?.error || 'Le cahier n’a pas pu être créé.');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveLesson = async (sectionId: string, lessonEntryId: string) => {
    if (!window.confirm('Retirer cette leçon du cahier ?')) return;
    
    try {
      if (!currentNotebook) return;
      
      // Use the new nested API for removing lesson pages
      await api.post(`/notebooks/${currentNotebook.id}/chapters/${sectionId}/remove_lesson_page/`, {
        lesson_entry_id: lessonEntryId
      });
      
      // Refresh the notebook data
      loadNotebookDetails(currentNotebook.id);
      
      toast.success('Leçon retirée du cahier');
    } catch (err) {
      console.error('Error removing lesson:', err);
      toast.error('La leçon n’a pas pu être retirée.');
    }
  };

  const handleDeleteNotebook = async (notebookId: string) => {
    if (!window.confirm('Supprimer ce cahier ? Cette action est définitive.')) return;
    
    try {
      await api.delete(`/notebooks/${notebookId}/`);
      
      // Update local state
      setNotebooks(prev => prev.filter(notebook => notebook.id !== notebookId));
      
      // If we just deleted the current notebook, go back to notebooks list
      if (currentNotebookId === notebookId) {
        setSearchParams({});
      }
      
      toast.success('Cahier supprimé');
    } catch (err) {
      console.error('Error deleting notebook:', err);
      toast.error('Le cahier n’a pas pu être supprimé.');
    }
  };

  // Helper function to get current section
  const getCurrentSection = () => {
    if (!currentNotebook) return null;
    return currentNotebook.sections.find(section => section.id === currentSectionId) || null;
  };

  // Main render
  return (
    <div className="flex flex-col">
      {/* Main Content Area */}
      <div className="flex-1">
        {loading ? (
          <div className="flex flex-col justify-center items-center py-24">
            <Loader2 className="w-7 h-7 animate-spin mb-3" style={{ color: '#9a958c' }} />
            <p style={{ color: '#6b6862', fontSize: 14 }}>Chargement des cahiers…</p>
          </div>
        ) : error ? (
          <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-8">
            <div className="flex items-center gap-3 p-4" style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, color: '#991b1b', fontSize: 14 }}>{error}</div>
          </div>
        ) : showCreateForm ? (
          <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-8">
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
          </div>
        ) : showNotebooksList ? (
          <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-8">
            <NotebooksListView
              notebooks={notebooks}
              onSelectNotebook={handleNotebookSelect}
              onDeleteNotebook={handleDeleteNotebook}
              onCreateNotebook={() => setShowCreateForm(true)}
            />
          </div>
        ) : (
          // In-flow reading pane: fills the area under the TopBar, to the right
          // of the app sidebar (which stays visible and collapsible).
          <div ref={paneRef} className="bg-white flex flex-col" style={{ height: paneHeight, borderTop: '1px solid #e7e3dc' }}>
            {/* Notebook Content */}
            {sectionsLoading ? (
              <div className="flex-1 flex items-center justify-center" style={{ background: '#faf9f7' }}>
                <div className="text-center" style={{ background: '#fff', padding: 32, borderRadius: 16, border: '1px solid #e7e3dc' }}>
                  <Loader2 className="w-8 h-8 mx-auto animate-spin mb-3" style={{ color: '#9a958c' }} />
                  <p style={{ color: '#6b6862', fontWeight: 500, fontSize: 14 }}>Chargement du contenu…</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-1 overflow-hidden">
                {/* Sections sidebar */}
                {currentNotebook && (
                  <div data-tour="cahier-sections" className="flex">
                  <NotebookSections
                    sections={currentNotebook.sections}
                    activeSectionId={currentSectionId}
                    onSelectSection={handleSectionSelect}
                    onRemoveLesson={handleRemoveLesson}
                    onGoBack={handleGoBackToNotebooks}
                    notebookTitle="Mes cahiers"
                    printTo={`/notebooks/${currentNotebook.id}/pdf`}
                  />
                  </div>
                )}

                {/* Main content area — fills remaining, scrolls internally */}
                <div
                  ref={contentRef}
                  data-tour="cahier-contenu"
                  className="flex-1 flex flex-col overflow-hidden"
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
                    <div className="flex flex-col items-center justify-center h-full p-8" style={{ background: '#faf9f7' }}>
                      <div className="text-center max-w-sm" style={{ background: '#fff', padding: 28, borderRadius: 16, border: '1px solid #e7e3dc' }}>
                        <div className="mx-auto mb-4 flex items-center justify-center" style={{ width: 56, height: 56, borderRadius: 16, background: '#f7f6f3' }}>
                          <FileText className="w-7 h-7" style={{ color: '#cfcdc8' }} />
                        </div>
                        <h3 style={{ fontSize: 16, fontWeight: 600, color: '#1a1a1a', marginBottom: 6 }}>Sélectionnez un chapitre</h3>
                        <p style={{ fontSize: 13.5, color: '#6b6862', marginBottom: 12 }}>
                          Choisissez un chapitre dans la liste à gauche pour afficher son contenu.
                        </p>
                        <p className="inline-flex items-center gap-1" style={{ fontSize: 12.5, color: '#15633c', fontWeight: 500 }}>
                          <ChevronRight className="w-4 h-4" />
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
      <style>{`
        .fade-in {
          animation: fadeIn 0.3s ease-out forwards;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .notebook-paper {
          background-image: linear-gradient(#f2f1ee 1px, transparent 1px);
          background-size: 100% 2rem;
          background-position: 0 1rem;
        }
      `}</style>
    </div>
  );
};

export default StudentNotebook;