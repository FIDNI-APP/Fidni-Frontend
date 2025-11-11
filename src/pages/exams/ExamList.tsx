// src/pages/ExamList.tsx (or wherever your ExamList component is)
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Loader2, Plus, Award } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { getExams, voteExam, deleteExam } from '@/lib/api/examApi';
import { Exam, Difficulty, VoteValue, ExamFilters as ExamFiltersType } from '../../types';
import { HorizontalFilterBar } from '@/components/HorizontalFilterBar';
import { ContentCard } from '@/components/content/ContentCard';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useAuthModal } from '@/components/AuthController';
import { useFilters as useNavbarFilters } from '../../components/navbar/FilterContext';

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
  
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [filters, setFilters] = useState<{
    classLevels: string[];
    subjects: string[];
    subfields: string[];
    chapters: string[];
    theorems: string[];
    difficulties: Difficulty[];
    isNationalExam?: boolean;
    dateStart?: string | null;
    dateEnd?: string | null;
  }>({
    classLevels: [],
    subjects: [],
    subfields: [],
    chapters: [],
    theorems: [],
    difficulties: [],
    isNationalExam: false,
    dateStart: null,
    dateEnd: null,
  });
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const listRef = useRef<HTMLDivElement>(null);
  const previousScrollPosition = useRef(0);

  const { getCachedData, setCachedData, invalidateCache } = useFetchCache();

  const debouncedFilters = useDebounce(filters, 500);
  const debouncedSortBy = useDebounce(sortBy, 500);
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
        isNationalExam: filters.isNationalExam || undefined,
        dateRange: filters.dateStart || filters.dateEnd ? {
          start: filters.dateStart,
          end: filters.dateEnd
        } : undefined,
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
    setPage(1);
    if (page === 1) {
      fetchExams(false);
    }
  }, [debouncedFilters, debouncedSortBy]);

  useEffect(() => {
    // Handle pagination fetches
    fetchExams(page > 1);
  }, [page, fetchExams]);


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

  const handleFilterChange = useCallback((newFilters: any) => {
    if (listRef.current) {
      listRef.current.scrollTop = 0;
    }

    setFilters(newFilters);

    const params = new URLSearchParams();
    if (newFilters.classLevels.length > 0) params.set('classLevels', newFilters.classLevels.join(','));
    if (newFilters.subjects.length > 0) params.set('subjects', newFilters.subjects.join(','));
    if (newFilters.subfields.length > 0) params.set('subfields', newFilters.subfields.join(','));
    if (newFilters.chapters.length > 0) params.set('chapters', newFilters.chapters.join(','));
    if (newFilters.theorems.length > 0) params.set('theorems', newFilters.theorems.join(','));
    if (newFilters.difficulties.length > 0) params.set('difficulties', newFilters.difficulties.join(','));
    if (newFilters.isNationalExam) params.set('isNational', 'true');
    if (newFilters.dateStart) params.set('dateStart', newFilters.dateStart);
    if (newFilters.dateEnd) params.set('dateEnd', newFilters.dateEnd);

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

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
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
                Préparez-vous avec notre collection de sujets d'examen de qualité
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
        {/* Horizontal Filter Bar with integrated Sort */}
        <HorizontalFilterBar
          contentType="exam"
          filters={filters}
          onFilterChange={handleFilterChange}
          sortBy={sortBy}
          onSortChange={handleSortChange}
        />

        <div ref={listRef}>
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded-lg">
              <p className="font-medium">{error}</p>
            </div>
          )}

          {loading && exams.length === 0 ? (
            <div className="flex justify-center items-center h-96">
              <div className="text-center">
                <Loader2 className="w-12 h-12 animate-spin text-indigo-600 mx-auto mb-4" />
                <p className="text-gray-600 font-medium">Chargement des examens...</p>
              </div>
            </div>
          ) : !loading && exams.length === 0 ? (
            <div className="text-center py-20 px-6 bg-white rounded-xl shadow-sm">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Award className="w-10 h-10 text-gray-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-3">Aucun examen trouvé</h3>
              <p className="text-gray-600 max-w-md mx-auto mb-6">
                Essayez d'ajuster vos filtres de recherche ou ajoutez un nouvel examen pour enrichir notre collection
              </p>
              <button
                onClick={handleNewExamClick}
                className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
              >
                <Plus className="w-5 h-5" />
                Créer un examen
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {exams.map((exam) => (
                <ContentCard
                  key={exam.id}
                  content={exam}
                  onVote={handleVote}
                  onDelete={handleDelete}
                  onEdit={(id) => navigate(`/edit-exam/${id}`)}
                  contentType="exam"
                />
              ))}
            </div>
          )}

          {hasMore && !loading && exams.length > 0 && (
            <div className="mt-8 text-center">
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="px-8 py-4 bg-white hover:bg-gray-50 text-gray-700 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 font-semibold disabled:opacity-50 disabled:cursor-not-allowed border border-gray-200"
              >
                {loadingMore ? (
                  <div className="flex items-center gap-3">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Chargement...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <span>Charger plus d'examens</span>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
  );
};