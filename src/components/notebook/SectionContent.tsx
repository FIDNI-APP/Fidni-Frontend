import React, { useState, useEffect, useRef } from 'react';
import { PenLine, Edit, Save, X, BookMarked, Plus, Trash, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import TipTapRenderer from '@/components/editor/TipTapRenderer';
import { Section } from '@/types';

// Structure pour les notes modulaires
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
}

const SectionContent: React.FC<SectionContentProps> = ({
  section,
  onStartEditNotes,
  onSaveNotes,
  onCancelEditNotes,
  editingNotes,
  noteContent,
  setNoteContent,
  onSaveModularNotes
}) => {
  // State to force re-rendering of TipTapRenderer
  const [renderKey, setRenderKey] = useState<number>(0);
  
  // État pour gérer l'affichage fluide du contenu
  const [contentLoading, setContentLoading] = useState<boolean>(true);
  
  // State pour les notes modulaires
  const [modularNotes, setModularNotes] = useState<ModularNote[]>([]);
  const [addingNote, setAddingNote] = useState<boolean>(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [newNoteContent, setNewNoteContent] = useState<string>('');
  const [newNoteColor, setNewNoteColor] = useState<string>('#FFEB3B'); // Jaune par défaut
  
  // Référence pour le conteneur de contenu
  const contentContainerRef = useRef<HTMLDivElement>(null);
  
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
      
      // Force TipTapRenderer to re-render with new content by changing its key
      setRenderKey(prev => prev + 1);
      
      // Charger les notes modulaires pour cette section
      loadModularNotes(section.id);
    }
  }, [section?.id]);

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

  // Fonction pour sauvegarder les notes modulaires
  const saveModularNotes = async () => {
    if (!section) return;
    
    try {
      // Dans un scénario réel, vous appelleriez votre API backend
      // Si nous avons une fonction de rappel, utilisons-la
      if (onSaveModularNotes) {
        await onSaveModularNotes(section.id, modularNotes);
      }
      
      // Pour le développement, sauvegardons dans localStorage
      localStorage.setItem(`modular_notes_${section.id}`, JSON.stringify(modularNotes));
      
      // Feedback visuel
      alert('Notes sauvegardées avec succès!');
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des notes:', error);
      alert('Erreur lors de la sauvegarde des notes');
    }
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
    // Content is ready, stop showing the loading skeleton
    setContentLoading(false);
  };

  if (!section || !section.lesson) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <div className="bg-indigo-50 p-6 rounded-lg max-w-md text-center">
          <BookMarked className="w-16 h-16 mx-auto text-indigo-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-800 mb-2">No lesson content</h3>
          <p className="text-gray-600">
            This chapter doesn't have any lesson content yet.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 overflow-y-auto flex-1 relative">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 bg-white inline-block px-1">
            {section.lesson.title}
          </h2>
          <p className="text-sm text-gray-500 mt-1 bg-white inline-block px-1">
            Chapter: {section.chapter.name}
          </p>
        </div>
        
        {/* Floating Add Note Button */}
        <div className="sticky top-4 z-50 flex justify-end mb-4">
          <div className="flex items-center bg-white rounded-full shadow-md">
            {addingNote && (
              <span className="text-sm bg-yellow-50 text-yellow-800 px-3 py-1 rounded-l-full border-r border-gray-200">
                Cliquez sur le contenu pour placer votre note
              </span>
            )}
            <Button
              size="sm"
              onClick={() => setAddingNote(!addingNote)}
              className={`rounded-full ${addingNote ? 'bg-amber-500' : 'bg-indigo-600'}`}
            >
              {addingNote ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4 mr-1" />}
              {!addingNote && "Ajouter une note"}
            </Button>
          </div>
        </div>
    
        {/* Lesson Content - Clickable for adding notes */}
        <div
          ref={contentContainerRef}
          className={`prose max-w-none mb-8 bg-white/80 p-6 rounded-lg shadow-sm relative ${addingNote ? 'cursor-crosshair' : ''}`}
          onClick={addingNote ? addModularNote : undefined}
        >
          {/* Loading state - skeleton loader */}
          {contentLoading && (
            <div className="absolute inset-0 bg-white z-20 flex flex-col space-y-4 p-4">
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
                className="flex flex-col items-start group"
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
                  className="w-8 h-8 rounded-full shadow-md flex items-center justify-center hover:scale-110 transition-transform duration-200"
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
                  <MessageSquare className="w-4 h-4 text-white" />
                </button>
                
                {/* Expanded Note Content - only shown when editing */}
                {editingNoteId === note.id && (
                  <div className="mt-2 absolute top-10 z-20 bg-white rounded-lg shadow-lg p-3 border-l-4 min-w-64" style={{ borderColor: note.color }}>
                    <div className="flex justify-between mb-2">
                      <div className="flex space-x-1">
                        {noteColors.map(color => (
                          <button
                            key={color}
                            className={`w-5 h-5 rounded-full ${newNoteColor === color ? 'ring-2 ring-offset-1 ring-gray-400' : ''}`}
                            style={{ backgroundColor: color }}
                            onClick={(e) => {
                              e.stopPropagation(); 
                              setNewNoteColor(color);
                            }}
                          />
                        ))}
                      </div>
                      <button
                        className="text-red-500 hover:text-red-700"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNote(note.id);
                        }}
                      >
                        <Trash className="w-4 h-4" />
                      </button>
                    </div>
                    <textarea
                      value={newNoteContent}
                      onChange={(e) => setNewNoteContent(e.target.value)}
                      className="w-full p-2 border border-gray-200 rounded text-sm"
                      rows={3}
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
                  <div className="absolute top-10 left-0 hidden group-hover:block bg-white p-2 rounded shadow-md border-l-2 min-w-40 max-w-60 text-sm z-10" style={{ borderColor: note.color }}>
                    {note.content}
                  </div>
                )}
              </div>
            </div>
          ))}
          
          {/* Content wrapper with hidden visibility until rendered */}
          <div 
            className="relative"
            style={{ 
              visibility: contentLoading ? 'hidden' : 'visible',
              opacity: contentLoading ? 0 : 1,
              transition: 'opacity 0.3s ease-in-out'
            }}
          >
            <TipTapRenderer 
              key={`section-${section.id}-renderer-${renderKey}`} 
              content={section.lesson.content}
              onReady={handleContentReady}
            />
          </div>
        </div>
        
        {/* Save Modular Notes Button */}
        {modularNotes.length > 0 && (
          <div className="mb-8 flex justify-end">
            <Button
              onClick={saveModularNotes}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Save className="w-4 h-4 mr-2" />
              Enregistrer toutes les notes
            </Button>
          </div>
        )}
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