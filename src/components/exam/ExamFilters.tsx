// src/components/exam/ExamFiltersPanel.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X, Filter as FilterIcon, BookOpen, GraduationCap, ChevronUp, ChevronDown, Tag, BarChart3, FileText, Award, Calendar, CheckSquare, Square
} from 'lucide-react';
import {
  getClassLevels, getSubjects, getChapters, getSubfields, getTheorems
} from '@/lib/api'; // Assurez-vous que les chemins sont corrects
import {
  ClassLevelModel, SubjectModel, ChapterModel, Difficulty, Subfield, Theorem, ExamFilters as ExamFiltersType
} from '@/types'; // Assurez-vous que les chemins et types sont corrects
import { DateRangePicker } from './DateRangePicker'; // Assurez-vous que le chemin est correct

// Props du composant
interface ExamFiltersPanelProps {
  onFilterChange: (filters: ExamFiltersType) => void;
  initialFilters?: Partial<ExamFiltersType>;
}

// Type pour la définition des sections de filtre
type FilterSectionConfig = {
  id: keyof ExamFiltersType;
  title: string;
  icon: React.ReactNode;
  // 'dataLoader' est pour les filtres dont les options sont chargées dynamiquement
  dataLoader?: () => Promise<any[]>;
  // 'options' est pour les filtres avec des options statiques ou gérées différemment
  options?: any[];
  // 'customRenderer' pour les filtres qui ne sont pas une simple liste de boutons (ex: DateRangePicker)
  customRenderer?: (
    selectedValues: any,
    onToggle: (value: any) => void,
    allData?: any[] // Pour les filtres comme isNationalExam
  ) => React.ReactNode;
  // Indique si le filtre dépend d'autres filtres pour afficher ses options
  dependent?: boolean;
  // Fonction pour vérifier si les options doivent être affichées/chargées
  shouldShowOptions?: (selectedFilters: ExamFiltersType) => boolean;
  // Pour obtenir le nom d'affichage d'un ID sélectionné
  getDisplayName?: (id: string, data: any[]) => string;
};

// Utilitaire Debounce
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

// Utilitaire pour obtenir des items uniques par ID (si vos données ont un 'id')
const getUniqueById = <T extends { id: string | number }>(array: T[]): T[] => {
  if (!array || array.length === 0) return [];
  return Array.from(new Map(array.map(item => [item.id, item])).values());
};


export const ExamFiltersPanel: React.FC<ExamFiltersPanelProps> = ({
  onFilterChange,
  initialFilters = {},
}) => {
  // États pour les données d'options des filtres hiérarchiques
  const [classLevelsData, setClassLevelsData] = useState<ClassLevelModel[]>([]);
  const [subjectsData, setSubjectsData] = useState<SubjectModel[]>([]);
  const [subfieldsData, setSubfieldsData] = useState<Subfield[]>([]);
  const [chaptersData, setChaptersData] = useState<ChapterModel[]>([]);
  const [theoremsData, setTheoremsData] = useState<Theorem[]>([]);

  // État pour tous les filtres sélectionnés
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

  // États de chargement
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({
    classLevels: false, subjects: false, subfields: false, chapters: false, theorems: false,
  });

  // État pour les sections dépliées/repliées
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    classLevels: true, subjects: true, difficulties: true, isNationalExam: true, dateRange: true, // Ouvert par défaut
    subfields: false, chapters: false, theorems: false, // Fermé par défaut si dépendants
  });

  // Cache pour les dernières requêtes API (pour éviter les appels redondants)
  const [lastRequests, setLastRequests] = useState<Record<string, string>>({});
  const initialValuesSet = useRef(false); // Pour gérer les valeurs initiales

  // --- Logique de chargement des données hiérarchiques ---
  const updateLoadingState = (category: keyof ExamFiltersType | string, isLoading: boolean) => {
    setLoadingStates(prev => ({ ...prev, [category as string]: isLoading }));
  };

  const loadClassLevels = async () => {
    updateLoadingState('classLevels', true);
    try {
      const data = await getClassLevels();
      setClassLevelsData(getUniqueById(data));
    } catch (error) { console.error('Failed to load class levels:', error); setClassLevelsData([]); }
    finally { updateLoadingState('classLevels', false); }
  };

  const loadSubjects = async () => {
    if (selectedFilters.classLevels.length === 0) { setSubjectsData([]); return; }
    updateLoadingState('subjects', true);
    const reqKey = JSON.stringify({ cl: selectedFilters.classLevels.sort() });
    if (lastRequests.subjects === reqKey && subjectsData.length > 0) { updateLoadingState('subjects', false); return; }
    try {
      const data = await getSubjects(selectedFilters.classLevels);
      setSubjectsData(getUniqueById(data));
      setLastRequests(prev => ({ ...prev, subjects: reqKey }));
    } catch (error) { console.error('Failed to load subjects:', error); setSubjectsData([]); }
    finally { updateLoadingState('subjects', false); }
  };

  const loadSubfields = async () => {
    if (selectedFilters.subjects.length === 0 || selectedFilters.classLevels.length === 0) { setSubfieldsData([]); return; }
    updateLoadingState('subfields', true);
    const reqKey = JSON.stringify({ cl: selectedFilters.classLevels.sort(), su: selectedFilters.subjects.sort() });
    if (lastRequests.subfields === reqKey && subfieldsData.length > 0) { updateLoadingState('subfields', false); return; }
    try {
      const promises = selectedFilters.subjects.map(subjectId => getSubfields(subjectId, selectedFilters.classLevels));
      const results = await Promise.all(promises);
      setSubfieldsData(getUniqueById(results.flat()));
      setLastRequests(prev => ({ ...prev, subfields: reqKey }));
    } catch (error) { console.error('Failed to load subfields:', error); setSubfieldsData([]); }
    finally { updateLoadingState('subfields', false); }
  };

  const loadChapters = async () => {
    if (selectedFilters.subfields.length === 0) { setChaptersData([]); return; } // Simplifié, ajuster si nécessaire
    updateLoadingState('chapters', true);
    const reqKey = JSON.stringify({ cl: selectedFilters.classLevels.sort(), su: selectedFilters.subjects.sort(), sf: selectedFilters.subfields.sort() });
     if (lastRequests.chapters === reqKey && chaptersData.length > 0) { updateLoadingState('chapters', false); return; }
    try {
       // Note: getChapters peut nécessiter un seul subjectId. Adaptez l'appel API ou la logique ici.
      const data = await getChapters(selectedFilters.subjects[0], selectedFilters.classLevels, selectedFilters.subfields);
      setChaptersData(getUniqueById(data));
      setLastRequests(prev => ({ ...prev, chapters: reqKey }));
    } catch (error) { console.error('Failed to load chapters:', error); setChaptersData([]); }
    finally { updateLoadingState('chapters', false); }
  };

  const loadTheorems = async () => {
    if (selectedFilters.chapters.length === 0) { setTheoremsData([]); return; } // Simplifié
    updateLoadingState('theorems', true);
    const reqKey = JSON.stringify({ cl: selectedFilters.classLevels.sort(), su: selectedFilters.subjects.sort(), sf: selectedFilters.subfields.sort(), ch: selectedFilters.chapters.sort() });
    if (lastRequests.theorems === reqKey && theoremsData.length > 0) { updateLoadingState('theorems', false); return; }
    try {
      // Note: getTheorems peut nécessiter un seul subjectId. Adaptez.
      const data = await getTheorems(selectedFilters.subjects[0], selectedFilters.classLevels, selectedFilters.subfields, selectedFilters.chapters);
      setTheoremsData(getUniqueById(data));
      setLastRequests(prev => ({ ...prev, theorems: reqKey }));
    } catch (error) { console.error('Failed to load theorems:', error); setTheoremsData([]); }
    finally { updateLoadingState('theorems', false); }
  };
  
  // Effet pour charger les données initiales et en cascade
  useEffect(() => { loadClassLevels(); }, []);

  useEffect(() => {
    if (selectedFilters.classLevels.length > 0) loadSubjects();
    else { setSubjectsData([]); setSelectedFilters(f => ({...f, subjects: [], subfields: [], chapters: [], theorems: []})); setLastRequests(p => ({...p, subjects:'', subfields:'', chapters:'', theorems:''}));}
  }, [selectedFilters.classLevels]);

  useEffect(() => {
    if (selectedFilters.subjects.length > 0 && selectedFilters.classLevels.length > 0 && expandedSections.subfields) loadSubfields();
    else { setSubfieldsData([]); setSelectedFilters(f => ({...f, subfields: [], chapters: [], theorems: []})); setLastRequests(p => ({...p, subfields:'', chapters:'', theorems:''}));}
  }, [selectedFilters.subjects, selectedFilters.classLevels, expandedSections.subfields]);

  useEffect(() => {
    if (selectedFilters.subfields.length > 0 && expandedSections.chapters) loadChapters();
    else { setChaptersData([]); setSelectedFilters(f => ({...f, chapters: [], theorems: []})); setLastRequests(p => ({...p, chapters:'', theorems:''}));}
  }, [selectedFilters.subfields, expandedSections.chapters]);

  useEffect(() => {
    if (selectedFilters.chapters.length > 0 && expandedSections.theorems) loadTheorems();
    else { setTheoremsData([]); setSelectedFilters(f => ({...f, theorems: []})); setLastRequests(p => ({...p, theorems:''})); }
  }, [selectedFilters.chapters, expandedSections.theorems]);


  // --- Gestionnaire de changement de filtre générique ---
  const handleToggleFilter = useCallback((category: keyof ExamFiltersType, value: any) => {
    setSelectedFilters(prev => {
      const newSelected = { ...prev };
      let currentValues = prev[category];

      if (category === 'isNationalExam') {
        newSelected.isNationalExam = prev.isNationalExam === value ? null : value; // Toggle on/off/null
      } else if (category === 'dateRange') {
        newSelected.dateRange = value; // Remplacer directement la valeur
      } else if (Array.isArray(currentValues)) {
        if (currentValues.includes(value)) {
          newSelected[category] = currentValues.filter(v => v !== value) as any;
        } else {
          newSelected[category] = [...currentValues, value] as any;
        }
      }

      // Réinitialisation des filtres dépendants si un parent est modifié
      const resetDependentLastRequests: Record<string, string> = {};
      if (category === 'classLevels') {
        newSelected.subjects = []; newSelected.subfields = []; newSelected.chapters = []; newSelected.theorems = [];
        setSubjectsData([]); setSubfieldsData([]); setChaptersData([]); setTheoremsData([]);
        resetDependentLastRequests.subjects = ''; resetDependentLastRequests.subfields = ''; resetDependentLastRequests.chapters = ''; resetDependentLastRequests.theorems = '';
      } else if (category === 'subjects') {
        newSelected.subfields = []; newSelected.chapters = []; newSelected.theorems = [];
        setSubfieldsData([]); setChaptersData([]); setTheoremsData([]);
        resetDependentLastRequests.subfields = ''; resetDependentLastRequests.chapters = ''; resetDependentLastRequests.theorems = '';
      } else if (category === 'subfields') {
        newSelected.chapters = []; newSelected.theorems = [];
        setChaptersData([]); setTheoremsData([]);
        resetDependentLastRequests.chapters = ''; resetDependentLastRequests.theorems = '';
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

  // Effet pour notifier le parent des changements de filtres (débouncé)
  const debouncedOnFilterChange = useRef(debounce(onFilterChange, 300)).current;
  useEffect(() => {
    debouncedOnFilterChange(selectedFilters);
  }, [selectedFilters, debouncedOnFilterChange]);

  // --- Configuration des sections de filtre ---
  const filterSectionConfigs: FilterSectionConfig[] = [
    {
      id: 'classLevels', title: 'Niveau', icon: <GraduationCap className="w-4 h-4 text-indigo-600" />,
      getDisplayName: (id, data) => data.find(d => d.id === id)?.name || id,
    },
    {
      id: 'subjects', title: 'Matières', icon: <BookOpen className="w-4 h-4 text-purple-600" />,
      dependent: true, shouldShowOptions: (sf) => sf.classLevels.length > 0,
      getDisplayName: (id, data) => data.find(d => d.id === id)?.name || id,
    },
    {
      id: 'subfields', title: 'Sous-domaines', icon: <FileText className="w-4 h-4 text-teal-600" />,
      dependent: true, shouldShowOptions: (sf) => sf.classLevels.length > 0 && sf.subjects.length > 0,
      getDisplayName: (id, data) => data.find(d => d.id === id)?.name || id,
    },
    {
      id: 'chapters', title: 'Chapitres', icon: <Tag className="w-4 h-4 text-pink-600" />,
      dependent: true, shouldShowOptions: (sf) => sf.subfields.length > 0, // Simplifié
      getDisplayName: (id, data) => data.find(d => d.id === id)?.name || id,
    },
    {
      id: 'theorems', title: 'Théorèmes', icon: <Award className="w-4 h-4 text-orange-600" />, // Icône différente
      dependent: true, shouldShowOptions: (sf) => sf.chapters.length > 0, // Simplifié
      getDisplayName: (id, data) => data.find(d => d.id === id)?.name || id,
    },
    {
      id: 'difficulties', title: 'Difficulté', icon: <BarChart3 className="w-4 h-4 text-red-600" />,
      options: [
        { id: 'easy', name: 'Facile', color: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border-emerald-200' },
        { id: 'medium', name: 'Moyen', color: 'bg-amber-100 text-amber-800 hover:bg-amber-200 border-amber-200' },
        { id: 'hard', name: 'Difficile', color: 'bg-red-100 text-red-800 hover:bg-red-200 border-red-200' },
      ],
      getDisplayName: (id, data) => data.find(d => d.id === id)?.name || id.charAt(0).toUpperCase() + id.slice(1),
    },
    {
      id: 'isNationalExam', title: "Type d'examen", icon: <Award className="w-4 h-4 text-sky-600" />,
      options: [ // Utilisé par le customRenderer pour savoir quels boutons créer
        { id: null, name: 'Tous' },
        { id: true, name: 'Nationaux' },
        { id: false, name: 'Autres' },
      ],
      customRenderer: (selectedValue, onToggle, options) => (
        <div className="flex bg-white rounded-lg p-0.5 shadow-sm border border-gray-200 mt-1">
          {options?.map(opt => (
            <button
              key={String(opt.id)}
              onClick={() => onToggle(opt.id)}
              className={`flex-1 px-3 py-1.5 text-sm rounded-md transition-colors duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-sky-400 ${
                selectedValue === opt.id ? 'bg-sky-600 text-white shadow-md' : 'text-gray-700 hover:bg-sky-100'
              }`}
            >
              {opt.name}
            </button>
          ))}
        </div>
      ),
      getDisplayName: (id: string, data: any[]) => {
        const value = id === 'true' ? true : id === 'false' ? false : null;
        return value === true ? 'Nationaux' : value === false ? 'Autres' : 'Tous types';
      },
    },
    {
      id: 'dateRange', title: "Date de l'examen", icon: <Calendar className="w-4 h-4 text-rose-600" />,
      customRenderer: (selectedValue, onToggle) => (
        <>
          <DateRangePicker onChange={onToggle} value={selectedValue} />
          {selectedValue && (selectedValue.start || selectedValue.end) && (
            <div className="mt-2.5 p-2 bg-white rounded-md text-xs text-gray-700 border border-gray-200 shadow-sm">
              {/* ... affichage des dates ... */}
              <button onClick={() => onToggle(null)} className="mt-1.5 text-sky-600 hover:text-sky-800 text-xs underline">Effacer</button>
            </div>
          )}
        </>
      ),
      getDisplayName: (id: string, data: any[]) => {
        const value = id ? JSON.parse(id) as ExamFiltersType['dateRange'] : null;
        if (!value || (!value.start && !value.end)) return "Toutes dates";
        if (value.start && !value.end) return `Après ${new Date(value.start).toLocaleDateString()}`;
        if (!value.start && value.end) return `Avant ${new Date(value.end).toLocaleDateString()}`;
        if (value.start === value.end) return `Le ${new Date(value.start!).toLocaleDateString()}`;
        return `Du ${new Date(value.start!).toLocaleDateString()} au ${new Date(value.end!).toLocaleDateString()}`;
      },
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
  
  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => ({ ...prev, [sectionId]: !prev[sectionId] }));
  };

  const resetAllFilters = () => {
    setSelectedFilters({
      classLevels: [], subjects: [], subfields: [], chapters: [], theorems: [],
      difficulties: [], isNationalExam: null, dateRange: null,
    });
    // Réinitialiser les données chargées (sauf classLevels qui est la base)
    setSubjectsData([]); setSubfieldsData([]); setChaptersData([]); setTheoremsData([]);
    setLastRequests({});
    // Optionnel: replier les sections dépendantes
    setExpandedSections(prev => ({
        ...prev, subfields: false, chapters: false, theorems: false,
    }));
  };

  const getActiveFiltersCount = () => {
    return Object.values(selectedFilters).reduce((count, filterValue) => {
      if (Array.isArray(filterValue)) return count + filterValue.length;
      if (filterValue !== null && filterValue !== undefined) return count + 1; // Pour isNationalExam, dateRange
      return count;
    }, 0);
  };


  return (
    <div className="bg-white rounded-xl shadow-xl overflow-hidden sticky top-5 w-full">
      <div className="p-6 bg-gradient-to-r from-sky-600 to-cyan-600 text-white font-medium"> {/* Thème couleur examen */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold flex items-center">
            <FilterIcon className="w-5 h-5 mr-2.5" /> Filtres des Examens
          </h2>
          {getActiveFiltersCount() > 0 && (
            <button onClick={resetAllFilters} className="text-sm bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-full transition-colors">
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
          if (section.dependent && section.shouldShowOptions && !section.shouldShowOptions(selectedFilters)) {
            isDisabled = true;
            disabledMessage = "Veuillez sélectionner les filtres parents requis.";
          }
          if (section.id === 'subjects' && selectedFilters.classLevels.length === 0) {
            isDisabled = true; disabledMessage = "Sélectionnez un niveau d'abord.";
          } else if (section.id === 'subfields' && (selectedFilters.classLevels.length === 0 || selectedFilters.subjects.length === 0)) {
            isDisabled = true; disabledMessage = "Sélectionnez niveau et matière.";
          } else if (section.id === 'chapters' && selectedFilters.subfields.length === 0) { // Adapter cette logique précisément
             isDisabled = true; disabledMessage = "Sélectionnez un sous-domaine.";
          } else if (section.id === 'theorems' && selectedFilters.chapters.length === 0) {
             isDisabled = true; disabledMessage = "Sélectionnez un chapitre.";
          }


          return (
            <div key={section.id} className="mb-3 border-b border-gray-100 pb-3 last:border-b-0">
              <button
                onClick={() => toggleSection(section.id as string)}
                className="flex items-center justify-between w-full text-left mb-2 py-1"
                disabled={isDisabled && section.dependent}
              >
                <div className="flex items-center space-x-2">
                  {section.icon}
                  <h3 className={`text-md font-medium text-gray-800 ${isDisabled && section.dependent ? 'opacity-60' : ''}`}>{section.title}</h3>
                  {!isDisabled && Array.isArray(selectedValuesForCategory) && selectedValuesForCategory.length > 0 && (
                     <span className="text-xs bg-sky-100 text-sky-700 px-2 py-0.5 rounded-full">
                        {selectedValuesForCategory.length}
                     </span>
                  )}
                  {/* Affichage spécifique pour isNationalExam et dateRange si sélectionné */}
                </div>
                {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
              </button>

              {isExpanded && !isDisabled && (
                <div className={`pl-1 pr-1 ${['chapters', 'theorems', 'subfields'].includes(section.id) ? "max-h-[250px] overflow-y-auto custom-scrollbar-light pr-2" : ""}`}>
                  {isLoading ? (
                    <p className="text-sm text-gray-500 italic py-2">Chargement...</p>
                  ) : section.customRenderer ? (
                    section.customRenderer(selectedValuesForCategory, (value) => handleToggleFilter(section.id, value), section.options || categoryData)
                  ) : categoryData.length > 0 || section.options ? (
                    <div className="flex flex-wrap gap-2 mt-1">
                      {(section.options || categoryData).map((item: any) => {
                        const itemId = item.id;
                        const itemName = item.name;
                        const isSelected = Array.isArray(selectedValuesForCategory) && selectedValuesForCategory.includes(itemId);
                        let buttonClass = isSelected
                          ? 'bg-gradient-to-r from-sky-500 to-cyan-500 text-white border-transparent'
                          : item.color || 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-200';
                        
                        return (
                          <button
                            key={itemId}
                            onClick={() => handleToggleFilter(section.id, itemId)}
                            className={`px-3 py-1.5 rounded-full text-sm transition-all duration-200 border ${buttonClass} shadow-sm hover:shadow`}
                          >
                            {itemName}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 italic py-2">Aucun élément disponible.</p>
                  )}
                </div>
              )}
              {isExpanded && isDisabled && (
                <p className="text-sm text-gray-400 italic pl-1 py-1">{disabledMessage}</p>
              )}
            </div>
          );
        })}

        {/* Résumé des filtres actifs */}
        {getActiveFiltersCount() > 0 && (
          <div className="mt-6 pt-4 border-t border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Filtres Actifs :</h3>
            <div className="flex flex-wrap gap-2">
              {filterSectionConfigs.map(section => {
                const values = selectedFilters[section.id];
                if (Array.isArray(values) && values.length > 0) {
                  return values.map(val => (
                    <span key={`${section.id}-${val}`} className="chip-active bg-sky-100 text-sky-700">
                      {section.getDisplayName ? section.getDisplayName(val, getDataForCategory(section.id)) : val}
                      <X onClick={() => handleToggleFilter(section.id, val)} className="w-3 h-3 ml-1.5 cursor-pointer hover:text-sky-900" />
                    </span>
                  ));
                } else if (!Array.isArray(values) && values !== null && values !== undefined) {
                  // Pour isNationalExam et dateRange
                  if (section.id === 'isNationalExam' && (values === true || values === false)) {
                     return (
                        <span key={`${section.id}-${String(values)}`} className="chip-active bg-sky-100 text-sky-700">
                            {section.getDisplayName ? section.getDisplayName(values as any, []) : String(values)}
                            <X onClick={() => handleToggleFilter(section.id, values)} className="w-3 h-3 ml-1.5 cursor-pointer hover:text-sky-900" />
                        </span>
                     );
                  }
                  if (section.id === 'dateRange' && ( (values as any).start || (values as any).end)) {
                    return (
                        <span key={`${section.id}-daterange`} className="chip-active bg-sky-100 text-sky-700">
                            {section.getDisplayName ? section.getDisplayName(values as any, []) : "Plage de dates"}
                            <X onClick={() => handleToggleFilter(section.id, null)} className="w-3 h-3 ml-1.5 cursor-pointer hover:text-sky-900" />
                        </span>
                    );
                  }
                }
                return null;
              })}
            </div>
          </div>
        )}
      </div>
      <style jsx global>{`
        .chip-active {
          display: inline-flex;
          align-items: center;
          padding: 0.2rem 0.5rem;
          border-radius: 9999px;
          font-size: 0.75rem; /* text-xs */
          font-weight: 500;
        }
        .custom-scrollbar-light::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar-light::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar-light::-webkit-scrollbar-thumb { background-color: rgba(14, 165, 233, 0.3); border-radius: 10px; } /* sky-500 avec opacité */
        .custom-scrollbar-light::-webkit-scrollbar-thumb:hover { background-color: rgba(14, 165, 233, 0.5); }
      `}</style>
    </div>
  );
};