// In src/contexts/FilterContext.tsx (new file)
import React, { createContext, useContext, useState } from 'react';

type FilterContextType = {
  selectedClassLevel: string | null;
  selectedSubject: string | null;
  setSelectedClassLevel: (id: string | null) => void;
  setSelectedSubject: (id: string | null) => void;
  clearFilters: () => void;
};

const FilterContext = createContext<FilterContextType | undefined>(undefined);

export const FilterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedClassLevel, setSelectedClassLevel] = useState<string | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);

  const clearFilters = () => {
    setSelectedClassLevel(null);
    setSelectedSubject(null);
  };

  return (
    <FilterContext.Provider 
      value={{ 
        selectedClassLevel, 
        selectedSubject, 
        setSelectedClassLevel, 
        setSelectedSubject,
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