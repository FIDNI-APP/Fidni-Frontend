import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Loader2, Plus, Filter, SortAsc, BookOpen, ArrowUpDown } from 'lucide-react';
import { Button } from '../components/ui/button';
import { getLessons, voteLesson, deleteContent } from '../lib/api';
import { Content, Lesson, SortOption, VoteValue } from '../types';
import { Filters } from '../components/Filters';
import { SortDropdown } from '../components/SortDropdown';
import { ContentList } from '../components/ContentList';
import { ContentListItem } from '../components/ContentListItem';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useAuthModal } from '@/components/AuthController';

// Custom hook for debouncing values
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Set debouncedValue to value after the specified delay
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Cancel the timeout if value changes or unmounts
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
  const { isAuthenticated } = useAuth();
  const { openModal } = useAuthModal();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [filters, setFilters] = useState({
    classLevels: [] as string[],
    subjects: [] as string[],
    subfields: [] as string[],
    chapters: [] as string[],
    theorems: [] as string[],
    difficulties: [] as string[], // Keep this for filter compatibility, even though lessons don't have difficulty
  });
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isFilterOpen, setIsFilterOpen] = useState(true);
  
  // Add refs for tracking scroll position
  const listRef = useRef<HTMLDivElement>(null);
  const previousScrollPosition = useRef(0);
  
  // Implement caching for API results
  const { getCachedData, setCachedData, invalidateCache } = useFetchCache();
  
  // Debounce filter changes to reduce API calls
  const debouncedFilters = useDebounce(filters, 500);
  const debouncedSortBy = useDebounce(sortBy, 500);
  
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

  // Load data when debounced filters/sort change or page changes
  useEffect(() => {
    const shouldReset = page > 1;
    if (shouldReset) {
      setPage(1); // This will trigger another effect call with page=1
    } else {
      fetchLessons(false);
    }
  }, [debouncedFilters, debouncedSortBy, fetchLessons]);
  
  // Handle pagination separately
  useEffect(() => {
    if (page > 1) {
      fetchLessons(true);
    }
  }, [page, fetchLessons]);

  // Optimized vote handler with local state updates
  const handleVote = useCallback(async (id: string, type: VoteValue) => {
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
  }, [fetchLessons]);

  // Optimized delete handler
  const handleDelete = useCallback(async (id: string) => {
    if (window.confirm('Are you sure you want to delete this lesson?')) {
      try {
        // Optimistically update UI
        setLessons(prev => prev.filter(lesson => lesson.id !== id));
        setTotalCount(prev => prev - 1);
        
        // Make API call in background
        await deleteContent(id);
        
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

  // Optimized filter change handler
  const handleFilterChange = useCallback((newFilters: typeof filters) => {
    // Reset scroll position when filters change
    if (listRef.current) {
      listRef.current.scrollTop = 0;
    }
    
    setFilters(newFilters);
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
      openModal('/new-lesson');
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
          className="w-full bg-white rounded-lg shadow-md p-3 flex items-center justify-center space-x-2 text-indigo-800 font-medium"
        >
          <Filter className="w-5 h-5" />
          <span>{isFilterOpen ? 'Hide filters' : 'Show filters'}</span>
        </button>
      </div>

      {/* Sort and Count Section */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-center">
          <div className="flex items-center gap-3 mb-4 sm:mb-0">
            <span className="text-gray-600 flex items-center font-medium">
              <ArrowUpDown className="w-5 h-5 mr-2 text-indigo-600" />
              Sort by:
            </span>
            <SortDropdown 
              value={sortBy} 
              onChange={handleSortChange} 
            />
          </div>
          <div className="bg-indigo-50 text-indigo-700 px-4 py-1.5 rounded-full font-medium">
            {totalCount} lessons found
          </div>
        </div>
      </div>
    </>
  ), [isFilterOpen, sortBy, totalCount, handleSortChange]);

  // Memoize filter component to prevent unnecessary re-renders
  const FilterComponent = useMemo(() => (
    <div 
      className={`${isFilterOpen ? 'block' : 'hidden'} md:block md:w-64 lg:w-72 flex-shrink-0 custom-scrollbar bg-white rounded-xl shadow-sm`}
      style={{ 
        position: "sticky",
        top: "100px",
        height: "fit-content",
        maxHeight: "calc(100vh - 140px)",
        overflowY: "auto",
        padding: "4px"
      }}
    >
      <Filters onFilterChange={handleFilterChange} />
    </div>
  ), [isFilterOpen, handleFilterChange]);

  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-16">
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
      <div className="bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 text-white py-8 mb-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-6 md:mb-0">
              <h1 className="text-3xl md:text-4xl font-bold mb-3 flex items-center">
                <BookOpen className="w-8 h-8 mr-3" /> 
                Lessons
              </h1>
              <p className="text-indigo-200 text-lg">
                Explore our comprehensive collection of {totalCount} learning resources
              </p>
            </div>
            <button 
              onClick={handleNewLessonClick}
              className="bg-white text-indigo-700 hover:bg-indigo-50 px-6 py-3 rounded-full shadow-md hover:shadow-lg transition-all duration-200 font-medium flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Create Lesson
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

            {/* Lesson Content */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              {loading ? (
                <div className="flex justify-center items-center h-64">
                  <div className="text-center">
                    <Loader2 className="w-10 h-10 animate-spin text-indigo-600 mx-auto mb-4" />
                    <p className="text-gray-500">Loading lessons...</p>
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
                <div className="text-center py-16">
                  <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <BookOpen className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-700 mb-2">No lessons found</h3>
                  <p className="text-gray-500 max-w-md mx-auto">
                    Try adjusting your search filters or create a new lesson
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
                    'Load more lessons'
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