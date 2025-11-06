import React, { useState, useEffect } from 'react';
import { Book, Plus, Check, ChevronDown, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import api from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthModal } from '@/components/AuthController';

interface AddToNotebookButtonProps {
  lessonId: string;
}

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
}

interface Section {
  id: string;
  chapter: {
    id: string;
    name: string;
  };
  lesson_entries: any[];
}

const AddToNotebookButton: React.FC<AddToNotebookButtonProps> = ({ lessonId }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [selectedNotebook, setSelectedNotebook] = useState<string>('');
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { isAuthenticated } = useAuth();
  const { openModal } = useAuthModal();
  
  // Référence au conteneur principal
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Fermer le dropdown au clic à l'extérieur
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node) && isOpen) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Charger les cahiers quand le dropdown s'ouvre
  useEffect(() => {
    if (isOpen && isAuthenticated) {
      fetchNotebooks();
    }
  }, [isOpen, isAuthenticated]);

  // Charger les sections quand un cahier est sélectionné
  useEffect(() => {
    if (selectedNotebook) {
      fetchSections(selectedNotebook);
    } else {
      setSections([]);
      setSelectedSection('');
    }
  }, [selectedNotebook]);

  const fetchNotebooks = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/notebooks/get_notebooks/');
      console.log('Notebooks response:', response.data);
      setNotebooks(response.data);
      setIsLoading(false);
    } catch (err) {
      console.error('Erreur lors du chargement des cahiers:', err);
      setError('Impossible de charger vos cahiers');
      setIsLoading(false);
    }
  };

  const fetchSections = async (notebookId: string) => {
    try {
      const response = await api.get(`/notebooks/${notebookId}/`);
      console.log('Sections response:', response.data.sections);
      setSections(response.data.sections);
    } catch (err) {
      console.error('Erreur lors du chargement des sections:', err);
      setSections([]);
    }
  };

  const handleButtonClick = () => {
    if (!isAuthenticated) {
      openModal();
      return;
    }
    setIsOpen(!isOpen);
    // Réinitialiser
    setError(null);
    setSuccess(null);
    setSelectedNotebook('');
    setSelectedSection('');
  };

  const handleAddToNotebook = async () => {
    if (!selectedNotebook || !selectedSection) {
      setError('Veuillez sélectionner un cahier et une section');
      return;
    }

    try {
      setIsLoading(true);
      
      // Use the new nested API
      await api.post(`/notebooks/${selectedNotebook}/chapters/${selectedSection}/add_lesson/`, {
        lesson_id: lessonId
      });
      
      setSuccess('Leçon ajoutée à votre cahier');
      setIsLoading(false);
      
      // Trigger notebook refresh event
      window.dispatchEvent(new CustomEvent('refreshNotebook'));
      
      // Fermer le dropdown après un délai
      setTimeout(() => {
        setIsOpen(false);
        setSuccess(null);
      }, 2000);
    } catch (err) {
      console.error('Erreur lors de l\'ajout au cahier:', err);
      setError('Erreur lors de l\'ajout au cahier');
      setIsLoading(false);
    }
  };

  return (
    <div ref={containerRef} className="relative inline-block">
      <Button
        onClick={handleButtonClick}
        className="flex items-center bg-amber-500 hover:bg-amber-600 text-white"
        size="sm"
      >
        <Book className="w-4 h-4 mr-2" />
        Ajouter au cahier
      </Button>
      
      {isOpen && (
        <div 
          className="absolute right-0 mt-2 w-72 bg-white rounded-md shadow-xl z-50 border border-gray-200"
          style={{
            maxHeight: '400px',
            overflowY: 'auto'
          }}
        >
          <div className="p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-medium text-gray-900">Ajouter à mon cahier</h3>
              <button 
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600"
                type="button"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {isLoading && !notebooks.length ? (
              <div className="py-4 flex justify-center">
                <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-indigo-500"></div>
              </div>
            ) : error ? (
              <div className="bg-red-50 text-red-700 p-3 rounded-md mb-4">
                {error}
              </div>
            ) : success ? (
              <div className="bg-green-50 text-green-700 p-3 rounded-md mb-4 flex items-center">
                <Check className="w-5 h-5 mr-2" />
                {success}
              </div>
            ) : (
              <>
                {notebooks.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-gray-500 mb-4">Vous n'avez pas encore de cahiers.</p>
                    <Button
                      onClick={() => window.location.href = '/profile'}
                      className="bg-indigo-600 hover:bg-indigo-700 text-black"
                      size="sm"
                    >
                      Créer un cahier
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Cahier
                      </label>
                      <div className="relative">
                        <select
                          value={selectedNotebook}
                          onChange={(e) => setSelectedNotebook(e.target.value)}
                          className="block w-full pl-3 pr-10 py-2 text-black border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                        >
                          <option value="">Sélectionner un cahier</option>
                          {notebooks.map((notebook) => (
                            <option key={notebook.id} value={notebook.id}>
                              {notebook.title}
                            </option>
                          ))}
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                          <ChevronDown className="w-4 h-4 text-gray-400" />
                        </div>
                      </div>
                    </div>

                    {selectedNotebook && (
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Chapitre
                        </label>
                        <div className="relative">
                          <select
                            value={selectedSection}
                            onChange={(e) => setSelectedSection(e.target.value)}
                            className="block w-full pl-3 pr-10 py-2 text-base text-black border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                          >
                            <option value="">Sélectionner un chapitre</option>
                            {sections.map((section) => (
                              <option 
                                key={section.id} 
                                value={section.id}
                              >
                                {section.chapter.name}
                              </option>
                            ))}
                          </select>
                          <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                            <ChevronDown className="w-4 h-4 text-gray-400" />
                          </div>
                        </div>
                      </div>
                    )}

                    <Button
                      onClick={handleAddToNotebook}
                      className="w-full text-black flex justify-center items-center hover:bg-purple-600 bg-purple-500 mt-2"
                      disabled={!selectedNotebook || !selectedSection || isLoading}
                      type="button"
                      variant='ghost'
                    >
                      {isLoading ? (
                        <div className="animate-spin text-dark rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                      ) : (
                        <>
                          <Plus className="w-4 h-4 mr-2" />
                          Ajouter
                        </>
                      )}
                    </Button>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AddToNotebookButton;