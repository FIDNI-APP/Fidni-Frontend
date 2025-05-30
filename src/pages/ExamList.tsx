// src/pages/ExamList.tsx (or wherever your ExamList component is)
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Loader2, Plus, Filter, SortAsc, BookOpen, ArrowUpDown, X, Award, Calendar } from 'lucide-react';
import { Button } from '../components/ui/button';
import { getExams, voteExam, deleteExam } from '@/lib/api/examApi';
import { Exam, Difficulty, VoteValue, ExamFilters as ExamFiltersType } from '../types'; // Renamed ExamFilters to ExamFiltersType to avoid conflict
import { ExamFiltersPanel } from '@/components/exam/ExamFilters'; // Corrected import
import { SortDropdown } from '../components/SortDropdown';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useAuthModal } from '@/components/AuthController';
import { useFilters as useNavbarFilters } from '../components/navbar/FilterContext'; // Renamed useFilters to avoid conflict
import { ExamCard } from '@/components/exam/ExamCard';
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

    // Priority 1: Paramètres URL
    if (classLevelsParam || subjectsParam || isNationalParam || dateStartParam || dateEndParam) {
      return {
        classLevels: classLevelsParam ? classLevelsParam.split(',') : [],
        subjects: subjectsParam ? subjectsParam.split(',') : [],
        subfields: searchParams.get('subfields')?.split(',') || [],
        chapters: searchParams.get('chapters')?.split(',') || [],
        theorems: searchParams.get('theorems')?.split(',') || [],
        difficulties: (searchParams.get('difficulties')?.split(',') || []) as Difficulty[],
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
    setFilters(newFilters);
    
    const params = new URLSearchParams();
    if (newFilters.classLevels.length > 0) params.set('classLevels', newFilters.classLevels.join(','));
    if (newFilters.subjects.length > 0) params.set('subjects', newFilters.subjects.join(','));
    if (newFilters.subfields.length > 0) params.set('subfields', newFilters.subfields.join(','));
    if (newFilters.chapters.length > 0) params.set('chapters', newFilters.chapters.join(','));
    // Add theorems and difficulties if you want them in URL
    if (newFilters.isNationalExam !== undefined && newFilters.isNationalExam !== null) params.set('isNational', newFilters.isNationalExam.toString());
    if (newFilters.dateRange?.start) params.set('dateStart', newFilters.dateRange.start);
    if (newFilters.dateRange?.end) params.set('dateEnd', newFilters.dateRange.end);
    
    const newUrl = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`;
    window.history.replaceState(null, '', newUrl);
  }, []);

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
          className="w-full bg-white rounded-lg shadow-md p-3 flex items-center justify-center space-x-2 text-indigo-800 font-medium"
        >
          <Filter className="w-5 h-5" />
          <span>{isFilterOpen ? 'Cacher les filtres' : 'Afficher les filtres'}</span>
        </button>
      </div>
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-center"> {/* Removed mb-4 here */}
          <div className="flex items-center gap-3 mb-4 sm:mb-0">
            <span className="text-gray-600 flex items-center font-medium">
              <ArrowUpDown className="w-5 h-5 mr-2 text-indigo-600" />
              Trier par:
            </span>
            <SortDropdown 
              value={sortBy} 
              onChange={handleSortChange}
              options={[
                { value: 'newest', label: 'Plus récents' },
                { value: 'oldest', label: 'Plus anciens' },
                { value: 'most_upvoted', label: 'Plus de votes' },
                // { value: 'most_commented', label: 'Most commented' }, // Décommenter si API supporte
                // { value: 'most_viewed', label: 'Most viewed' } // Décommenter si API supporte
              ]}
            />
          </div>
          <div className="bg-indigo-50 text-indigo-700 px-4 py-1.5 rounded-full font-medium text-sm sm:text-base">
            {totalCount} examen(s) trouvé(s)
          </div>
        </div>
        {/* Les filtres isNational et dateRange sont maintenant dans ExamFiltersPanel */}
      </div>
    </>
  ), [isFilterOpen, sortBy, totalCount, handleSortChange]);

  const FilterComponent = useMemo(() => (
    <div 
      className={`${isFilterOpen ? 'block' : 'hidden'} md:block md:w-full lg:w-80 xl:w-96 flex-shrink-0 custom-scrollbar`} // Adjusted width
      style={{ 
        top: "100px", // Adjust if you have a sticky navbar
        height: "fit-content",
        maxHeight: "calc(100vh - 120px)", // Adjust based on navbar height and padding
        overflowY: "auto",
        position: "sticky",
      }}
    >
      <ExamFiltersPanel 
        onFilterChange={handleFilterChange} 
        initialClassLevels={filters.classLevels}
        initialSubjects={filters.subjects}
        initialIsNationalExam={filters.isNationalExam} // Pass initial values
        initialDateRange={filters.dateRange}          // Pass initial values
        // Vous pourriez aussi passer l'objet 'filters' entier si ExamFiltersPanel est conçu pour le prendre
        // et si cela simplifie la gestion des props initiales.
        // Par exemple: initialFilters={filters}
      />
    </div>
  ), [isFilterOpen, handleFilterChange, filters]); // filters is now the main dependency

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <style>{`
        .custom-scrollbar { scrollbar-width: thin; scrollbar-color: rgba(79, 70, 229, 0.3) transparent; }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(79, 70, 229, 0.3); border-radius: 10px; border: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background-color: rgba(79, 70, 229, 0.5); }
      `}</style>
      
      <div className="bg-gradient-to-br from-blue-800 via-blue-900 to-indigo-900 text-white py-8 mb-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-6 md:mb-0 text-center md:text-left">
              <h1 className="text-3xl md:text-4xl font-bold mb-3 flex items-center justify-center md:justify-start">
                <Award className="w-8 h-8 mr-3" /> 
                Examens
              </h1>
              <p className="text-indigo-200 text-lg">
                Préparez-vous avec notre collection de {totalCount > 0 ? `${totalCount} ` : ''}sujets de qualité
              </p>
            </div>
            <button 
              onClick={handleNewExamClick}
              className="bg-white text-indigo-700 hover:bg-indigo-50 px-6 py-3 rounded-full shadow-md hover:shadow-lg transition-all duration-200 font-medium flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Ajouter un Examen
            </button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4">
        {SortFilterSection}
        <div className="flex flex-col md:flex-row md:gap-8">
          {FilterComponent}
          <div className="flex-grow min-w-0" ref={listRef}>
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded-lg shadow-sm">
                {error}
              </div>
            )}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              {loading && exams.length === 0 ? ( // Show loader only if exams array is empty initially
                <div className="flex justify-center items-center h-64">
                  <div className="text-center">
                    <Loader2 className="w-10 h-10 animate-spin text-indigo-600 mx-auto mb-4" />
                    <p className="text-gray-500">Chargement des examens...</p>
                  </div>
                </div>
              ) : !loading && exams.length === 0 ? (
                <div className="text-center py-16 px-4">
                  <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <Award className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-700 mb-2">Aucun examen trouvé</h3>
                  <p className="text-gray-500 max-w-md mx-auto">
                    Essayez d'ajuster vos filtres ou ajoutez un nouvel examen pour enrichir notre collection.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 p-6"> {/* Adjusted sm breakpoint */}
                  {exams.map(exam => (
                    <ExamCard
                      key={exam.id}
                      exam={exam}
                      onVote={handleVote}
                      onDelete={handleDelete}
                      onEdit={(id) => navigate(`/edit-exam/${id}`)}
                    />
                  ))}
                </div>
              )}
            </div>

            {hasMore && !loading && exams.length > 0 && (
              <div className="mt-8 text-center">
                <Button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-lg shadow-sm transition-all"
                  size="lg"
                >
                  {loadingMore ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Chargement...
                    </>
                  ) : (
                    'Charger plus d\'examens'
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};