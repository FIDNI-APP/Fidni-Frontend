import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Loader2, Plus, Filter, SortAsc, BookOpen, ArrowUpDown, X, Award, Calendar } from 'lucide-react';
import { Button } from '../components/ui/button';
import { getExams, voteExam, deleteExam } from '@/lib/api/examApi';
import { Exam, Difficulty, VoteValue, ExamFilters } from '../types';
import { Filters } from '../components/Filters';
import { SortDropdown } from '../components/SortDropdown';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useAuthModal } from '@/components/AuthController';
import { useFilters } from '../components/navbar/FilterContext';
import { ExamCard } from '@/components/exam/ExamCard';
import { DateRangePicker } from '@/components/exam/DateRangePicker';

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
  const { selectedClassLevel, selectedSubject, fullFilters } = useFilters();
  
  // Fonction pour initialiser les filtres depuis l'URL ou le contexte
  const getInitialFilters = () => {
    const searchParams = new URLSearchParams(location.search);
    const classLevelsParam = searchParams.get('classLevels');
    const subjectsParam = searchParams.get('subjects');
    const isNationalParam = searchParams.get('isNational');
    
    // Priorité 1: Paramètres URL
    if (classLevelsParam || subjectsParam || isNationalParam) {
      const isNational = isNationalParam === 'true' ? true : isNationalParam === 'false' ? false : null;
      
      return {
        classLevels: classLevelsParam ? classLevelsParam.split(',') : [],
        subjects: subjectsParam ? subjectsParam.split(',') : [],
        subfields: [] as string[],
        chapters: [] as string[],
        theorems: [] as string[],
        difficulties: [] as Difficulty[],
        isNationalExam: isNational,
        dateRange: null
      } as ExamFilters;
    }
    
    // Priorité 2: Filtres complets du contexte
    if (fullFilters) {
      return {
        ...fullFilters,
        isNationalExam: null,
        dateRange: null
      } as ExamFilters;
    }
    
    // Priorité 3: Filtres simples du contexte
    if (selectedClassLevel || selectedSubject) {
      return {
        classLevels: selectedClassLevel ? [selectedClassLevel] : [],
        subjects: selectedSubject ? [selectedSubject] : [],
        subfields: [] as string[],
        chapters: [] as string[],
        theorems: [] as string[],
        difficulties: [] as Difficulty[],
        isNationalExam: null,
        dateRange: null
      } as ExamFilters;
    }
    
    // Par défaut: filtres vides
    return {
      classLevels: [] as string[],
      subjects: [] as string[],
      subfields: [] as string[],
      chapters: [] as string[],
      theorems: [] as string[],
      difficulties: [] as Difficulty[],
      isNationalExam: null,
      dateRange: null
    } as ExamFilters;
  };
  
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [filters, setFilters] = useState<ExamFilters>(getInitialFilters());
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isFilterOpen, setIsFilterOpen] = useState(true);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [isNationalOnly, setIsNationalOnly] = useState<boolean | null>(null);
  const [dateRange, setDateRange] = useState<{start: string | null, end: string | null} | null>(null);
  
  // Add refs for tracking scroll position
  const listRef = useRef<HTMLDivElement>(null);
  const previousScrollPosition = useRef(0);
  
  // Implement caching for API results
  const { getCachedData, setCachedData, invalidateCache } = useFetchCache();
  
  // Debounce filter changes to reduce API calls
  const debouncedFilters = useDebounce(filters, 500);
  const debouncedSortBy = useDebounce(sortBy, 500);
  const debouncedIsNationalOnly = useDebounce(isNationalOnly, 500);
  const debouncedDateRange = useDebounce(dateRange, 500);
  
  // Gérer les changements d'URL après le chargement initial
  useEffect(() => {
    if (!initialLoadComplete) return;
    
    const searchParams = new URLSearchParams(location.search);
    const classLevelsParam = searchParams.get('classLevels');
    const subjectsParam = searchParams.get('subjects');
    const isNationalParam = searchParams.get('isNational');
    
    if (classLevelsParam || subjectsParam || isNationalParam) {
      const newFilters = { ...filters };
      let hasChanges = false;
      
      if (classLevelsParam) {
        const classLevels = classLevelsParam.split(',');
        if (JSON.stringify(classLevels) !== JSON.stringify(filters.classLevels)) {
          newFilters.classLevels = classLevels;
          hasChanges = true;
        }
      }
      
      if (subjectsParam) {
        const subjects = subjectsParam.split(',');
        if (JSON.stringify(subjects) !== JSON.stringify(filters.subjects)) {
          newFilters.subjects = subjects;
          hasChanges = true;
        }
      }
      
      if (isNationalParam) {
        const isNationalExam = isNationalParam === 'true';
        if (isNationalExam !== isNationalOnly) {
          setIsNationalOnly(isNationalExam);
          hasChanges = true;
        }
      }
      
      if (hasChanges) {
        // Reset dependent filters
        newFilters.subfields = [];
        newFilters.chapters = [];
        newFilters.theorems = [];
        
        // Update filters
        setFilters(newFilters);
      }
    }
  }, [location.search, initialLoadComplete]);
  
  // Marquer le chargement initial comme terminé
  useEffect(() => {
    setInitialLoadComplete(true);
  }, []);
  
  // Use memoization for creating API query parameters
  const queryParams = useMemo(() => {
    return {
      classLevels: debouncedFilters.classLevels,
      subjects: debouncedFilters.subjects,
      chapters: debouncedFilters.chapters,
      difficulties: debouncedFilters.difficulties,
      subfields: debouncedFilters.subfields,
      theorems: debouncedFilters.theorems,
      isNationalExam: debouncedIsNationalOnly,
      dateRange: debouncedDateRange,
      sort: debouncedSortBy,
      page,
      per_page: ITEMS_PER_PAGE
    };
  }, [debouncedFilters, debouncedSortBy, debouncedIsNationalOnly, debouncedDateRange, page]);
  
  // Generate cache key based on query params
  const getCacheKey = useCallback((params: any) => {
    return JSON.stringify(params);
  }, []);

  // Optimized function to fetch exams
  const fetchExams = useCallback(async (isLoadMore = false) => {
    const setLoadingState = isLoadMore ? setLoadingMore : setLoading;
    
    try {
      setLoadingState(true);
      setError(null);
      
      // Generate cache key from the current query params
      const cacheKey = getCacheKey(queryParams);
      
      // Check if we have cached results
      const cachedResult = getCachedData(cacheKey);
      if (cachedResult) {
        if (isLoadMore) {
          setExams(prev => [...prev, ...cachedResult.results]);
        } else {
          setExams(cachedResult.results);
        }
        setTotalCount(cachedResult.count);
        setHasMore(!!cachedResult.next);
        setLoadingState(false);
        return;
      }
      
      // If not cached, fetch from API
      const data = await getExams(queryParams);
      
      // Cache the results
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
  }, [queryParams, getCacheKey, getCachedData, setCachedData]);

  // Load data when debounced filters/sort change or page changes
  useEffect(() => {
    const shouldReset = page > 1;
    if (shouldReset) {
      setPage(1); // This will trigger another effect call with page=1
    } else {
      fetchExams(false);
    }
  }, [debouncedFilters, debouncedSortBy, debouncedIsNationalOnly, debouncedDateRange]);
  
  // Handle pagination separately
  useEffect(() => {
    if (page > 1) {
      fetchExams(true);
    }
  }, [page, fetchExams]);

  // Optimized vote handler with local state updates
  const handleVote = useCallback(async (id: string, type: VoteValue) => {
    if (!isAuthenticated) {
      openModal();
      return;
    }
    
    try {
      // Optimistically update UI
      setExams(prevExams => 
        prevExams.map(exam => {
          if (exam.id === id) {
            // Calculate new vote count based on previous state and new vote
            let newVoteCount = exam.vote_count;
            if (exam.user_vote === type) {
              // User is toggling off their vote
              newVoteCount -= type;
            } else if (exam.user_vote === 0) {
              // User is voting when they hadn't before
              newVoteCount += type;
            } else {
              // User is changing their vote
              newVoteCount = newVoteCount - exam.user_vote + type;
            }
            
            return {
              ...exam,
              user_vote: exam.user_vote === type ? 0 : type,
              vote_count: newVoteCount
            };
          }
          return exam;
        })
      );
      
      // Make API call in background
      const updatedExam = await voteExam(id, type);
      
      // Update with actual server response to ensure consistency
      setExams(prevExams => 
        prevExams.map(exam => 
          exam.id === id ? updatedExam : exam
        )
      );
    } catch (err) {
      console.error('Failed to vote:', err);
      // Revert to original state on error
      fetchExams(false);
    }
  }, [isAuthenticated, openModal, fetchExams]);

  // Optimized delete handler
  const handleDelete = useCallback(async (id: string) => {
    if (window.confirm('Are you sure you want to delete this exam?')) {
      try {
        // Optimistically update UI
        setExams(prev => prev.filter(exam => exam.id !== id));
        setTotalCount(prev => prev - 1);
        
        // Make API call in background
        await deleteExam(id);
        
        // Invalidate cache after deletion
        invalidateCache();
      } catch (err) {
        console.error('Failed to delete exam:', err);
        // Revert to original state on error
        fetchExams(false);
      }
    }
  }, [invalidateCache, fetchExams]);

  // Load more content with scroll position preservation
  const handleLoadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      // Save current scroll position before loading more
      if (listRef.current) {
        previousScrollPosition.current = listRef.current.scrollTop;
      }
      setPage(prev => prev + 1);
    }
  }, [loadingMore, hasMore]);

  // Optimized filter change handler with URL update
  const handleFilterChange = useCallback((newFilters: Omit<ExamFilters, 'isNationalExam' | 'dateRange'>) => {
    // Reset scroll position when filters change
    if (listRef.current) {
      listRef.current.scrollTop = 0;
    }
    
    setFilters(prev => ({
      ...prev,
      ...newFilters
    }));
    
    // Update URL with the new filters
    const params = new URLSearchParams();
    
    if (newFilters.classLevels.length > 0) {
      params.set('classLevels', newFilters.classLevels.join(','));
    }
    
    if (newFilters.subjects.length > 0) {
      params.set('subjects', newFilters.subjects.join(','));
    }
    
    if (isNationalOnly !== null) {
      params.set('isNational', isNationalOnly.toString());
    }
    
    const newUrl = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`;
    window.history.replaceState(null, '', newUrl);
  }, [isNationalOnly]);

  // Restore scroll position after loading more content
  useEffect(() => {
    if (!loadingMore && page > 1 && listRef.current) {
      listRef.current.scrollTop = previousScrollPosition.current;
    }
  }, [loadingMore, page]);

  const handleNewExamClick = useCallback(() => {
    if (isAuthenticated) {
      navigate('/new-exam');
    } else {
      openModal();
      // Navigate after authentication
      navigate('/new-exam');
    }
  }, [isAuthenticated, navigate, openModal]);

  const handleSortChange = useCallback((newSortOption: SortOption) => {
    // Reset scroll position when sort changes
    if (listRef.current) {
      listRef.current.scrollTop = 0;
    }
    
    setSortBy(newSortOption);
  }, []);

  // Toggle national exams filter
  const handleNationalToggle = useCallback((value: boolean | null) => {
    setIsNationalOnly(value);
    
    // Update URL
    const params = new URLSearchParams(window.location.search);
    if (value !== null) {
      params.set('isNational', value.toString());
    } else {
      params.delete('isNational');
    }
    
    const newUrl = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`;
    window.history.replaceState(null, '', newUrl);
  }, []);

  // Handle date range change
  const handleDateRangeChange = useCallback((range: {start: string | null, end: string | null} | null) => {
    setDateRange(range);
  }, []);

  // Memoize the sort/filter section to prevent re-renders
  const SortFilterSection = useMemo(() => (
    <>
      {/* Mobile filter toggle */}
      <div className="md:hidden mb-6">
        <button 
          onClick={() => setIsFilterOpen(prev => !prev)}
          className="w-full bg-white rounded-lg shadow-md p-3 flex items-center justify-center space-x-2 text-indigo-800 font-medium"
        >
          <Filter className="w-5 h-5" />
          <span>{isFilterOpen ? 'Hide filters' : 'Show filters'}</span>
        </button>
      </div>

      {/* Sort and Count Section */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-4">
          <div className="flex items-center gap-3 mb-4 sm:mb-0">
            <span className="text-gray-600 flex items-center font-medium">
              <ArrowUpDown className="w-5 h-5 mr-2 text-indigo-600" />
              Sort by:
            </span>
            <SortDropdown 
              value={sortBy} 
              onChange={handleSortChange}
              options={[
                { value: 'newest', label: 'Newest first' },
                { value: 'oldest', label: 'Oldest first' },
                { value: 'most_upvoted', label: 'Most upvoted' },
                { value: 'most_commented', label: 'Most commented' },
                { value: 'most_viewed', label: 'Most viewed' }
              ]}
            />
          </div>
          <div className="bg-indigo-50 text-indigo-700 px-4 py-1.5 rounded-full font-medium">
            {totalCount} exams found
          </div>
        </div>
        
        {/* Filters spécifiques aux examens */}
        <div className="flex flex-wrap gap-3 items-center border-t border-gray-100 pt-4">
          {/* Filtre examens nationaux */}
          <div className="flex items-center gap-2">
            <span className="text-gray-600 text-sm font-medium flex items-center">
              <Award className="w-4 h-4 mr-1 text-blue-600" />
              Examen National:
            </span>
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => handleNationalToggle(null)}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  isNationalOnly === null ? 'bg-white shadow-sm text-indigo-700' : 'text-gray-600 hover:bg-gray-200'
                }`}
              >
                Tous
              </button>
              <button
                onClick={() => handleNationalToggle(true)}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  isNationalOnly === true ? 'bg-white shadow-sm text-indigo-700' : 'text-gray-600 hover:bg-gray-200'
                }`}
              >
                Oui
              </button>
              <button
                onClick={() => handleNationalToggle(false)}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  isNationalOnly === false ? 'bg-white shadow-sm text-indigo-700' : 'text-gray-600 hover:bg-gray-200'
                }`}
              >
                Non
              </button>
            </div>
          </div>
          
          {/* Filtre par date (pour les examens nationaux) */}
          <div className="flex items-center gap-2 ml-4">
            <span className="text-gray-600 text-sm font-medium flex items-center">
              <Calendar className="w-4 h-4 mr-1 text-blue-600" />
              Date de l'examen:
            </span>
            <DateRangePicker 
              onChange={handleDateRangeChange}
              value={dateRange}
            />
          </div>
        </div>
      </div>
    </>
  ), [isFilterOpen, sortBy, totalCount, isNationalOnly, dateRange, handleSortChange, handleNationalToggle, handleDateRangeChange]);

  // Memoize filter component to prevent unnecessary re-renders
  const FilterComponent = useMemo(() => (
    <div 
      className={`${isFilterOpen ? 'block' : 'hidden'} md:block md:w-90 lg:w-72 flex-shrink-10 custom-scrollbar bg-white rounded-xl shadow-sm`}
      style={{ 
        top: "100px",
        height: "fit-content",
        maxHeight: "calc(100vh - 140px)",
        overflowY: "auto",
        position: "sticky",
        }}
    >
      <Filters 
        onFilterChange={handleFilterChange} 
        initialClassLevels={filters.classLevels}
        initialSubjects={filters.subjects}
      />
    </div>
  ), [isFilterOpen, handleFilterChange, filters.classLevels, filters.subjects]);

  return (
    <div className="min-h-screen bg-gray-50 pb-16">

      {/* Add the styles for the scrollbar */}
      <style>{`
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: rgba(79, 70, 229, 0.3) transparent;
        }
        
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
          border-radius: 10px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: rgba(79, 70, 229, 0.3);
          border-radius: 10px;
          border: transparent;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: rgba(79, 70, 229, 0.5);
        }
      `}</style>
      
      {/* Header Section */}
      <div className="bg-gradient-to-br from-blue-800 via-blue-900 to-indigo-900 text-white py-8 mb-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-6 md:mb-0">
              <h1 className="text-3xl md:text-4xl font-bold mb-3 flex items-center">
                <Award className="w-8 h-8 mr-3" /> 
                Examens
              </h1>
              <p className="text-indigo-200 text-lg">
                Préparez-vous aux examens avec notre collection de {totalCount} sujets de qualité
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

      {/* Main layout */}
      <div className="container mx-auto px-4">
        {SortFilterSection}

        {/* Fixed Left Filter + Content Layout */}
        <div className="flex flex-col md:flex-row md:gap-8">
          {FilterComponent}

          {/* Content Area */}
          <div className="flex-grow min-w-0" ref={listRef}>
            {/* Error message if any */}
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded-lg shadow-sm">
                {error}
              </div>
            )}

            {/* Exam Content */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              {loading ? (
                <div className="flex justify-center items-center h-64">
                  <div className="text-center">
                    <Loader2 className="w-10 h-10 animate-spin text-indigo-600 mx-auto mb-4" />
                    <p className="text-gray-500">Loading exams...</p>
                  </div>
                </div>
              ) : exams.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6 p-6">
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
              ) : (
                <div className="text-center py-16">
                  <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <Award className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-700 mb-2">Aucun examen trouvé</h3>
                  <p className="text-gray-500 max-w-md mx-auto">
                    Essayez d'ajuster vos filtres de recherche ou créez un nouvel examen
                  </p>
                </div>
              )}
            </div>

            {/* Load More Button */}
            {hasMore && !loading && (
              <div className="mt-8 text-center">
                <Button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-lg shadow-sm transition-all"
                >
                  {loadingMore ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Loading...
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