import React, { useState, useEffect } from 'react';
import { ChevronDown, X, Filter as FilterIcon, RotateCcw, ArrowUpDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Difficulty, SortOption } from '@/types';
import { getClassLevels, getSubjects, getSubfields, getChapters, getTheorems, getDifficultyCounts } from '@/lib/api';
import { SortDropdown } from './SortDropdown';

interface HorizontalFilterBarProps {
  contentType: 'exercise' | 'lesson' | 'exam';
  filters: {
    classLevels: string[];
    subjects: string[];
    subfields: string[];
    chapters: string[];
    theorems: string[];
    difficulties: Difficulty[];
    showViewed?: boolean;
    hideViewed?: boolean;
    showCompleted?: boolean;
    showFailed?: boolean;
    isNationalExam?: boolean;
    dateStart?: string | null;
    dateEnd?: string | null;
  };
  onFilterChange: (filters: any) => void;
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  accentColor?: string;
}

interface Option {
  id: string | number;
  name: string;
  content_count?: number | null;
}

export const HorizontalFilterBar: React.FC<HorizontalFilterBarProps> = ({
  contentType,
  filters,
  onFilterChange,
  sortBy,
  onSortChange,
  accentColor = 'indigo',
}) => {
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  const getColorClasses = () => {
    switch (accentColor) {
      case 'violet':
        return {
          chip: 'bg-violet-100 text-violet-700',
          chipHover: 'hover:bg-violet-200',
          selected: 'bg-violet-600 text-white',
          button: 'bg-violet-600 hover:bg-violet-700',
        };
      case 'emerald':
        return {
          chip: 'bg-emerald-100 text-emerald-700',
          chipHover: 'hover:bg-emerald-200',
          selected: 'bg-emerald-600 text-white',
          button: 'bg-emerald-600 hover:bg-emerald-700',
        };
      case 'blue':
        return {
          chip: 'bg-blue-100 text-blue-700',
          chipHover: 'hover:bg-blue-200',
          selected: 'bg-blue-600 text-white',
          button: 'bg-blue-600 hover:bg-blue-700',
        };
      default:
        return {
          chip: 'bg-indigo-100 text-indigo-700',
          chipHover: 'hover:bg-indigo-200',
          selected: 'bg-indigo-600 text-white',
          button: 'bg-indigo-600 hover:bg-indigo-700',
        };
    }
  };

  const colorClasses = getColorClasses();
  const [classLevels, setClassLevels] = useState<Option[]>([]);
  const [subjects, setSubjects] = useState<Option[]>([]);
  const [subfields, setSubfields] = useState<Option[]>([]);
  const [chapters, setChapters] = useState<Option[]>([]);
  const [theorems, setTheorems] = useState<Option[]>([]);
  const [difficultyCounts, setDifficultyCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    loadClassLevels();
  }, [contentType]);

  // Load difficulty counts when panel opens or filters change
  useEffect(() => {
    if (contentType !== 'lesson') {
      loadDifficultyCounts();
    }
  }, [contentType, filters.classLevels, filters.subjects, filters.subfields, filters.chapters, filters.theorems]);

  useEffect(() => {
    if (filters.classLevels.length > 0) {
      loadSubjects(filters.classLevels);
    } else {
      setSubjects([]);
      setSubfields([]);
      setChapters([]);
      setTheorems([]);
    }
  }, [filters.classLevels]);

  useEffect(() => {
    if (filters.subjects.length > 0 && filters.classLevels.length > 0) {
      loadSubfields(filters.classLevels, filters.subjects);
    } else {
      setSubfields([]);
      setChapters([]);
      setTheorems([]);
    }
  }, [filters.subjects, filters.classLevels]);

  useEffect(() => {
    if (filters.subfields.length > 0) {
      loadChapters(filters.subfields);
    } else {
      setChapters([]);
      setTheorems([]);
    }
  }, [filters.subfields]);

  useEffect(() => {
    if (filters.chapters.length > 0) {
      loadTheorems(filters.chapters);
    } else {
      setTheorems([]);
    }
  }, [filters.chapters]);

  const loadClassLevels = async () => {
    try {
      const data = await getClassLevels(contentType);
      setClassLevels(data);
    } catch (error) {
      console.error('Error loading class levels:', error);
    }
  };

  const loadSubjects = async (classLevelIds: string[]) => {
    try {
      const data = await getSubjects(classLevelIds, contentType);
      setSubjects(data);
    } catch (error) {
      console.error('Error loading subjects:', error);
    }
  };

  const loadSubfields = async (classLevelIds: string[], subjectIds: string[]) => {
    try {
      const promises = subjectIds.map(subjectId => getSubfields(subjectId, classLevelIds, contentType));
      const results = await Promise.all(promises);
      const allSubfields = results.flat();
      const uniqueSubfields = Array.from(
        new Map(allSubfields.map(item => [item.id, item])).values()
      );
      setSubfields(uniqueSubfields);
    } catch (error) {
      console.error('Error loading subfields:', error);
    }
  };

  const loadChapters = async (subfieldIds: string[]) => {
    try {
      if (filters.subjects.length === 0 || filters.classLevels.length === 0) {
        setChapters([]);
        return;
      }
      const subjectId = filters.subjects[0];
      const data = await getChapters(subjectId, filters.classLevels, subfieldIds, contentType);
      setChapters(data);
    } catch (error) {
      console.error('Error loading chapters:', error);
    }
  };

  const loadTheorems = async (chapterIds: string[]) => {
    try {
      if (filters.subjects.length === 0 || filters.classLevels.length === 0 || filters.subfields.length === 0) {
        setTheorems([]);
        return;
      }
      const subjectId = filters.subjects[0];
      const data = await getTheorems(subjectId, filters.classLevels, filters.subfields, chapterIds, contentType);
      setTheorems(data);
    } catch (error) {
      console.error('Error loading theorems:', error);
    }
  };

  const loadDifficultyCounts = async () => {
    try {
      const data = await getDifficultyCounts(contentType, {
        classLevels: filters.classLevels,
        subjects: filters.subjects,
        subfields: filters.subfields,
        chapters: filters.chapters,
        theorems: filters.theorems,
      });
      setDifficultyCounts(data);
    } catch (error) {
      console.error('Error loading difficulty counts:', error);
    }
  };

  const handleToggleFilter = (filterKey: keyof typeof filters, value: string) => {
    const currentValues = filters[filterKey] as string[];
    const newValues = currentValues.includes(value)
      ? currentValues.filter((v) => v !== value)
      : [...currentValues, value];

    const updatedFilters = { ...filters, [filterKey]: newValues };

    if (filterKey === 'classLevels') {
      updatedFilters.subjects = [];
      updatedFilters.subfields = [];
      updatedFilters.chapters = [];
      updatedFilters.theorems = [];
      setSubjects([]);
      setSubfields([]);
      setChapters([]);
      setTheorems([]);
    } else if (filterKey === 'subjects') {
      updatedFilters.subfields = [];
      updatedFilters.chapters = [];
      updatedFilters.theorems = [];
      setSubfields([]);
      setChapters([]);
      setTheorems([]);
    } else if (filterKey === 'subfields') {
      updatedFilters.chapters = [];
      updatedFilters.theorems = [];
      setChapters([]);
      setTheorems([]);
    } else if (filterKey === 'chapters') {
      updatedFilters.theorems = [];
      setTheorems([]);
    }

    onFilterChange(updatedFilters);
  };

  const handleClearAll = () => {
    onFilterChange({
      classLevels: [],
      subjects: [],
      subfields: [],
      chapters: [],
      theorems: [],
      difficulties: [],
      showViewed: false,
      hideViewed: false,
      showCompleted: false,
      showFailed: false,
      isNationalExam: undefined,
      dateStart: null,
      dateEnd: null,
    });
  };

  const getActiveFilterCount = () => {
    let count = 0;
    count += filters.classLevels.length;
    count += filters.subjects.length;
    count += filters.subfields.length;
    count += filters.chapters.length;
    count += filters.theorems.length;
    count += filters.difficulties.length;
    if (filters.showViewed) count++;
    if (filters.hideViewed) count++;
    if (filters.showCompleted) count++;
    if (filters.showFailed) count++;
    if (filters.isNationalExam !== undefined && filters.isNationalExam !== null) count++;
    if (filters.dateStart) count++;
    if (filters.dateEnd) count++;
    return count;
  };

  const renderChip = (label: string, onRemove: () => void) => (
    <div key={label} className={`inline-flex items-center gap-1.5 px-3 py-1.5 ${colorClasses.chip} rounded-lg text-sm font-medium`}>
      <span>{label}</span>
      <button
        onClick={onRemove}
        className={`${colorClasses.chipHover} rounded-full p-0.5 transition-colors`}
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );

  const getOptionName = (options: Option[], id: string) => {
    const option = options.find((opt) => opt.id.toString() === id);
    return option?.name || id;
  };

  const activeFilterCount = getActiveFilterCount();

  return (
    <div className="bg-white rounded-2xl border border-slate-200 mb-6">
      {/* Toolbar */}
      <div className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          {/* Left: Filter toggle + chips */}
          <div className="flex flex-wrap items-center gap-2.5 flex-1">
            <button
              onClick={() => setIsPanelOpen(!isPanelOpen)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                isPanelOpen
                  ? `${colorClasses.button} text-white shadow-md`
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <FilterIcon className="w-4 h-4" />
              <span>Filtres</span>
              {activeFilterCount > 0 && (
                <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full ${
                  isPanelOpen ? 'bg-white/20 text-white' : 'bg-slate-900 text-white'
                }`}>
                  {activeFilterCount}
                </span>
              )}
              <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isPanelOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Active chips */}
            <div className="flex flex-wrap items-center gap-2">
              {filters.classLevels.map((id) =>
                renderChip(getOptionName(classLevels, id), () =>
                  handleToggleFilter('classLevels', id)
                )
              )}
              {filters.subjects.map((id) =>
                renderChip(getOptionName(subjects, id), () =>
                  handleToggleFilter('subjects', id)
                )
              )}
              {filters.subfields.map((id) =>
                renderChip(getOptionName(subfields, id), () =>
                  handleToggleFilter('subfields', id)
                )
              )}
              {filters.chapters.map((id) =>
                renderChip(getOptionName(chapters, id), () =>
                  handleToggleFilter('chapters', id)
                )
              )}
              {filters.theorems.map((id) =>
                renderChip(getOptionName(theorems, id), () =>
                  handleToggleFilter('theorems', id)
                )
              )}
              {filters.difficulties.map((diff) =>
                renderChip(
                  diff === 'easy' ? 'Facile' : diff === 'medium' ? 'Moyen' : 'Difficile',
                  () => handleToggleFilter('difficulties', diff)
                )
              )}
              {filters.showViewed &&
                renderChip('Vus', () =>
                  onFilterChange({ ...filters, showViewed: false })
                )}
              {filters.hideViewed &&
                renderChip('Non vus', () =>
                  onFilterChange({ ...filters, hideViewed: false })
                )}
              {filters.showCompleted &&
                renderChip('Validés', () =>
                  onFilterChange({ ...filters, showCompleted: false })
                )}
              {filters.showFailed &&
                renderChip('Échoués', () =>
                  onFilterChange({ ...filters, showFailed: false })
                )}
              {filters.isNationalExam === true &&
                renderChip('National', () =>
                  onFilterChange({ ...filters, isNationalExam: undefined })
                )}
              {filters.isNationalExam === false &&
                renderChip('Autres examens', () =>
                  onFilterChange({ ...filters, isNationalExam: undefined })
                )}
              {filters.dateStart &&
                renderChip(`Depuis ${filters.dateStart}`, () =>
                  onFilterChange({ ...filters, dateStart: null })
                )}
              {filters.dateEnd &&
                renderChip(`Jusqu'à ${filters.dateEnd}`, () =>
                  onFilterChange({ ...filters, dateEnd: null })
                )}
            </div>

            {activeFilterCount > 0 && (
              <button
                onClick={handleClearAll}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-sm text-slate-500 hover:text-slate-800 font-medium transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Effacer</span>
              </button>
            )}
          </div>

          {/* Right: Sort */}
          <div className="flex items-center gap-2.5 border-t sm:border-t-0 sm:border-l border-slate-200 pt-3 sm:pt-0 sm:pl-3 flex-shrink-0">
            <ArrowUpDown className="w-4 h-4 text-slate-400" />
            <SortDropdown value={sortBy} onChange={onSortChange} />
          </div>
        </div>
      </div>

      {/* Collapsible Filter Panel */}
      <AnimatePresence>
        {isPanelOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="border-t border-slate-200 px-5 py-4 space-y-0">
              {/* Class Levels — always visible */}
              <FilterRow
                title="Niveau"
                options={classLevels}
                selectedIds={filters.classLevels}
                onToggle={(id) => handleToggleFilter('classLevels', id)}
                selectedClass={colorClasses.selected}
              />

              {/* Subjects */}
              {filters.classLevels.length > 0 && subjects.length > 0 && (
                <FilterRow
                  title="Matière"
                  options={subjects}
                  selectedIds={filters.subjects}
                  onToggle={(id) => handleToggleFilter('subjects', id)}
                  selectedClass={colorClasses.selected}
                />
              )}

              {/* Subfields */}
              {filters.subjects.length > 0 && subfields.length > 0 && (
                <FilterRow
                  title="Sous-domaine"
                  options={subfields}
                  selectedIds={filters.subfields}
                  onToggle={(id) => handleToggleFilter('subfields', id)}
                  selectedClass={colorClasses.selected}
                />
              )}

              {/* Chapters */}
              {filters.subfields.length > 0 && chapters.length > 0 && (
                <FilterRow
                  title="Chapitre"
                  options={chapters}
                  selectedIds={filters.chapters}
                  onToggle={(id) => handleToggleFilter('chapters', id)}
                  selectedClass={colorClasses.selected}
                />
              )}

              {/* Theorems */}
              {filters.chapters.length > 0 && theorems.length > 0 && (
                <FilterRow
                  title="Théorème"
                  options={theorems}
                  selectedIds={filters.theorems}
                  onToggle={(id) => handleToggleFilter('theorems', id)}
                  selectedClass={colorClasses.selected}
                />
              )}

              {/* Difficulty — exercises & exams only */}
              {contentType !== 'lesson' && (
                <div className="flex flex-col sm:flex-row sm:items-start gap-2 border-b border-slate-100 pb-3 mb-3">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider w-28 flex-shrink-0 pt-2">
                    Difficulté
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {([
                      { id: 'easy', name: 'Facile', selected: 'bg-emerald-600 text-white shadow-sm', unselected: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200' },
                      { id: 'medium', name: 'Moyen', selected: 'bg-amber-500 text-white shadow-sm', unselected: 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200' },
                      { id: 'hard', name: 'Difficile', selected: 'bg-rose-600 text-white shadow-sm', unselected: 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200' },
                    ] as const).map((diff) => {
                      const isSelected = filters.difficulties.includes(diff.id);
                      const count = difficultyCounts[diff.id];
                      return (
                        <button
                          key={diff.id}
                          onClick={() => handleToggleFilter('difficulties', diff.id)}
                          className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                            isSelected ? diff.selected : diff.unselected
                          }`}
                        >
                          {diff.name}
                          {count != null && (
                            <span className={`ml-1.5 ${isSelected ? 'opacity-75' : 'opacity-50'}`}>({count})</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Status — all content types */}
              <div className="flex flex-col sm:flex-row sm:items-start gap-2 border-b border-slate-100 pb-3 mb-3">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider w-28 flex-shrink-0 pt-2">
                  Statut
                </span>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => onFilterChange({ ...filters, showViewed: !filters.showViewed, hideViewed: false })}
                    className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                      filters.showViewed ? colorClasses.selected : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    Vus
                  </button>
                  <button
                    onClick={() => onFilterChange({ ...filters, hideViewed: !filters.hideViewed, showViewed: false })}
                    className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                      filters.hideViewed ? 'bg-slate-700 text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    Non vus
                  </button>
                  <button
                    onClick={() => onFilterChange({ ...filters, showCompleted: !filters.showCompleted })}
                    className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                      filters.showCompleted ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    Validés
                  </button>
                  <button
                    onClick={() => onFilterChange({ ...filters, showFailed: !filters.showFailed })}
                    className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                      filters.showFailed ? 'bg-red-600 text-white shadow-sm' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    Échoués
                  </button>
                </div>
              </div>

              {/* National exam + date — exams only */}
              {contentType === 'exam' && (
                <>
                  <div className="flex flex-col sm:flex-row sm:items-start gap-2 border-b border-slate-100 pb-3 mb-3">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider w-28 flex-shrink-0 pt-2">
                      Type
                    </span>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => onFilterChange({ ...filters, isNationalExam: filters.isNationalExam ? undefined : true })}
                        className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                          filters.isNationalExam === true ? colorClasses.selected : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        Examen National
                      </button>
                      <button
                        onClick={() => onFilterChange({ ...filters, isNationalExam: filters.isNationalExam === false ? undefined : false })}
                        className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                          filters.isNationalExam === false ? colorClasses.selected : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        Autres examens
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-start gap-2 pb-1">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider w-28 flex-shrink-0 pt-2">
                      Période
                    </span>
                    <div className="flex items-center gap-3">
                      <select
                        value={filters.dateStart || ''}
                        onChange={(e) => onFilterChange({ ...filters, dateStart: e.target.value || null })}
                        className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">De...</option>
                        {Array.from({ length: new Date().getFullYear() - 2008 + 1 }, (_, i) => 2008 + i).reverse().map(year => (
                          <option key={year} value={year}>{year}</option>
                        ))}
                      </select>
                      <span className="text-slate-400 text-sm">—</span>
                      <select
                        value={filters.dateEnd || ''}
                        onChange={(e) => onFilterChange({ ...filters, dateEnd: e.target.value || null })}
                        className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">À...</option>
                        {Array.from({ length: new Date().getFullYear() - 2008 + 1 }, (_, i) => 2008 + i).reverse().map(year => (
                          <option key={year} value={year}>{year}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </>
              )}

              {/* Footer */}
              {activeFilterCount > 0 && (
                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <button
                    onClick={handleClearAll}
                    className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 font-medium transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Réinitialiser tout
                  </button>
                  <span className="text-xs text-slate-400">
                    {activeFilterCount} filtre{activeFilterCount !== 1 ? 's' : ''} actif{activeFilterCount !== 1 ? 's' : ''}
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Reusable row: label + pill buttons with optional count
const FilterRow: React.FC<{
  title: string;
  options: Option[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  selectedClass: string;
}> = ({ title, options, selectedIds, onToggle, selectedClass }) => (
  <div className="flex flex-col sm:flex-row sm:items-start gap-2 border-b border-slate-100 pb-3 mb-3">
    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider w-28 flex-shrink-0 pt-2">
      {title}
    </span>
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const isSelected = selectedIds.includes(option.id.toString());
        const count = option.content_count;
        return (
          <button
            key={option.id}
            onClick={() => onToggle(option.id.toString())}
            className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
              isSelected
                ? selectedClass
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {option.name}
            {count != null && (
              <span className={`ml-1.5 ${isSelected ? 'opacity-75' : 'opacity-50'}`}>({count})</span>
            )}
          </button>
        );
      })}
    </div>
  </div>
);
