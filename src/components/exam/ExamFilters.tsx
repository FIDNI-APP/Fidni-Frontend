import React, { useState, useEffect } from 'react';
import { Award, Calendar, Filter, ChevronUp, ChevronDown } from 'lucide-react';
import { Filters } from '../Filters';
import { ExamFilters } from '@/types/index';
import { DateRangePicker } from './DateRangePicker';

interface ExamFiltersProps {
  onFilterChange: (filters: ExamFilters) => void;
  initialClassLevels?: string[];
  initialSubjects?: string[];
}

export const ExamFilterPanel: React.FC<ExamFiltersProps> = ({
  onFilterChange,
  initialClassLevels = [],
  initialSubjects = []
}) => {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    standardFilters: true,
    examSpecific: true
  });
  const [isNationalOnly, setIsNationalOnly] = useState<boolean | null>(null);
  const [dateRange, setDateRange] = useState<{start: string | null, end: string | null} | null>(null);
  const [standardFilters, setStandardFilters] = useState<Omit<ExamFilters, 'isNationalExam' | 'dateRange'>>({
    classLevels: initialClassLevels,
    subjects: initialSubjects,
    subfields: [],
    chapters: [],
    theorems: [],
    difficulties: []
  });

  // Mettre à jour les filtres lorsque les sélections spécifiques aux examens changent
  useEffect(() => {
    onFilterChange({
      ...standardFilters,
      isNationalExam: isNationalOnly,
      dateRange
    });
  }, [isNationalOnly, dateRange, standardFilters, onFilterChange]);

  // Mettre à jour les filtres standard lorsqu'ils changent
  const handleStandardFilterChange = (newFilters: Omit<ExamFilters, 'isNationalExam' | 'dateRange'>) => {
    setStandardFilters(newFilters);
  };

  // Toggle d'une section de filtres
  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      {/* En-tête des filtres */}
      <div className="p-4 bg-gradient-to-r from-blue-700 to-indigo-700 text-white font-medium">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">
            <Filter className="w-5 h-5 mr-2 inline" />
            Filtres d'examens
          </h2>
        </div>
      </div>

      <div className="p-4">
        {/* Section de filtres standard (collapsable) */}
        <div className="mb-4 border-b border-gray-100 pb-4">
          <button 
            onClick={() => toggleSection('standardFilters')}
            className="flex items-center justify-between w-full text-left mb-3"
          >
            <h3 className="text-lg font-medium text-gray-800">Filtres généraux</h3>
            {expandedSections.standardFilters ? 
              <ChevronDown className="w-5 h-5 text-gray-500" /> : 
              <ChevronUp className="w-5 h-5 text-gray-500" />
            }
          </button>
          
          {expandedSections.standardFilters && (
            <div className="pl-2">
              <Filters 
                onFilterChange={handleStandardFilterChange}
                initialClassLevels={initialClassLevels}
                initialSubjects={initialSubjects}
              />
            </div>
          )}
        </div>

        {/* Section de filtres spécifiques aux examens */}
        <div className="mb-4">
          <button 
            onClick={() => toggleSection('examSpecific')}
            className="flex items-center justify-between w-full text-left mb-3"
          >
            <h3 className="text-lg font-medium text-gray-800">Filtres spécifiques aux examens</h3>
            {expandedSections.examSpecific ? 
              <ChevronDown className="w-5 h-5 text-gray-500" /> : 
              <ChevronUp className="w-5 h-5 text-gray-500" />
            }
          </button>
          
          {expandedSections.examSpecific && (
            <div className="space-y-4">
              {/* Filtre d'examen national */}
              <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg">
                <h4 className="text-sm font-medium text-blue-700 flex items-center mb-2">
                  <Award className="w-4 h-4 mr-1.5" />
                  Type d'examen
                </h4>
                
                <div className="flex bg-white rounded-lg p-1 shadow-sm">
                  <button
                    onClick={() => setIsNationalOnly(null)}
                    className={`flex-1 px-3 py-1.5 text-sm rounded-md transition-colors ${
                      isNationalOnly === null ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    Tous
                  </button>
                  <button
                    onClick={() => setIsNationalOnly(true)}
                    className={`flex-1 px-3 py-1.5 text-sm rounded-md transition-colors ${
                      isNationalOnly === true ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    Nationaux
                  </button>
                  <button
                    onClick={() => setIsNationalOnly(false)}
                    className={`flex-1 px-3 py-1.5 text-sm rounded-md transition-colors ${
                      isNationalOnly === false ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    Autres
                  </button>
                </div>
              </div>
              
              {/* Filtre de date */}
              <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg">
                <h4 className="text-sm font-medium text-blue-700 flex items-center mb-2">
                  <Calendar className="w-4 h-4 mr-1.5" />
                  Date de l'examen
                </h4>
                
                <DateRangePicker 
                  onChange={setDateRange}
                  value={dateRange}
                />
                
                {dateRange && (dateRange.start || dateRange.end) && (
                  <div className="mt-2 p-2 bg-white rounded-md text-xs text-gray-600">
                    {dateRange.start && (
                      <div>Début: {new Date(dateRange.start).toLocaleDateString()}</div>
                    )}
                    {dateRange.end && (
                      <div>Fin: {new Date(dateRange.end).toLocaleDateString()}</div>
                    )}
                    <button
                      onClick={() => setDateRange(null)}
                      className="mt-1 text-blue-600 hover:text-blue-800 text-xs underline"
                    >
                      Effacer les dates
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        
        {/* Résumé des filtres actifs */}
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Filtres actifs</h4>
          
          <div className="flex flex-wrap gap-2">
            {standardFilters.classLevels.length > 0 && (
              <span className="bg-indigo-100 text-indigo-800 px-2 py-1 rounded-full text-xs">
                {standardFilters.classLevels.length} niveau(x)
              </span>
            )}
            
            {standardFilters.subjects.length > 0 && (
              <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs">
                {standardFilters.subjects.length} matière(s)
              </span>
            )}
            
            {standardFilters.chapters.length > 0 && (
              <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">
                {standardFilters.chapters.length} chapitre(s)
              </span>
            )}
            
            {isNationalOnly !== null && (
              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                {isNationalOnly ? 'Examens nationaux' : 'Examens non-nationaux'}
              </span>
            )}
            
            {dateRange && (dateRange.start || dateRange.end) && (
              <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs">
                Période sélectionnée
              </span>
            )}
            
            {/* Bouton pour réinitialiser tous les filtres */}
            {(standardFilters.classLevels.length > 0 || 
              standardFilters.subjects.length > 0 || 
              standardFilters.chapters.length > 0 ||
              isNationalOnly !== null ||
              (dateRange && (dateRange.start || dateRange.end))) && (
              <button
                onClick={() => {
                  setStandardFilters({
                    classLevels: [],
                    subjects: [],
                    subfields: [],
                    chapters: [],
                    theorems: [],
                    difficulties: []
                  });
                  setIsNationalOnly(null);
                  setDateRange(null);
                }}
                className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs hover:bg-red-200"
              >
                Réinitialiser tous les filtres
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};