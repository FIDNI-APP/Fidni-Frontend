// src/components/Filters.tsx
import React, { useState, useEffect, useCallback } from 'react';
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
  // New props for initial filter values from URL
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
  const [selectedFilters, setSelectedFilters] = useState<FilterCategories>({
    classLevels: initialClassLevels || [],
    subjects: initialSubjects || [],
    subfields: [],
    chapters: [],
    theorems: [],
    difficulties: [],
  });
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    classLevels: true,
    subjects: true,
    subfields: false,  // Start collapsed to reduce initial API calls
    chapters: false,   // Start collapsed to reduce initial API calls 
    theorems: false,   // Start collapsed to reduce initial API calls
    difficulties: true,
  });
  const [isLoadingSubfields, setIsLoadingSubfields] = useState(false);
  const [isLoadingChapters, setIsLoadingChapters] = useState(false);
  const [isLoadingTheorems, setIsLoadingTheorems] = useState(false);
  
  // Track last request signatures to prevent duplicate calls
  const [lastRequests, setLastRequests] = useState({
    subfields: '',
    chapters: '',
    theorems: ''
  });

  // Auto-expand sections based on initial filters
  useEffect(() => {
    let changed = false;
    const newFilters = {...selectedFilters};
    
    if (initialClassLevels?.length > 0 && 
        JSON.stringify(initialClassLevels) !== JSON.stringify(selectedFilters.classLevels)) {
      newFilters.classLevels = initialClassLevels;
      changed = true;
    }
    
    if (initialSubjects?.length > 0 && 
        JSON.stringify(initialSubjects) !== JSON.stringify(selectedFilters.subjects)) {
      newFilters.subjects = initialSubjects;
      changed = true;
    }
    
    if (changed) {
      setSelectedFilters(newFilters);
    }
  }, [initialClassLevels, initialSubjects]);

  // Conditions to check if we should load data for hierarchical filters
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
  
  // Load initial data on component mount
  useEffect(() => {
    loadClassLevels();
  }, []);
  
  // Load subjects when class levels change
  useEffect(() => {
    if (selectedFilters.classLevels.length > 0) {
      loadSubjects();
    } else {
      setSubjects([]);
      // Clear dependent fields when class level changes
      setSelectedFilters(prev => ({
        ...prev,
        subjects: [],
        subfields: [],
        chapters: [],
        theorems: []
      }));
    }
  }, [selectedFilters.classLevels]);
  
  // Only load subfields when section is expanded and prerequisites are selected
  useEffect(() => {
    if (expandedSections.subfields && shouldShowSubfieldOptions()) {
      loadSubfields();
    } else if (!shouldShowSubfieldOptions()) {
      setSubfields([]);
    }
  }, [
    expandedSections.subfields, 
    selectedFilters.subjects, 
    selectedFilters.classLevels
  ]);
  
  // Only load chapters when section is expanded and prerequisites are selected
  useEffect(() => {
    if (expandedSections.chapters && shouldShowChapterOptions()) {
      loadChapters();
    } else if (!shouldShowChapterOptions()) {
      setChapters([]);
    }
  }, [
    expandedSections.chapters,
    selectedFilters.subfields,
    selectedFilters.subjects,
    selectedFilters.classLevels
  ]);
  
  // Only load theorems when section is expanded and prerequisites are selected
  useEffect(() => {
    if (expandedSections.theorems && shouldShowTheoremOptions()) {
      loadTheorems();
    } else if (!shouldShowTheoremOptions()) {
      setTheorems([]);
    }
  }, [
    expandedSections.theorems,
    selectedFilters.chapters,
    selectedFilters.subfields,
    selectedFilters.subjects,
    selectedFilters.classLevels
  ]);
  
  // Effect to update parent component with selected filters
  useEffect(() => {
    // Use debounce to prevent too many filter updates in rapid succession
    const debouncedFilterChange = debounce(() => {
      onFilterChange(selectedFilters);
    }, 300);
    
    debouncedFilterChange();
    
    // Cleanup function
    return () => {
      // Any cleanup needed
    };
  }, [selectedFilters, onFilterChange]);

  // Auto-expand sections when parent selections change
  useEffect(() => {
    // If user selects a subject, automatically expand the subfields section
    if (selectedFilters.subjects.length > 0 && shouldShowSubfieldOptions()) {
      setExpandedSections(prev => ({
        ...prev,
        subfields: true
      }));
    }
  }, [selectedFilters.subjects]);

  useEffect(() => {
    // If user selects a subfield, automatically expand the chapters section
    if (selectedFilters.subfields.length > 0 && shouldShowChapterOptions()) {
      setExpandedSections(prev => ({
        ...prev,
        chapters: true
      }));
    }
  }, [selectedFilters.subfields]);

  useEffect(() => {
    // If user selects a chapter, automatically expand the theorems section
    if (selectedFilters.chapters.length > 0 && shouldShowTheoremOptions()) {
      setExpandedSections(prev => ({
        ...prev,
        theorems: true
      }));
    }
  }, [selectedFilters.chapters]);

  const loadClassLevels = async () => {
    try {
      const data = await getClassLevels();
      setClassLevels(data);
      
      // Ensure all class level IDs in initialClassLevels exist in the loaded data
      if (initialClassLevels?.length > 0) {
        const validClassLevelIds = data.map(level => level.id);
        const filteredInitialLevels = initialClassLevels.filter(id => 
          validClassLevelIds.includes(id)
        );
        
        if (filteredInitialLevels.length !== selectedFilters.classLevels.length) {
          setSelectedFilters(prev => ({
            ...prev,
            classLevels: filteredInitialLevels
          }));
        }
      }
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
      
      // Ensure all subject IDs in initialSubjects exist in the loaded data
      if (initialSubjects?.length > 0) {
        const validSubjectIds = uniqueSubjects.map(subject => subject.id);
        const filteredInitialSubjects = initialSubjects.filter(id => 
          validSubjectIds.includes(id)
        );
        
        if (filteredInitialSubjects.length !== selectedFilters.subjects.length) {
          setSelectedFilters(prev => ({
            ...prev,
            subjects: filteredInitialSubjects
          }));
        }
      }
    } catch (error) {
      console.error('Failed to load subjects:', error);
    }
  };

  const loadSubfields = async () => {
    // Skip if necessary conditions aren't met
    if (selectedFilters.subjects.length === 0 || selectedFilters.classLevels.length === 0) {
      setSubfields([]);
      return;
    }
    
    // Create a request signature to prevent duplicate calls
    const requestSignature = JSON.stringify({
      subjects: [...selectedFilters.subjects].sort(),
      classLevels: [...selectedFilters.classLevels].sort()
    });
    
    // Skip if this is a duplicate of the last request
    if (requestSignature === lastRequests.subfields) {
      return;
    }
    
    setIsLoadingSubfields(true);
    try {
      // Update last request signature
      setLastRequests(prev => ({
        ...prev,
        subfields: requestSignature
      }));
      
      // Load data for each selected subject
      const promises = selectedFilters.subjects.map(subject => 
        getSubfields(subject, selectedFilters.classLevels)
      );
      
      const results = await Promise.all(promises);
      const allSubfields = results.flat();
      const uniqueSubfields = getUniqueById(allSubfields);
      
      setSubfields(uniqueSubfields);
    } catch (err) {
      console.error('Failed to load subfields:', err);
    } finally {
      setIsLoadingSubfields(false);
    }
  };

  const loadChapters = async () => {
    // Skip if necessary conditions aren't met
    if (selectedFilters.subfields.length === 0 || 
        selectedFilters.subjects.length === 0 || 
        selectedFilters.classLevels.length === 0) {
      setChapters([]);
      return;
    }
    
    // Create a request signature to prevent duplicate calls
    const requestSignature = JSON.stringify({
      subjects: [...selectedFilters.subjects].sort(),
      classLevels: [...selectedFilters.classLevels].sort(),
      subfields: [...selectedFilters.subfields].sort()
    });
    
    // Skip if this is a duplicate of the last request
    if (requestSignature === lastRequests.chapters) {
      return;
    }
    
    setIsLoadingChapters(true);
    try {
      // Update last request signature
      setLastRequests(prev => ({
        ...prev,
        chapters: requestSignature
      }));
      
      // For simplicity, use the first subject in the list
      const data = await getChapters(
        selectedFilters.subjects[0],
        selectedFilters.classLevels,
        selectedFilters.subfields
      );
      
      const uniqueChapters = getUniqueById(data);
      setChapters(uniqueChapters);
    } catch (err) {
      console.error('Failed to load chapters:', err);
    } finally {
      setIsLoadingChapters(false);
    }
  };

  const loadTheorems = async () => {
    // Skip if necessary conditions aren't met
    if (selectedFilters.chapters.length === 0 ||
        selectedFilters.subfields.length === 0 || 
        selectedFilters.subjects.length === 0 || 
        selectedFilters.classLevels.length === 0) {
      setTheorems([]);
      return;
    }
    
    // Create a request signature to prevent duplicate calls
    const requestSignature = JSON.stringify({
      subjects: [...selectedFilters.subjects].sort(),
      classLevels: [...selectedFilters.classLevels].sort(),
      subfields: [...selectedFilters.subfields].sort(),
      chapters: [...selectedFilters.chapters].sort()
    });
    
    // Skip if this is a duplicate of the last request
    if (requestSignature === lastRequests.theorems) {
      return;
    }
    
    setIsLoadingTheorems(true);
    try {
      // Update last request signature
      setLastRequests(prev => ({
        ...prev,
        theorems: requestSignature
      }));
      
      // For simplicity, use the first subject in the list
      const data = await getTheorems(
        selectedFilters.subjects[0],
        selectedFilters.classLevels,
        selectedFilters.subfields,
        selectedFilters.chapters
      );
      
      const uniqueTheorems = getUniqueById(data);
      setTheorems(uniqueTheorems);
    } catch (err) {
      console.error('Failed to load theorems:', err);
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
        
        if (newFilters[category].includes(value as string)) {
          newFilters[category] = newFilters[category].filter(v => v !== value);
          
          // Clear dependent fields when parent is deselected
          if (category === 'classLevels') {
            // No need for additional clearing here as it's handled in the useEffect
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
          newFilters[category] = [...newFilters[category], value as string];
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
      const found = items.find(item => item.id === id);
      return found ? found.name : id;
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

  // For sections with many items, add a height max and scrolling
  const needsScroll = ['chapters', 'theorems', 'subfields'].includes(category);
  const scrollableClass = needsScroll ? "max-h-[300px] overflow-y-auto pr-2" : "";

  // Determine if this section is disabled based on hierarchy
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

  // Determine if section is loading
  let isLoading = false;
  if (category === 'subfields' && isLoadingSubfields) {
    isLoading = true;
  } else if (category === 'chapters' && isLoadingChapters) {
    isLoading = true;
  } else if (category === 'theorems' && isLoadingTheorems) {
    isLoading = true;
  }
  
  // Highlight section if it has active filters
  const hasActiveFilters = selectedFilters[category].length > 0;
  const sectionHeaderClass = hasActiveFilters ? 
    'border-indigo-300 bg-indigo-50' : 
    'border-gray-200';

  return (
    <div className={`mb-3 border rounded-lg overflow-hidden ${sectionHeaderClass}`} key={`section-${category}`}>
      <button 
        onClick={() => toggleSection(category)}
        className={`flex items-center justify-between w-full text-left p-3 ${isDisabled ? 'opacity-70' : ''} hover:bg-gray-50 transition-colors`}
      >
        <div className="flex items-center space-x-2">
          {icon}
          <h3 className="text-base font-medium text-gray-800">{title}</h3>
          
          {/* Display count of selected items */}
          {hasActiveFilters && (
            <span className="text-xs bg-indigo-600 text-white px-2 py-0.5 rounded-full ml-2 font-medium">
              {selectedFilters[category].length}
            </span>
          )}
        </div>
        {isExpanded ? 
          <ChevronUp className="w-4 h-4 text-gray-500" /> : 
          <ChevronDown className="w-4 h-4 text-gray-500" />
        }
      </button>
      
      {isExpanded && (
        <div className={`px-3 pb-3 ${scrollableClass} ${hasActiveFilters ? 'bg-indigo-50/50' : ''}`}>
          <div className="flex flex-wrap gap-2 mt-2">
            {isDisabled ? (
              <p className="text-sm text-gray-500 italic w-full">
                {disabledMessage}
              </p>
            ) : isLoading ? (
              <div className="flex items-center justify-center py-3 w-full">
                <div className="animate-spin h-5 w-5 border-2 border-indigo-600 rounded-full border-t-transparent"></div>
                <span className="ml-2 text-sm text-gray-500">Chargement en cours...</span>
              </div>
            ) : (
              <>
                {items.map((item, index) => {
                  const itemId = typeof item === 'string' ? item : item.id;
                  const itemName = typeof item === 'string' ? 
                    getDifficultyLabel(item) : 
                    item.name;
                  
                  // Check if this item is selected
                  const isSelected = selectedFilters[category].includes(itemId as any);
                  
                  // Create distinct, clear visual styles for selected vs unselected items
                  let buttonClass = isSelected
                    ? 'bg-indigo-600 text-white border-indigo-700 ring-2 ring-indigo-200 font-medium shadow-md'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border-gray-200';
                  
                  // Override for difficulty filters
                  if (category === 'difficulties' && !isSelected) {
                    buttonClass = getDifficultyColor(itemId);
                  }
                  
                  return (
                    <button
                      key={`${category}-${itemId}-${index}`}
                      onClick={() => toggleFilter(category, itemId)}
                      className={`px-3 py-2 rounded-lg text-sm transition-all duration-200 border ${buttonClass} ${isSelected ? 'transform scale-105' : ''}`}
                    >
                      {isSelected && (
                        <svg className="w-4 h-4 inline-block mr-1 -ml-1" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                      {itemName}
                    </button>
                  );
                })}
                {items.length === 0 && (
                  <p className="text-sm text-gray-500 italic w-full">
                    {category === 'subjects' ? 
                      'Veuillez sélectionner un niveau d\'abord' : 
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
  };

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden sticky top-28 w-full max-w-4xl">
      <div className="p-4 bg-gradient-to-r from-indigo-700 to-purple-700 text-white font-medium">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <h2 className="text-xl font-semibold">
              <Filter className="w-5 h-5 mr-2 inline" />
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
      
      <div className="p-4">
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
                      : chapters
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
                values.map((value, index) => (
                  <button
                    key={`active-${category}-${value}-${index}`}
                    onClick={() => toggleFilter(category as keyof FilterCategories, value)}
                    className="px-3 py-1.5 rounded-lg text-sm bg-indigo-100 text-indigo-700 hover:bg-indigo-200 flex items-center space-x-2 transition-colors"
                  >
                    <span>{getFilterName(category as keyof FilterCategories, value as string)}</span>
                    <X className="w-4 h-4 ml-1" />
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};