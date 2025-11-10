// src/pages/ExamList.tsx (or wherever your ExamList component is)
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Loader2, Plus, Filter, SortAsc, BookOpen, ArrowUpDown, X, Award, Calendar } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { getExams, voteExam, deleteExam } from '@/lib/api/examApi';
import { Exam, Difficulty, VoteValue, ExamFilters as ExamFiltersType } from '../../types'; // Renamed ExamFilters to ExamFiltersType to avoid conflict
import { ExamFiltersPanel } from '@/components/exam/ExamFilters'; // Import the original ExamFilters component
import { SortDropdown } from '../../components/SortDropdown';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useAuthModal } from '@/components/AuthController';
import { useFilters as useNavbarFilters } from '../../components/navbar/FilterContext'; // Renamed useFilters to avoid conflict
import { ExamList as ExamListComponent } from '@/components/exam/ExamList';
// DateRangePicker is now used internally by ExamFiltersPanel, so it might not be needed here directly unless used elsewhere.
// import { DateRangePicker } from '@/components/exam/DateRangePicker';

// Custom hook for debouncing values
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Custom hook for caching query results
function useFetchCache() {
  const cache = useRef<Record<string, { data: any; timestamp: number }>>({});
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache duration

  const getCachedData = useCallback((key: string) => {
    const cachedItem = cache.current[key];
    if (cachedItem && Date.now() - cachedItem.timestamp < CACHE_DURATION) {
      return cachedItem.data;
    }
    return null;
  }, []);

  const setCachedData = useCallback((key: string, data: any) => {
    cache.current[key] = {
      data,
      timestamp: Date.now(),
    };
  }, []);

  const invalidateCache = useCallback(() => {
    cache.current = {};
  }, []);

  return { getCachedData, setCachedData, invalidateCache };
}

import { SortOption } from '@/types';

const ITEMS_PER_PAGE = 20;

export const ExamList = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const { openModal } = useAuthModal();
  const { selectedClassLevel, selectedSubject, fullFilters: navbarFullFilters } = useNavbarFilters();
  
  const getInitialFilters = useCallback((): ExamFiltersType => {
    const searchParams = new URLSearchParams(location.search);
    const classLevelsParam = searchParams.get('classLevels');
    const subjectsParam = searchParams.get('subjects');
    const subfieldsParam = searchParams.get('subfields');
    const chaptersParam = searchParams.get('chapters');
    const theoremsParam = searchParams.get('theorems');
    const difficultiesParam = searchParams.get('difficulties');
    const isNationalParam = searchParams.get('isNational');
    const dateStartParam = searchParams.get('dateStart');
    const dateEndParam = searchParams.get('dateEnd');

    let initialDateRange = null;
    if (dateStartParam || dateEndParam) {
        initialDateRange = {
            start: dateStartParam,
            end: dateEndParam
        };
    }

    // Priority 1: Paramètres URL - check for ANY URL param
    if (classLevelsParam || subjectsParam || subfieldsParam || chaptersParam || theoremsParam || difficultiesParam || isNationalParam || dateStartParam || dateEndParam) {
      return {
        classLevels: classLevelsParam ? classLevelsParam.split(',') : [],
        subjects: subjectsParam ? subjectsParam.split(',') : [],
        subfields: subfieldsParam ? subfieldsParam.split(',') : [],
        chapters: chaptersParam ? chaptersParam.split(',') : [],
        theorems: theoremsParam ? theoremsParam.split(',') : [],
        difficulties: (difficultiesParam?.split(',') || []) as Difficulty[],
        isNationalExam: isNationalParam === 'true' ? true : isNationalParam === 'false' ? false : null,
        dateRange: initialDateRange
      };
    }
    
    // Priority 2: Filtres complets du contexte Navbar (si pertinent pour les examens)
    // Adaptez ceci si navbarFullFilters a une structure différente ou ne doit pas tout initialiser
    if (navbarFullFilters) {
      return {
        classLevels: navbarFullFilters.classLevels || [],
        subjects: navbarFullFilters.subjects || [],
        subfields: navbarFullFilters.subfields || [],
        chapters: navbarFullFilters.chapters || [],
        theorems: navbarFullFilters.theorems || [],
        difficulties: (navbarFullFilters.difficulties || []) as Difficulty[],
        isNationalExam: null, // Ou lire depuis navbarFullFilters si applicable
        dateRange: null       // Ou lire depuis navbarFullFilters si applicable
      };
    }
    
    // Priorité 3: Filtres simples du contexte Navbar
    if (selectedClassLevel || selectedSubject) {
      return {
        classLevels: selectedClassLevel ? [selectedClassLevel] : [],
        subjects: selectedSubject ? [selectedSubject] : [],
        subfields: [],
        chapters: [],
        theorems: [],
        difficulties: [],
        isNationalExam: null,
        dateRange: null
      };
    }
    
    // Par défaut: filtres vides
    return {
      classLevels: [],
      subjects: [],
      subfields: [],
      chapters: [],
      theorems: [],
      difficulties: [],
      isNationalExam: null,
      dateRange: null
    };
  }, [location.search, navbarFullFilters, selectedClassLevel, selectedSubject]);
  
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [filters, setFilters] = useState<ExamFiltersType>(getInitialFilters());
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isFilterOpen, setIsFilterOpen] = useState(true); // Pour le toggle mobile
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  
  const listRef = useRef<HTMLDivElement>(null);
  const previousScrollPosition = useRef(0);
  
  const { getCachedData, setCachedData, invalidateCache } = useFetchCache();
  
  const debouncedFilters = useDebounce(filters, 500);
  const debouncedSortBy = useDebounce(sortBy, 500);
  
  useEffect(() => {
    if (!initialLoadComplete) {
        setInitialLoadComplete(true);
        return; // Ne pas mettre à jour les filtres depuis l'URL au premier chargement si getInitialFilters s'en est chargé
    }

    const searchParams = new URLSearchParams(location.search);
    const classLevelsFromURL = searchParams.get('classLevels')?.split(',') || [];
    const subjectsFromURL = searchParams.get('subjects')?.split(',') || [];
    const subfieldsFromURL = searchParams.get('subfields')?.split(',') || [];
    const chaptersFromURL = searchParams.get('chapters')?.split(',') || [];
    const theoremsFromURL = searchParams.get('theorems')?.split(',') || [];
    const difficultiesFromURL = (searchParams.get('difficulties')?.split(',') || []) as Difficulty[];
    const isNationalParam = searchParams.get('isNational');
    const isNationalFromURL = isNationalParam === 'true' ? true : isNationalParam === 'false' ? false : null;
    const dateStartFromURL = searchParams.get('dateStart');
    const dateEndFromURL = searchParams.get('dateEnd');
    const dateRangeFromURL = dateStartFromURL || dateEndFromURL ? { start: dateStartFromURL, end: dateEndFromURL } : null;

    const newFiltersFromURL: ExamFiltersType = {
        classLevels: classLevelsFromURL,
        subjects: subjectsFromURL,
        subfields: subfieldsFromURL,
        chapters: chaptersFromURL,
        theorems: theoremsFromURL,
        difficulties: difficultiesFromURL,
        isNationalExam: isNationalFromURL,
        dateRange: dateRangeFromURL,
    };

    if (JSON.stringify(newFiltersFromURL) !== JSON.stringify(filters)) {
        setFilters(newFiltersFromURL);
    }
  }, [location.search, initialLoadComplete]); // Removed 'filters' to prevent potential loop
  
  const queryParams = useMemo(() => {
    return {
      classLevels: debouncedFilters.classLevels,
      subjects: debouncedFilters.subjects,
      chapters: debouncedFilters.chapters,
      difficulties: debouncedFilters.difficulties,
      subfields: debouncedFilters.subfields,
      theorems: debouncedFilters.theorems,
      isNationalExam: debouncedFilters.isNationalExam,
      dateRange: debouncedFilters.dateRange,
      sort: debouncedSortBy,
      page,
      per_page: ITEMS_PER_PAGE
    };
  }, [debouncedFilters, debouncedSortBy, page]);
  

    const sortDropdownOptions = useMemo(() => [
    { value: 'newest' as SortOption, label: 'Plus récents' },
    { value: 'oldest' as SortOption, label: 'Plus anciens' },
    { value: 'most_upvoted' as SortOption, label: 'Plus de votes' },
    // { value: 'most_commented', label: 'Most commented' },
    // { value: 'most_viewed', label: 'Most viewed' }
  ], []);
  const getCacheKey = useCallback((params: any) => {
    return JSON.stringify(params);
  }, []);

  const fetchExams = useCallback(async (isLoadMore = false) => {
    const setLoadingState = isLoadMore ? setLoadingMore : setLoading;
    setLoadingState(true);
    setError(null);
    
    const currentQueryParams = { // Recalculate queryParams for this specific fetch
        classLevels: filters.classLevels, // Use non-debounced for immediate page loads if filters changed
        subjects: filters.subjects,
        chapters: filters.chapters,
        difficulties: filters.difficulties,
        subfields: filters.subfields,
        theorems: filters.theorems,
        isNationalExam: filters.isNationalExam,
        dateRange: filters.dateRange,
        sort: sortBy,
        page: isLoadMore ? page : 1, // Use current page for load more, 1 for new filter set
        per_page: ITEMS_PER_PAGE
    };
    const cacheKey = getCacheKey(currentQueryParams);
    
    const cachedResult = getCachedData(cacheKey);
    if (cachedResult) {
      setExams(prev => isLoadMore ? [...prev, ...cachedResult.results] : cachedResult.results);
      setTotalCount(cachedResult.count);
      setHasMore(!!cachedResult.next);
      setLoadingState(false);
      return;
    }
    
    try {
      const data = await getExams(currentQueryParams);
      setCachedData(cacheKey, data);
      setExams(prev => isLoadMore ? [...prev, ...data.results] : data.results);
      setTotalCount(data.count);
      setHasMore(!!data.next);
    } catch (err) {
      console.error('Error fetching exams:', err);
      setError('Failed to load exams. Please try again.');
    } finally {
      setLoadingState(false);
    }
  }, [filters, sortBy, page, getCacheKey, getCachedData, setCachedData]); // Use non-debounced filters for this logic

  useEffect(() => {
    // Fetch on debounced filter/sort changes, reset page
    if (initialLoadComplete) {
        setPage(1); // This will trigger the page useEffect if page actually changes
        if (page === 1) { // If page is already 1, fetch directly
            fetchExams(false);
        }
    }
  }, [debouncedFilters, debouncedSortBy, initialLoadComplete]); // fetchExams is not a dep here to avoid loops
  
  useEffect(() => {
    // Handle pagination fetches (when page changes, excluding initial load triggered by debounced filters)
    if (initialLoadComplete) {
        fetchExams(page > 1);
    }
  }, [page, initialLoadComplete, fetchExams]);


  const handleVote = useCallback(async (id: string, type: VoteValue) => {
    // ... (vote logic unchanged)
    if (!isAuthenticated) { openModal(); return; }
    try {
      setExams(prevExams => prevExams.map(exam => { /* ... optimistic update ... */ return exam; }));
      const updatedExam = await voteExam(id, type);
      setExams(prevExams => prevExams.map(exam => exam.id === id ? updatedExam : exam ));
    } catch (err) { console.error('Failed to vote:', err); fetchExams(false); }
  }, [isAuthenticated, openModal, fetchExams]);

  const handleDelete = useCallback(async (id: string) => {
    // ... (delete logic unchanged)
    if (window.confirm('Are you sure?')) {
        try {
            setExams(prev => prev.filter(exam => exam.id !== id));
            setTotalCount(prev => prev - 1);
            await deleteExam(id);
            invalidateCache();
        } catch (err) { console.error('Failed to delete:', err); fetchExams(false); }
    }
  }, [invalidateCache, fetchExams]);

  const handleLoadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      if (listRef.current) {
        previousScrollPosition.current = listRef.current.scrollTop;
      }
      setPage(prev => prev + 1);
    }
  }, [loadingMore, hasMore]);

  const handleFilterChange = useCallback((newFilters: ExamFiltersType) => {
    if (listRef.current) {
      listRef.current.scrollTop = 0;
    }
    
    // Use the complete filters from ExamFiltersPanel
    const updatedFilters: ExamFiltersType = newFilters;
    
    setFilters(updatedFilters);
    
    const params = new URLSearchParams();
    if (updatedFilters.classLevels.length > 0) params.set('classLevels', updatedFilters.classLevels.join(','));
    if (updatedFilters.subjects.length > 0) params.set('subjects', updatedFilters.subjects.join(','));
    if (updatedFilters.subfields.length > 0) params.set('subfields', updatedFilters.subfields.join(','));
    if (updatedFilters.chapters.length > 0) params.set('chapters', updatedFilters.chapters.join(','));
    if (updatedFilters.theorems.length > 0) params.set('theorems', updatedFilters.theorems.join(','));
    if (updatedFilters.difficulties.length > 0) params.set('difficulties', updatedFilters.difficulties.join(','));
    if (updatedFilters.isNationalExam !== undefined && updatedFilters.isNationalExam !== null) params.set('isNational', updatedFilters.isNationalExam.toString());
    if (updatedFilters.dateRange?.start) params.set('dateStart', updatedFilters.dateRange.start);
    if (updatedFilters.dateRange?.end) params.set('dateEnd', updatedFilters.dateRange.end);
    
    const newUrl = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`;
    window.history.replaceState(null, '', newUrl);
  }, [filters]);

  useEffect(() => {
    if (!loadingMore && page > 1 && listRef.current) {
      listRef.current.scrollTop = previousScrollPosition.current;
    }
  }, [loadingMore, page]);

  const handleNewExamClick = useCallback(() => {
    if (isAuthenticated) { navigate('/new-exam'); }
    else { openModal(); /* navigate('/new-exam'); // Consider navigating after modal confirmation */ }
  }, [isAuthenticated, navigate, openModal]);

  const handleSortChange = useCallback((newSortOption: SortOption) => {
    if (listRef.current) { listRef.current.scrollTop = 0; }
    setSortBy(newSortOption);
  }, []);

  const SortFilterSection = useMemo(() => (
    <>
      <div className="md:hidden mb-6">
        <button
          onClick={() => setIsFilterOpen(prev => !prev)}
          className="w-full bg-white/80 backdrop-blur-md rounded-xl shadow-lg p-4 flex items-center justify-center space-x-3 text-gray-700 font-semibold hover:bg-white transition-all duration-200 border border-gray-200"
        >
          <Filter className="w-5 h-5" />
          <span>{isFilterOpen ? 'Masquer les filtres' : 'Afficher les filtres'}</span>
        </button>
      </div>
      <div className="bg-white/80 backdrop-blur-md rounded-xl shadow-lg border border-gray-100 p-5 mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 rounded-lg">
              <ArrowUpDown className="w-5 h-5 text-gray-700" />
            </div>
            <span className="text-gray-700 font-semibold">Trier par:</span>
            <SortDropdown
              value={sortBy}
              onChange={handleSortChange}
              // options removed: SortDropdown now manages its own options internally
            />
          </div>
          <div className="flex items-center gap-2 bg-gray-100 text-gray-700 px-5 py-2 rounded-full font-bold shadow-sm">
            <Award className="w-4 h-4" />
            <span>{totalCount} examen{totalCount > 1 ? 's' : ''}</span>
          </div>
        </div>
      </div>
    </>
  ), [isFilterOpen, sortBy, totalCount, handleSortChange, sortDropdownOptions]);

  const FilterComponent = useMemo(() => (
    <div
      className={`filter-sidebar ${isFilterOpen ? 'block' : 'hidden'} md:block md:w-full lg:w-80 xl:w-96 flex-shrink-0 custom-scrollbar`}
    >
      <ExamFiltersPanel
        onFilterChange={handleFilterChange}
        initialFilters={filters}
      />
    </div>
  ), [isFilterOpen, handleFilterChange, filters]);

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <style>{`
        .custom-scrollbar { scrollbar-width: thin; scrollbar-color: rgba(79, 70, 229, 0.3) transparent; }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(79, 70, 229, 0.3); border-radius: 10px; border: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background-color: rgba(79, 70, 229, 0.5); }
      `}</style>

      {/* Header Section */}
      <div className="relative bg-gradient-to-r from-gray-900 to-green-800 text-white py-16 md:py-20 mb-8 overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 opacity-10 pointer-events-none">
  <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <pattern id="hexPattern" width="40" height="34.64" patternUnits="userSpaceOnUse">
        <path
          d="M20 0 L40 11.55 L40 23.09 L20 34.64 L0 23.09 L0 11.55 Z"
          fill="none"
          stroke="white"
          strokeWidth="0.5"
        />
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#hexPattern)" />
  </svg>
</div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="text-center md:text-left flex-1">
              {/* Category badge */}
              <div className="inline-flex items-center px-4 py-1.5 bg-white/10 backdrop-blur-md rounded-full mb-4 border border-white/20">
                <Award className="w-4 h-4 mr-2" />
                <span className="text-sm font-semibold">Validation</span>
              </div>

              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold mb-4 leading-tight">
                <span className="bg-gradient-to-r from-yellow-200 to-green-200 bg-clip-text text-transparent">Examens</span>
              </h1>
              <p className="text-gray-300 text-lg md:text-xl max-w-2xl">
                Préparez-vous avec notre collection de <span className="font-bold text-white">{totalCount > 0 ? totalCount : ''}</span> sujets d'examen de qualité
              </p>
            </div>

            <Button
              onClick={handleNewExamClick}
              variant="ghost"
              className="liquid-glass rounded-xl font-bold text-xl hover:text-white inline-flex items-center justify-center gap-3 bg-gradient-to-r from-yellow-200 to-green-200 text-green-900 rounded-xl group relative px-4 py-3"
            >
              <Plus className="w-5 h-5 relative z-10" />
              <span className="relative z-10">Ajouter un examen</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4">
        {SortFilterSection}
        <div className="flex flex-col md:flex-row md:gap-8">
          {FilterComponent}
          <div className="flex-grow min-w-0" ref={listRef}>
            {error && (
              <div className="bg-red-50/80 backdrop-blur-sm border-l-4 border-red-500 text-red-700 p-5 mb-6 rounded-xl shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="font-medium">{error}</p>
                </div>
              </div>
            )}
            <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
              {loading && exams.length === 0 ? (
                <div className="flex justify-center items-center h-96">
                  <div className="text-center">
                    <div className="relative">
                      <div className="absolute inset-0 bg-gray-400 rounded-full blur-2xl opacity-10 animate-pulse"></div>
                      <Loader2 className="relative w-12 h-12 animate-spin text-gray-600 mx-auto mb-4" />
                    </div>
                    <p className="text-gray-600 font-medium">Chargement des examens...</p>
                  </div>
                </div>
              ) : !loading && exams.length === 0 ? (
                <div className="text-center py-20 px-6">
                  <div className="relative inline-block mb-6">
                    <div className="absolute inset-0 bg-gray-400 rounded-full blur-2xl opacity-10"></div>
                    <div className="relative w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
                      <Award className="w-10 h-10 text-gray-600" />
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-gray-800 mb-3">Aucun examen trouvé</h3>
                  <p className="text-gray-600 max-w-md mx-auto mb-6">
                    Essayez d'ajuster vos filtres de recherche ou ajoutez un nouvel examen pour enrichir notre collection
                  </p>
                  <button
                    onClick={handleNewExamClick}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gray-800 hover:bg-gray-900 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
                  >
                    <Plus className="w-5 h-5" />
                    Créer un examen
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  <ExamListComponent
                    exams={exams}
                    onVote={handleVote}
                    onDelete={handleDelete}
                    onEdit={(id) => navigate(`/edit-exam/${id}`)}
                  />
                </div>
              )}
            </div>

            {hasMore && !loading && exams.length > 0 && (
              <div className="mt-8 text-center">
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="group relative px-8 py-4 bg-white/80 backdrop-blur-md hover:bg-white text-gray-700 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 font-semibold disabled:opacity-50 disabled:cursor-not-allowed border border-gray-200 hover:scale-105"
                >
                  {loadingMore ? (
                    <div className="flex items-center gap-3">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Chargement...</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <span>Charger plus d'examens</span>
                      <svg className="w-5 h-5 group-hover:translate-y-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};