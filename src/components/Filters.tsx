// src/components/Filters.tsx - Version corrigée

import React, { useState, useEffect, useRef } from 'react';
import { X, Filter, BookOpen, GraduationCap, ChevronUp, ChevronDown, Tag, BarChart3, FileText, Award } from 'lucide-react';
import { getClassLevels, getSubjects, getChapters, getSubfields, getTheorems } from '@/lib/api';
import { ClassLevelModel, SubjectModel, ChapterModel, Difficulty, Subfield, Theorem } from '@/types';

interface FiltersProps {
  onFilterChange: (filters: {
    classLevels: string[];
    subjects: string[];
    subfields: string[];
    chapters: string[];
    theorems: string[];
    difficulties: Difficulty[];
  }) => void;
  initialClassLevels?: string[];
  initialSubjects?: string[];
}

type FilterCategories = {
  classLevels: string[];
  subjects: string[];
  subfields: string[];
  chapters: string[];
  theorems: string[];
  difficulties: Difficulty[];
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
  initialSubjects = [] 
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
    subfields: [],
    chapters: [],
    theorems: [],
    difficulties: [],
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

  const shouldShowSubfieldOptions = () => {
    return selectedFilters.classLevels.length > 0 && selectedFilters.subjects.length > 0;
  };

  const shouldShowChapterOptions = () => {
    return shouldShowSubfieldOptions() && selectedFilters.subfields.length > 0;
  };

  const shouldShowTheoremOptions = () => {
    return shouldShowChapterOptions() && selectedFilters.chapters.length > 0;
  };

  const filterSections: FilterSection[] = [
    { title: 'Niveau', category: 'classLevels', icon: <GraduationCap className="w-4 h-4 text-indigo-600" /> },
    { title: 'Matières', category: 'subjects', icon: <BookOpen className="w-4 h-4 text-purple-600" /> },
    { title: 'Sous-domaines', category: 'subfields', icon: <FileText className="w-4 h-4 text-indigo-600" /> },
    { title: 'Chapitres', category: 'chapters', icon: <Tag className="w-4 h-4 text-purple-600" /> },
    { title: 'Théorèmes', category: 'theorems', icon: <Award className="w-4 h-4 text-indigo-600" /> },
    { title: 'Difficulté', category: 'difficulties', icon: <BarChart3 className="w-4 h-4 text-purple-600" /> },
  ];
  
  useEffect(() => {
    loadClassLevels();
  }, []);
  
  useEffect(() => {
    if (!initialValuesSet.current && (initialClassLevels?.length > 0 || initialSubjects?.length > 0)) {
      initialValuesSet.current = true;
      const newFilters = {
        classLevels: initialClassLevels.map(String),
        subjects: initialSubjects.map(String),
        subfields: [],
        chapters: [],
        theorems: [],
        difficulties: [],
      };
      setSelectedFilters(newFilters);
    }
  }, [initialClassLevels, initialSubjects]);
  
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
  
  // ... (le reste du code reste inchangé)

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
        return 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border-emerald-200';
      case 'medium':
        return 'bg-amber-100 text-amber-800 hover:bg-amber-200 border-amber-200';
      case 'hard':
        return 'bg-red-100 text-red-800 hover:bg-red-200 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 hover:bg-gray-200 border-gray-200';
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

    return (
      <div className="mb-2 border-b border-gray-100 pb-4" key={`section-${category}`}>
        <button 
          onClick={() => toggleSection(category)}
          className={`flex items-center justify-between w-full text-left mb-3 ${isDisabled ? 'opacity-70 cursor-not-allowed' : ''}`} // Ajout de cursor-not-allowed
          disabled={isDisabled && !['classLevels', 'subjects', 'difficulties'].includes(category)} // Désactiver le bouton si la section dépendante est vide de prérequis
        >
          <div className="flex items-center space-x-2">
            {icon}
            <h3 className="text-lg font-medium text-gray-800">{title}</h3>
            
            {!isDisabled && items.length > 0 && (
              <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full ml-2">
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
                    
                    let buttonClass = isSelected
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-transparent'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-200';
                    
                    if (category === 'difficulties' && !isSelected) {
                      buttonClass = getDifficultyColor(itemId);
                    }
                    
                    return (
                      <button
                        key={`${category}-${itemId}-${index}`}
                        onClick={() => toggleFilter(category, itemId)}
                        className={`px-3 py-1.5 rounded-full text-sm transition-all duration-200 border ${buttonClass} shadow-sm hover:shadow`}
                      >
                        {itemName}
                      </button>
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
    return Object.values(selectedFilters).reduce((count, filters) => count + filters.length, 0);
  };

  const clearAllFilters = () => {
    setSelectedFilters({
      classLevels: [],
      subjects: [],
      subfields: [],
      chapters: [],
      theorems: [],
      difficulties: [],
    });
    // Aussi réinitialiser les sections ouvertes si désiré, et les lastRequests
    setExpandedSections({
        classLevels: true,
        subjects: true,
        subfields: false,
        chapters: false,
        theorems: false,
        difficulties: true,
    });
    setLastRequests({ subfields: '', chapters: '', theorems: ''});
  };

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden sticky top-28 w-full max-w-4xl">
      <div className="p-6 bg-gradient-to-r from-indigo-700 to-purple-700 text-white font-medium">
        <div className="flex items-center justify-between">
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
          <div className="mt-6 pt-6 border-t border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-medium text-gray-800">
                Filtres actifs
              </h3>
              <span className="text-sm bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full">
                {getActiveFiltersCount()}
              </span>
            </div>
            <div className="flex flex-wrap gap-3">
              {Object.entries(selectedFilters).map(([category, values]) =>
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