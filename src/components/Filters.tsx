import React, { useState, useEffect } from 'react';
import { X, Filter, BookOpen, GraduationCap, ChevronUp, ChevronDown, Tag, BarChart3 } from 'lucide-react';
import { getClassLevels, getSubjects, getChapters } from '@/lib/api';
import { ClassLevelModel, SubjectModel, ChapterModel, Difficulty } from '@/types';

interface FiltersProps {
  onFilterChange: (filters: {
    classLevels: string[];
    subjects: string[];
    chapters: string[];
    difficulties: Difficulty[];
  }) => void;
}

type FilterCategories = {
  classLevels: string[];
  subjects: string[];
  chapters: string[];
  difficulties: Difficulty[];
};

type FilterSection = {
  title: string;
  category: keyof FilterCategories;
  icon: React.ReactNode;
};

export const Filters: React.FC<FiltersProps> = ({ onFilterChange }) => {
  const [classLevels, setClassLevels] = useState<ClassLevelModel[]>([]);
  const [subjects, setSubjects] = useState<SubjectModel[]>([]);
  const [chapters, setChapters] = useState<ChapterModel[]>([]);
  const [selectedFilters, setSelectedFilters] = useState<FilterCategories>({
    classLevels: [],
    subjects: [],
    chapters: [],
    difficulties: [],
  });
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    classLevels: true,
    subjects: true,
    chapters: true,
    difficulties: true,
  });
  const [isLoadingChapters, setIsLoadingChapters] = useState(false);

  // Condition to check if both class levels and subjects are selected
  const shouldShowChapterOptions = () => {
    return selectedFilters.classLevels.length > 0 && selectedFilters.subjects.length > 0;
  };

  const filterSections: FilterSection[] = [
    { title: 'Niveau', category: 'classLevels', icon: <GraduationCap className="w-4 h-4 text-indigo-600" /> },
    { title: 'Matières', category: 'subjects', icon: <BookOpen className="w-4 h-4 text-purple-600" /> },
    { title: 'Chapitres', category: 'chapters', icon: <Tag className="w-4 h-4 text-indigo-600" /> },
    { title: 'Difficulté', category: 'difficulties', icon: <BarChart3 className="w-4 h-4 text-purple-600" /> },
  ];

  useEffect(() => {
    loadClassLevels();
  }, []);

  useEffect(() => {
    loadSubjects();
  }, [selectedFilters.classLevels]);

  useEffect(() => {
    if (shouldShowChapterOptions()) {
      loadChapters();
    } else {
      // Clear chapters when conditions aren't met
      setSelectedFilters(prev => ({
        ...prev,
        chapters: []
      }));
    }
  }, [selectedFilters.subjects, selectedFilters.classLevels]);

  useEffect(() => {
    onFilterChange(selectedFilters);
  }, [selectedFilters]);

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
    try {
      const data = await getSubjects(selectedFilters.classLevels);
      const uniqueSubjects = getUniqueById(data);
      setSubjects(uniqueSubjects);
    } catch (error) {
      console.error('Failed to load subjects:', error);
    }
  };

  const loadChapters = async () => {
    try {
      setIsLoadingChapters(true);
      
      // If your API has pagination, you can fetch all chapters by making multiple requests
      // This is just an example - adjust according to your actual API implementation
      const data = await getChapters(
        selectedFilters.subjects, 
        selectedFilters.classLevels
      );
      
      const uniqueChapters = getUniqueById(data);
      setChapters(uniqueChapters);
    } catch (error) {
      console.error('Failed to load chapters:', error);
    } finally {
      setIsLoadingChapters(false);
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
        } else {
          newFilters[category] = [...newFilters[category], value as string];
        }
      }
      return newFilters;
    });
  };

  const getFilterName = (category: keyof FilterCategories, id: string) => {
    const source = { classLevels, subjects, chapters };
    if (category in source) {
      const items = source[category as keyof typeof source];
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

    // For chapters section specifically, add max height and scrolling if many items
    const isChaptersSection = category === 'chapters';
    const chaptersContainerClass = isChaptersSection 
      ? "max-h-[300px] overflow-y-auto pr-2" 
      : "";

    return (
      <div className="mb-2 border-b border-gray-100 pb-4">
        <button 
          onClick={() => toggleSection(category)}
          className="flex items-center justify-between w-full text-left mb-3"
        >
          <div className="flex items-center space-x-2">
            {icon}
            <h3 className="text-lg font-medium text-gray-800">{title}</h3>
            
            {/* Show count of available items for chapters */}
            {isChaptersSection && chapters.length > 0 && (
              <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full ml-2">
                {chapters.length}
              </span>
            )}
          </div>
          {isExpanded ? 
            <ChevronUp className="w-4 h-4 text-gray-500" /> : 
            <ChevronDown className="w-4 h-4 text-gray-500" />
          }
        </button>
        
        {isExpanded && (
          <div className={`${chaptersContainerClass}`}>
            <div className="flex flex-wrap gap-2 mt-3">
              {/* Special handling for chapters */}
              {category === 'chapters' && !shouldShowChapterOptions() ? (
                <p className="text-sm text-gray-500 italic w-full">
                  Veuillez sélectionner une matière et un niveau d'abord
                </p>
              ) : isLoadingChapters && category === 'chapters' ? (
                <p className="text-sm text-gray-500 italic w-full">
                  Chargement des chapitres...
                </p>
              ) : (
                <>
                  {items.map((item, index) => {
                    const itemId = typeof item === 'string' ? item : item.id;
                    const itemName = typeof item === 'string' ? 
                      getDifficultyLabel(item) : 
                      item.name;
                    
                    const isSelected = selectedFilters[category].includes(itemId as any);
                    
                    let buttonClass = isSelected
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-transparent'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-200';
                    
                    // Override for difficulty filters
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
                  {items.length === 0 && category !== 'chapters' && (
                    <p className="text-sm text-gray-500 italic w-full">
                      {category === 'subjects' ? 
                        'Veuillez sélectionner un niveau d\'abord' : 
                        'Aucun élément disponible'}
                    </p>
                  )}
                  {items.length === 0 && category === 'chapters' && shouldShowChapterOptions() && (
                    <p className="text-sm text-gray-500 italic w-full">
                      Aucun chapitre disponible pour cette sélection
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
      chapters: [],
      difficulties: [],
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden sticky top-28 w-full max-w-4xl">
      <div className="p-6 bg-gradient-to-r from-indigo-700 to-purple-700 text-white font-medium">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <h2 className="text-xl font-semibold">
              <Filter className="w-6 h-6 mr-3" />
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
        {filterSections.map(section => 
          renderFilterCategory(
            section, 
            section.category === 'difficulties' 
              ? ['easy', 'medium', 'hard'] as Difficulty[]
              : section.category === 'classLevels'
                ? classLevels
                : section.category === 'subjects'
                  ? subjects
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
                values.map(value => (
                  <button
                    key={`${category}-${value}`}
                    onClick={() => toggleFilter(category as keyof FilterCategories, value)}
                    className="px-3 py-1.5 rounded-full text-sm bg-indigo-100 text-indigo-700 hover:bg-indigo-200 flex items-center space-x-2 transition-colors"
                  >
                    <span>{getFilterName(category as keyof FilterCategories, value)}</span>
                    <X className="w-4 h-4" />
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