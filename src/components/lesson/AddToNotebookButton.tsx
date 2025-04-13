import React, { useState, useEffect } from 'react';
import { Book, BookOpen, Plus, Check, ChevronDown, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import api from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthModal } from '@/components/AuthController';
import { createPortal } from 'react-dom';

interface AddToNotebookButtonProps {
  lessonId: string;
}

interface Section {
  id: string;
  title: string;
  subject: {
    id: string;
    name: string;
  };
}

interface Chapter {
  id: string;
  name: string;
}

const AddToNotebookButton: React.FC<AddToNotebookButtonProps> = ({ lessonId }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [sections, setSections] = useState<Section[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [selectedChapter, setSelectedChapter] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { isAuthenticated } = useAuth();
  const { openModal } = useAuthModal();
  
  // Référence au bouton pour positionner le dropdown
  const buttonRef = React.useRef<HTMLDivElement>(null);
  // Position du dropdown
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });

  // Calcule la position du dropdown par rapport au bouton
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY,
        left: Math.max(0, rect.right - 280 + window.scrollX), // Aligné à droite, mais reste visible
        width: 280 // Largeur fixe du dropdown
      });
    }
  }, [isOpen]);

  // Fermer le dropdown au clic à l'extérieur
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (buttonRef.current && !buttonRef.current.contains(e.target as Node) && isOpen) {
        // Vérifier si le clic était dans le dropdown
        const target = e.target as HTMLElement;
        if (!target.closest('.notebook-dropdown-menu')) {
          setIsOpen(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Charger les sections du cahier
  useEffect(() => {
    if (isOpen && isAuthenticated) {
      fetchNotebookSections();
    }
  }, [isOpen, isAuthenticated]);

  // Charger les chapitres quand une section est sélectionnée
  useEffect(() => {
    if (selectedSection) {
      fetchChapters(selectedSection);
    } else {
      setChapters([]);
    }
  }, [selectedSection]);

  // Dans AddToNotebookButton.tsx

const fetchNotebookSections = async () => {
  try {
    setIsLoading(true);
    const response = await api.get('/notebooks/my_notebook/');
    console.log('API Response:', response.data); // Log complet de la réponse
    
    // Vérification de la structure des données
    if (response.data && response.data.sections) {
      console.log('Sections trouvées:', response.data.sections.length);
      setSections(response.data.sections);
    } else {
      console.warn('Format de réponse inattendu:', response.data);
      // Essayons de trouver les sections si elles sont à un autre endroit
      if (Array.isArray(response.data)) {
        console.log('Essai avec la réponse directe comme tableau');
        setSections(response.data);
      } else {
        setError('Format de réponse inattendu');
      }
    }
    setIsLoading(false);
  } catch (err) {
    console.error('Erreur lors du chargement des sections:', err);
    setError('Impossible de charger votre cahier');
    setIsLoading(false);
  }
};

  const fetchChapters = async (sectionId: string) => {
    try {
      const response = await api.get(`/sections/${sectionId}/chapters/`);
      setChapters(response.data || []);
    } catch (err) {
      console.error('Erreur lors du chargement des chapitres:', err);
      setChapters([]);
    }
  };

  const handleButtonClick = () => {
    if (!isAuthenticated) {
      openModal();
      return;
    }
    setIsOpen(!isOpen);
    // Réinitialiser les messages
    setError(null);
    setSuccess(null);
  };

  const handleAddToNotebook = async () => {
    if (!selectedSection) {
      setError('Veuillez sélectionner une matière');
      return;
    }

    try {
      setIsLoading(true);
      await api.post('/entries/', {
        section_id: selectedSection,
        lesson_id: lessonId,
        chapter_id: selectedChapter || null
      });
      
      setSuccess('Leçon ajoutée à votre cahier');
      setIsLoading(false);
      
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

  // Rendu du dropdown en dehors de la hiérarchie DOM pour éviter les problèmes d'overflow
  const renderDropdown = () => {
    if (!isOpen) return null;
    
    return createPortal(
      <div 
        className="fixed notebook-dropdown-menu bg-white rounded-md shadow-xl z-50 border border-gray-200"
        style={{
          top: `${dropdownPosition.top}px`,
          left: `${dropdownPosition.left}px`,
          width: `${dropdownPosition.width}px`,
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

          {isLoading && !sections.length ? (
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
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Matière
                </label>
                <div className="relative">
                  <select
                    value={selectedSection}
                    onChange={(e) => setSelectedSection(e.target.value)}
                    className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                  >
                    <option value="">Sélectionner une matière</option>
                    {sections.map((section) => (
                      <option key={section.id} value={section.id}>
                        {section.title}
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  </div>
                </div>
              </div>

              {selectedSection && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Chapitre (optionnel)
                  </label>
                  <div className="relative">
                    <select
                      value={selectedChapter}
                      onChange={(e) => setSelectedChapter(e.target.value)}
                      className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                    >
                      <option value="">Sans chapitre</option>
                      {chapters.map((chapter) => (
                        <option key={chapter.id} value={chapter.id}>
                          {chapter.name}
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
                className="w-full flex justify-center items-center"
                disabled={!selectedSection || isLoading}
                type="button"
              >
                {isLoading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Ajouter
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </div>,
      document.body
    );
  };

  return (
    <div ref={buttonRef} className="inline-block">
      <Button
        onClick={handleButtonClick}
        className="flex items-center bg-amber-500 hover:bg-amber-600 text-white"
        size="sm"
      >
        <Book className="w-4 h-4 mr-2" />
        Ajouter au cahier
      </Button>
      
      {renderDropdown()}
    </div>
  );
};

export default AddToNotebookButton;