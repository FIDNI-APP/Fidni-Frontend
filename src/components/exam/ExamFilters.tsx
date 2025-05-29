// src/components/exam/ExamFilters.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  X, 
  Filter, 
  RotateCcw,
  ChevronDown,
  ChevronRight,
  Flag,
  Calendar,
  GraduationCap,
  BookOpen,
  AlertCircle,
  Layers
} from 'lucide-react';
import { getClassLevels, getSubjects, getChapters } from '@/lib/api';
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { ClassLevel, Subject, Chapter, Difficulty } from '@/types';
import { DatePickerWithRange } from '../ui/date-range-picker';
import { cn } from '@/lib/utils';

interface ExamFiltersProps {
  onFilterChange: (filters: FilterState) => void;
  initialClassLevels?: string[];
  initialSubjects?: string[];
  initialIsNational?: boolean;
}

interface FilterState {
  classLevels: string[];
  subjects: string[];
  subfields: string[];
  chapters: string[];
  theorems: string[];
  difficulties: Difficulty[];
  isNationalExam: boolean;
  dateRange: { start: Date | null; end: Date | null } | null;
}

interface FilterSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  count: number;
}

export const ExamFilters: React.FC<ExamFiltersProps> = ({ 
  onFilterChange, 
  initialClassLevels = [],
  initialSubjects = [],
  initialIsNational = false
}) => {
  // State
  const [availableClassLevels, setAvailableClassLevels] = useState<ClassLevel[]>([]);
  const [availableSubjects, setAvailableSubjects] = useState<Subject[]>([]);
  const [availableChapters, setAvailableChapters] = useState<Chapter[]>([]);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['class', 'subject']));
  const [loading, setLoading] = useState(true);
  
  const [filters, setFilters] = useState<FilterState>({
    classLevels: initialClassLevels,
    subjects: initialSubjects,
    subfields: [],
    chapters: [],
    theorems: [],
    difficulties: [],
    isNationalExam: initialIsNational,
    dateRange: null
  });

  const difficulties: { value: Difficulty; label: string; color: string }[] = [
    { value: 'easy', label: 'Easy', color: 'text-green-600 bg-green-50' },
    { value: 'medium', label: 'Medium', color: 'text-amber-600 bg-amber-50' },
    { value: 'hard', label: 'Hard', color: 'text-rose-600 bg-rose-50' }
  ];

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [classLevels, subjects] = await Promise.all([
          getClassLevels(),
          getSubjects()
        ]);
        
        setAvailableClassLevels(classLevels);
        setAvailableSubjects(subjects);
      } catch (error) {
        console.error('Failed to load filter data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, []);

  // Load chapters when subjects change
  useEffect(() => {
    const loadChapters = async () => {
      if (filters.subjects.length === 0) {
        setAvailableChapters([]);
        return;
      }
      
      try {
        const chapters = await getChapters({
          subjects: filters.subjects,
          classLevels: filters.classLevels
        });
        setAvailableChapters(chapters);
      } catch (error) {
        console.error('Failed to load chapters:', error);
      }
    };
    
    loadChapters();
  }, [filters.subjects, filters.classLevels]);

  // Handle filter changes
  const handleFilterChange = useCallback((newFilters: FilterState) => {
    setFilters(newFilters);
    onFilterChange(newFilters);
  }, [onFilterChange]);

  // Toggle section expansion
  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  // Handle individual filter toggles
  const toggleClassLevel = (classLevelId: string) => {
    const newClassLevels = filters.classLevels.includes(classLevelId)
      ? filters.classLevels.filter(id => id !== classLevelId)
      : [...filters.classLevels, classLevelId];
    
    handleFilterChange({
      ...filters,
      classLevels: newClassLevels,
      chapters: [] // Reset chapters when class level changes
    });
  };

  const toggleSubject = (subjectId: string) => {
    const newSubjects = filters.subjects.includes(subjectId)
      ? filters.subjects.filter(id => id !== subjectId)
      : [...filters.subjects, subjectId];
    
    handleFilterChange({
      ...filters,
      subjects: newSubjects,
      chapters: [], // Reset chapters when subject changes
      subfields: []
    });
  };

  const toggleChapter = (chapterId: string) => {
    const newChapters = filters.chapters.includes(chapterId)
      ? filters.chapters.filter(id => id !== chapterId)
      : [...filters.chapters, chapterId];
    
    handleFilterChange({
      ...filters,
      chapters: newChapters
    });
  };

  const toggleDifficulty = (difficulty: Difficulty) => {
    const newDifficulties = filters.difficulties.includes(difficulty)
      ? filters.difficulties.filter(d => d !== difficulty)
      : [...filters.difficulties, difficulty];
    
    handleFilterChange({
      ...filters,
      difficulties: newDifficulties
    });
  };

  const toggleNationalExam = () => {
    handleFilterChange({
      ...filters,
      isNationalExam: !filters.isNationalExam
    });
  };

  const handleDateRangeChange = (range: { start: Date | null; end: Date | null } | null) => {
    handleFilterChange({
      ...filters,
      dateRange: range
    });
  };

  // Reset all filters
  const resetFilters = () => {
    const resetState: FilterState = {
      classLevels: [],
      subjects: [],
      subfields: [],
      chapters: [],
      theorems: [],
      difficulties: [],
      isNationalExam: false,
      dateRange: null
    };
    
    handleFilterChange(resetState);
  };

  // Count active filters
  const activeFilterCount = useMemo(() => {
    return (
      filters.classLevels.length +
      filters.subjects.length +
      filters.chapters.length +
      filters.difficulties.length +
      (filters.isNationalExam ? 1 : 0) +
      (filters.dateRange ? 1 : 0)
    );
  }, [filters]);

  // Filter sections configuration
  const filterSections: FilterSection[] = [
    {
      id: 'class',
      title: 'Class Level',
      icon: <GraduationCap className="w-4 h-4" />,
      count: filters.classLevels.length
    },
    {
      id: 'subject',
      title: 'Subject',
      icon: <BookOpen className="w-4 h-4" />,
      count: filters.subjects.length
    },
    {
      id: 'chapter',
      title: 'Chapters',
      icon: <Layers className="w-4 h-4" />,
      count: filters.chapters.length
    },
    {
      id: 'difficulty',
      title: 'Difficulty',
      icon: <AlertCircle className="w-4 h-4" />,
      count: filters.difficulties.length
    },
    {
      id: 'type',
      title: 'Exam Type',
      icon: <Flag className="w-4 h-4" />,
      count: filters.isNationalExam ? 1 : 0
    },
    {
      id: 'date',
      title: 'Date Range',
      icon: <Calendar className="w-4 h-4" />,
      count: filters.dateRange ? 1 : 0
    }
  ];

  if (loading) {
    return (
      <div className="p-6 text-center">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Filter className="w-5 h-5 text-indigo-600" />
          Filters
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="ml-2">
              {activeFilterCount}
            </Badge>
          )}
        </h3>
        
        {activeFilterCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={resetFilters}
            className="text-gray-500 hover:text-gray-700"
          >
            <RotateCcw className="w-4 h-4 mr-1" />
            Reset
          </Button>
        )}
      </div>

      {/* Filter Sections */}
      <div className="space-y-4">
        {filterSections.map((section) => (
          <div key={section.id} className="border-b border-gray-100 pb-4 last:border-0">
            <button
              onClick={() => toggleSection(section.id)}
              className="w-full flex items-center justify-between py-2 text-left hover:text-indigo-600 transition-colors"
            >
              <div className="flex items-center gap-2">
                {section.icon}
                <span className="font-medium text-gray-700">{section.title}</span>
                {section.count > 0 && (
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {section.count}
                  </Badge>
                )}
              </div>
              {expandedSections.has(section.id) ? (
                <ChevronDown className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-400" />
              )}
            </button>

            {expandedSections.has(section.id) && (
              <div className="mt-3 space-y-2">
                {/* Class Levels */}
                {section.id === 'class' && (
                  <div className="space-y-2">
                    {availableClassLevels.map((level) => (
                      <label
                        key={level.id}
                        className="flex items-center space-x-2 cursor-pointer hover:text-indigo-600"
                      >
                        <Checkbox
                          checked={filters.classLevels.includes(level.id)}
                          onCheckedChange={() => toggleClassLevel(level.id)}
                        />
                        <span className="text-sm">{level.name}</span>
                      </label>
                    ))}
                  </div>
                )}

                {/* Subjects */}
                {section.id === 'subject' && (
                  <div className="space-y-2">
                    {availableSubjects.map((subject) => (
                      <label
                        key={subject.id}
                        className="flex items-center space-x-2 cursor-pointer hover:text-indigo-600"
                      >
                        <Checkbox
                          checked={filters.subjects.includes(subject.id)}
                          onCheckedChange={() => toggleSubject(subject.id)}
                        />
                        <span className="text-sm">{subject.name}</span>
                      </label>
                    ))}
                  </div>
                )}

                {/* Chapters */}
                {section.id === 'chapter' && (
                  <div className="space-y-2">
                    {availableChapters.length > 0 ? (
                      availableChapters.map((chapter) => (
                        <label
                          key={chapter.id}
                          className="flex items-center space-x-2 cursor-pointer hover:text-indigo-600"
                        >
                          <Checkbox
                            checked={filters.chapters.includes(chapter.id)}
                            onCheckedChange={() => toggleChapter(chapter.id)}
                          />
                          <span className="text-sm">{chapter.name}</span>
                        </label>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500">
                        Select a subject first
                      </p>
                    )}
                  </div>
                )}

                {/* Difficulty */}
                {section.id === 'difficulty' && (
                  <div className="space-y-2">
                    {difficulties.map((diff) => (
                      <label
                        key={diff.value}
                        className="flex items-center space-x-2 cursor-pointer"
                      >
                        <Checkbox
                          checked={filters.difficulties.includes(diff.value)}
                          onCheckedChange={() => toggleDifficulty(diff.value)}
                        />
                        <span className={cn("text-sm px-2 py-0.5 rounded", diff.color)}>
                          {diff.label}
                        </span>
                      </label>
                    ))}
                  </div>
                )}

                {/* Exam Type */}
                {section.id === 'type' && (
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <Checkbox
                      checked={filters.isNationalExam}
                      onCheckedChange={toggleNationalExam}
                    />
                    <span className="text-sm flex items-center gap-1">
                      <Flag className="w-4 h-4 text-blue-600" />
                      National Exams Only
                    </span>
                  </label>
                )}

                {/* Date Range */}
                {section.id === 'date' && (
                  <DatePickerWithRange
                    value={filters.dateRange}
                    onChange={handleDateRangeChange}
                    placeholder="Select date range"
                  />
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};