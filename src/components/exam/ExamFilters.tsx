// src/components/exam/ExamFiltersPanel.tsx - Alternative with position:fixed for YearRangePicker

import React, { useState, useEffect, useRef, useCallback } from 'react';
// PAS besoin de ReactDOM pour cette approche
import {
  X, Filter as FilterIcon, BookOpen, GraduationCap, ChevronUp, ChevronDown, Tag, BarChart3, FileText, Award, Calendar, Clock, TrendingUp, TrendingDown, Minus
} from 'lucide-react';
import {
  getClassLevels, getSubjects, getChapters, getSubfields, getTheorems
} from '@/lib/api'; // Assurez-vous que ce chemin est correct
import {
  ClassLevelModel, SubjectModel, ChapterModel, Difficulty, Subfield, Theorem, ExamFilters as ExamFiltersType
} from '@/types'; // Assurez-vous que ce chemin est correct
import { Button } from '@/components/ui/button'; // Assurez-vous que ce chemin est correct

// Props du composant
interface ExamFiltersPanelProps {
  onFilterChange: (filters: ExamFiltersType) => void;
  initialFilters?: Partial<ExamFiltersType>;
}

// Enhanced Year Range Picker Component with position:fixed dropdown
interface YearRangePickerProps {
  onChange: (range: { start: string | null, end: string | null } | null) => void;
  value: { start: string | null, end: string | null } | null;
}

const YearRangePicker: React.FC<YearRangePickerProps> = ({ onChange, value }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [startYear, setStartYear] = useState<string | null>(value?.start || null);
  const [endYear, setEndYear] = useState<string | null>(value?.end || null);
  const [activeTab, setActiveTab] = useState<'range' | 'presets'>('presets');
  
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({ display: 'none' });

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 2008 + 3 }, (_, i) => 2008 + i);
  const presets = [
    { label: 'Dernières années', icon: <Clock className="w-4 h-4" />, start: (currentYear - 3).toString(), end: currentYear.toString(), color: 'bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700' },
    { label: '5 dernières années', icon: <TrendingUp className="w-4 h-4" />, start: (currentYear - 5).toString(), end: currentYear.toString(), color: 'bg-green-50 hover:bg-green-100 border-green-200 text-green-700' },
    { label: 'Années 2020s', icon: <Calendar className="w-4 h-4" />, start: '2020', end: currentYear.toString(), color: 'bg-purple-50 hover:bg-purple-100 border-purple-200 text-purple-700' },
    { label: 'Années 2010s', icon: <Calendar className="w-4 h-4" />, start: '2010', end: '2019', color: 'bg-orange-50 hover:bg-orange-100 border-orange-200 text-orange-700' },
    { label: 'Avant 2015', icon: <TrendingDown className="w-4 h-4" />, start: '2008', end: '2014', color: 'bg-gray-50 hover:bg-gray-100 border-gray-200 text-gray-700' }
  ];

  const getDisplayText = (): string => {
    if (!startYear && !endYear) return 'Sélectionner une période';
    if (startYear && !endYear) return `Depuis ${startYear}`;
    if (!startYear && endYear) return `Jusqu'à ${endYear}`;
    if (startYear === endYear) return `Année ${startYear}`;
    return `${startYear} - ${endYear}`;
  };

  const applyFilter = () => { onChange({ start: startYear, end: endYear }); setIsOpen(false); };
  const clearFilterInternal = () => { setStartYear(null); setEndYear(null); onChange(null); setIsOpen(false); };
  const applyPreset = (preset: typeof presets[0]) => { setStartYear(preset.start); setEndYear(preset.end); onChange({ start: preset.start, end: preset.end }); setIsOpen(false); };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (triggerRef.current && !triggerRef.current.contains(event.target as Node) && dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen && isMounted) { document.addEventListener('mousedown', handleClickOutside); }
    return () => { document.removeEventListener('mousedown', handleClickOutside); };
  }, [isOpen, isMounted]);

  useEffect(() => { setStartYear(value?.start || null); setEndYear(value?.end || null); }, [value]);

  useEffect(() => {
    if (isOpen && triggerRef.current && isMounted) {
      const rect = triggerRef.current.getBoundingClientRect();
      const dropdownHeightEst = dropdownRef.current?.offsetHeight || 450; // Utiliser la hauteur réelle si possible, sinon estimer
      const dropdownWidth = 320; 

      let top = rect.bottom + 8; 
      let left = rect.left;

      if (left + dropdownWidth > window.innerWidth - 16) left = window.innerWidth - dropdownWidth - 16;
      if (left < 16) left = 16;
      
      if (top + dropdownHeightEst > window.innerHeight - 16) {
        top = rect.top - dropdownHeightEst - 8; 
      }
      if (top < 16) top = 16;

      setDropdownStyle({ display: 'block', position: 'fixed', top: `${top}px`, left: `${left}px`, width: `${dropdownWidth}px`, zIndex: 1050 });
    } else {
      setDropdownStyle({ display: 'none' });
    }
  }, [isOpen, isMounted, value]); // `value` peut changer la taille du bouton, recalculer

  useEffect(() => { // Ferme la dropdown si le bouton déclencheur devient non visible (scroll)
    if (!isOpen || !triggerRef.current || !isMounted || !window.IntersectionObserver) return;

    const observer = new IntersectionObserver(
      ([entry]) => { if (!entry.isIntersecting) { setIsOpen(false); } },
      { threshold: 0 } // Ferme dès que le bouton n'est plus du tout visible
    );
    observer.observe(triggerRef.current);
    return () => { observer.disconnect(); };
  }, [isOpen, isMounted]);

  const dropdownElement = (
    <div 
      ref={dropdownRef} 
      className="bg-white rounded-xl shadow-2xl border border-gray-200 w-80 overflow-hidden" // `shadow-2xl` pour plus de visibilité
      style={dropdownStyle}
    >
      <div className="flex border-b border-gray-100">
        <button onClick={() => setActiveTab('presets')} className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${activeTab === 'presets' ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-500' : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'}`}><Clock className="w-4 h-4 inline mr-2" />Périodes rapides</button>
        <button onClick={() => setActiveTab('range')} className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${activeTab === 'range' ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-500' : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'}`}><Calendar className="w-4 h-4 inline mr-2" />Personnalisé</button>
      </div>
      <div className="p-4 max-h-[calc(100vh-150px)] overflow-y-auto"> {/* Permet scroll interne si dropdown très haute */}
        {activeTab === 'presets' ? (
          <div className="space-y-2">
            {presets.map((p, i) => <button key={i} onClick={() => applyPreset(p)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 border ${p.color}`}>{p.icon}<div className="flex-1 text-left"><div className="font-medium">{p.label}</div><div className="text-xs opacity-75">{p.start === p.end ? p.start : `${p.start} - ${p.end}`}</div></div></button>)}
          </div>
        ) : (
          <div className="space-y-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-2">Année de début</label><select value={startYear || ''} onChange={(e) => setStartYear(e.target.value || null)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"><option value="">Toutes les années précédentes</option>{years.map(y => <option key={`s-${y}`} value={y.toString()}>{y}</option>)}</select></div>
            <div className="flex items-center justify-center"><Minus className="w-4 h-4 text-gray-400" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-2">Année de fin</label><select value={endYear || ''} onChange={(e) => setEndYear(e.target.value || null)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"><option value="">Toutes les années suivantes</option>{years.map(y => <option key={`e-${y}`} value={y.toString()}>{y}</option>)}</select></div>
            <div className="flex justify-between pt-2"><Button onClick={clearFilterInternal} variant="outline" size="sm" className="text-gray-700">Effacer</Button><Button onClick={applyFilter} size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">Appliquer</Button></div>
          </div>
        )}
      </div>
      <div className="border-t border-gray-100 p-3 bg-gray-50">
        <div className="text-xs font-medium text-gray-600 mb-2">Accès rapide</div>
        <div className="flex flex-wrap gap-1">{[currentYear, currentYear - 1, currentYear - 2, currentYear - 3].map(y => <button key={y} onClick={() => {setStartYear(y.toString());setEndYear(y.toString());onChange({ start: y.toString(), end: y.toString() });setIsOpen(false);}} className="px-2 py-1 text-xs rounded bg-white hover:bg-blue-50 border border-gray-200 hover:border-blue-300 transition-colors">{y}</button>)}</div>
      </div>
    </div>
  );

  return (
    // Ce div n'a plus besoin d'être `relative` pour une dropdown `fixed`
    <div> 
      <button
        ref={triggerRef}
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm transition-all duration-200 w-full ${value ? 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200' : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200'}`}
      >
        <Calendar className="w-4 h-4" />
        <span className="flex-1 text-left truncate">{getDisplayText()}</span>
        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        {value && (<button onClick={(e) => { e.stopPropagation(); clearFilterInternal(); }} className="p-1 rounded-full hover:bg-white/50 transition-colors"><X className="w-3 h-3" /></button>)}
      </button>
      {isMounted && dropdownElement}
    </div>
  );
};

// --- Le reste du composant ExamFiltersPanel reste identique à votre version ---
// ... (copiez ici tout le code de ExamFiltersPanel à partir de "type FilterSectionConfig = ..." jusqu'à la fin) ...
// J'inclus le reste pour que le fichier soit complet.

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
  getDisplayName?: (value: any, data: any[]) => string;
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

  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({ classLevels: false, subjects: false, subfields: false, chapters: false, theorems: false });
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({ classLevels: true, subjects: true, difficulties: true, isNationalExam: true, dateRange: true, subfields: false, chapters: false, theorems: false });
  const [lastRequests, setLastRequests] = useState<Record<string, string>>({});

  const updateLoadingState = (category: keyof ExamFiltersType | string, isLoading: boolean) => setLoadingStates(prev => ({ ...prev, [category as string]: isLoading }));

  const loadClassLevels = useCallback(async () => { /* ... (inchangé) ... */ 
    updateLoadingState('classLevels', true); try { const data = await getClassLevels(); setClassLevelsData(getUniqueById(data)); } catch (error) { console.error('Failed to load class levels:', error); setClassLevelsData([]); } finally { updateLoadingState('classLevels', false); }
  }, []);
  const loadSubjects = useCallback(async () => { /* ... (inchangé) ... */ 
    if (selectedFilters.classLevels.length === 0) { setSubjectsData([]); return; } updateLoadingState('subjects', true); const reqKey = JSON.stringify({ cl: selectedFilters.classLevels.sort() }); if (lastRequests.subjects === reqKey && subjectsData.length > 0) { updateLoadingState('subjects', false); return; } try { const data = await getSubjects(selectedFilters.classLevels); setSubjectsData(getUniqueById(data)); setLastRequests(prev => ({ ...prev, subjects: reqKey })); } catch (error) { console.error('Failed to load subjects:', error); setSubjectsData([]); } finally { updateLoadingState('subjects', false); }
  }, [selectedFilters.classLevels, lastRequests.subjects, subjectsData.length]);
  const loadSubfields = useCallback(async () => { /* ... (inchangé) ... */ 
    if (selectedFilters.subjects.length === 0 || selectedFilters.classLevels.length === 0) { setSubfieldsData([]); return; } updateLoadingState('subfields', true); const reqKey = JSON.stringify({ cl: selectedFilters.classLevels.sort(), su: selectedFilters.subjects.sort() }); if (lastRequests.subfields === reqKey && subfieldsData.length > 0) { updateLoadingState('subfields', false); return; } try { const promises = selectedFilters.subjects.map(subjectId => getSubfields(subjectId, selectedFilters.classLevels)); const results = await Promise.all(promises); setSubfieldsData(getUniqueById(results.flat())); setLastRequests(prev => ({ ...prev, subfields: reqKey })); } catch (error) { console.error('Failed to load subfields:', error); setSubfieldsData([]); } finally { updateLoadingState('subfields', false); }
  }, [selectedFilters.subjects, selectedFilters.classLevels, lastRequests.subfields, subfieldsData.length]);
  const loadChapters = useCallback(async () => { /* ... (inchangé, mais attention à subjectIdToUse si plusieurs sujets) ... */ 
    if (selectedFilters.subfields.length === 0 || selectedFilters.subjects.length === 0 || selectedFilters.classLevels.length === 0) { setChaptersData([]); return; } updateLoadingState('chapters', true); const reqKey = JSON.stringify({ cl: selectedFilters.classLevels.sort(), su: selectedFilters.subjects.sort(), sf: selectedFilters.subfields.sort() }); if (lastRequests.chapters === reqKey && chaptersData.length > 0) { updateLoadingState('chapters', false); return; } try { const subjectIdToUse = selectedFilters.subjects[0]; const data = await getChapters(subjectIdToUse, selectedFilters.classLevels, selectedFilters.subfields); setChaptersData(getUniqueById(data)); setLastRequests(prev => ({ ...prev, chapters: reqKey })); } catch (error) { console.error('Failed to load chapters:', error); setChaptersData([]); } finally { updateLoadingState('chapters', false); }
  }, [selectedFilters.subfields, selectedFilters.subjects, selectedFilters.classLevels, lastRequests.chapters, chaptersData.length]);
  const loadTheorems = useCallback(async () => { /* ... (inchangé, mais attention à subjectIdToUse) ... */ 
    if (selectedFilters.chapters.length === 0 || selectedFilters.subfields.length === 0 || selectedFilters.subjects.length === 0 || selectedFilters.classLevels.length === 0) { setTheoremsData([]); return; } updateLoadingState('theorems', true); const reqKey = JSON.stringify({ cl: selectedFilters.classLevels.sort(), su: selectedFilters.subjects.sort(), sf: selectedFilters.subfields.sort(), ch: selectedFilters.chapters.sort() }); if (lastRequests.theorems === reqKey && theoremsData.length > 0) { updateLoadingState('theorems', false); return; } try { const subjectIdToUse = selectedFilters.subjects[0]; const data = await getTheorems(subjectIdToUse, selectedFilters.classLevels, selectedFilters.subfields, selectedFilters.chapters); setTheoremsData(getUniqueById(data)); setLastRequests(prev => ({ ...prev, theorems: reqKey })); } catch (error) { console.error('Failed to load theorems:', error); setTheoremsData([]); } finally { updateLoadingState('theorems', false); }
  }, [selectedFilters.chapters, selectedFilters.subfields, selectedFilters.subjects, selectedFilters.classLevels, lastRequests.theorems, theoremsData.length]);

  useEffect(() => { loadClassLevels(); }, [loadClassLevels]);
  useEffect(() => { if (selectedFilters.classLevels.length > 0) loadSubjects(); else { setSubjectsData([]); setSelectedFilters(f => ({...f, subjects: [], subfields: [], chapters: [], theorems: []})); setLastRequests(p => ({...p, subjects:'', subfields:'', chapters:'', theorems:''})); } }, [selectedFilters.classLevels, loadSubjects]);
  useEffect(() => { if (selectedFilters.subjects.length > 0 && selectedFilters.classLevels.length > 0 && expandedSections.subfields) loadSubfields(); else { setSubfieldsData([]); setSelectedFilters(f => ({...f, subfields: [], chapters: [], theorems: []})); setLastRequests(p => ({...p, subfields:'', chapters:'', theorems:''})); } }, [selectedFilters.subjects, selectedFilters.classLevels, expandedSections.subfields, loadSubfields]);
  useEffect(() => { if (selectedFilters.subfields.length > 0 && expandedSections.chapters) loadChapters(); else { setChaptersData([]); setSelectedFilters(f => ({...f, chapters: [], theorems: []})); setLastRequests(p => ({...p, chapters:'', theorems:''})); } }, [selectedFilters.subfields, expandedSections.chapters, loadChapters]);
  useEffect(() => { if (selectedFilters.chapters.length > 0 && expandedSections.theorems) loadTheorems(); else { setTheoremsData([]); setSelectedFilters(f => ({...f, theorems: []})); setLastRequests(p => ({...p, theorems:''})); } }, [selectedFilters.chapters, expandedSections.theorems, loadTheorems]);

  const handleToggleFilter = useCallback((category: keyof ExamFiltersType, value: any) => { /* ... (inchangé) ... */ 
    setSelectedFilters(prev => { const newSelected = { ...prev }; let currentValues = prev[category]; if (category === 'isNationalExam') { newSelected.isNationalExam = prev.isNationalExam === value ? null : value; } else if (category === 'dateRange') { newSelected.dateRange = value; } else if (Array.isArray(currentValues)) { if (currentValues.includes(value)) { newSelected[category] = currentValues.filter(v => v !== value) as any; } else { newSelected[category] = [...currentValues, value] as any; } } const resetDependentLastRequests: Record<string, string> = {}; if (category === 'classLevels') { newSelected.subjects = []; newSelected.subfields = []; newSelected.chapters = []; newSelected.theorems = []; setSubjectsData([]); setSubfieldsData([]); setChaptersData([]); setTheoremsData([]); resetDependentLastRequests.subjects = ''; resetDependentLastRequests.subfields = ''; resetDependentLastRequests.chapters = ''; resetDependentLastRequests.theorems = ''; } else if (category === 'subjects') { newSelected.subfields = []; newSelected.chapters = []; newSelected.theorems = []; setSubfieldsData([]); setChaptersData([]); setTheoremsData([]); resetDependentLastRequests.subfields = ''; resetDependentLastRequests.chapters = ''; resetDependentLastRequests.theorems = ''; } else if (category === 'subfields') { newSelected.chapters = []; newSelected.theorems = []; setChaptersData([]); setTheoremsData([]); resetDependentLastRequests.chapters = ''; resetDependentLastRequests.theorems = ''; } else if (category === 'chapters') { newSelected.theorems = []; setTheoremsData([]); resetDependentLastRequests.theorems = ''; } if(Object.keys(resetDependentLastRequests).length > 0) { setLastRequests(prevLR => ({...prevLR, ...resetDependentLastRequests})); } return newSelected; });
  }, []);

  const debouncedOnFilterChange = useRef(debounce(onFilterChange, 300)).current;
  useEffect(() => { debouncedOnFilterChange(selectedFilters); }, [selectedFilters, debouncedOnFilterChange]);

  const filterSectionConfigs: FilterSectionConfig[] = [ /* ... (inchangé, sauf getDisplayName qui ne prend que `value` pour isNationalExam et dateRange) ... */ 
    { id: 'classLevels', title: 'Niveau', icon: <GraduationCap className="w-4 h-4 text-indigo-600" />, getDisplayName: (id, data) => data.find(d => d.id === id)?.name || id, },
    { id: 'subjects', title: 'Matières', icon: <BookOpen className="w-4 h-4 text-purple-600" />, dependent: true, shouldShowOptions: (sf) => sf.classLevels.length > 0, getDisplayName: (id, data) => data.find(d => d.id === id)?.name || id, },
    { id: 'subfields', title: 'Sous-domaines', icon: <FileText className="w-4 h-4 text-teal-600" />, dependent: true, shouldShowOptions: (sf) => sf.classLevels.length > 0 && sf.subjects.length > 0, getDisplayName: (id, data) => data.find(d => d.id === id)?.name || id, },
    { id: 'chapters', title: 'Chapitres', icon: <Tag className="w-4 h-4 text-pink-600" />, dependent: true, shouldShowOptions: (sf) => sf.subfields.length > 0, getDisplayName: (id, data) => data.find(d => d.id === id)?.name || id, },
    { id: 'theorems', title: 'Théorèmes', icon: <Award className="w-4 h-4 text-orange-600" />, dependent: true, shouldShowOptions: (sf) => sf.chapters.length > 0, getDisplayName: (id, data) => data.find(d => d.id === id)?.name || id, },
    { id: 'difficulties', title: 'Difficulté', icon: <BarChart3 className="w-4 h-4 text-red-600" />, options: [ { id: 'easy', name: 'Facile', color: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border-emerald-200' }, { id: 'medium', name: 'Moyen', color: 'bg-amber-100 text-amber-800 hover:bg-amber-200 border-amber-200' }, { id: 'hard', name: 'Difficile', color: 'bg-red-100 text-red-800 hover:bg-red-200 border-red-200' }, ], getDisplayName: (id, data) => data.find(d => d.id === id)?.name || id.charAt(0).toUpperCase() + id.slice(1), },
    { id: 'isNationalExam', title: "Type d'examen", icon: <Award className="w-4 h-4 text-sky-600" />, options: [ { id: null, name: 'Tous', color: 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-200' }, { id: true, name: 'Nationaux 🇫🇷', color: 'bg-blue-100 text-blue-800 hover:bg-blue-200 border-blue-200' }, { id: false, name: 'Autres', color: 'bg-purple-100 text-purple-700 hover:bg-purple-200 border-purple-200' }, ], customRenderer: (selectedValue, onToggle, options) => (<div className="grid grid-cols-3 gap-2 mt-2">{options?.map(opt => (<button key={String(opt.id)} onClick={() => onToggle(opt.id)} className={`px-3 py-2 text-sm rounded-lg transition-all duration-200 border ${selectedValue === opt.id ? 'bg-gradient-to-r from-sky-500 to-cyan-500 text-white border-transparent shadow-md' : opt.color}`}>{opt.name}</button>))}</div>), getDisplayName: (value: any) => { if (value === true) return 'Nationaux'; if (value === false) return 'Autres'; return 'Tous types'; }, },
    { id: 'dateRange', title: "Période d'examen", icon: <Calendar className="w-4 h-4 text-rose-600" />, customRenderer: (selectedValue, onToggle) => (<div className="mt-3"><YearRangePicker onChange={onToggle} value={selectedValue} />{selectedValue && (selectedValue.start || selectedValue.end) && (<div className="mt-3 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200"><div className="flex items-center justify-between"><div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-blue-600" /><span className="text-sm font-medium text-blue-900">{selectedValue.start && selectedValue.end ? selectedValue.start === selectedValue.end ? `Année ${selectedValue.start}` : `${selectedValue.start} - ${selectedValue.end}` : selectedValue.start ? `Depuis ${selectedValue.start}` : `Jusqu'à ${selectedValue.end}`}</span></div><button onClick={() => onToggle(null)} className="text-blue-600 hover:text-blue-800 transition-colors"><X className="w-4 h-4" /></button></div><div className="mt-2 text-xs text-blue-700">{(() => { if (!selectedValue.start && !selectedValue.end) return ''; const start = selectedValue.start ? parseInt(selectedValue.start) : 2008; const end = selectedValue.end ? parseInt(selectedValue.end) : new Date().getFullYear(); const yearsCount = end - start + 1; return `${yearsCount} année${yearsCount > 1 ? 's' : ''} sélectionnée${yearsCount > 1 ? 's' : ''}`; })()}</div></div>)}</div>), getDisplayName: (value: any) => { const dr = value as ExamFiltersType['dateRange']; if (!dr || (!dr.start && !dr.end)) return "Toutes périodes"; if (dr.start && !dr.end) return `Depuis ${dr.start}`; if (!dr.start && dr.end) return `Jusqu'à ${dr.end}`; if (dr.start === dr.end) return `Année ${dr.start}`; return `${dr.start} - ${dr.end}`; }, },
  ];

  const getDataForCategory = (categoryId: keyof ExamFiltersType): any[] => { /* ... (inchangé) ... */ 
    switch (categoryId) { case 'classLevels': return classLevelsData; case 'subjects': return subjectsData; case 'subfields': return subfieldsData; case 'chapters': return chaptersData; case 'theorems': return theoremsData; case 'difficulties': return filterSectionConfigs.find(s => s.id === 'difficulties')?.options || []; default: return []; }
  };
  
  const toggleSection = (sectionId: string) => setExpandedSections(prev => ({ ...prev, [sectionId]: !prev[sectionId] }));
  const resetAllFilters = () => { /* ... (inchangé) ... */ 
    setSelectedFilters({ classLevels: [], subjects: [], subfields: [], chapters: [], theorems: [], difficulties: [], isNationalExam: null, dateRange: null, }); setSubjectsData([]); setSubfieldsData([]); setChaptersData([]); setTheoremsData([]); setLastRequests({}); setExpandedSections(prev => ({ ...prev, classLevels: true, subjects: true, difficulties: true, isNationalExam: true, dateRange: true, subfields: false, chapters: false, theorems: false, }));
  };
  const getActiveFiltersCount = () => { /* ... (inchangé) ... */ 
    return Object.values(selectedFilters).reduce((count, filterValue) => { if (Array.isArray(filterValue)) return count + filterValue.length; if (filterValue !== null && filterValue !== undefined) return count + 1; return count; }, 0);
  };

  return (
    // Ajout de z-40 ici pour aider au contexte d'empilement.
    // overflow-hidden est retiré pour minimiser les chances de clipping si une dropdown `absolute` (pas `fixed`) devait déborder.
    // Cependant, pour la YearRangePicker qui est maintenant `fixed`, cet overflow-hidden est moins pertinent.
    <div className="bg-white rounded-xl shadow-xl sticky top-5 w-full z-40"> 
      <div className="p-6 bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-600 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10"><svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg"><defs><pattern id="examGrid" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M 20 0 L 0 0 0 20" fill="none" stroke="white" strokeWidth="0.5" /></pattern></defs><rect width="100%" height="100%" fill="url(#examGrid)" /></svg></div>
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-3"><div className="p-2 bg-white/20 rounded-lg"><FilterIcon className="w-6 h-6" /></div><div><h2 className="text-xl font-bold">Filtres des Examens</h2><p className="text-blue-100 text-sm">Affinez votre recherche d'examens</p></div></div>
          {getActiveFiltersCount() > 0 && (<div className="flex items-center gap-3"><div className="bg-white/20 px-3 py-1 rounded-full text-sm font-medium">{getActiveFiltersCount()} filtre{getActiveFiltersCount() > 1 ? 's' : ''}</div><button onClick={resetAllFilters} className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 flex items-center gap-2"><X className="w-4 h-4" />Réinitialiser</button></div>)}
        </div>
      </div>

      {/* overflow-y-auto ici est la raison pour laquelle les dropdowns `absolute` étaient coupées. */}
      {/* YearRangePicker en `fixed` n'est plus affectée par cet overflow. */}
      <div className="p-6 max-h-[calc(100vh-180px)] overflow-y-auto custom-scrollbar">
        {filterSectionConfigs.map(section => { /* ... (contenu du map inchangé) ... */ 
          const categoryData = getDataForCategory(section.id); const selectedValuesForCategory = selectedFilters[section.id]; const isLoading = loadingStates[section.id as string]; const isExpanded = expandedSections[section.id as string]; let isDisabled = false; let disabledMessage = ""; if (section.dependent) { if (section.id === 'subjects' && selectedFilters.classLevels.length === 0) { isDisabled = true; disabledMessage = "Sélectionnez un niveau d'abord."; } else if (section.id === 'subfields' && (selectedFilters.classLevels.length === 0 || selectedFilters.subjects.length === 0)) { isDisabled = true; disabledMessage = "Sélectionnez niveau et matière."; } else if (section.id === 'chapters' && selectedFilters.subfields.length === 0) { isDisabled = true; disabledMessage = "Sélectionnez un sous-domaine."; } else if (section.id === 'theorems' && selectedFilters.chapters.length === 0) { isDisabled = true; disabledMessage = "Sélectionnez un chapitre."; } }
          return (
            <div key={section.id} className="mb-4 border border-gray-100 rounded-lg overflow-hidden last:mb-0">
              <button onClick={() => { if (!(isDisabled && section.dependent)) { toggleSection(section.id as string); } }} className={`flex items-center justify-between w-full text-left p-4 transition-colors duration-200 ${isDisabled && section.dependent ? 'bg-gray-100 opacity-60 cursor-not-allowed' : 'bg-gray-50 hover:bg-gray-100'}`} disabled={isDisabled && section.dependent && !isExpanded} >
                <div className="flex items-center space-x-3"><div className="p-1.5 bg-white rounded-lg shadow-sm">{section.icon}</div><div><h3 className="text-base font-semibold text-gray-800">{section.title}</h3>{!isDisabled && Array.isArray(selectedValuesForCategory) && selectedValuesForCategory.length > 0 && (<p className="text-xs text-gray-600 mt-0.5">{selectedValuesForCategory.length} sélectionné{selectedValuesForCategory.length > 1 ? 's' : ''}</p>)}{!isDisabled && section.id === 'isNationalExam' && selectedFilters.isNationalExam !== null && (<p className="text-xs text-blue-600 mt-0.5">{selectedFilters.isNationalExam ? 'Examens nationaux' : 'Autres examens'}</p>)}{!isDisabled && section.id === 'dateRange' && selectedFilters.dateRange && (<p className="text-xs text-rose-600 mt-0.5">{section.getDisplayName?.(selectedFilters.dateRange)}</p>)}</div></div>
                <div className="flex items-center gap-2">{!isDisabled && Array.isArray(selectedValuesForCategory) && selectedValuesForCategory.length > 0 && (<span className="bg-sky-100 text-sky-700 px-2 py-1 rounded-full text-xs font-medium">{selectedValuesForCategory.length}</span>)}<ChevronDown className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${isExpanded && !(isDisabled && section.dependent) ? 'rotate-180' : ''}`} /></div>
              </button>
              {isExpanded && !(isDisabled && section.dependent) && (
                <div className="p-4 bg-white border-t border-gray-100">
                  {isLoading ? (<div className="flex items-center justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600"></div><span className="ml-3 text-sm text-gray-600">Chargement...</span></div>)
                  : section.customRenderer ? (section.customRenderer(selectedValuesForCategory, (value) => handleToggleFilter(section.id, value), section.options || categoryData))
                  : categoryData.length > 0 || section.options ? (<div className={`${['chapters', 'theorems', 'subfields'].includes(section.id) ? "max-h-64 overflow-y-auto custom-scrollbar-light" : ""}`}><div className="flex flex-wrap gap-2">{(section.options || categoryData).map((item: any) => { const itemId = item.id; const itemName = item.name; const isSelected = Array.isArray(selectedValuesForCategory) && selectedValuesForCategory.includes(itemId); let buttonClass = isSelected ? 'bg-gradient-to-r from-sky-500 to-cyan-500 text-white border-transparent shadow-md scale-105' : item.color || 'bg-gray-50 text-gray-700 hover:bg-gray-100 border-gray-200 hover:border-sky-300'; return (<button key={itemId} onClick={() => handleToggleFilter(section.id, itemId)} className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 border ${buttonClass} hover:shadow-sm`}>{itemName}</button>); })}</div></div>)
                  : (<div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg"><div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center"><FileText className="w-4 h-4 text-gray-500" /></div><p className="text-sm text-gray-600">Aucun élément disponible pour le moment.</p></div>)}
                </div>
              )}
              {isExpanded && isDisabled && section.dependent && (<div className="p-4 bg-white border-t border-gray-100"><div className="flex items-center gap-3 p-4 bg-amber-50 rounded-lg border border-amber-200"><div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center"><Award className="w-4 h-4 text-amber-600" /></div><div><p className="text-sm font-medium text-amber-800">Filtre dépendant</p><p className="text-xs text-amber-700 mt-1">{disabledMessage}</p></div></div></div>)}
            </div>
          );
        })}
        {getActiveFiltersCount() > 0 && ( /* ... (résumé des filtres inchangé) ... */ 
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex items-center gap-2 mb-4"><div className="w-6 h-6 bg-sky-100 rounded-full flex items-center justify-center"><FilterIcon className="w-3 h-3 text-sky-600" /></div><h3 className="text-sm font-bold text-gray-800">Filtres Actifs</h3><span className="bg-sky-100 text-sky-700 px-2 py-0.5 rounded-full text-xs font-medium">{getActiveFiltersCount()}</span></div>
            <div className="flex flex-wrap gap-2">
              {filterSectionConfigs.map(section => { const values = selectedFilters[section.id]; if (Array.isArray(values) && values.length > 0) { return values.map(val => (<span key={`${section.id}-${val}`} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-100 text-sky-800 rounded-full text-xs font-medium border border-sky-200">{React.cloneElement(section.icon as React.ReactElement, { className: "w-3 h-3" })}<span>{section.getDisplayName ? section.getDisplayName(val, getDataForCategory(section.id)) : val}</span><button onClick={() => handleToggleFilter(section.id, val)} className="ml-1 hover:bg-sky-200 rounded-full p-0.5 transition-colors"><X className="w-3 h-3" /></button></span>)); } else if (!Array.isArray(values) && values !== null && values !== undefined) { if (section.id === 'isNationalExam' && (values === true || values === false)) { return (<span key={`${section.id}-${String(values)}`} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-100 text-sky-800 rounded-full text-xs font-medium border border-sky-200">{React.cloneElement(section.icon as React.ReactElement, { className: "w-3 h-3" })}<span>{section.getDisplayName ? section.getDisplayName(values) : String(values)}</span><button onClick={() => handleToggleFilter(section.id, values)} className="ml-1 hover:bg-sky-200 rounded-full p-0.5 transition-colors"><X className="w-3 h-3" /></button></span>); } if (section.id === 'dateRange' && ((values as any).start || (values as any).end)) { return (<span key={`${section.id}-daterange`} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-100 text-rose-800 rounded-full text-xs font-medium border border-rose-200">{React.cloneElement(section.icon as React.ReactElement, { className: "w-3 h-3" })}<span>{section.getDisplayName ? section.getDisplayName(values) : "Plage de dates"}</span><button onClick={() => handleToggleFilter(section.id, null)} className="ml-1 hover:bg-rose-200 rounded-full p-0.5 transition-colors"><X className="w-3 h-3" /></button></span>); } } return null; })}
            </div>
            <div className="mt-4 pt-3 border-t border-gray-100"><button onClick={resetAllFilters} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors duration-200"><X className="w-4 h-4" />Effacer tous les filtres</button></div>
          </div>
        )}
      </div>
      <style jsx global>{` /* ... (styles inchangés) ... */ 
        .custom-scrollbar::-webkit-scrollbar { width: 6px; } .custom-scrollbar::-webkit-scrollbar-track { background: transparent; } .custom-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(14, 165, 233, 0.3); border-radius: 10px; } .custom-scrollbar::-webkit-scrollbar-thumb:hover { background-color: rgba(14, 165, 233, 0.5); } .custom-scrollbar-light::-webkit-scrollbar { width: 4px; } .custom-scrollbar-light::-webkit-scrollbar-track { background: transparent; } .custom-scrollbar-light::-webkit-scrollbar-thumb { background-color: rgba(14, 165, 233, 0.2); border-radius: 10px; } .custom-scrollbar-light::-webkit-scrollbar-thumb:hover { background-color: rgba(14, 165, 233, 0.4); }
      `}</style>
    </div>
  );
};