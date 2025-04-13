import React, { useState, useEffect } from 'react';
import { Book, BookOpen, Plus, Trash2, Edit, Save, X, ChevronDown, ChevronRight, FolderPlus, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import TipTapRenderer from '@/components/editor/TipTapRenderer';
import axios from 'axios';

// Typages pour les données du cahier
interface NotebookEntry {
  id: string;
  lesson: {
    id: string;
    title: string;
    content: string;
  };
  chapter?: {
    id: string;
    name: string;
  };
  user_notes: string;
  order: number;
  added_at: string;
}

interface NotebookSection {
  id: string;
  title: string;
  subject: {
    id: string;
    name: string;
  };
  order: number;
  entries: NotebookEntry[];
}

interface Notebook {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  sections: NotebookSection[];
}

const api = axios.create({
  baseURL: 'http://127.0.0.1:8000/api',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Ajout de l'intercepteur pour les tokens d'authentification
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

const StudentNotebook: React.FC = () => {
  const [notebook, setNotebook] = useState<Notebook | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [expandedChapters, setExpandedChapters] = useState<Record<string, boolean>>({});
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [noteContent, setNoteContent] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'sections' | 'search'>('sections');
  const [expandedEntries, setExpandedEntries] = useState<Record<string, boolean>>({});

  // Récupération du cahier de l'utilisateur
  useEffect(() => {
    fetchNotebook();
  }, []);

  const fetchNotebook = async () => {
    try {
      setLoading(true);
      const response = await api.get('/notebooks/my_notebook/');
      setNotebook(response.data);
      if (response.data.sections.length > 0) {
        setActiveSection(response.data.sections[0].id);
      }
      setLoading(false);
    } catch (err) {
      console.error('Erreur lors du chargement du cahier:', err);
      setError('Impossible de charger votre cahier de cours');
      setLoading(false);
    }
  };

  // Gestion des chapitres dépliés/repliés
  const toggleChapter = (chapterId: string) => {
    setExpandedChapters(prev => ({
      ...prev,
      [chapterId]: !prev[chapterId]
    }));
  };

  // Gestion des entrées dépliées/repliées
  const toggleEntry = (entryId: string) => {
    setExpandedEntries(prev => ({
      ...prev,
      [entryId]: !prev[entryId]
    }));
  };

  // Commencer l'édition des notes
  const startEditingNotes = (entryId: string, content: string) => {
    setEditingNotes(entryId);
    setNoteContent(content);
  };

  // Annuler l'édition des notes
  const cancelEditingNotes = () => {
    setEditingNotes(null);
    setNoteContent('');
  };

  // Sauvegarder les notes
  const saveNotes = async (entryId: string) => {
    try {
      await api.patch(`/entries/${entryId}/`, {
        user_notes: noteContent
      });
      
      // Mettre à jour l'état local
      if (notebook) {
        const updatedNotebook = {
          ...notebook,
          sections: notebook.sections.map(section => ({
            ...section,
            entries: section.entries.map(entry => 
              entry.id === entryId 
                ? { ...entry, user_notes: noteContent } 
                : entry
            )
          }))
        };
        setNotebook(updatedNotebook);
      }
      
      // Réinitialiser l'état d'édition
      setEditingNotes(null);
      setNoteContent('');
    } catch (err) {
      console.error('Erreur lors de la sauvegarde des notes:', err);
    }
  };

  // Supprimer une entrée du cahier
  const deleteEntry = async (entryId: string) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette leçon de votre cahier ?')) {
      return;
    }
    
    try {
      await api.delete(`/entries/${entryId}/`);
      
      // Mettre à jour l'état local
      if (notebook) {
        const updatedNotebook = {
          ...notebook,
          sections: notebook.sections.map(section => ({
            ...section,
            entries: section.entries.filter(entry => entry.id !== entryId)
          }))
        };
        setNotebook(updatedNotebook);
      }
    } catch (err) {
      console.error('Erreur lors de la suppression de l\'entrée:', err);
    }
  };

  // Grouper les entrées par chapitre
  const getEntriesByChapter = (entries: NotebookEntry[]) => {
    const grouped: Record<string, NotebookEntry[]> = {};
    
    entries.forEach(entry => {
      const chapterId = entry.chapter?.id || 'uncategorized';
      if (!grouped[chapterId]) {
        grouped[chapterId] = [];
      }
      grouped[chapterId].push(entry);
    });
    
    return grouped;
  };

  // Si chargement
  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  // Si erreur
  if (error) {
    return (
      <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md">
        <p className="text-red-700">{error}</p>
        <Button 
          className="mt-4 bg-red-600 hover:bg-red-700 text-white"
          onClick={fetchNotebook}
        >
          Réessayer
        </Button>
      </div>
    );
  }

  // Si pas de cahier
  if (!notebook) {
    return (
      <div className="text-center p-8">
        <Book className="mx-auto h-16 w-16 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900">Pas de cahier trouvé</h3>
        <p className="mt-2 text-gray-500">Votre cahier de cours n'a pas encore été créé.</p>
        <Button 
          className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white"
          onClick={fetchNotebook}
        >
          Créer mon cahier
        </Button>
      </div>
    );
  }

  // Trouver la section active
  const currentSection = notebook.sections.find(s => s.id === activeSection);

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden">
      <div className="border-b border-gray-200 bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold flex items-center">
            <Book className="w-5 h-5 mr-2" />
            {notebook.title}
          </h2>
          <div>
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20"
              onClick={() => setActiveTab('sections')}
            >
              Mes matières
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20"
              onClick={() => setActiveTab('search')}
            >
              Rechercher
            </Button>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row">
        {/* Sidebar pour les sections/matières */}
        <div className="w-full md:w-64 bg-gray-50 p-4 border-r border-gray-200">
          <h3 className="font-medium text-gray-900 mb-4">Mes matières</h3>
          
          <div className="space-y-2">
            {notebook.sections.map(section => (
              <div 
                key={section.id}
                className={`p-2 rounded-md cursor-pointer transition-colors ${
                  activeSection === section.id 
                    ? 'bg-indigo-100 text-indigo-800' 
                    : 'hover:bg-gray-100'
                }`}
                onClick={() => setActiveSection(section.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <BookOpen className="w-4 h-4 mr-2 text-indigo-600" />
                    <span>{section.title}</span>
                  </div>
                  <span className="text-xs bg-gray-200 text-gray-700 rounded-full px-2 py-0.5">
                    {section.entries.length}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Contenu principal */}
        <div className="flex-1 p-6 overflow-auto max-h-[calc(100vh-250px)]">
          {activeTab === 'sections' ? (
            currentSection ? (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6 pb-2 border-b border-gray-200">
                  {currentSection.title}
                </h2>
                
                {currentSection.entries.length === 0 ? (
                  <div className="text-center p-8 bg-gray-50 rounded-lg">
                    <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900">Aucune leçon</h3>
                    <p className="mt-2 text-gray-500">Vous n'avez pas encore ajouté de leçons à cette matière.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Groupe les entrées par chapitre */}
                    {Object.entries(getEntriesByChapter(currentSection.entries)).map(([chapterId, entries]) => {
                      const chapterName = entries[0]?.chapter?.name || "Sans chapitre";
                      const isExpanded = expandedChapters[chapterId] !== false; // Par défaut, afficher les chapitres
                      
                      return (
                        <div key={chapterId} className="border border-gray-200 rounded-lg overflow-hidden">
                          <div 
                            className="bg-gray-50 p-3 flex justify-between items-center cursor-pointer"
                            onClick={() => toggleChapter(chapterId)}
                          >
                            <h3 className="font-medium text-gray-900 flex items-center">
                              <FolderPlus className="w-5 h-5 mr-2 text-indigo-600" />
                              {chapterName}
                            </h3>
                            {isExpanded ? 
                              <ChevronDown className="w-5 h-5 text-gray-500" /> : 
                              <ChevronRight className="w-5 h-5 text-gray-500" />
                            }
                          </div>
                          
                          {isExpanded && (
                            <div className="divide-y divide-gray-100">
                              {entries.map(entry => {
                                const isEntryExpanded = expandedEntries[entry.id] || false;
                                
                                return (
                                  <div key={entry.id} className="p-4">
                                    <div 
                                      className="flex justify-between items-center cursor-pointer"
                                      onClick={() => toggleEntry(entry.id)}
                                    >
                                      <h4 className="font-medium text-gray-800">{entry.lesson.title}</h4>
                                      {isEntryExpanded ? 
                                        <ChevronDown className="w-5 h-5 text-gray-500" /> : 
                                        <ChevronRight className="w-5 h-5 text-gray-500" />
                                      }
                                    </div>
                                    
                                    {isEntryExpanded && (
                                      <div className="mt-4 pt-4 border-t border-gray-100">
                                        {/* Contenu de la leçon */}
                                        <div className="prose max-w-none mb-6 bg-white p-4 rounded-md border border-gray-200">
                                          <TipTapRenderer content={entry.lesson.content} />
                                        </div>
                                        
                                        {/* Notes personnelles */}
                                        <div className="bg-yellow-50 p-4 rounded-md border-l-4 border-yellow-300">
                                          <div className="flex justify-between items-center mb-2">
                                            <h5 className="font-medium text-gray-800">Mes notes</h5>
                                            
                                            {editingNotes === entry.id ? (
                                              <div className="flex space-x-2">
                                                <Button
                                                  size="sm"
                                                  variant="ghost"
                                                  onClick={() => saveNotes(entry.id)}
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
                                                onClick={() => startEditingNotes(entry.id, entry.user_notes)}
                                                className="text-indigo-600 hover:text-indigo-700"
                                              >
                                                <Edit className="w-4 h-4 mr-1" />
                                                Modifier
                                              </Button>
                                            )}
                                          </div>
                                          
                                          {editingNotes === entry.id ? (
                                            <textarea
                                              value={noteContent}
                                              onChange={(e) => setNoteContent(e.target.value)}
                                              className="w-full p-2 border border-gray-300 rounded-md"
                                              rows={4}
                                              placeholder="Ajoutez vos notes personnelles ici..."
                                            />
                                          ) : (
                                            <div className="prose prose-sm max-w-none text-gray-700">
                                              {entry.user_notes ? (
                                                <div dangerouslySetInnerHTML={{ __html: entry.user_notes }} />
                                              ) : (
                                                <p className="text-gray-500 italic">Pas encore de notes.</p>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                        
                                        {/* Actions */}
                                        <div className="mt-4 flex justify-end">
                                          <Button
                                            size="sm"
                                            variant="destructive"
                                            onClick={() => deleteEntry(entry.id)}
                                            className="text-red-600 hover:text-red-700"
                                          >
                                            <Trash2 className="w-4 h-4 mr-1" />
                                            Supprimer du cahier
                                          </Button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center p-8">
                <p>Veuillez sélectionner une matière</p>
              </div>
            )
          ) : (
            // Interface de recherche
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">Rechercher des leçons</h2>
              
              <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                <p className="text-center text-gray-500">
                  Fonctionnalité de recherche à implémenter...
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentNotebook;