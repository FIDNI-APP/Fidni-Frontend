import React, { useState, useEffect, useRef } from 'react';
import { Save, X, BookMarked, Plus, Trash, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import NotebookContent from './NotebookContent';
import { Section } from '@/types';
import { saveLessonAnnotations, getLessonAnnotations } from '@/lib/api/notebookApi';
import toast from 'react-hot-toast';


interface ModularNote {
  id: string;
  content: string;
  position: {
    topPercent: number;
    leftPercent: number;
  };
  color: string;
}

interface SectionContentProps {
  section: Section | null;
  onStartEditNotes: (notes: string) => void;
  onSaveNotes: () => void;
  onCancelEditNotes: () => void;
  editingNotes: boolean;
  noteContent: string;
  setNoteContent: (content: string) => void;
  onSaveModularNotes?: (sectionId: string, notes: ModularNote[]) => Promise<void>;
  notebookId?: string;
}



const SectionContent: React.FC<SectionContentProps> = ({
  section,
  onStartEditNotes,
  onSaveNotes,
  onCancelEditNotes,
  editingNotes,
  noteContent,
  setNoteContent,
  onSaveModularNotes,
  notebookId
}) => {
  // State to force re-rendering of TipTapRenderer
  const [renderKey, setRenderKey] = useState<number>(0);
  
  // État pour gérer l'affichage fluide du contenu
  const [contentLoading, setContentLoading] = useState<boolean>(true);
  // État pour contrôler complètement la visibilité du contenu
  const [showContent, setShowContent] = useState<boolean>(false);
  
  // State pour les notes modulaires
  const [modularNotes, setModularNotes] = useState<ModularNote[]>([]);
  
  // State pour les annotations
  const [annotations, setAnnotations] = useState<any[]>([]);
  const [loadingAnnotations, setLoadingAnnotations] = useState(false);
  const [addingNote, setAddingNote] = useState<boolean>(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [newNoteContent, setNewNoteContent] = useState<string>('');
  const [newNoteColor, setNewNoteColor] = useState<string>('#FFEB3B'); // Jaune par défaut
  
  // Référence pour le conteneur de contenu
  const contentContainerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  
  // Couleurs disponibles pour les notes
  const noteColors = [
    '#FFEB3B', // Jaune
    '#4CAF50', // Vert
    '#2196F3', // Bleu
    '#F44336', // Rouge
    '#9C27B0'  // Violet
  ];

  // Use section ID as dependency to update renderKey when section changes
  useEffect(() => {
    if (section?.id) {
      // Reset states
      setContentLoading(true);
      setShowContent(false);
      
      // Force TipTapRenderer to re-render with new content by changing its key
      setRenderKey(prev => prev + 1);
      
      // Charger les notes modulaires pour cette section
      loadModularNotes(section.id);
      
      // Charger les annotations
      loadAnnotations();
    }
  }, [section?.id, notebookId]);

  // Fonction pour charger les notes modulaires
  const loadModularNotes = (sectionId: string) => {
    // Cette fonction devrait normalement faire un appel API
    // Pour l'instant, nous allons simuler avec des données en dur
    
    // Vérifier si nous avons des notes sauvegardées dans localStorage pour le développement
    const savedNotes = localStorage.getItem(`modular_notes_${sectionId}`);
    if (savedNotes) {
      try {
        setModularNotes(JSON.parse(savedNotes));
        return;
      } catch (e) {
        console.error('Erreur lors du chargement des notes sauvegardées:', e);
      }
    }
    
    // Notes par défaut pour démonstration
    const demoNotes: ModularNote[] = [];
    setModularNotes(demoNotes);
  };

  

  // Fonction pour ajouter une nouvelle note
  const addModularNote = (e: React.MouseEvent) => {
    if (!contentContainerRef.current || !addingNote || !section) return;
    
    // Obtenir la position du clic relative au conteneur
    const containerRect = contentContainerRef.current.getBoundingClientRect();
    const topPercent = ((e.clientY - containerRect.top) / containerRect.height) * 100;
    const leftPercent = ((e.clientX - containerRect.left) / containerRect.width) * 100;
    
    // Créer une nouvelle note
    const newNote: ModularNote = {
      id: `note_${Date.now()}`,
      content: newNoteContent || 'Nouvelle note',
      position: {
        topPercent,
        leftPercent
      },
      color: newNoteColor
    };
    
    // Ajouter la note à la liste
    setModularNotes(prev => [...prev, newNote]);
    
    // Réinitialiser l'état
    setAddingNote(false);
    setNewNoteContent('');
  };

  // Fonction pour éditer une note
  const startEditingNote = (noteId: string) => {
    setEditingNoteId(noteId);
    const note = modularNotes.find(n => n.id === noteId);
    if (note) {
      setNewNoteContent(note.content);
      setNewNoteColor(note.color);
    }
  };

  // Fonction pour sauvegarder une note éditée
  const saveEditedNote = () => {
    if (!editingNoteId) return;
    
    setModularNotes(prev => prev.map(note => 
      note.id === editingNoteId 
        ? { ...note, content: newNoteContent, color: newNoteColor } 
        : note
    ));
    
    setEditingNoteId(null);
    setNewNoteContent('');
  };
  
  // Fonctions pour gérer les annotations
  const handleSaveAnnotations = async (annotationsData: any[]) => {
    if (!section?.lesson?.id || !notebookId) {
      console.warn('Missing lesson ID or notebook ID for saving annotations');
      return;
    }
    
    try {
      await saveLessonAnnotations(notebookId, section.lesson.id, annotationsData);
      setAnnotations(annotationsData);
    } catch (error) {
      console.error('Failed to save annotations:', error);
      toast.error('Erreur lors de la sauvegarde des annotations');
      throw error;
    }
  };
  
  const loadAnnotations = async () => {
    if (!section?.lesson?.id || !notebookId) return;
    
    try {
      setLoadingAnnotations(true);
      const savedAnnotations = await getLessonAnnotations(notebookId, section.lesson.id);
      setAnnotations(savedAnnotations);
    } catch (error) {
      console.error('Failed to load annotations:', error);
    } finally {
      setLoadingAnnotations(false);
    }
  };

  // Fonction pour supprimer une note
  const deleteNote = (noteId: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette note?')) {
      setModularNotes(prev => prev.filter(note => note.id !== noteId));
      if (editingNoteId === noteId) {
        setEditingNoteId(null);
        setNewNoteContent('');
      }
    }
  };

  // Fonction pour déplacer une note (glisser-déposer)
  const moveNote = (noteId: string, newPosition: { topPercent: number, leftPercent: number }) => {
    setModularNotes(prev => prev.map(note => 
      note.id === noteId 
        ? { ...note, position: newPosition } 
        : note
    ));
  };
  
  // Fonction appelée quand TipTapRenderer a fini de charger
  const handleContentReady = () => {
    // Content is ready, stop showing the loading skeleton with a slight delay
    setTimeout(() => {
      setContentLoading(false);
      // Afficher le contenu seulement après que le loading soit terminé
      // pour éviter tout flash du contenu brut
      setTimeout(() => {
        setShowContent(true);
      }, 50);
    }, 100);
  };

  if (!section || !section.lesson) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <div className="bg-indigo-50 p-6 rounded-lg max-w-md text-center">
          <BookMarked className="w-16 h-16 mx-auto text-indigo-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-800 mb-2">Aucun contenu de leçon</h3>
          <p className="text-gray-600">
            Ce chapitre n'a pas encore de contenu de leçon.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 flex-1 relative bg-gradient-to-br from-gray-50 to-white">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6 rounded-2xl shadow-xl mb-6">
            <h2 className="text-3xl font-bold mb-2">
              {section.lesson.title}
            </h2>
            <p className="text-indigo-100 text-lg">
              Chapitre: {section.chapter.name}
            </p>
          </div>
        </div>
        {/* Lesson Content - Clickable for adding notes */}
        <div
          ref={contentContainerRef}
          className={`prose max-w-none mb-8 bg-white/90 backdrop-blur-sm p-8 rounded-2xl shadow-xl border border-white/50 relative transition-all duration-300 hover:shadow-2xl ${addingNote ? 'cursor-crosshair ring-2 ring-indigo-300' : ''}`}
          onClick={addingNote ? addModularNote : undefined}
        >
          {/* Loading state - skeleton loader - Toujours visible jusqu'à ce que le contenu soit prêt */}
          {contentLoading && (
            <div className="absolute inset-0 bg-white z-30 flex flex-col space-y-4 p-4">
              <div className="h-6 bg-gray-200 rounded w-3/4 animate-pulse"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6 animate-pulse"></div>
              <div className="h-20 bg-gray-200 rounded w-full animate-pulse mt-4"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3 animate-pulse"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse"></div>
              <div className="h-32 bg-gray-200 rounded w-full animate-pulse mt-4"></div>
            </div>
          )}

          {/* Modular Notes */}
          {modularNotes.map(note => (
            <div
              key={note.id}
              className="absolute z-30"
              style={{
                top: `${note.position.topPercent}%`,
                left: `${note.position.leftPercent}%`,
              }}
            >
              <div 
                className="flex flex-col items-start group transform transition-all duration-200 hover:scale-105"
                draggable
                onDragEnd={(e) => {
                  if (!contentContainerRef.current) return;
                  const containerRect = contentContainerRef.current.getBoundingClientRect();
                  const topPercent = ((e.clientY - containerRect.top) / containerRect.height) * 100;
                  const leftPercent = ((e.clientX - containerRect.left) / containerRect.width) * 100;
                  moveNote(note.id, { topPercent, leftPercent });
                }}
              >
                {/* Note Icon */}
                <button
                  className="w-10 h-10 rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition-all duration-200 ring-2 ring-white hover:shadow-xl"
                  style={{ backgroundColor: note.color }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (editingNoteId === note.id) {
                      saveEditedNote();
                    } else {
                      startEditingNote(note.id);
                    }
                  }}
                >
                  <MessageSquare className="w-5 h-5 text-white" />
                </button>
                
                {/* Expanded Note Content - only shown when editing */}
                {editingNoteId === note.id && (
                  <div className="mt-2 absolute top-12 z-40 bg-white/95 backdrop-blur-md rounded-xl shadow-2xl p-4 border-l-4 min-w-72 border border-gray-200/50" style={{ borderLeftColor: note.color }}>
                    <div className="flex justify-between mb-3">
                        <div className="flex space-x-2">
                          {noteColors.map(color => (
                            <button
                              key={color}
                              className={`w-6 h-6 rounded-full transition-all duration-200 hover:scale-110 ${newNoteColor === color ? 'ring-2 ring-offset-2 ring-gray-400 shadow-md' : 'hover:shadow-md'}`}
                              style={{ backgroundColor: color }}
                              onClick={(e) => {
                                e.stopPropagation(); 
                                setNewNoteColor(color);
                              }}
                            />
                          ))}
                        </div>
                      <button
                        className="p-2 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 transition-all duration-200"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNote(note.id);
                        }}
                      >
                        <Trash className="w-5 h-5" />
                      </button>
                    </div>
                    <textarea
                      value={newNoteContent}
                      onChange={(e) => setNewNoteContent(e.target.value)}
                      className="w-full p-3 border border-gray-200 rounded-lg resize-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent transition-all duration-200 bg-gray-50/50"
                      rows={4}
                      placeholder="Tapez votre note ici..."
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="flex justify-end mt-2">
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white"
                        onClick={(e) => {
                          e.stopPropagation();
                          saveEditedNote();
                        }}
                      >
                        <Save className="w-3 h-3 mr-1" />
                        Enregistrer
                      </Button>
                    </div>
                  </div>
                )}
                
                {/* Tooltip to show note content on hover */}
                {editingNoteId !== note.id && (
                  <div className="absolute top-10 left-0 hidden group-hover:block bg-white p-2 rounded shadow-md border-l-2 min-w-40 max-w-60 text-sm z-40" style={{ borderColor: note.color }}>
                    {note.content}
                  </div>
                )}
              </div>
            </div>
          ))}
          
          {/* Content wrapper with hidden visibility until completely ready */}
          <div 
            ref={contentRef}
            className={`h-full w-full transition-opacity duration-300 ${showContent ? 'opacity-100 z-20' : 'opacity-0 z-10 invisible absolute'}`}
          >
            
      <NotebookContent
                content={section.lesson.content}
                lessonId={section.lesson.id}
                className="p-6 w-full h-full" // Add any classes you need
                notebookTheme={{
                  bgColor: '#ffffff',
                  lineColor: '#e5e7eb',
                  isGrid: false,
                  lineSpacing: 2
                }}
                onReady={handleContentReady}
                onSaveAnnotations={handleSaveAnnotations}
                initialAnnotations={annotations}
                key={renderKey} // Force re-render when section changes
              />
           
          </div>
        </div>
        
       
      </div>

      {/* Add a style tag for CSS animations */}
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-in-out;
        }
      `}</style>
    </div>
  );
};

export default SectionContent;