import React, { useState, useEffect } from 'react';
import { Book, BookOpen, Plus, Trash2, Edit, Save, X, ChevronDown, ChevronRight, FolderPlus, FileText, Loader2, School } from 'lucide-react';
import { Button } from '@/components/ui/button';
import TipTapRenderer from '@/components/editor/TipTapRenderer';
import api, { getClassLevels, getSubjects,deleteNotebook } from '@/lib/api';
import { ToastContainer, toast } from 'react-toastify';

interface Notebook {
  id: string;
  title: string;
  subject: {
    id: string;
    name: string;
  };
  class_level: {
    id: string;
    name: string;
  };
  sections: Section[];
}

interface Section {
  id: string;
  chapter: {
    id: string;
    name: string;
  };
  lesson: {
    id: string;
    title: string;
    content: string;
  } | null;
  user_notes: string;
  order: number;
}

interface ClassLevel {
  id: string;
  name: string;
}

interface Subject {
  id: string;
  name: string;
}

const StudentNotebook: React.FC = () => {
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeNotebook, setActiveNotebook] = useState<string | null>(null);
  const [activeChapter, setActiveChapter] = useState<string | null>(null); // Track active chapter
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [noteContent, setNoteContent] = useState<string>('');
  const [isCreating, setIsCreating] = useState(false);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classLevels, setClassLevels] = useState<ClassLevel[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedClassLevel, setSelectedClassLevel] = useState<string>('');

  // Fetch notebooks and class levels on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [notebooksResponse, classLevelsData] = await Promise.all([
          api.get('/notebooks/get_notebooks/'),
          getClassLevels()
        ]);
        
        setNotebooks(notebooksResponse.data);
        setClassLevels(classLevelsData);
        
        if (notebooksResponse.data.length > 0) {
          setActiveNotebook(notebooksResponse.data[0].id);
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Erreur lors du chargement:', err);
        setError('Impossible de charger vos données');
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  // Load subjects based on selected class level
  useEffect(() => {
    const loadSubjects = async () => {
      if (!selectedClassLevel) {
        setSubjects([]);
        setSelectedSubject('');
        return;
      }
      
      try {
        const data = await getSubjects([selectedClassLevel]);
        const uniqueSubjects = data.filter((subject, index, self) =>
          self.findIndex(s => s.id === subject.id) === index
        ).sort((a, b) => a.name.localeCompare(b.name));
        setSubjects(uniqueSubjects);
        
        if (uniqueSubjects.length === 1) {
          setSelectedSubject(uniqueSubjects[0].id);
        }
      } catch (error) {
        console.error('Failed to load subjects:', error);
        toast({
          title: 'Erreur',
          description: 'Impossible de charger les matières',
          variant: 'destructive'
        });
      }
    };

    loadSubjects();
  }, [selectedClassLevel]);

  const toggleChapter = (chapterId: string) => {
    setExpandedChapters(prev => ({
      ...prev,
      [chapterId]: !prev[chapterId]
    }));
  };

  const startEditingNotes = (sectionId: string, content: string) => {
    setEditingNotes(sectionId);
    setNoteContent(content);
  };

  const cancelEditingNotes = () => {
    setEditingNotes(null);
    setNoteContent('');
  };

  const saveNotes = async (sectionId: string) => {
    try {
      const notebook = notebooks.find(n => n.id === activeNotebook);
      if (!notebook) return;
      
      await api.post(`/notebooks/${notebook.id}/update_section_notes/`, {
        section_id: sectionId,
        user_notes: noteContent
      });
      
      setNotebooks(prevNotebooks => prevNotebooks.map(notebook => {
        if (notebook.id === activeNotebook) {
          return {
            ...notebook,
            sections: notebook.sections.map(section => 
              section.id === sectionId 
                ? { ...section, user_notes: noteContent } 
                : section
            )
          };
        }
        return notebook;
      }));
      
      setEditingNotes(null);
      setNoteContent('');
      toast({
        title: 'Succès',
        description: 'Vos notes ont été enregistrées',
      });
    } catch (err) {
      console.error('Erreur lors de la sauvegarde des notes:', err);
      toast({
        title: 'Erreur',
        description: 'Impossible de sauvegarder les notes',
        variant: 'destructive'
      });
    }
  };

  const removeLesson = async (sectionId: string) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette leçon de ce chapitre ?')) {
      return;
    }
    
    try {
      await api.post(`/sections/${sectionId}/remove_lesson/`);
      
      setNotebooks(prevNotebooks => prevNotebooks.map(notebook => {
        if (notebook.id === activeNotebook) {
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
      }));
      
      toast({
        title: 'Succès',
        description: 'La leçon a été supprimée',
      });
    } catch (err) {
      console.error('Erreur lors de la suppression de la leçon:', err);
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer la leçon',
        variant: 'destructive'
      });
    }
  };

  const createNotebook = async () => {
    if (!selectedSubject || !selectedClassLevel) {
      toast({
        title: 'Information',
        description: 'Veuillez sélectionner une matière et un niveau',
        variant: 'default'
      });
      return;
    }
    
    const existingNotebook = notebooks.find(
      n => n.subject.id === selectedSubject && n.class_level.id === selectedClassLevel
    );
    
    if (existingNotebook) {
      toast({
        title: 'Information',
        description: 'Vous avez déjà un cahier pour cette matière et ce niveau',
      });
      setActiveNotebook(existingNotebook.id);
      setIsCreating(false);
      return;
    }
    
    try {
      setLoading(true);
      const response = await api.post('/notebooks/create_notebook/', {
        subject_id: selectedSubject,
        class_level_id: selectedClassLevel
      });
      
      setNotebooks(prev => {
        const alreadyExists = prev.some(
          n => n.id === response.data.id || 
               (n.subject.id === response.data.subject.id && 
                n.class_level.id === response.data.class_level.id)
        );
        return alreadyExists ? prev : [...prev, response.data];
      });
      
      setActiveNotebook(response.data.id);
      setIsCreating(false);
      setSelectedSubject('');
      setSelectedClassLevel('');
      setLoading(false);
      
      toast({
        title: 'Succès',
        description: 'Cahier créé avec succès!',
      });
    } catch (err) {
      console.error('Erreur lors de la création du cahier:', err);
      setLoading(false);
      toast({
        title: 'Erreur',
        description: 'Impossible de créer le cahier',
        variant: 'destructive'
      });
    }
  };



  if (loading && notebooks.length === 0) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="animate-spin h-12 w-12 text-indigo-600" />
      </div>
    );
  }

  if (error && notebooks.length === 0) {
    return (
      <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md">
        <p className="text-red-700">{error}</p>
        <Button 
          className="mt-4 bg-red-600 hover:bg-red-700 text-white"
          onClick={() => {
            setError(null);
            setLoading(true);
            api.get('/notebooks/get_notebooks/').then(response => {
              setNotebooks(response.data);
              setLoading(false);
            }).catch(() => setLoading(false));
          }}
        >
          Réessayer
        </Button>
      </div>
    );
  }

  const currentNotebook = notebooks.find(n => n.id === activeNotebook);
  const currentChapter = currentNotebook?.sections.find(s => s.id === activeChapter);

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden">
      {/* Header */}
      <div className="border-b border-gray-200 bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold flex items-center">
            <Book className="w-5 h-5 mr-2" />
            Mes cahiers de cours
          </h2>
          <Button
            variant="ghost"
            size="sm"
            className="text-white hover:bg-white/20"
            onClick={() => setIsCreating(!isCreating)}
          >
            {isCreating ? (
              <>
                <X className="w-4 h-4 mr-2" />
                Annuler
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                {notebooks.length === 0 ? "Commencer" : "Nouveau cahier"}
              </>
            )}
          </Button>
        </div>
      </div>

      {isCreating && (
        <div className="p-6 bg-white border-b border-gray-200 shadow-sm">
          <h3 className="font-medium text-indigo-900 text-lg mb-4 flex items-center">
            <Plus className="w-5 h-5 mr-2 text-indigo-600" />
            Créer un nouveau cahier
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                <Book className="w-4 h-4 mr-2 text-indigo-500" />
                Matière
              </label>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                disabled={!selectedClassLevel}
              >
                <option value="">{selectedClassLevel ? "Choisissez une matière" : "Sélectionnez d'abord un niveau"}</option>
                {subjects.map(subject => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                <School className="w-4 h-4 mr-2 text-indigo-500" />
                Niveau
              </label>
              <select
                value={selectedClassLevel}
                onChange={(e) => {
                  setSelectedClassLevel(e.target.value);
                  setSelectedSubject('');
                }}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">Choisissez un niveau</option>
                {classLevels.map(level => (
                  <option key={level.id} value={level.id}>
                    {level.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="mt-6 flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={() => setIsCreating(false)}
              className="border-gray-300 hover:bg-gray-50"
            >
              Annuler
            </Button>
            <Button
              onClick={createNotebook}
              className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
              disabled={!selectedSubject || !selectedClassLevel || loading}
            >
              {loading ? (
                <div className="flex items-center">
                  <Loader2 className="animate-spin h-4 w-4 mr-2" />
                  Création...
                </div>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Créer mon cahier
                </>
              )}
            </Button>
          </div>
        </div>
      )}

<div className="flex flex-col md:flex-row">
        {/* Left Sidebar for Notebooks */}
        <div className="w-full md:w-64 bg-gray-50 p-4 border-r border-gray-200">
          <h3 className="font-medium text-gray-900 mb-4">Mes cahiers</h3>
          {notebooks.length === 0 ? (
            <div className="text-center p-4 bg-gray-100 rounded-lg">
              <BookOpen className="mx-auto h-8 w-8 text-gray-400 mb-3" />
              <p className="text-gray-500">Vous n'avez pas encore de cahiers</p>
              <Button
                className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white w-full"
                onClick={() => setIsCreating(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Créer mon premier cahier
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {notebooks.map(notebook => (
                <div
                  key={notebook.id}
                  className={`p-3 rounded-md cursor-pointer transition-colors ${
                    activeNotebook === notebook.id
                      ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                      : 'hover:bg-gray-100 border border-transparent'
                  }`}
                  onClick={() => {
                    setActiveNotebook(notebook.id);
                    setActiveChapter(null); // Reset active chapter
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center truncate">
                      <BookOpen className="w-4 h-4 mr-2 text-indigo-600 flex-shrink-0" />
                      <span className="truncate">{notebook.title}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs bg-gray-200 text-gray-700 rounded-full px-2 py-0.5 flex-shrink-0">
                        {notebook.sections.filter(s => s.lesson).length}/{notebook.sections.length}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotebook(notebook.id);
                        }}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-1 text-xs text-gray-500 truncate">
                    {notebook.subject.name} • {notebook.class_level.name}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Main Content Area */}
        <div className="flex-1 p-6 overflow-auto max-h-[calc(100vh-250px)]">
          {currentNotebook ? (
            <div className="flex h-full">
              {/* Chapters Sidebar */}
              <div className="w-64 bg-gray-50 p-4 border-r border-gray-200">
                <h3 className="font-medium text-gray-900 mb-4">Chapitres</h3>
                {currentNotebook.sections.length === 0 ? (
                  <p className="text-gray-500">Aucun chapitre disponible.</p>
                ) : (
                  <div className="space-y-2">
                    {currentNotebook.sections.map(section => (
                      <button
                        key={section.id}
                        className={`w-full p-2 rounded-md text-left ${
                          activeChapter === section.id
                            ? 'bg-indigo-100 text-indigo-800'
                            : 'hover:bg-gray-100'
                        }`}
                        onClick={() => setActiveChapter(section.id)}
                      >
                        {section.chapter.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Chapter Content */}
              <div className="flex-1 p-4 bg-white">
                {currentChapter ? (
                  <div className="space-y-4">
                    <h3 className="text-2xl font-bold text-gray-900 mb-4">{currentChapter.chapter.name}</h3>
                    {currentChapter.lesson ? (
                      <>
                        <div className="prose max-w-none mb-6">
                          <TipTapRenderer content={currentChapter.lesson.content} />
                        </div>
                        <div className="bg-yellow-50 p-4 rounded-md border-l-4 border-yellow-300">
                          {/* Notes Section */}
                          <div className="flex justify-between items-center mb-3">
                            <h5 className="font-medium text-gray-800 flex items-center">
                              <Edit className="w-4 h-4 mr-2 text-yellow-600" />
                              Mes notes
                            </h5>
                            {editingNotes === currentChapter.id ? (
                              <div className="flex space-x-2">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => saveNotes(currentChapter.id)}
                                  className="text-green-600 hover:text-green-700"
                                >
                                  <Save className="w-4 h-4 mr-1" />
                                  Enregistrer
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={cancelEditingNotes}
                                  className="text-gray-600 hover:text-gray-700"
                                >
                                  <X className="w-4 h-4 mr-1" />
                                  Annuler
                                </Button>
                              </div>
                            ) : (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => startEditingNotes(currentChapter.id, currentChapter.user_notes)}
                                className="text-indigo-600 hover:text-indigo-700"
                              >
                                <Edit className="w-4 h-4 mr-1" />
                                Modifier
                              </Button>
                            )}
                          </div>
                          {editingNotes === currentChapter.id ? (
                            <textarea
                              value={noteContent}
                              onChange={(e) => setNoteContent(e.target.value)}
                              className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                              rows={4}
                              placeholder="Ajoutez vos notes personnelles ici..."
                            />
                          ) : (
                            <div className="prose prose-sm max-w-none text-gray-700">
                              {currentChapter.user_notes ? (
                                <div dangerouslySetInnerHTML={{ __html: currentChapter.user_notes }} />
                              ) : (
                                <p className="text-gray-500 italic">Pas encore de notes.</p>
                              )}
                            </div>
                          )}
                        </div>
                      </>
                    ) : (
                      <p className="text-gray-500">Aucune leçon n'a été ajoutée à ce chapitre.</p>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-500">Sélectionnez un chapitre pour afficher son contenu.</p>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center p-8">
              <BookOpen className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-500">Veuillez sélectionner un cahier ou en créer un nouveau.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentNotebook;