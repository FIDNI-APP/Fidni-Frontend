// src/components/Filters.tsx - Version adaptative selon le type de contenu

import React, { useState, useEffect, useRef } from 'react';
import { X, Filter, BookOpen, GraduationCap, ChevronUp, ChevronDown, Tag, BarChart3, FileText, Award } from 'lucide-react';
import { getClassLevels, getSubjects, getChapters, getSubfields, getTheorems, getFilterCounts } from '@/lib/api';
import { ClassLevelModel, SubjectModel, ChapterModel, Difficulty, Subfield, Theorem } from '@/types';
import { Button } from '@/components/ui/button';
interface FiltersProps {
  onFilterChange: (filters: {
    classLevels: string[];
    subjects: string[];
    subfields: string[];
    chapters: string[];
    theorems: string[];
    difficulties: Difficulty[];
    showViewed?: boolean;
    showCompleted?: boolean;
  }) => void;
  initialClassLevels?: string[];
  initialSubjects?: string[];
  initialSubfields?: string[];
  initialChapters?: string[];
  initialTheorems?: string[];
  initialDifficulties?: Difficulty[];
  initialShowViewed?: boolean;
  initialShowCompleted?: boolean;
  contentType?: 'exercise' | 'lesson' | 'exam'; // Type de contenu pour adapter les filtres disponibles
}

type FilterCategories = {
  classLevels: string[];
  subjects: string[];
  subfields: string[];
  chapters: string[];
  theorems: string[];
  difficulties: Difficulty[];
  showViewed: boolean;
  showCompleted: boolean;
};

type FilterSection = {
  title: string;
  category: keyof FilterCategories;
  icon: React.ReactNode;
};

// Debounce utility to prevent rapid successive API calls
const debounce = (func: Function, wait: number) => {
  let timeout: NodeJS.Timeout;
  return function executedFunction(...args: any[]) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

export const Filters: React.FC<FiltersProps> = ({
  onFilterChange,
  initialClassLevels = [],
  initialSubjects = [],
  initialSubfields = [],
  initialChapters = [],
  initialTheorems = [],
  initialDifficulties = [],
  initialShowViewed = false,
  initialShowCompleted = false,
  contentType = 'exercise' // Valeur par défaut
}) => {
  const [classLevels, setClassLevels] = useState<ClassLevelModel[]>([]);
  const [subjects, setSubjects] = useState<SubjectModel[]>([]);
  const [subfields, setSubfields] = useState<Subfield[]>([]);
  const [chapters, setChapters] = useState<ChapterModel[]>([]);
  const [theorems, setTheorems] = useState<Theorem[]>([]);

  const initialValuesSet = useRef(false);

  const [selectedFilters, setSelectedFilters] = useState<FilterCategories>({
    classLevels: initialClassLevels.map(String),
    subjects: initialSubjects.map(String),
    subfields: initialSubfields.map(String),
    chapters: initialChapters.map(String),
    theorems: initialTheorems.map(String),
    difficulties: initialDifficulties,
    showViewed: initialShowViewed,
    showCompleted: initialShowCompleted,
  });
  
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    classLevels: true,
    subjects: true,
    subfields: false,
    chapters: false,
    theorems: false,
    difficulties: true,
  });
  
  const [isLoadingSubfields, setIsLoadingSubfields] = useState(false);
  const [isLoadingChapters, setIsLoadingChapters] = useState(false);
  const [isLoadingTheorems, setIsLoadingTheorems] = useState(false);

  const [lastRequests, setLastRequests] = useState({
    subfields: '',
    chapters: '',
    theorems: ''
  });

  // State for filter counts
  const [filterCounts, setFilterCounts] = useState<Record<string, Record<string, number>>>({
    classLevels: {},
    subjects: {},
    subfields: {},
    chapters: {},
    theorems: {},
    difficulties: {}
  });

  const shouldShowSubfieldOptions = () => {
    return selectedFilters.classLevels.length > 0 && selectedFilters.subjects.length > 0;
  };

  const shouldShowChapterOptions = () => {
    return shouldShowSubfieldOptions() && selectedFilters.subfields.length > 0;
  };

  const shouldShowTheoremOptions = () => {
    return shouldShowChapterOptions() && selectedFilters.chapters.length > 0;
  };

  // Fonction pour déterminer quels filtres afficher selon le type de contenu
  const getAvailableFilterSections = (): FilterSection[] => {
    // Définir les couleurs selon le type de contenu
    const primaryColor = contentType === 'lesson' ? 'text-blue-800' : 
                         contentType === 'exam' ? 'text-green-800' : 
                         'text-indigo-600';
    const secondaryColor = contentType === 'lesson' ? 'text-blue-800' : 
                           contentType === 'exam' ? 'text-amber-600' : 
                           'text-purple-600';

    const allSections: FilterSection[] = [
      { title: 'Niveau', category: 'classLevels', icon: <GraduationCap className={`w-4 h-4 ${primaryColor}`} /> },
      { title: 'Matières', category: 'subjects', icon: <BookOpen className={`w-4 h-4 ${secondaryColor}`} /> },
      { title: 'Sous-domaines', category: 'subfields', icon: <FileText className={`w-4 h-4 ${primaryColor}`} /> },
      { title: 'Chapitres', category: 'chapters', icon: <Tag className={`w-4 h-4 ${secondaryColor}`} /> },
      { title: 'Théorèmes', category: 'theorems', icon: <Award className={`w-4 h-4 ${primaryColor}`} /> },
    ];

    // Ajouter la difficulté uniquement pour les exercices et examens
    if (contentType !== 'lesson') {
      allSections.push({ 
        title: 'Difficulté', 
        category: 'difficulties', 
        icon: <BarChart3 className={`w-4 h-4 ${secondaryColor}`} /> 
      });
    }

    return allSections;
  };

  const filterSections = getAvailableFilterSections();

  // Fetch counts for filter options
  const fetchFilterCounts = async (category: keyof FilterCategories, items: any[]) => {
    if (items.length === 0) return;

    try {
      const counts: Record<string, number> = {};

      // For each item, fetch the count with that filter applied
      await Promise.all(
        items.map(async (item) => {
          const itemId = typeof item === 'string' ? item : String(item.id);

          // Build params with current filters + this specific item
          const params = {
            classLevels: category === 'classLevels' ? [itemId] : selectedFilters.classLevels,
            subjects: category === 'subjects' ? [itemId] : selectedFilters.subjects,
            subfields: category === 'subfields' ? [itemId] : selectedFilters.subfields,
            chapters: category === 'chapters' ? [itemId] : selectedFilters.chapters,
            theorems: category === 'theorems' ? [itemId] : selectedFilters.theorems,
            difficulties: category === 'difficulties' ? [itemId as Difficulty] : selectedFilters.difficulties,
            filterType: category,
            contentType: contentType
          };

          try {
            const result = await getFilterCounts(params);
            counts[itemId] = result.count;
          } catch (error) {
            console.error(`Error fetching count for ${category}:${itemId}`, error);
            counts[itemId] = 0;
          }
        })
      );

      setFilterCounts(prev => ({
        ...prev,
        [category]: counts
      }));
    } catch (error) {
      console.error(`Error fetching counts for ${category}`, error);
    }
  };

  useEffect(() => {
    loadClassLevels();
  }, []);

  // REMOVED: This useEffect was causing filters to reset to empty arrays
  // The initial state is already set correctly in useState() above
  
  useEffect(() => {
    if (selectedFilters.classLevels.length > 0) {
      loadSubjects();
    } else {
      setSubjects([]);
      setSelectedFilters(prev => ({
        ...prev,
        subjects: [],
        subfields: [],
        chapters: [],
        theorems: []
      }));
    }
  }, [selectedFilters.classLevels]);
  
  useEffect(() => {
    if (expandedSections.subfields && shouldShowSubfieldOptions()) {
      loadSubfields();
    } else if (!shouldShowSubfieldOptions()) {
      setSubfields([]);
      // CORRECTION : Invalider la dernière requête pour les sous-domaines
      setLastRequests(prev => ({ ...prev, subfields: '' }));
    }
  }, [
    expandedSections.subfields, 
    selectedFilters.subjects, 
    selectedFilters.classLevels
  ]);
  
  useEffect(() => {
    if (expandedSections.chapters && shouldShowChapterOptions()) {
      loadChapters();
    } else if (!shouldShowChapterOptions()) {
      setChapters([]);
      // CORRECTION : Invalider la dernière requête pour les chapitres
      setLastRequests(prev => ({ ...prev, chapters: '' }));
    }
  }, [
    expandedSections.chapters,
    selectedFilters.subfields,
    selectedFilters.subjects,
    selectedFilters.classLevels
  ]);
  
  useEffect(() => {
    if (expandedSections.theorems && shouldShowTheoremOptions()) {
      loadTheorems();
    } else if (!shouldShowTheoremOptions()) {
      setTheorems([]);
      // CORRECTION : Invalider la dernière requête pour les théorèmes
      setLastRequests(prev => ({ ...prev, theorems: '' }));
    }
  }, [
    expandedSections.theorems,
    selectedFilters.chapters,
    selectedFilters.subfields,
    selectedFilters.subjects,
    selectedFilters.classLevels
  ]);
  
  const debouncedOnFilterChange = useRef(
    debounce((filters: FilterCategories) => {
      onFilterChange(filters);
    }, 300)
  ).current;

  useEffect(() => {
    debouncedOnFilterChange(selectedFilters);
  }, [selectedFilters, debouncedOnFilterChange]); // Ajout de debouncedOnFilterChange aux dépendances

  useEffect(() => {
    if (selectedFilters.subjects.length > 0 && shouldShowSubfieldOptions()) {
      setExpandedSections(prev => ({ ...prev, subfields: true }));
    }
  }, [selectedFilters.subjects]);

  useEffect(() => {
    if (selectedFilters.subfields.length > 0 && shouldShowChapterOptions()) {
      setExpandedSections(prev => ({ ...prev, chapters: true }));
    }
  }, [selectedFilters.subfields]);

  useEffect(() => {
    if (selectedFilters.chapters.length > 0 && shouldShowTheoremOptions()) {
      setExpandedSections(prev => ({ ...prev, theorems: true }));
    }
  }, [selectedFilters.chapters]);

  // Fetch counts when class levels are loaded or filters change
  useEffect(() => {
    if (classLevels.length > 0) {
      fetchFilterCounts('classLevels', classLevels);
    }
  }, [classLevels, selectedFilters.subjects, selectedFilters.subfields, selectedFilters.chapters, selectedFilters.theorems, selectedFilters.difficulties]);

  // Fetch counts for subjects when loaded or filters change
  useEffect(() => {
    if (subjects.length > 0) {
      fetchFilterCounts('subjects', subjects);
    }
  }, [subjects, selectedFilters.classLevels, selectedFilters.subfields, selectedFilters.chapters, selectedFilters.theorems, selectedFilters.difficulties]);

  // Fetch counts for subfields when loaded or filters change
  useEffect(() => {
    if (subfields.length > 0) {
      fetchFilterCounts('subfields', subfields);
    }
  }, [subfields, selectedFilters.classLevels, selectedFilters.subjects, selectedFilters.chapters, selectedFilters.theorems, selectedFilters.difficulties]);

  // Fetch counts for chapters when loaded or filters change
  useEffect(() => {
    if (chapters.length > 0) {
      fetchFilterCounts('chapters', chapters);
    }
  }, [chapters, selectedFilters.classLevels, selectedFilters.subjects, selectedFilters.subfields, selectedFilters.theorems, selectedFilters.difficulties]);

  // Fetch counts for theorems when loaded or filters change
  useEffect(() => {
    if (theorems.length > 0) {
      fetchFilterCounts('theorems', theorems);
    }
  }, [theorems, selectedFilters.classLevels, selectedFilters.subjects, selectedFilters.subfields, selectedFilters.chapters, selectedFilters.difficulties]);

  // Fetch counts for difficulties when filters change
  useEffect(() => {
    const difficulties = ['easy', 'medium', 'hard'];
    fetchFilterCounts('difficulties', difficulties);
  }, [selectedFilters.classLevels, selectedFilters.subjects, selectedFilters.subfields, selectedFilters.chapters, selectedFilters.theorems]);

  const loadClassLevels = async () => {
    try {
      const data = await getClassLevels();
      setClassLevels(data);
    } catch (error) {
      console.error('Failed to load class levels:', error);
    }
  };

  const getUniqueById = <T extends { id: string }>(array: T[]): T[] => {
    return Array.from(new Map(array.map(item => [item.id, item])).values());
  };

  const loadSubjects = async () => {
    if (selectedFilters.classLevels.length === 0) {
      setSubjects([]);
      return;
    }
    try {
      const data = await getSubjects(selectedFilters.classLevels);
      const uniqueSubjects = getUniqueById(data);
      setSubjects(uniqueSubjects);
    } catch (error) {
      console.error('Failed to load subjects:', error);
    }
  };

  const loadSubfields = async () => {
    if (!shouldShowSubfieldOptions()) { // Simplification de la condition
      setSubfields([]);
      return;
    }
    const requestSignature = JSON.stringify({
      subjects: [...selectedFilters.subjects].sort(),
      classLevels: [...selectedFilters.classLevels].sort()
    });
    if (requestSignature === lastRequests.subfields && subfields.length > 0) { // Ajout de subfields.length > 0 pour permettre le rechargement si vide
      return;
    }
    setIsLoadingSubfields(true);
    try {
      setLastRequests(prev => ({ ...prev, subfields: requestSignature }));
      const promises = selectedFilters.subjects.map(subject => 
        getSubfields(subject, selectedFilters.classLevels)
      );
      const results = await Promise.all(promises);
      const allSubfields = results.flat();
      const uniqueSubfields = getUniqueById(allSubfields);
      setSubfields(uniqueSubfields);
    } catch (error) {
      console.error('Failed to load subfields:', error);
      setLastRequests(prev => ({ ...prev, subfields: '' })); // Réinitialiser en cas d'erreur
    } finally {
      setIsLoadingSubfields(false);
    }
  };

  const loadChapters = async () => {
    if (!shouldShowChapterOptions()) { // Simplification
      setChapters([]);
      return;
    }
    const requestSignature = JSON.stringify({
      subjects: [...selectedFilters.subjects].sort(),
      classLevels: [...selectedFilters.classLevels].sort(),
      subfields: [...selectedFilters.subfields].sort()
    });
    if (requestSignature === lastRequests.chapters && chapters.length > 0) { // Ajout de chapters.length > 0
      return;
    }
    setIsLoadingChapters(true);
    try {
      setLastRequests(prev => ({ ...prev, chapters: requestSignature }));
      // Supposant que getChapters peut gérer plusieurs sous-domaines ou que vous prenez le premier sujet comme référence
      const data = await getChapters(
        selectedFilters.subjects[0], // Use first selected subject
        selectedFilters.classLevels,
        selectedFilters.subfields
      );
      const uniqueChapters = getUniqueById(data);
      setChapters(uniqueChapters);
    } catch (error) {
      console.error('Failed to load chapters:', error);
      setLastRequests(prev => ({ ...prev, chapters: '' })); // Réinitialiser en cas d'erreur
    } finally {
      setIsLoadingChapters(false);
    }
  };

  const loadTheorems = async () => {
    if (!shouldShowTheoremOptions()) { // Simplification
      setTheorems([]);
      return;
    }
    const requestSignature = JSON.stringify({
      subjects: [...selectedFilters.subjects].sort(),
      classLevels: [...selectedFilters.classLevels].sort(),
      subfields: [...selectedFilters.subfields].sort(),
      chapters: [...selectedFilters.chapters].sort()
    });
    if (requestSignature === lastRequests.theorems && theorems.length > 0) { // Ajout de theorems.length > 0
      return;
    }
    setIsLoadingTheorems(true);
    try {
      setLastRequests(prev => ({ ...prev, theorems: requestSignature }));
       // Supposant que getTheorems peut gérer plusieurs chapitres ou que vous prenez le premier sujet comme référence
      const data = await getTheorems(
        selectedFilters.subjects[0], // Use first selected subject
        selectedFilters.classLevels,
        selectedFilters.subfields,
        selectedFilters.chapters
      );
      const uniqueTheorems = getUniqueById(data);
      setTheorems(uniqueTheorems);
    } catch (error) {
      console.error('Failed to load theorems:', error);
      setLastRequests(prev => ({ ...prev, theorems: '' })); // Réinitialiser en cas d'erreur
    } finally {
      setIsLoadingTheorems(false);
    }
  };

  const toggleFilter = (category: keyof FilterCategories, value: string | Difficulty) => {
    setSelectedFilters(prev => {
      const newFilters = { ...prev };

      if (category === 'difficulties') {
        if (newFilters.difficulties.includes(value as Difficulty)) {
          newFilters.difficulties = newFilters.difficulties.filter(v => v !== value);
        } else {
          newFilters.difficulties = [...newFilters.difficulties, value as Difficulty];
        }
      } else {
        const currentCategoryFilters = newFilters[category] as string[]; // Cast pour type string[]
        if (currentCategoryFilters.includes(value as string)) {
          newFilters[category] = currentCategoryFilters.filter(v => v !== value);

          if (category === 'classLevels') {
            // Géré dans useEffect pour selectedFilters.classLevels
          } else if (category === 'subjects') {
            newFilters.subfields = [];
            newFilters.chapters = [];
            newFilters.theorems = [];
          } else if (category === 'subfields') {
            newFilters.chapters = [];
            newFilters.theorems = [];
          } else if (category === 'chapters') {
            newFilters.theorems = [];
          }
        } else {
          newFilters[category] = [...currentCategoryFilters, value as string];
        }
      }

      return newFilters;
    });
  };
  
  const getFilterName = (category: keyof FilterCategories, id: string) => {
    const source: Record<string, any[]> = { 
      classLevels, 
      subjects, 
      subfields,
      chapters,
      theorems
    };
    
    if (category in source) {
      const items = source[category];
      const found = items.find(item => String(item.id) === String(id));
      if (found) {
        return found.name;
      }
      // Si l'élément n'est pas encore chargé, essayez de le trouver dans les filtres initiaux (si pertinent)
      // ou retourner l'ID en attendant.
      if(category === 'classLevels' && initialClassLevels.includes(id) ) {
        // Potentiellement chercher dans une liste initiale de noms si disponible
      }
      if(category === 'subjects' && initialSubjects.includes(id) ) {
        // Potentiellement chercher dans une liste initiale de noms si disponible
      }
      return `ID: ${id}`; // Fallback plus informatif
    }
    if (category === 'difficulties') {
      return getDifficultyLabel(id);
    }
    
    return id.charAt(0).toUpperCase() + id.slice(1);
  };

  const getDifficultyColor = (difficulty: string): string => {
    switch (difficulty) {
      case 'easy':
        return 'liquid-glass bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border-emerald-200';
      case 'medium':
        return 'liquid-glass bg-amber-100 text-amber-800 hover:bg-amber-200 border-amber-200';
      case 'hard':
        return 'liquid-glass bg-red-100 text-red-800 hover:bg-red-200 border-red-200';
      default:
        return 'liquid-glass bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getDifficultyLabel = (difficulty: string): string => {
    switch (difficulty) {
      case 'easy':
        return 'Facile';
      case 'medium':
        return 'Moyen';
      case 'hard':
        return 'Difficile';
      default:
        return difficulty;
    }
  };

  const toggleSection = (category: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const renderFilterCategory = (
    section: FilterSection,
    items: { id: string; name: string }[] | Difficulty[]
  ) => {
    const { title, category, icon } = section;
    const isExpanded = expandedSections[category];

    const needsScroll = ['chapters', 'theorems', 'subfields'].includes(category);
    const scrollableClass = needsScroll ? "max-h-[300px] overflow-y-auto pr-2" : "";

    let isDisabled = false;
    let disabledMessage = "";
    
    if (category === 'subfields' && !shouldShowSubfieldOptions()) {
      isDisabled = true;
      disabledMessage = "Veuillez sélectionner une matière et un niveau d'abord";
    } else if (category === 'chapters' && !shouldShowChapterOptions()) {
      isDisabled = true;
      disabledMessage = "Veuillez sélectionner un sous-domaine d'abord";
    } else if (category === 'theorems' && !shouldShowTheoremOptions()) {
      isDisabled = true;
      disabledMessage = "Veuillez sélectionner un chapitre d'abord";
    }

    let isLoading = false;
    if (category === 'subfields' && isLoadingSubfields) {
      isLoading = true;
    } else if (category === 'chapters' && isLoadingChapters) {
      isLoading = true;
    } else if (category === 'theorems' && isLoadingTheorems) {
      isLoading = true;
    }

    // Déterminer si c'est la dernière section (difficulté pour exercise/exam, théorèmes pour lesson)
    const isLastSection = 
      (contentType !== 'lesson' && category === 'difficulties') || 
      (contentType === 'lesson' && category === 'theorems');
      
    return (
      <div className={`mb-2 ${!isLastSection ? 'border-b border-gray-100' : ''} pb-4`} key={`section-${category}`}>
        <button 
          onClick={() => toggleSection(category)}
          className={`liquid-effect flex items-center justify-between w-full text-left mb-3 ${isDisabled ? 'opacity-70 cursor-not-allowed' : ''}`} // Ajout de cursor-not-allowed
          disabled={isDisabled && !['classLevels', 'subjects', 'difficulties'].includes(category)} // Désactiver le bouton si la section dépendante est vide de prérequis
        >
          <div className="flex items-center space-x-2">
            {icon}
            <h3 className="text-lg font-medium text-gray-800">{title}</h3>
            
            {!isDisabled && items.length > 0 && (
              <span className={`text-xs ${getContentTypeColors().badge} px-2 py-0.5 rounded-full ml-2`}>
                {items.length}
              </span>
            )}
          </div>
          {isExpanded ? 
            <ChevronDown className="w-4 h-4 text-gray-500" /> : 
            <ChevronUp className="w-4 h-4 text-gray-500" />
          }
        </button>
        
        {isExpanded && (
          <div className={scrollableClass}>
            <div className="flex flex-wrap gap-2 mt-3">
              {isDisabled ? (
                <p className="text-sm text-gray-500 italic w-full">
                  {disabledMessage}
                </p>
              ) : isLoading ? (
                <p className="text-sm text-gray-500 italic w-full">
                  Chargement en cours...
                </p>
              ) : (
                <>
                  {items.map((item, index) => {
                    const itemId = typeof item === 'string' ? item : String(item.id);
                    const itemName = typeof item === 'string' ? 
                      getDifficultyLabel(item) : 
                      item.name;
                    
                    const isSelected = selectedFilters[category].includes(itemId as any);
                    
                    // Définir les gradients selon le type de contenu
                    let selectedGradient = '';
                    let hoverGradient = '';
                    
                    if (contentType === 'lesson') {
                      selectedGradient = 'bg-gradient-to-r from-gray-600 to-blue-600';
                      hoverGradient = 'hover:bg-gradient-to-r hover:from-blue-600 hover:to-sky-700';
                    } else if (contentType === 'exam') {
                      selectedGradient = 'bg-gradient-to-r from-gray-800 to-green-600';
                      hoverGradient = 'hover:bg-gradient-to-r hover:from-gray-800 hover:to-green-700';
                    } else {
                      selectedGradient = 'bg-gradient-to-r from-indigo-600 to-purple-600';
                      hoverGradient = 'hover:bg-gradient-to-r hover:from-indigo-600 hover:to-purple-700';
                    }
                    
                    let buttonClass = isSelected
                      ? `${selectedGradient} text-white border-transparent ${hoverGradient} hover:text-white`
                      : `bg-gray-100 text-gray-700 ${hoverGradient} hover:text-white border-gray-200`;
                    
                    if (category === 'difficulties' && !isSelected) {
                      buttonClass = getDifficultyColor(itemId);
                    }
                    
                    const count = filterCounts[category]?.[itemId] ?? null;

                    return (
                      <Button
                        key={`${category}-${itemId}-${index}`}
                        onClick={() => toggleFilter(category, itemId)}
                        className={`px-3 py-1.5 rounded-full text-sm transition-all duration-200 border ${buttonClass} shadow-sm hover:shadow flex items-center gap-1.5`}
                      >
                        <span>{itemName}</span>
                        {count !== null && count > 0 && (
                          <span className={`text-xs px-1.5 py-0.5 rounded-full ${isSelected ? 'bg-white/20' : 'bg-gray-200 text-gray-600'}`}>
                            {count}
                          </span>
                        )}
                      </Button>
                    );
                  })}
                  {items.length === 0 && (
                    <p className="text-sm text-gray-500 italic w-full">
                      {category === 'subjects' && selectedFilters.classLevels.length === 0 ? 
                        'Veuillez sélectionner un niveau d\'abord' : 
                         category === 'subfields' && (selectedFilters.classLevels.length === 0 || selectedFilters.subjects.length === 0) ?
                        'Veuillez sélectionner un niveau et une matière' :
                         category === 'chapters' && (selectedFilters.classLevels.length === 0 || selectedFilters.subjects.length === 0 || selectedFilters.subfields.length === 0) ?
                        'Veuillez sélectionner un niveau, une matière et un sous-domaine' :
                         category === 'theorems' && (selectedFilters.classLevels.length === 0 || selectedFilters.subjects.length === 0 || selectedFilters.subfields.length === 0 || selectedFilters.chapters.length === 0) ?
                        'Veuillez sélectionner un niveau, une matière, un sous-domaine et un chapitre' :
                        'Aucun élément disponible pour cette sélection'}
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  const getActiveFiltersCount = () => {
    // Obtenir les catégories disponibles pour ce type de contenu
    const availableCategories = filterSections.map(section => section.category);

    // Count array filters
    let count = Object.entries(selectedFilters)
      .filter(([category]) => availableCategories.includes(category as keyof FilterCategories))
      .reduce((acc, [key, filters]) => {
        if (key === 'showViewed' || key === 'showCompleted') return acc;
        return acc + (Array.isArray(filters) ? filters.length : 0);
      }, 0);

    // Add boolean filters
    if (selectedFilters.showViewed) count++;
    if (selectedFilters.showCompleted) count++;

    return count;
  };
  
  // Fonction pour obtenir les classes CSS de couleur selon le type de contenu
  const getContentTypeColors = () => {
    if (contentType === 'lesson') {
      return {
        bg: 'bg-blue-100',
        text: 'text-blue-800',
        badge: 'bg-blue-100 text-blue-800'
      };
    } else if (contentType === 'exam') {
      return {
        bg: 'bg-orange-100',
        text: 'text-orange-800',
        badge: 'bg-orange-100 text-orange-800'
      };
    } else {
      return {
        bg: 'bg-indigo-100',
        text: 'text-indigo-800',
        badge: 'bg-indigo-100 text-indigo-800'
      };
    };
  };

  const clearAllFilters = () => {
    const baseFilters = {
      classLevels: [],
      subjects: [],
      subfields: [],
      chapters: [],
      theorems: [],
      difficulties: [],
      showViewed: false,
      showCompleted: false,
    };

    // Si c'est une leçon, on garde les difficultés actuelles (ne pas les réinitialiser)
    const newFilters = contentType === 'lesson' 
      ? { ...baseFilters, difficulties: selectedFilters.difficulties }
      : baseFilters;

    setSelectedFilters(newFilters);
    
    // Aussi réinitialiser les sections ouvertes si désiré, et les lastRequests
    const baseExpandedSections = {
        classLevels: true,
        subjects: true,
        subfields: false,
        chapters: false,
        theorems: false,
        difficulties: true,
    };

    // Pour les leçons, on peut fermer la section difficulté puisqu'elle n'est pas affichée
    const newExpandedSections = contentType === 'lesson'
      ? { ...baseExpandedSections, difficulties: false }
      : baseExpandedSections;

    setExpandedSections(newExpandedSections);
    setLastRequests({ subfields: '', chapters: '', theorems: ''});
  };

  // Fonction pour obtenir les classes de couleur du header selon le type de contenu
  const getHeaderGradient = () => {
    switch(contentType) {
      case 'lesson':
        return 'bg-gradient-to-r from-gray-700 to-blue-900';
      case 'exam':
        return 'bg-gradient-to-r from-gray-700 to-green-900';
      default: // exercise ou valeur par défaut
        return 'bg-gradient-to-r from-gray-700 to-purple-900';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden sticky top-28 w-full max-w-4xl">
      <div className={`p-6 ${getHeaderGradient()} text-white font-medium relative overflow-hidden`}>
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="hexPattern" width="40" height="34.64" patternUnits="userSpaceOnUse">
                <path
                  d="M20 0 L40 11.55 L40 23.09 L20 34.64 L0 23.09 L0 11.55 Z"
                  fill="none"
                  stroke="white"
                  strokeWidth="0.5"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#hexPattern)" />
          </svg>
        </div>
        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center space-x-3">
            <h2 className="text-xl font-semibold">
              <Filter className="w-6 h-6 mr-3 inline" />
              Filtres
            </h2>
          </div>
          {getActiveFiltersCount() > 0 && (
            <button 
              onClick={clearAllFilters}
              className="text-sm bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-full transition-colors" 
            >
              Réinitialiser
            </button>
          )}
        </div>
      </div>

      <div className="p-6">
        {/* Quick status filters - Only for exercises and exams */}
        {contentType !== 'lesson' && (
          <div className="mb-6 pb-6 border-b border-gray-200">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Statut</h3>
            <div className="space-y-2">
              <label className="flex items-center cursor-pointer group">
                <input
                  type="checkbox"
                  checked={selectedFilters.showViewed}
                  onChange={(e) => {
                    const newFilters = { ...selectedFilters, showViewed: e.target.checked };
                    setSelectedFilters(newFilters);
                    onFilterChange(newFilters);
                  }}
                  className="w-4 h-4 text-indigo-600 bg-gray-100 border-gray-300 rounded focus:ring-indigo-500 focus:ring-2"
                />
                <span className="ml-2 text-sm text-gray-700 group-hover:text-gray-900">
                  Déjà vus (avec succès/révision)
                </span>
              </label>
              <label className="flex items-center cursor-pointer group">
                <input
                  type="checkbox"
                  checked={selectedFilters.showCompleted}
                  onChange={(e) => {
                    const newFilters = { ...selectedFilters, showCompleted: e.target.checked };
                    setSelectedFilters(newFilters);
                    onFilterChange(newFilters);
                  }}
                  className="w-4 h-4 text-emerald-600 bg-gray-100 border-gray-300 rounded focus:ring-emerald-500 focus:ring-2"
                />
                <span className="ml-2 text-sm text-gray-700 group-hover:text-gray-900">
                  Complétés uniquement
                </span>
              </label>
            </div>
          </div>
        )}

        {filterSections.map((section) => 
          renderFilterCategory(
            section, 
            section.category === 'difficulties' 
              ? ['easy', 'medium', 'hard'] as Difficulty[]
              : section.category === 'classLevels'
                ? classLevels
                : section.category === 'subjects'
                  ? subjects
                  : section.category === 'subfields'
                    ? subfields
                    : section.category === 'theorems'
                      ? theorems
                      : chapters // Fallback à chapters pour la catégorie 'chapters' si non listé avant
          )
        )}

        {getActiveFiltersCount() > 0 && (
          <div className="mt-6 pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-medium text-gray-800">
                Filtres actifs
              </h3>
              <span className={`text-sm ${getContentTypeColors().badge} px-3 py-1 rounded-full`}>
                {getActiveFiltersCount()}
              </span>
            </div>
            <div className="flex flex-wrap gap-3">
              {Object.entries(selectedFilters)
                .filter(([category]) => {
                  const availableCategories = filterSections.map(section => section.category);
                  return availableCategories.includes(category as keyof FilterCategories);
                })
                .map(([category, values]) =>
                values.map((value, index) => {
                  if (!value) return null;
                  
                  return (
                    <button
                      key={`active-${category}-${value}-${index}`}
                      onClick={() => toggleFilter(category as keyof FilterCategories, value)}
                      className="px-3 py-1.5 rounded-full text-sm bg-indigo-100 text-indigo-700 hover:bg-indigo-200 flex items-center space-x-2 transition-colors"
                    >
                      <span>{getFilterName(category as keyof FilterCategories, value as string)}</span>
                      <X className="w-4 h-4 ml-1" />
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};