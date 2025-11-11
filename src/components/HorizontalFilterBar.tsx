import React, { useState, useEffect } from 'react';
import { ChevronDown, X, Filter as FilterIcon, RotateCcw } from 'lucide-react';
import { Difficulty } from '@/types';
import { getClassLevels, getSubjects, getSubfields, getChapters, getTheorems } from '@/lib/api';

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
    showCompleted?: boolean;
    isNationalExam?: boolean;
    dateStart?: string | null;
    dateEnd?: string | null;
  };
  onFilterChange: (filters: any) => void;
}

interface Option {
  id: string | number;
  name: string;
}

export const HorizontalFilterBar: React.FC<HorizontalFilterBarProps> = ({
  contentType,
  filters,
  onFilterChange,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [classLevels, setClassLevels] = useState<Option[]>([]);
  const [subjects, setSubjects] = useState<Option[]>([]);
  const [subfields, setSubfields] = useState<Option[]>([]);
  const [chapters, setChapters] = useState<Option[]>([]);
  const [theorems, setTheorems] = useState<Option[]>([]);

  // Load class levels on mount
  useEffect(() => {
    loadClassLevels();
  }, []);

  // Load subjects when class levels change
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

  // Load subfields when subjects change
  useEffect(() => {
    if (filters.subjects.length > 0 && filters.classLevels.length > 0) {
      loadSubfields(filters.classLevels, filters.subjects);
    } else {
      setSubfields([]);
      setChapters([]);
      setTheorems([]);
    }
  }, [filters.subjects, filters.classLevels]);

  // Load chapters when subfields change
  useEffect(() => {
    if (filters.subfields.length > 0) {
      loadChapters(filters.subfields);
    } else {
      setChapters([]);
      setTheorems([]);
    }
  }, [filters.subfields]);

  // Load theorems when chapters change
  useEffect(() => {
    if (filters.chapters.length > 0) {
      loadTheorems(filters.chapters);
    } else {
      setTheorems([]);
    }
  }, [filters.chapters]);

  const loadClassLevels = async () => {
    try {
      const data = await getClassLevels();
      setClassLevels(data);
    } catch (error) {
      console.error('Error loading class levels:', error);
    }
  };

  const loadSubjects = async (classLevelIds: string[]) => {
    try {
      const data = await getSubjects({ classLevel: classLevelIds });
      setSubjects(data);
    } catch (error) {
      console.error('Error loading subjects:', error);
    }
  };

  const loadSubfields = async (classLevelIds: string[], subjectIds: string[]) => {
    try {
      const data = await getSubfields({
        classLevel: classLevelIds,
        subject: subjectIds[0], // Use first subject for now
      });
      setSubfields(data);
    } catch (error) {
      console.error('Error loading subfields:', error);
    }
  };

  const loadChapters = async (subfieldIds: string[]) => {
    try {
      const data = await getChapters({ subfield: subfieldIds });
      setChapters(data);
    } catch (error) {
      console.error('Error loading chapters:', error);
    }
  };

  const loadTheorems = async (chapterIds: string[]) => {
    try {
      const data = await getTheorems({ chapter: chapterIds });
      setTheorems(data);
    } catch (error) {
      console.error('Error loading theorems:', error);
    }
  };

  const handleToggleFilter = (filterKey: keyof typeof filters, value: string) => {
    const currentValues = filters[filterKey] as string[];
    const newValues = currentValues.includes(value)
      ? currentValues.filter((v) => v !== value)
      : [...currentValues, value];

    onFilterChange({ ...filters, [filterKey]: newValues });
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
      showCompleted: false,
      isNationalExam: false,
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
    if (filters.showCompleted) count++;
    if (filters.isNationalExam) count++;
    return count;
  };

  const renderChip = (label: string, onRemove: () => void) => (
    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium">
      <span>{label}</span>
      <button
        onClick={onRemove}
        className="hover:bg-indigo-200 rounded-full p-0.5 transition-colors"
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
    <>
      {/* Horizontal Filter Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex flex-wrap items-center gap-3">
          {/* Filter Button */}
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg text-gray-700 font-medium transition-colors border border-gray-200"
          >
            <FilterIcon className="w-4 h-4" />
            <span>Filtres</span>
            {activeFilterCount > 0 && (
              <span className="ml-1 px-2 py-0.5 bg-indigo-600 text-white text-xs rounded-full">
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* Active Filter Chips */}
          <div className="flex flex-wrap items-center gap-2">
            {filters.classLevels.map((id) =>
              renderChip(`Niveau: ${getOptionName(classLevels, id)}`, () =>
                handleToggleFilter('classLevels', id)
              )
            )}
            {filters.subjects.map((id) =>
              renderChip(`Matière: ${getOptionName(subjects, id)}`, () =>
                handleToggleFilter('subjects', id)
              )
            )}
            {filters.subfields.map((id) =>
              renderChip(`Sous-domaine: ${getOptionName(subfields, id)}`, () =>
                handleToggleFilter('subfields', id)
              )
            )}
            {filters.chapters.map((id) =>
              renderChip(`Chapitre: ${getOptionName(chapters, id)}`, () =>
                handleToggleFilter('chapters', id)
              )
            )}
            {filters.theorems.map((id) =>
              renderChip(`Théorème: ${getOptionName(theorems, id)}`, () =>
                handleToggleFilter('theorems', id)
              )
            )}
            {filters.difficulties.map((diff) =>
              renderChip(
                `Difficulté: ${diff === 'easy' ? 'Facile' : diff === 'medium' ? 'Moyen' : 'Difficile'}`,
                () => handleToggleFilter('difficulties', diff)
              )
            )}
            {filters.showViewed &&
              renderChip('Vus', () =>
                onFilterChange({ ...filters, showViewed: false })
              )}
            {filters.showCompleted &&
              renderChip('Complétés', () =>
                onFilterChange({ ...filters, showCompleted: false })
              )}
            {filters.isNationalExam &&
              renderChip('Examen National', () =>
                onFilterChange({ ...filters, isNationalExam: false })
              )}
          </div>

          {/* Clear All Button */}
          {activeFilterCount > 0 && (
            <button
              onClick={handleClearAll}
              className="ml-auto inline-flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 font-medium transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Réinitialiser</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl my-8">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">Filtres</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              {/* Class Levels */}
              <FilterSection
                title="Niveau scolaire"
                options={classLevels}
                selectedIds={filters.classLevels}
                onToggle={(id) => handleToggleFilter('classLevels', id)}
              />

              {/* Subjects */}
              {filters.classLevels.length > 0 && (
                <FilterSection
                  title="Matière"
                  options={subjects}
                  selectedIds={filters.subjects}
                  onToggle={(id) => handleToggleFilter('subjects', id)}
                />
              )}

              {/* Subfields */}
              {filters.subjects.length > 0 && (
                <FilterSection
                  title="Sous-domaine"
                  options={subfields}
                  selectedIds={filters.subfields}
                  onToggle={(id) => handleToggleFilter('subfields', id)}
                />
              )}

              {/* Chapters */}
              {filters.subfields.length > 0 && (
                <FilterSection
                  title="Chapitre"
                  options={chapters}
                  selectedIds={filters.chapters}
                  onToggle={(id) => handleToggleFilter('chapters', id)}
                />
              )}

              {/* Theorems */}
              {filters.chapters.length > 0 && (
                <FilterSection
                  title="Théorème"
                  options={theorems}
                  selectedIds={filters.theorems}
                  onToggle={(id) => handleToggleFilter('theorems', id)}
                />
              )}

              {/* Difficulties (only for exercises and exams) */}
              {contentType !== 'lesson' && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Difficulté</h3>
                  <div className="flex flex-wrap gap-2">
                    {(['easy', 'medium', 'hard'] as Difficulty[]).map((diff) => (
                      <button
                        key={diff}
                        onClick={() => handleToggleFilter('difficulties', diff)}
                        className={`px-4 py-2 rounded-lg font-medium transition-all ${
                          filters.difficulties.includes(diff)
                            ? 'bg-indigo-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {diff === 'easy' ? 'Facile' : diff === 'medium' ? 'Moyen' : 'Difficile'}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Status filters (only for exercises) */}
              {contentType === 'exercise' && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Statut</h3>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() =>
                        onFilterChange({ ...filters, showViewed: !filters.showViewed })
                      }
                      className={`px-4 py-2 rounded-lg font-medium transition-all ${
                        filters.showViewed
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Vus
                    </button>
                    <button
                      onClick={() =>
                        onFilterChange({ ...filters, showCompleted: !filters.showCompleted })
                      }
                      className={`px-4 py-2 rounded-lg font-medium transition-all ${
                        filters.showCompleted
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Complétés
                    </button>
                  </div>
                </div>
              )}

              {/* National Exam filter (only for exams) */}
              {contentType === 'exam' && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Type d'examen</h3>
                  <button
                    onClick={() =>
                      onFilterChange({ ...filters, isNationalExam: !filters.isNationalExam })
                    }
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${
                      filters.isNationalExam
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Examen National
                  </button>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between p-6 border-t border-gray-200">
              <button
                onClick={handleClearAll}
                className="px-4 py-2 text-gray-600 hover:text-gray-900 font-medium transition-colors"
              >
                Réinitialiser tout
              </button>
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
              >
                Appliquer les filtres
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// Helper component for filter sections
const FilterSection: React.FC<{
  title: string;
  options: Option[];
  selectedIds: string[];
  onToggle: (id: string) => void;
}> = ({ title, options, selectedIds, onToggle }) => (
  <div>
    <h3 className="font-semibold text-gray-900 mb-3">{title}</h3>
    <div className="flex flex-wrap gap-2">
      {options.map((option) => (
        <button
          key={option.id}
          onClick={() => onToggle(option.id.toString())}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            selectedIds.includes(option.id.toString())
              ? 'bg-indigo-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          {option.name}
        </button>
      ))}
    </div>
  </div>
);
