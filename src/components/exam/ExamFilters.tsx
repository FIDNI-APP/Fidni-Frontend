// src/components/exam/ExamFilters.tsx - Version améliorée avec le design de Filters.tsx

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X, Filter as FilterIcon, BookOpen, GraduationCap, ChevronUp, ChevronDown, Tag, BarChart3, FileText, Award, Calendar
} from 'lucide-react';
import {
  getClassLevels, getSubjects, getChapters, getSubfields, getTheorems
} from '@/lib/api';
import {
  ClassLevelModel, SubjectModel, ChapterModel, Difficulty, Subfield, Theorem, ExamFilters as ExamFiltersType
} from '@/types';

// Props du composant
interface ExamFiltersPanelProps {
  onFilterChange: (filters: ExamFiltersType) => void;
  initialFilters?: Partial<ExamFiltersType>;
}



type FilterSectionConfig = {
  id: keyof ExamFiltersType;
  title: string;
  icon: React.ReactNode;
  options?: any[];
  customRenderer?: (
    selectedValues: any,
    onToggle: (value: any) => void,
    allData?: any[]
  ) => React.ReactNode;
  dependent?: boolean;
  shouldShowOptions?: (selectedFilters: ExamFiltersType) => boolean;
  getDisplayName?: (value: any, data?: any[]) => string;
};

const debounce = (func: Function, wait: number) => {
  let timeout: NodeJS.Timeout;
  return function executedFunction(...args: any[]) {
    const later = () => { clearTimeout(timeout); func(...args); };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

const getUniqueById = <T extends { id: string | number }>(array: T[]): T[] => {
  if (!array || array.length === 0) return [];
  return Array.from(new Map(array.map(item => [item.id, item])).values());
};

export const ExamFiltersPanel: React.FC<ExamFiltersPanelProps> = ({
  onFilterChange,
  initialFilters = {},
}) => {
  const [classLevelsData, setClassLevelsData] = useState<ClassLevelModel[]>([]);
  const [subjectsData, setSubjectsData] = useState<SubjectModel[]>([]);
  const [subfieldsData, setSubfieldsData] = useState<Subfield[]>([]);
  const [chaptersData, setChaptersData] = useState<ChapterModel[]>([]);
  const [theoremsData, setTheoremsData] = useState<Theorem[]>([]);

  const [selectedFilters, setSelectedFilters] = useState<ExamFiltersType>({
    classLevels: initialFilters.classLevels || [],
    subjects: initialFilters.subjects || [],
    subfields: initialFilters.subfields || [],
    chapters: initialFilters.chapters || [],
    theorems: initialFilters.theorems || [],
    difficulties: initialFilters.difficulties || [],
    isNationalExam: initialFilters.isNationalExam !== undefined ? initialFilters.isNationalExam : null,
    dateRange: initialFilters.dateRange || null,
  });

  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({ 
    classLevels: false, 
    subjects: false, 
    subfields: false, 
    chapters: false, 
    theorems: false 
  });
  
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    classLevels: true,
    subjects: true,
    difficulties: true,
    isNationalExam: true,
    dateRange: true,
    subfields: (initialFilters.subfields && initialFilters.subfields.length > 0) || false,
    chapters: (initialFilters.chapters && initialFilters.chapters.length > 0) || false,
    theorems: (initialFilters.theorems && initialFilters.theorems.length > 0) || false
  });
  
  const [lastRequests, setLastRequests] = useState<Record<string, string>>({});

  const updateLoadingState = (category: keyof ExamFiltersType | string, isLoading: boolean) => 
    setLoadingStates(prev => ({ ...prev, [category as string]: isLoading }));

  const loadClassLevels = useCallback(async () => {
    updateLoadingState('classLevels', true); 
    try { 
      const data = await getClassLevels(); 
      setClassLevelsData(getUniqueById(data)); 
    } catch (error) { 
      console.error('Failed to load class levels:', error); 
      setClassLevelsData([]); 
    } finally { 
      updateLoadingState('classLevels', false); 
    }
  }, []);

  const loadSubjects = useCallback(async () => {
    if (selectedFilters.classLevels.length === 0) { 
      setSubjectsData([]); 
      return; 
    } 
    updateLoadingState('subjects', true); 
    const reqKey = JSON.stringify({ cl: selectedFilters.classLevels.sort() }); 
    if (lastRequests.subjects === reqKey && subjectsData.length > 0) { 
      updateLoadingState('subjects', false); 
      return; 
    } 
    try { 
      const data = await getSubjects(selectedFilters.classLevels); 
      setSubjectsData(getUniqueById(data)); 
      setLastRequests(prev => ({ ...prev, subjects: reqKey })); 
    } catch (error) { 
      console.error('Failed to load subjects:', error); 
      setSubjectsData([]); 
    } finally { 
      updateLoadingState('subjects', false); 
    }
  }, [selectedFilters.classLevels, lastRequests.subjects, subjectsData.length]);

  const loadSubfields = useCallback(async () => {
    if (selectedFilters.subjects.length === 0 || selectedFilters.classLevels.length === 0) { 
      setSubfieldsData([]); 
      return; 
    } 
    updateLoadingState('subfields', true); 
    const reqKey = JSON.stringify({ cl: selectedFilters.classLevels.sort(), su: selectedFilters.subjects.sort() }); 
    if (lastRequests.subfields === reqKey && subfieldsData.length > 0) { 
      updateLoadingState('subfields', false); 
      return; 
    } 
    try { 
      const promises = selectedFilters.subjects.map(subjectId => getSubfields(subjectId, selectedFilters.classLevels)); 
      const results = await Promise.all(promises); 
      setSubfieldsData(getUniqueById(results.flat())); 
      setLastRequests(prev => ({ ...prev, subfields: reqKey })); 
    } catch (error) { 
      console.error('Failed to load subfields:', error); 
      setSubfieldsData([]); 
    } finally { 
      updateLoadingState('subfields', false); 
    }
  }, [selectedFilters.subjects, selectedFilters.classLevels, lastRequests.subfields, subfieldsData.length]);

  const loadChapters = useCallback(async () => {
    if (selectedFilters.subfields.length === 0 || selectedFilters.subjects.length === 0 || selectedFilters.classLevels.length === 0) { 
      setChaptersData([]); 
      return; 
    } 
    updateLoadingState('chapters', true); 
    const reqKey = JSON.stringify({ cl: selectedFilters.classLevels.sort(), su: selectedFilters.subjects.sort(), sf: selectedFilters.subfields.sort() }); 
    if (lastRequests.chapters === reqKey && chaptersData.length > 0) { 
      updateLoadingState('chapters', false); 
      return; 
    } 
    try { 
      const subjectIdToUse = selectedFilters.subjects[0]; 
      const data = await getChapters(subjectIdToUse, selectedFilters.classLevels, selectedFilters.subfields); 
      setChaptersData(getUniqueById(data)); 
      setLastRequests(prev => ({ ...prev, chapters: reqKey })); 
    } catch (error) { 
      console.error('Failed to load chapters:', error); 
      setChaptersData([]); 
    } finally { 
      updateLoadingState('chapters', false); 
    }
  }, [selectedFilters.subfields, selectedFilters.subjects, selectedFilters.classLevels, lastRequests.chapters, chaptersData.length]);

  const loadTheorems = useCallback(async () => {
    if (selectedFilters.chapters.length === 0 || selectedFilters.subfields.length === 0 || selectedFilters.subjects.length === 0 || selectedFilters.classLevels.length === 0) { 
      setTheoremsData([]); 
      return; 
    } 
    updateLoadingState('theorems', true); 
    const reqKey = JSON.stringify({ cl: selectedFilters.classLevels.sort(), su: selectedFilters.subjects.sort(), sf: selectedFilters.subfields.sort(), ch: selectedFilters.chapters.sort() }); 
    if (lastRequests.theorems === reqKey && theoremsData.length > 0) { 
      updateLoadingState('theorems', false); 
      return; 
    } 
    try { 
      const subjectIdToUse = selectedFilters.subjects[0]; 
      const data = await getTheorems(subjectIdToUse, selectedFilters.classLevels, selectedFilters.subfields, selectedFilters.chapters); 
      setTheoremsData(getUniqueById(data)); 
      setLastRequests(prev => ({ ...prev, theorems: reqKey })); 
    } catch (error) { 
      console.error('Failed to load theorems:', error); 
      setTheoremsData([]); 
    } finally { 
      updateLoadingState('theorems', false); 
    }
  }, [selectedFilters.chapters, selectedFilters.subfields, selectedFilters.subjects, selectedFilters.classLevels, lastRequests.theorems, theoremsData.length]);

  useEffect(() => { loadClassLevels(); }, [loadClassLevels]);
  useEffect(() => { 
    if (selectedFilters.classLevels.length > 0) loadSubjects(); 
    else { 
      setSubjectsData([]); 
      setSelectedFilters(f => ({...f, subjects: [], subfields: [], chapters: [], theorems: []})); 
      setLastRequests(p => ({...p, subjects:'', subfields:'', chapters:'', theorems:''})); 
    } 
  }, [selectedFilters.classLevels, loadSubjects]);
  
  useEffect(() => { 
    if (selectedFilters.subjects.length > 0 && selectedFilters.classLevels.length > 0 && expandedSections.subfields) loadSubfields(); 
    else { 
      setSubfieldsData([]); 
      setSelectedFilters(f => ({...f, subfields: [], chapters: [], theorems: []})); 
      setLastRequests(p => ({...p, subfields:'', chapters:'', theorems:''})); 
    } 
  }, [selectedFilters.subjects, selectedFilters.classLevels, expandedSections.subfields, loadSubfields]);
  
  useEffect(() => { 
    if (selectedFilters.subfields.length > 0 && expandedSections.chapters) loadChapters(); 
    else { 
      setChaptersData([]); 
      setSelectedFilters(f => ({...f, chapters: [], theorems: []})); 
      setLastRequests(p => ({...p, chapters:'', theorems:''})); 
    } 
  }, [selectedFilters.subfields, expandedSections.chapters, loadChapters]);
  
  useEffect(() => { 
    if (selectedFilters.chapters.length > 0 && expandedSections.theorems) loadTheorems(); 
    else { 
      setTheoremsData([]); 
      setSelectedFilters(f => ({...f, theorems: []})); 
      setLastRequests(p => ({...p, theorems:''})); 
    } 
  }, [selectedFilters.chapters, expandedSections.theorems, loadTheorems]);

  const handleToggleFilter = useCallback((category: keyof ExamFiltersType, value: any) => {
    setSelectedFilters(prev => { 
      const newSelected = { ...prev }; 
      let currentValues = prev[category]; 
      
      if (category === 'isNationalExam') { 
        newSelected.isNationalExam = prev.isNationalExam === value ? null : value; 
      } else if (category === 'dateRange') { 
        newSelected.dateRange = value; 
      } else if (Array.isArray(currentValues)) { 
        if (currentValues.includes(value)) { 
          newSelected[category] = currentValues.filter(v => v !== value) as any; 
        } else { 
          newSelected[category] = [...currentValues, value] as any; 
        } 
      } 
      
      const resetDependentLastRequests: Record<string, string> = {}; 
      if (category === 'classLevels') { 
        newSelected.subjects = []; 
        newSelected.subfields = []; 
        newSelected.chapters = []; 
        newSelected.theorems = []; 
        setSubjectsData([]); 
        setSubfieldsData([]); 
        setChaptersData([]); 
        setTheoremsData([]); 
        resetDependentLastRequests.subjects = ''; 
        resetDependentLastRequests.subfields = ''; 
        resetDependentLastRequests.chapters = ''; 
        resetDependentLastRequests.theorems = ''; 
      } else if (category === 'subjects') { 
        newSelected.subfields = []; 
        newSelected.chapters = []; 
        newSelected.theorems = []; 
        setSubfieldsData([]); 
        setChaptersData([]); 
        setTheoremsData([]); 
        resetDependentLastRequests.subfields = ''; 
        resetDependentLastRequests.chapters = ''; 
        resetDependentLastRequests.theorems = ''; 
      } else if (category === 'subfields') { 
        newSelected.chapters = []; 
        newSelected.theorems = []; 
        setChaptersData([]); 
        setTheoremsData([]); 
        resetDependentLastRequests.chapters = ''; 
        resetDependentLastRequests.theorems = ''; 
      } else if (category === 'chapters') { 
        newSelected.theorems = []; 
        setTheoremsData([]); 
        resetDependentLastRequests.theorems = ''; 
      } 
      
      if(Object.keys(resetDependentLastRequests).length > 0) { 
        setLastRequests(prevLR => ({...prevLR, ...resetDependentLastRequests})); 
      } 
      
      return newSelected; 
    });
  }, []);

  const debouncedOnFilterChange = useRef(debounce(onFilterChange, 300)).current;
  useEffect(() => { debouncedOnFilterChange(selectedFilters); }, [selectedFilters, debouncedOnFilterChange]);

  const filterSectionConfigs: FilterSectionConfig[] = [
    { 
      id: 'isNationalExam', 
      title: "Type d'examen", 
      icon: <Award className="w-4 h-4 text-sky-600" />, 
      options: [ 
        { id: null, name: 'Tous', color: 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-200' }, 
        { id: true, name: 'Nationaux', color: 'bg-blue-100 text-blue-800 hover:bg-blue-200 border-blue-200' }, 
        { id: false, name: 'Autres', color: 'bg-purple-100 text-purple-700 hover:bg-purple-200 border-purple-200' }, 
      ], 
      customRenderer: (selectedValue, onToggle, options) => (
        <div className="grid grid-cols-3 gap-2 mt-3">
         {options?.map(opt => (
           <button 
             key={String(opt.id)} 
             onClick={() => onToggle(opt.id)} 
             className={`px-3 py-2 text-sm rounded-full transition-all duration-200 border ${
               selectedValue === opt.id 
                 ? 'bg-gradient-to-r from-green-900 to-green-800 text-white border-transparent' 
                 : opt.color
             }`}
           >
             {opt.name}
           </button>
         ))}
       </div>
     ), 
     getDisplayName: (value: any) => { 
       if (value === true) return 'Nationaux'; 
       if (value === false) return 'Autres'; 
       return 'Tous types'; 
     }, 
   },
   { 
     id: 'dateRange', 
     title: "Période d'examen", 
     icon: <Calendar className="w-4 h-4 text-rose-600" />, 
     customRenderer: (selectedValue, onToggle) => (
       <div className="mt-3">
         <div className="space-y-3">
           <div className="grid grid-cols-2 gap-3">
             <div>
               <label className="block text-sm font-medium text-gray-700 mb-1">Année de début</label>
               <select 
                 value={selectedValue?.start || ''} 
                 onChange={(e) => onToggle({ start: e.target.value || null, end: selectedValue?.end || null })}
                 className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                 title='Sélectionnez l année de début de la période d examen'
               >
                 <option value="">Toutes</option>
                 {Array.from({ length: new Date().getFullYear() - 2008 + 1 }, (_, i) => 2008 + i).reverse().map(year => (
                   <option key={year} value={year}>{year}</option>
                 ))}
               </select>
             </div>
             <div>
               <label className="block text-sm font-medium text-gray-700 mb-1">Année de fin</label>
               <select 
                 value={selectedValue?.end || ''} 
                 onChange={(e) => onToggle({ start: selectedValue?.start || null, end: e.target.value || null })}
                 className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                 title='Sélectionnez l année de fin de la période d examen'
               >
                 <option value="">Toutes</option>
                 {Array.from({ length: new Date().getFullYear() - 2008 + 1 }, (_, i) => 2008 + i).reverse().map(year => (
                   <option key={year} value={year}>{year}</option>
                 ))}
               </select>
             </div>
           </div>
         </div>
       </div>
     ), 
     getDisplayName: (value: any) => { 
       const dr = value as ExamFiltersType['dateRange']; 
       if (!dr || (!dr.start && !dr.end)) return "Toutes périodes"; 
       if (dr.start && !dr.end) return `Depuis ${dr.start}`; 
       if (!dr.start && dr.end) return `Jusqu'à ${dr.end}`; 
       if (dr.start === dr.end) return `Année ${dr.start}`; 
       return `${dr.start} - ${dr.end}`; 
     }, 
   },
    {
      id: 'classLevels',
      title: 'Niveau',
      icon: <GraduationCap className="w-4 h-4 text-indigo-600" />,
      getDisplayName: (id, data) => data?.find((d: any) => String(d.id) === String(id))?.name || id,
    },
    {
      id: 'subjects',
      title: 'Matières',
      icon: <BookOpen className="w-4 h-4 text-purple-600" />,
      dependent: true,
      shouldShowOptions: (sf) => sf.classLevels.length > 0,
      getDisplayName: (id, data) => data?.find((d: any) => String(d.id) === String(id))?.name || id,
    },
    {
      id: 'subfields',
      title: 'Sous-domaines',
      icon: <FileText className="w-4 h-4 text-teal-600" />,
      dependent: true,
      shouldShowOptions: (sf) => sf.classLevels.length > 0 && sf.subjects.length > 0,
      getDisplayName: (id, data) => data?.find((d: any) => String(d.id) === String(id))?.name || id,
    },
    {
      id: 'chapters',
      title: 'Chapitres',
      icon: <Tag className="w-4 h-4 text-pink-600" />,
      dependent: true,
      shouldShowOptions: (sf) => sf.subfields.length > 0,
      getDisplayName: (id, data) => data?.find((d: any) => String(d.id) === String(id))?.name || id,
    },
    {
      id: 'theorems',
      title: 'Théorèmes',
      icon: <Award className="w-4 h-4 text-orange-600" />,
      dependent: true,
      shouldShowOptions: (sf) => sf.chapters.length > 0,
      getDisplayName: (id, data) => data?.find((d: any) => String(d.id) === String(id))?.name || id,
    },
    { 
      id: 'difficulties', 
      title: 'Difficulté', 
      icon: <BarChart3 className="w-4 h-4 text-red-600" />, 
      options: [ 
        { id: 'easy', name: 'Facile', color: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border-emerald-200' }, 
        { id: 'medium', name: 'Moyen', color: 'bg-amber-100 text-amber-800 hover:bg-amber-200 border-amber-200' }, 
        { id: 'hard', name: 'Difficile', color: 'bg-red-100 text-red-800 hover:bg-red-200 border-red-200' }, 
      ], 
      getDisplayName: (id, data) => data?.find((d: any) => d.id === id)?.name || id.charAt(0).toUpperCase() + id.slice(1), 
    },
 ];

 const getDataForCategory = (categoryId: keyof ExamFiltersType): any[] => {
   switch (categoryId) { 
     case 'classLevels': return classLevelsData; 
     case 'subjects': return subjectsData; 
     case 'subfields': return subfieldsData; 
     case 'chapters': return chaptersData; 
     case 'theorems': return theoremsData; 
     case 'difficulties': return filterSectionConfigs.find(s => s.id === 'difficulties')?.options || []; 
     default: return []; 
   }
 };
 
 const toggleSection = (sectionId: string) => 
   setExpandedSections(prev => ({ ...prev, [sectionId]: !prev[sectionId] }));
   
 const resetAllFilters = () => {
   setSelectedFilters({ 
     classLevels: [], 
     subjects: [], 
     subfields: [], 
     chapters: [], 
     theorems: [], 
     difficulties: [], 
     isNationalExam: null, 
     dateRange: null, 
   }); 
   setSubjectsData([]); 
   setSubfieldsData([]); 
   setChaptersData([]); 
   setTheoremsData([]); 
   setLastRequests({}); 
   setExpandedSections(prev => ({ 
     ...prev, 
     classLevels: true, 
     subjects: true, 
     difficulties: true, 
     isNationalExam: true, 
     dateRange: true, 
     subfields: false, 
     chapters: false, 
     theorems: false, 
   }));
 };
 
 const getActiveFiltersCount = () => {
   return Object.values(selectedFilters).reduce((count, filterValue) => { 
     if (Array.isArray(filterValue)) return count + filterValue.length; 
     if (filterValue !== null && filterValue !== undefined) return count + 1; 
     return count; 
   }, 0);
 };

 return (
   <div className="bg-white rounded-xl shadow-md overflow-hidden sticky top-28 w-full max-w-4xl">
     <div className="p-6 bg-gradient-to-r from-gray-800 to-green-900 text-white font-medium">
       <div className="flex items-center justify-between">
         <div className="flex items-center space-x-3">
           <h2 className="text-xl font-semibold">
             <FilterIcon className="w-6 h-6 mr-3 inline" />
             Filtres des Examens
           </h2>
         </div>
         {getActiveFiltersCount() > 0 && (
           <button 
             onClick={resetAllFilters}
             className="text-sm bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-full transition-colors" 
           >
             Réinitialiser
           </button>
         )}
       </div>
     </div>

     <div className="p-6">
       {filterSectionConfigs.map(section => {
         const categoryData = getDataForCategory(section.id); 
         const selectedValuesForCategory = selectedFilters[section.id]; 
         const isLoading = loadingStates[section.id as string]; 
         const isExpanded = expandedSections[section.id as string]; 
         
         let isDisabled = false; 
         let disabledMessage = ""; 
         
         if (section.dependent) { 
           if (section.id === 'subjects' && selectedFilters.classLevels.length === 0) { 
             isDisabled = true; 
             disabledMessage = "Veuillez sélectionner un niveau d'abord"; 
           } else if (section.id === 'subfields' && (selectedFilters.classLevels.length === 0 || selectedFilters.subjects.length === 0)) { 
             isDisabled = true; 
             disabledMessage = "Veuillez sélectionner un niveau et une matière"; 
           } else if (section.id === 'chapters' && selectedFilters.subfields.length === 0) { 
             isDisabled = true; 
             disabledMessage = "Veuillez sélectionner un sous-domaine d'abord"; 
           } else if (section.id === 'theorems' && selectedFilters.chapters.length === 0) { 
             isDisabled = true; 
             disabledMessage = "Veuillez sélectionner un chapitre d'abord"; 
           } 
         }
         
         const needsScroll = ['chapters', 'theorems', 'subfields'].includes(section.id);
         const scrollableClass = needsScroll ? "max-h-[300px] overflow-y-auto pr-2" : "";
         
         return (
           <div className="mb-2 border-b border-gray-100 pb-4" key={`section-${section.id}`}>
             <button 
               onClick={() => { 
                 if (!(isDisabled && section.dependent)) { 
                   toggleSection(section.id as string); 
                 } 
               }} 
               className={`flex items-center justify-between w-full text-left mb-3 ${
                 isDisabled ? 'opacity-70 cursor-not-allowed' : ''
               }`} 
               disabled={isDisabled && !['classLevels', 'difficulties', 'isNationalExam', 'dateRange'].includes(section.id)}
             >
               <div className="flex items-center space-x-2">
                 {section.icon}
                 <h3 className="text-lg font-medium text-gray-800">{section.title}</h3>
                 
                 {!isDisabled && Array.isArray(selectedValuesForCategory) && selectedValuesForCategory.length > 0 && (
                   <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full ml-2">
                     {selectedValuesForCategory.length}
                   </span>
                 )}
                 {!isDisabled && section.id === 'isNationalExam' && selectedFilters.isNationalExam !== null && (
                   <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full ml-2">
                     1
                   </span>
                 )}
                 {!isDisabled && section.id === 'dateRange' && selectedFilters.dateRange && (
                   <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full ml-2">
                     1
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
                   ) : section.customRenderer ? (
                     section.customRenderer(
                       selectedValuesForCategory, 
                       (value) => handleToggleFilter(section.id, value), 
                       section.options || categoryData
                     )
                   ) : categoryData.length > 0 || section.options ? (
                     (section.options || categoryData).map((item: any) => {
                       const itemId = item.id;
                       const itemName = item.name;
                       const isSelected = Array.isArray(selectedValuesForCategory) && selectedValuesForCategory.some(v => String(v) === String(itemId)); 
                       
                       let buttonClass = isSelected 
                         ? 'bg-gradient-to-r from-green-900 to-green-800 text-white border-transparent' 
                         : item.color || 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-200'; 
                         
                       return (
                         <button
                           key={itemId}
                           onClick={() => handleToggleFilter(section.id, String(itemId))}
                           className={`px-3 py-1.5 rounded-full text-sm transition-all duration-200 border ${buttonClass} shadow-sm hover:shadow`}
                         >
                           {itemName}
                         </button>
                       ); 
                     })
                   ) : (
                     <p className="text-sm text-gray-500 italic w-full">
                       {section.id === 'subjects' && selectedFilters.classLevels.length === 0 ? 
                         'Veuillez sélectionner un niveau d\'abord' : 
                          section.id === 'subfields' && (selectedFilters.classLevels.length === 0 || selectedFilters.subjects.length === 0) ?
                         'Veuillez sélectionner un niveau et une matière' :
                          section.id === 'chapters' && (selectedFilters.classLevels.length === 0 || selectedFilters.subjects.length === 0 || selectedFilters.subfields.length === 0) ?
                         'Veuillez sélectionner un niveau, une matière et un sous-domaine' :
                          section.id === 'theorems' && (selectedFilters.classLevels.length === 0 || selectedFilters.subjects.length === 0 || selectedFilters.subfields.length === 0 || selectedFilters.chapters.length === 0) ?
                         'Veuillez sélectionner un niveau, une matière, un sous-domaine et un chapitre' :
                         'Aucun élément disponible pour cette sélection'}
                     </p>
                   )}
                 </div>
               </div>
             )}
           </div>
         );
       })}
       
       {getActiveFiltersCount() > 0 && (
         <div className="mt-6 pt-6">
           <div className="flex items-center justify-between mb-4">
             <h3 className="text-base font-medium text-gray-800">
               Filtres actifs
             </h3>
             <span className="text-sm bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full">
               {getActiveFiltersCount()}
             </span>
           </div>
           <div className="flex flex-wrap gap-3">
             {filterSectionConfigs.map(section => { 
               const values = selectedFilters[section.id]; 
               
               if (Array.isArray(values) && values.length > 0) { 
                 return values.map(val => (
                   <button
                     key={`active-${section.id}-${val}`}
                     onClick={() => handleToggleFilter(section.id, val)}
                     className="px-3 py-1.5 rounded-full text-sm bg-indigo-100 text-indigo-700 hover:bg-indigo-200 flex items-center space-x-2 transition-colors"
                   >
                     <span>
                       {section.getDisplayName ? 
                         section.getDisplayName(val, getDataForCategory(section.id)) : 
                         val
                       }
                     </span>
                     <X className="w-4 h-4 ml-1" />
                   </button>
                 )); 
               } else if (!Array.isArray(values) && values !== null && values !== undefined) { 
                 if (section.id === 'isNationalExam' && (values === true || values === false)) { 
                   return (
                     <button
                       key={`active-${section.id}-${String(values)}`}
                       onClick={() => handleToggleFilter(section.id, values)}
                       className="px-3 py-1.5 rounded-full text-sm bg-indigo-100 text-indigo-700 hover:bg-indigo-200 flex items-center space-x-2 transition-colors"
                     >
                       <span>
                         {section.getDisplayName ? section.getDisplayName(values) : String(values)}
                       </span>
                       <X className="w-4 h-4 ml-1" />
                     </button>
                   ); 
                 } 
                 
                 if (section.id === 'dateRange' && ((values as any).start || (values as any).end)) { 
                   return (
                     <button
                       key={`active-${section.id}-daterange`}
                       onClick={() => handleToggleFilter(section.id, null)}
                       className="px-3 py-1.5 rounded-full text-sm bg-indigo-100 text-indigo-700 hover:bg-indigo-200 flex items-center space-x-2 transition-colors"
                     >
                       <span>
                         {section.getDisplayName ? section.getDisplayName(values) : "Plage de dates"}
                       </span>
                       <X className="w-4 h-4 ml-1" />
                     </button>
                   ); 
                 } 
               } 
               
               return null; 
             })}
           </div>
           </div>
       )}
     </div>
   </div>
 );
};