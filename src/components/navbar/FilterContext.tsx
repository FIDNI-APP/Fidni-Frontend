// src/components/navbar/FilterContext.tsx - Version améliorée
import React, { createContext, useContext, useState, useEffect } from 'react';

type FilterContextType = {
  selectedClassLevel: string | null;
  selectedSubject: string | null;
  // Ajout de filtres complets pour la persistence
  fullFilters: {
    classLevels: string[];
    subjects: string[];
    subfields: string[];
    chapters: string[];
    theorems: string[];
    difficulties: string[];
  } | null;
  setSelectedClassLevel: (id: string | null) => void;
  setSelectedSubject: (id: string | null) => void;
  setFullFilters: (filters: FilterContextType['fullFilters']) => void;
  clearFilters: () => void;
};

const FilterContext = createContext<FilterContextType | undefined>(undefined);

export const FilterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedClassLevel, setSelectedClassLevel] = useState<string | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [fullFilters, setFullFilters] = useState<FilterContextType['fullFilters']>(null);

  // Persister les filtres dans sessionStorage pour éviter la perte lors de la navigation
  useEffect(() => {
    const savedFilters = sessionStorage.getItem('exerciseFilters');
    if (savedFilters) {
      const parsed = JSON.parse(savedFilters);
      if (parsed.selectedClassLevel) setSelectedClassLevel(parsed.selectedClassLevel);
      if (parsed.selectedSubject) setSelectedSubject(parsed.selectedSubject);
      if (parsed.fullFilters) setFullFilters(parsed.fullFilters);
    }
  }, []);

  // Sauvegarder les changements
  useEffect(() => {
    const filtersToSave = {
      selectedClassLevel,
      selectedSubject,
      fullFilters
    };
    sessionStorage.setItem('exerciseFilters', JSON.stringify(filtersToSave));
  }, [selectedClassLevel, selectedSubject, fullFilters]);

  const clearFilters = () => {
    setSelectedClassLevel(null);
    setSelectedSubject(null);
    setFullFilters(null);
    sessionStorage.removeItem('exerciseFilters');
  };

  return (
    <FilterContext.Provider 
      value={{ 
        selectedClassLevel, 
        selectedSubject,
        fullFilters,
        setSelectedClassLevel, 
        setSelectedSubject,
        setFullFilters,
        clearFilters
      }}
    >
      {children}
    </FilterContext.Provider>
  );
};

export const useFilters = () => {
  const context = useContext(FilterContext);
  if (context === undefined) {
    throw new Error('useFilters must be used within a FilterProvider');
  }
  return context;
};