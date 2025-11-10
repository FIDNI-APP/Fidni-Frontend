// src/pages/LessonList.tsx
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Loader2, Plus, Filter, BookOpen, ArrowUpDown} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { getLessons, voteLesson, deleteLesson } from '../../lib/api';
import { Lesson, SortOption, VoteValue } from '../../types';
import { Filters } from '../../components/Filters';
import { SortDropdown } from '../../components/SortDropdown';
import { ContentListItem } from '@/components/exercise/ContentListItem';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useAuthModal } from '@/components/AuthController';
import { useFilters } from '../../components/navbar/FilterContext'; // AJOUT IMPORTANT

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

const ITEMS_PER_PAGE = 20;

export const LessonList = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const { openModal } = useAuthModal();
  const { selectedClassLevel, selectedSubject, fullFilters } = useFilters(); // UTILISATION DU CONTEXTE
  
  // NOUVELLE FONCTION pour initialiser les filtres depuis l'URL ou le contexte
  const getInitialFilters = () => {
    const searchParams = new URLSearchParams(location.search);
    const classLevelsParam = searchParams.get('classLevels');
    const subjectsParam = searchParams.get('subjects');
    const subfieldsParam = searchParams.get('subfields');
    const chaptersParam = searchParams.get('chapters');
    const theoremsParam = searchParams.get('theorems');
    const difficultiesParam = searchParams.get('difficulties');

    // Priorité 1: Paramètres URL - check for ANY URL param
    if (classLevelsParam || subjectsParam || subfieldsParam || chaptersParam || theoremsParam || difficultiesParam) {
      return {
        classLevels: classLevelsParam ? classLevelsParam.split(',') : [],
        subjects: subjectsParam ? subjectsParam.split(',') : [],
        subfields: subfieldsParam ? subfieldsParam.split(',') : [],
        chapters: chaptersParam ? chaptersParam.split(',') : [],
        theorems: theoremsParam ? theoremsParam.split(',') : [],
        difficulties: difficultiesParam ? difficultiesParam.split(',') : [],
      };
    }
    
    // Priorité 2: Filtres complets du contexte
    if (fullFilters) {
      return fullFilters;
    }
    
    // Priorité 3: Filtres simples du contexte
    if (selectedClassLevel || selectedSubject) {
      return {
        classLevels: selectedClassLevel ? [selectedClassLevel] : [],
        subjects: selectedSubject ? [selectedSubject] : [],
        subfields: [] as string[],
        chapters: [] as string[],
        theorems: [] as string[],
        difficulties: [] as string[],
      };
    }
    
    // Par défaut: filtres vides
    return {
      classLevels: [] as string[],
      subjects: [] as string[],
      subfields: [] as string[],
      chapters: [] as string[],
      theorems: [] as string[],
      difficulties: [] as string[],
    };
  };
  
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [filters, setFilters] = useState(getInitialFilters()); // UTILISATION DE LA FONCTION D'INITIALISATION
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isFilterOpen, setIsFilterOpen] = useState(true);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false); // NOUVEAU FLAG
  
  // Add refs for tracking scroll position
  const listRef = useRef<HTMLDivElement>(null);
  const previousScrollPosition = useRef(0);
  
  // Implement caching for API results
  const { getCachedData, setCachedData, invalidateCache } = useFetchCache();
  
  // Debounce filter changes to reduce API calls
  const debouncedFilters = useDebounce(filters, 500);
  const debouncedSortBy = useDebounce(sortBy, 500);
  
  // MODIFICATION: Gérer les changements d'URL seulement après le chargement initial
  useEffect(() => {
    // Ne traiter les changements d'URL qu'après le premier chargement
    if (!initialLoadComplete) return;

    const searchParams = new URLSearchParams(location.search);
    const classLevelsParam = searchParams.get('classLevels');
    const subjectsParam = searchParams.get('subjects');
    const subfieldsParam = searchParams.get('subfields');
    const chaptersParam = searchParams.get('chapters');
    const theoremsParam = searchParams.get('theorems');
    const difficultiesParam = searchParams.get('difficulties');

    // If there are ANY URL params, update filters from URL
    if (classLevelsParam || subjectsParam || subfieldsParam || chaptersParam || theoremsParam || difficultiesParam) {
      const newFilters = {
        classLevels: classLevelsParam ? classLevelsParam.split(',') : [],
        subjects: subjectsParam ? subjectsParam.split(',') : [],
        subfields: subfieldsParam ? subfieldsParam.split(',') : [],
        chapters: chaptersParam ? chaptersParam.split(',') : [],
        theorems: theoremsParam ? theoremsParam.split(',') : [],
        difficulties: difficultiesParam ? difficultiesParam.split(',') : [],
      };

      // Only update if different from current filters
      if (JSON.stringify(newFilters) !== JSON.stringify(filters)) {
        setFilters(newFilters);
      }
    }
  }, [location.search, initialLoadComplete]); // Dépendance sur initialLoadComplete
  
  // NOUVEAU: Marquer le chargement initial comme terminé
  useEffect(() => {
    setInitialLoadComplete(true);
  }, []);
  
  // Use memoization for creating API query parameters
  const queryParams = useMemo(() => {
    return {
      classLevels: debouncedFilters.classLevels,
      subjects: debouncedFilters.subjects,
      chapters: debouncedFilters.chapters,
      subfields: debouncedFilters.subfields,
      theorems: debouncedFilters.theorems,
      sort: debouncedSortBy,
      page,
      per_page: ITEMS_PER_PAGE,
      type: 'lesson' // Specify that we want lessons, not exercises
    };
  }, [debouncedFilters, debouncedSortBy, page]);
  
  // Generate cache key based on query params
  const getCacheKey = useCallback((params: any) => {
    return JSON.stringify(params);
  }, []);

  // Optimized function to fetch lessons
  const fetchLessons = useCallback(async (isLoadMore = false) => {
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
          setLessons(prev => [...prev, ...cachedResult.results]);
        } else {
          setLessons(cachedResult.results || []);
        }
        setTotalCount(cachedResult.count || 0);
        setHasMore(!!cachedResult.next);
        setLoadingState(false);
        return;
      }
      
      // If not cached, fetch from API
      const data = await getLessons(queryParams);
      
      // Cache the results
      setCachedData(cacheKey, data);
      
      const newLessons = data.results || [];
      
      // Make sure each lesson has a 'type' property
      const processedLessons = newLessons.map((lesson: any) => ({
        ...lesson,
        type: 'lesson' // Add type property to identify it as a lesson
      }));
      
      if (isLoadMore) {
        setLessons(prev => [...prev, ...processedLessons]);
      } else {
        setLessons(processedLessons);
      }
      
      setTotalCount(data.count || 0);
      setHasMore(!!data.next);
    } catch (err) {
      console.error('Error fetching lessons:', err);
      setError('Failed to load lessons. Please try again.');
    } finally {
      setLoadingState(false);
    }
  }, [queryParams, getCacheKey, getCachedData, setCachedData]);

  // Load data when debounced filters/sort change
  useEffect(() => {
    const shouldReset = page > 1;
    if (shouldReset) {
      setPage(1); // This will trigger another effect call with page=1
    } else {
      fetchLessons(false);
    }
  }, [debouncedFilters, debouncedSortBy]);
  
  // Handle pagination separately
  useEffect(() => {
    if (page > 1) {
      fetchLessons(true);
    }
  }, [page, fetchLessons]);

  // Optimized vote handler with local state updates
  const handleVote = useCallback(async (id: string, type: VoteValue) => {
    if (!isAuthenticated) {
      openModal();
      return;
    }
    
    try {
      // Optimistically update UI
      setLessons(prevLessons => 
        prevLessons.map(lesson => {
          if (lesson.id === id) {
            // Calculate new vote count based on previous state and new vote
            let newVoteCount = lesson.vote_count;
            if (lesson.user_vote === type) {
              // User is toggling off their vote
              newVoteCount -= type;
            } else if (lesson.user_vote === 0) {
              // User is voting when they hadn't before
              newVoteCount += type;
            } else {
              // User is changing their vote
              newVoteCount = newVoteCount - lesson.user_vote + type;
            }
            
            return {
              ...lesson,
              user_vote: lesson.user_vote === type ? 0 : type,
              vote_count: newVoteCount
            };
          }
          return lesson;
        })
      );
      
      // Make API call in background only if type is not 0
      if (type !== 0) {
        const updatedLesson = await voteLesson(id, type);
      
        // Update with actual server response to ensure consistency
        setLessons(prevLessons => 
          prevLessons.map(lesson => 
            lesson.id === id ? {
              ...updatedLesson,
              type: 'lesson' // Ensure type is preserved
            } : lesson
          )
        );
      }
    } catch (err) {
      console.error('Failed to vote:', err);
      // Revert to original state on error
      fetchLessons(false);
    }
  }, [isAuthenticated, openModal, fetchLessons]);

  // Optimized delete handler
  const handleDelete = useCallback(async (id: string) => {
    if (window.confirm('Are you sure you want to delete this lesson?')) {
      try {
        // Optimistically update UI
        setLessons(prev => prev.filter(lesson => lesson.id !== id));
        setTotalCount(prev => prev - 1);
        
        // Make API call in background
        await deleteLesson(id);
        
        // Invalidate cache after deletion
        invalidateCache();
      } catch (err) {
        console.error('Failed to delete lesson:', err);
        // Revert to original state on error
        fetchLessons(false);
      }
    }
  }, [invalidateCache, fetchLessons]);

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
  const handleFilterChange = useCallback((newFilters: typeof filters) => {
    // Reset scroll position when filters change
    if (listRef.current) {
      listRef.current.scrollTop = 0;
    }

    setFilters(newFilters);

    // Update URL with the new filters
    const params = new URLSearchParams();

    if (newFilters.classLevels.length > 0) {
      params.set('classLevels', newFilters.classLevels.join(','));
    }

    if (newFilters.subjects.length > 0) {
      params.set('subjects', newFilters.subjects.join(','));
    }

    if (newFilters.subfields.length > 0) {
      params.set('subfields', newFilters.subfields.join(','));
    }

    if (newFilters.chapters.length > 0) {
      params.set('chapters', newFilters.chapters.join(','));
    }

    if (newFilters.theorems.length > 0) {
      params.set('theorems', newFilters.theorems.join(','));
    }

    if (newFilters.difficulties.length > 0) {
      params.set('difficulties', newFilters.difficulties.join(','));
    }

    const newUrl = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`;
    window.history.replaceState(null, '', newUrl);
  }, []);

  // Restore scroll position after loading more content
  useEffect(() => {
    if (!loadingMore && page > 1 && listRef.current) {
      listRef.current.scrollTop = previousScrollPosition.current;
    }
  }, [loadingMore, page]);

  const handleNewLessonClick = useCallback(() => {
    if (isAuthenticated) {
      navigate('/new-lesson');
    } else {
      openModal();
      // The redirection will be handled by the auth context after successful login
    }
  }, [isAuthenticated, navigate, openModal]);

  const handleSortChange = useCallback((newSortOption: SortOption) => {
    // Reset scroll position when sort changes
    if (listRef.current) {
      listRef.current.scrollTop = 0;
    }
    
    setSortBy(newSortOption);
  }, []);

  // Memoize the sort/filter section to prevent re-renders
  const SortFilterSection = useMemo(() => (
    <>
      {/* Mobile filter toggle */}
      <div className="md:hidden mb-6">
        <button
          onClick={() => setIsFilterOpen(prev => !prev)}
          className="w-full bg-white/80 backdrop-blur-md rounded-xl shadow-lg p-4 flex items-center justify-center space-x-3 text-gray-700 font-semibold hover:bg-white transition-all duration-200 border border-gray-200"
        >
          <Filter className="w-5 h-5" />
          <span>{isFilterOpen ? 'Masquer les filtres' : 'Afficher les filtres'}</span>
        </button>
      </div>

      {/* Sort and Count Section */}
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
            />
          </div>
          <div className="flex items-center gap-2 bg-gray-100 text-gray-700 px-5 py-2 rounded-full font-bold shadow-sm">
            <BookOpen className="w-4 h-4" />
            <span>{totalCount} leçon{totalCount > 1 ? 's' : ''}</span>
          </div>
        </div>
      </div>
    </>
  ), [isFilterOpen, sortBy, totalCount, handleSortChange]);

  // Memoize filter component to prevent unnecessary re-renders
  const FilterComponent = useMemo(() => (
    <div
      className={`filter-sidebar ${isFilterOpen ? 'block' : 'hidden'} md:block md:w-full lg:w-80 xl:w-96 flex-shrink-0 custom-scrollbar bg-white/80 backdrop-blur-md rounded-xl shadow-lg border border-gray-100`}
    >
      <Filters
        onFilterChange={handleFilterChange}
        initialClassLevels={filters.classLevels}
        initialSubjects={filters.subjects}
        initialSubfields={filters.subfields}
        initialChapters={filters.chapters}
        initialTheorems={filters.theorems}
        initialDifficulties={filters.difficulties}
        contentType="lesson"
      />
    </div>
  ), [isFilterOpen, handleFilterChange, filters.classLevels, filters.subjects, filters.subfields, filters.chapters, filters.theorems, filters.difficulties]);

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
      <div className="relative bg-gradient-to-r from-gray-900 to-blue-900 text-white py-16 md:py-20 mb-8 overflow-hidden">
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
                <BookOpen className="w-4 h-4 mr-2" />
                <span className="text-sm font-semibold">Apprentissage</span>
              </div>

              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold mb-4 leading-tight">
                <span className="bg-gradient-to-r from-yellow-200 to-blue-200 bg-clip-text text-transparent">Leçons</span>
              </h1>
              <p className="text-gray-300 text-lg md:text-xl max-w-2xl">
                Explorez notre collection complète de <span className="font-bold text-white">{totalCount}</span> ressources pédagogiques
              </p>
            </div>

            <Button
              onClick={handleNewLessonClick}
              variant="ghost"
              className="liquid-glass rounded-xl font-bold text-xl hover:text-white inline-flex items-center justify-center gap-3 bg-gradient-to-r from-yellow-200 to-blue-200 text-blue-900 rounded-xl group relative px-4 py-3"
            >
              <Plus className="w-5 h-5 relative z-10" />
              <span className="relative z-10">Ajouter une leçon</span>
            </Button>
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

            {/* Lesson Content */}
            <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
              {loading ? (
                <div className="flex justify-center items-center h-96">
                  <div className="text-center">
                    <div className="relative">
                      <div className="absolute inset-0 bg-gray-400 rounded-full blur-2xl opacity-10 animate-pulse"></div>
                      <Loader2 className="relative w-12 h-12 animate-spin text-gray-600 mx-auto mb-4" />
                    </div>
                    <p className="text-gray-600 font-medium">Chargement des leçons...</p>
                  </div>
                </div>
              ) : lessons.length > 0 ? (
                <div className="divide-y divide-gray-100">
                  <ContentListItem
                    lessons={lessons as any}
                    onVote={handleVote}
                    onDelete={handleDelete}
                    onEdit={(id) => navigate(`/edit-lesson/${id}`)}
                  />
                </div>
              ) : (
                <div className="text-center py-20 px-6">
                  <div className="relative inline-block mb-6">
                    <div className="absolute inset-0 bg-gray-400 rounded-full blur-2xl opacity-10"></div>
                    <div className="relative w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
                      <BookOpen className="w-10 h-10 text-gray-600" />
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-gray-800 mb-3">Aucune leçon trouvée</h3>
                  <p className="text-gray-600 max-w-md mx-auto mb-6">
                    Essayez d'ajuster vos filtres de recherche ou créez une nouvelle leçon pour enrichir notre collection
                  </p>
                  <button
                    onClick={handleNewLessonClick}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gray-800 hover:bg-gray-900 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
                  >
                    <Plus className="w-5 h-5" />
                    Créer une leçon
                  </button>
                </div>
              )}
            </div>

            {/* Load More Button */}
            {hasMore && !loading && (
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
                      <span>Charger plus de leçons</span>
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