// src/pages/ExerciseList.tsx
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Loader2, Plus, BookOpen, ArrowUpDown } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { getContents, voteExercise, deleteContent } from '../../lib/api';
import { Content, SortOption, Difficulty, VoteValue } from '../../types';
import { HorizontalFilterBar } from '../../components/HorizontalFilterBar';
import { SortDropdown } from '../../components/SortDropdown';
import { ContentCard } from '@/components/exercise/ContentCard';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useAuthModal } from '@/components/AuthController';
import { useFilters } from '../../components/navbar/FilterContext';

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

export const ExerciseList = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const { openModal } = useAuthModal();
  const { selectedClassLevel, selectedSubject, fullFilters } = useFilters();

  // Initialize filters from URL or context
  const getInitialFilters = () => {
    const searchParams = new URLSearchParams(location.search);
    const classLevelsParam = searchParams.get('classLevels');
    const subjectsParam = searchParams.get('subjects');
    const subfieldsParam = searchParams.get('subfields');
    const chaptersParam = searchParams.get('chapters');
    const theoremsParam = searchParams.get('theorems');
    const difficultiesParam = searchParams.get('difficulties');
    const showViewedParam = searchParams.get('showViewed');
    const showCompletedParam = searchParams.get('showCompleted');

    const hasUrlParams = classLevelsParam || subjectsParam || subfieldsParam || chaptersParam || theoremsParam || difficultiesParam || showViewedParam || showCompletedParam;

    if (hasUrlParams) {
      return {
        classLevels: classLevelsParam ? classLevelsParam.split(',') : [],
        subjects: subjectsParam ? subjectsParam.split(',') : [],
        subfields: subfieldsParam ? subfieldsParam.split(',') : [],
        chapters: chaptersParam ? chaptersParam.split(',') : [],
        theorems: theoremsParam ? theoremsParam.split(',') : [],
        difficulties: difficultiesParam ? difficultiesParam.split(',') as Difficulty[] : [],
        showViewed: showViewedParam === 'true',
        showCompleted: showCompletedParam === 'true',
      };
    }

    if (fullFilters) {
      return fullFilters;
    }

    if (selectedClassLevel || selectedSubject) {
      return {
        classLevels: selectedClassLevel ? [selectedClassLevel] : [],
        subjects: selectedSubject ? [selectedSubject] : [],
        subfields: [] as string[],
        chapters: [] as string[],
        theorems: [] as string[],
        difficulties: [] as Difficulty[],
        showViewed: false,
        showCompleted: false,
      };
    }

    return {
      classLevels: [] as string[],
      subjects: [] as string[],
      subfields: [] as string[],
      chapters: [] as string[],
      theorems: [] as string[],
      difficulties: [] as Difficulty[],
      showViewed: false,
      showCompleted: false,
    };
  };

  const [contents, setContents] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [filters, setFilters] = useState(getInitialFilters());
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [unfilteredTotalCount, setUnfilteredTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

  const listRef = useRef<HTMLDivElement>(null);
  const previousScrollPosition = useRef(0);

  const { getCachedData, setCachedData, invalidateCache } = useFetchCache();

  const debouncedFilters = useDebounce(filters, 500);
  const debouncedSortBy = useDebounce(sortBy, 500);

  useEffect(() => {
    if (!initialLoadComplete) {
      return;
    }

    const searchParams = new URLSearchParams(location.search);
    const classLevelsParam = searchParams.get('classLevels');
    const subjectsParam = searchParams.get('subjects');
    const subfieldsParam = searchParams.get('subfields');
    const chaptersParam = searchParams.get('chapters');
    const theoremsParam = searchParams.get('theorems');
    const difficultiesParam = searchParams.get('difficulties');
    const showViewedParam = searchParams.get('showViewed');
    const showCompletedParam = searchParams.get('showCompleted');

    const urlFilters = {
      classLevels: classLevelsParam ? classLevelsParam.split(',') : [],
      subjects: subjectsParam ? subjectsParam.split(',') : [],
      subfields: subfieldsParam ? subfieldsParam.split(',') : [],
      chapters: chaptersParam ? chaptersParam.split(',') : [],
      theorems: theoremsParam ? theoremsParam.split(',') : [],
      difficulties: difficultiesParam ? difficultiesParam.split(',') as Difficulty[] : [],
      showViewed: showViewedParam === 'true',
      showCompleted: showCompletedParam === 'true',
    };

    setFilters(prevFilters => {
      const isDifferent =
        JSON.stringify(prevFilters.classLevels) !== JSON.stringify(urlFilters.classLevels) ||
        JSON.stringify(prevFilters.subjects) !== JSON.stringify(urlFilters.subjects) ||
        JSON.stringify(prevFilters.subfields) !== JSON.stringify(urlFilters.subfields) ||
        JSON.stringify(prevFilters.chapters) !== JSON.stringify(urlFilters.chapters) ||
        JSON.stringify(prevFilters.theorems) !== JSON.stringify(urlFilters.theorems) ||
        JSON.stringify(prevFilters.difficulties) !== JSON.stringify(urlFilters.difficulties) ||
        prevFilters.showViewed !== urlFilters.showViewed ||
        prevFilters.showCompleted !== urlFilters.showCompleted;

      return isDifferent ? urlFilters : prevFilters;
    });
  }, [location.search, initialLoadComplete]);

  useEffect(() => {
    setInitialLoadComplete(true);
  }, []);

  const queryParams = useMemo(() => {
    return {
      classLevels: debouncedFilters.classLevels,
      subjects: debouncedFilters.subjects,
      chapters: debouncedFilters.chapters,
      difficulties: debouncedFilters.difficulties as Difficulty[],
      subfields: debouncedFilters.subfields,
      theorems: debouncedFilters.theorems,
      showViewed: debouncedFilters.showViewed,
      showCompleted: debouncedFilters.showCompleted,
      sort: debouncedSortBy,
      page,
      per_page: ITEMS_PER_PAGE
    };
  }, [debouncedFilters, debouncedSortBy, page]);

  const getCacheKey = useCallback((params: any) => {
    return JSON.stringify(params);
  }, []);

  const fetchContents = useCallback(async (isLoadMore = false) => {
    const setLoadingState = isLoadMore ? setLoadingMore : setLoading;

    try {
      setLoadingState(true);
      setError(null);

      const cacheKey = getCacheKey(queryParams);

      const cachedResult = getCachedData(cacheKey);
      if (cachedResult) {
        if (isLoadMore) {
          setContents(prev => [...prev, ...cachedResult.results]);
        } else {
          setContents(cachedResult.results);
        }
        setTotalCount(cachedResult.count);
        setHasMore(!!cachedResult.next);
        setLoadingState(false);
        return;
      }

      const data = await getContents(queryParams);

      setCachedData(cacheKey, data);

      setContents(prev => isLoadMore ? [...prev, ...data.results] : data.results);
      setTotalCount(data.count);
      setHasMore(!!data.next);

      const hasActiveFilters = Object.entries(debouncedFilters).some(([key, value]) => {
        if (key === 'showViewed' || key === 'showCompleted') {
          return value === true;
        }
        return Array.isArray(value) && value.length > 0;
      });
      if (!hasActiveFilters && unfilteredTotalCount === 0) {
        setUnfilteredTotalCount(data.count);
      }
    } catch (err) {
      console.error('Error fetching contents:', err);
      setError('Failed to load exercises. Please try again.');
    } finally {
      setLoadingState(false);
    }
  }, [queryParams, getCacheKey, getCachedData, setCachedData, debouncedFilters, unfilteredTotalCount]);

  useEffect(() => {
    const shouldReset = page > 1;
    if (shouldReset) {
      setPage(1);
    } else {
      fetchContents(false);
    }
  }, [debouncedFilters, debouncedSortBy]);

  useEffect(() => {
    if (page > 1) {
      fetchContents(true);
    }
  }, [page, fetchContents]);

  const handleVote = useCallback(async (id: string, type: VoteValue) => {
    if (!isAuthenticated) {
      openModal();
      return;
    }

    try {
      setContents(prevContents =>
        prevContents.map(content => {
          if (content.id.toString() === id) {
            let newVoteCount = content.vote_count;
            if (content.user_vote === type) {
              newVoteCount -= type;
            } else if (content.user_vote === 0) {
              newVoteCount += type;
            } else {
              newVoteCount = newVoteCount - content.user_vote + type;
            }

            return {
              ...content,
              user_vote: content.user_vote === type ? 0 : type,
              vote_count: newVoteCount
            };
          }
          return content;
        })
      );

      const updatedExercise = await voteExercise(id, type);

      setContents(prevContents =>
        prevContents.map(content =>
          content.id.toString() === id ? updatedExercise : content
        )
      );
    } catch (err) {
      console.error('Failed to vote:', err);
      fetchContents(false);
    }
  }, [isAuthenticated, openModal, fetchContents]);

  const handleDelete = useCallback(async (id: string) => {
    if (window.confirm('Are you sure you want to delete this content?')) {
      try {
        setContents(prev => prev.filter(content => content.id.toString() !== id));
        setTotalCount(prev => prev - 1);

        await deleteContent(id);

        invalidateCache();
      } catch (err) {
        console.error('Failed to delete content:', err);
        fetchContents(false);
      }
    }
  }, [invalidateCache, fetchContents]);

  const handleLoadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      if (listRef.current) {
        previousScrollPosition.current = listRef.current.scrollTop;
      }
      setPage(prev => prev + 1);
    }
  }, [loadingMore, hasMore]);

  const handleFilterChange = useCallback((newFilters: typeof filters) => {
    if (listRef.current) {
      listRef.current.scrollTop = 0;
    }

    setFilters(newFilters);

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

    if (newFilters.showViewed) {
      params.set('showViewed', 'true');
    }

    if (newFilters.showCompleted) {
      params.set('showCompleted', 'true');
    }

    const newUrl = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`;
    window.history.replaceState(null, '', newUrl);
  }, []);

  useEffect(() => {
    if (!loadingMore && page > 1 && listRef.current) {
      listRef.current.scrollTop = previousScrollPosition.current;
    }
  }, [loadingMore, page]);

  const handleNewExerciseClick = useCallback(() => {
    if (isAuthenticated) {
      navigate('/new');
    } else {
      openModal();
      navigate('/new');
    }
  }, [isAuthenticated, navigate, openModal]);

  const handleSortChange = useCallback((newSortOption: SortOption) => {
    if (listRef.current) {
      listRef.current.scrollTop = 0;
    }

    setSortBy(newSortOption);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      {/* Header Section */}
      <div className="relative bg-gradient-to-r from-gray-900 to-purple-800 text-white py-16 md:py-20 mb-8 overflow-hidden">
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
              <div className="inline-flex items-center px-4 py-1.5 bg-white/10 backdrop-blur-md rounded-full mb-4 border border-white/20">
                <BookOpen className="w-4 h-4 mr-2" />
                <span className="text-sm font-semibold">Pratique</span>
              </div>

              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold mb-4 leading-tight">
                <span className="bg-gradient-to-r from-yellow-200 to-purple-200 bg-clip-text text-transparent">Exercices</span>
              </h1>
              <p className="text-gray-300 text-lg md:text-xl max-w-2xl">
                Découvrez et pratiquez avec notre collection de <span className="font-bold text-white">{totalCount}</span> exercices de qualité
              </p>
            </div>

            <Button
              onClick={handleNewExerciseClick}
              variant="ghost"
              className="liquid-glass rounded-xl font-bold text-xl hover:text-white inline-flex items-center justify-center gap-3 bg-gradient-to-r from-yellow-200 via-pink-200 to-purple-200 text-purple-900 group relative px-4 py-3"
            >
              <Plus className="w-5 h-5 relative z-10" />
              <span className="relative z-10">Ajouter un exercice</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Main layout */}
      <div className="container mx-auto px-4">
        {/* Horizontal Filter Bar */}
        <HorizontalFilterBar
          contentType="exercise"
          filters={filters}
          onFilterChange={handleFilterChange}
        />

        {/* Content Area */}
        <div ref={listRef}>
          {/* Error message if any */}
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-5 mb-6 rounded-xl shadow-sm">
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

          {/* Exercise Grid */}
          {loading ? (
            <div className="flex justify-center items-center h-96">
              <div className="text-center">
                <div className="relative">
                  <div className="absolute inset-0 bg-gray-400 rounded-full blur-2xl opacity-10 animate-pulse"></div>
                  <Loader2 className="relative w-12 h-12 animate-spin text-gray-600 mx-auto mb-4" />
                </div>
                <p className="text-gray-600 font-medium">Chargement des exercices...</p>
              </div>
            </div>
          ) : contents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {contents.map((content) => (
                <ContentCard
                  key={content.id}
                  content={content}
                  onVote={handleVote}
                  onDelete={handleDelete}
                  onEdit={(id) => navigate(`/edit/${id}`)}
                  contentType="exercise"
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-20 px-6 bg-white rounded-2xl shadow-sm">
              <div className="relative inline-block mb-6">
                <div className="absolute inset-0 bg-gray-400 rounded-full blur-2xl opacity-10"></div>
                <div className="relative w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
                  <BookOpen className="w-10 h-10 text-gray-600" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-3">Aucun exercice trouvé</h3>
              <p className="text-gray-600 max-w-md mx-auto mb-6">
                Essayez d'ajuster vos filtres de recherche ou créez un nouvel exercice pour enrichir notre collection
              </p>
              <Button
                className="liquid-glass group bg-gradient-to-r from-yellow-200 via-pink-200 to-purple-200 hover:from-yellow-300 hover:via-pink-300 hover:to-purple-300 text-purple-900 rounded-xl font-bold text-xl hover:text-white inline-flex items-center justify-center gap-3"
                variant="ghost"
                onClick={handleNewExerciseClick}>
                <Plus className="w-5 h-5" />
                Créer un exercice
              </Button>
            </div>
          )}

          {/* Load More Button */}
          {hasMore && !loading && (
            <div className="mt-8 text-center">
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="group relative px-8 py-4 bg-white hover:bg-gray-50 text-gray-700 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 font-semibold disabled:opacity-50 disabled:cursor-not-allowed border border-gray-200"
              >
                {loadingMore ? (
                  <div className="flex items-center gap-3">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Chargement...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <span>Charger plus d'exercices</span>
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
  );
};