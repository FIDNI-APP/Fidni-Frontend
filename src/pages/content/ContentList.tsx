/**
 * ContentList - List page for structured content (exercises, exams, lessons)
 * Uses the structured API endpoints with HorizontalFilterBar
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import {
  Plus, BookOpen, ChevronRight, ChevronLeft,
  Loader2, LayoutGrid, List as ListIcon,
  Bookmark, Clock, Play, Pause, RotateCcw, ListPlus, Save,
  Eye, MessageSquare, CheckCircle2, Circle, X
} from 'lucide-react';
import { APlusIcon } from '@/components/icons/APlusIcon';
import { LessonIcon } from '@/components/icons/LessonIcon';
import { exerciseContentAPI, examContentAPI, lessonContentAPI } from '@/lib/api';
import { ContentListCard } from '@/components/content/ContentListCard';
import {
  ContentCardBanner, getSubjectTheme, DIFFICULTY_CFG,
} from '@/components/content/ContentCardBanner';
import { HorizontalFilterBar } from '@/components/search/HorizontalFilterBar';
import { ExerciseRenderer } from '@/components/content/viewer/ExerciseRenderer';
import { LessonRenderer } from '@/components/content/viewer/LessonRenderer';
import type { FlexibleLessonStructure } from '@/components/content/editor/FlexibleLessonEditor';
import { VoteButtons } from '@/components/interactions/VoteButtons';
import { AddToRevisionListModal } from '@/components/revision/AddToRevisionListModal';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthModal } from '@/components/auth/AuthController';
import type { Difficulty, SortOption } from '@/types';
import type { ExerciseListItem, ExamListItem, LessonListItem, ContentFilters, AssessmentStatus } from '@/types/content';
import type { FlexibleExerciseStructure } from '@/components/content/editor/FlexibleExerciseEditor';

type StructuredListItem = ExerciseListItem | ExamListItem | LessonListItem;

type ContentType = 'exercise' | 'exam' | 'lesson';

const CONTENT_TYPE_CONFIG: Record<ContentType, {
  title: string;
  subtitle: string;
  createLabel: string;
  emptyMessage: string;
  icon: React.ReactNode;
  accentColor: string;
  basePath: string;
  api: typeof exerciseContentAPI;
}> = {
  exercise: {
    title: 'Exercices',
    subtitle: 'Parcourez et pratiquez des exercices',
    createLabel: 'Ajouter un exercice',
    emptyMessage: 'Aucun exercice trouvé',
    icon: <BookOpen className="w-5 h-5" />,
    accentColor: 'blue',
    basePath: '/exercises',
    api: exerciseContentAPI,
  },
  exam: {
    title: 'Examens',
    subtitle: 'Sujets d\'examens et corrigés',
    createLabel: 'Ajouter un examen',
    emptyMessage: 'Aucun examen trouvé',
    icon: <APlusIcon className="w-5 h-5" />,
    accentColor: 'purple',
    basePath: '/exams',
    api: examContentAPI,
  },
  lesson: {
    title: 'Leçons',
    subtitle: 'Cours et ressources pédagogiques',
    createLabel: 'Ajouter une leçon',
    emptyMessage: 'Aucune leçon trouvée',
    icon: <LessonIcon className="w-5 h-5" />,
    accentColor: 'emerald',
    basePath: '/lessons',
    api: lessonContentAPI,
  },
};

const ITEMS_PER_PAGE = 12;

interface ContentListProps {
  contentType?: ContentType;
}

interface FilterState {
  classLevels: string[];
  subjects: string[];
  subfields: string[];
  chapters: string[];
  theorems: string[];
  difficulties: Difficulty[];
  showViewed: boolean;
  hideViewed: boolean;
  showCompleted: boolean;
  showFailed: boolean;
  isNationalExam?: boolean;
  dateStart?: string | null;
  dateEnd?: string | null;
}

export const ContentList: React.FC<ContentListProps> = ({
  contentType = 'exercise',
}) => {
  const config = CONTENT_TYPE_CONFIG[contentType];
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAuthenticated } = useAuth();
  const { openModal } = useAuthModal();

  // Data
  const [items, setItems] = useState<StructuredListItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const listRef = useRef<HTMLDivElement>(null);
  const previousScrollPosition = useRef(0);

  // Initialize filters from URL
  const getInitialFilters = (): FilterState => {
    const classLevelsParam = searchParams.get('classLevels');
    const subjectsParam = searchParams.get('subjects');
    const subfieldsParam = searchParams.get('subfields');
    const chaptersParam = searchParams.get('chapters');
    const theoremsParam = searchParams.get('theorems');
    const difficultiesParam = searchParams.get('difficulties');
    const showViewedParam = searchParams.get('showViewed');
    const hideViewedParam = searchParams.get('hideViewed');
    const showCompletedParam = searchParams.get('showCompleted');
    const showFailedParam = searchParams.get('showFailed');
    const isNationalExamParam = searchParams.get('isNationalExam');
    const dateStartParam = searchParams.get('dateStart');
    const dateEndParam = searchParams.get('dateEnd');

    return {
      classLevels: classLevelsParam ? classLevelsParam.split(',') : [],
      subjects: subjectsParam ? subjectsParam.split(',') : [],
      subfields: subfieldsParam ? subfieldsParam.split(',') : [],
      chapters: chaptersParam ? chaptersParam.split(',') : [],
      theorems: theoremsParam ? theoremsParam.split(',') : [],
      difficulties: difficultiesParam ? difficultiesParam.split(',') as Difficulty[] : [],
      showViewed: showViewedParam === 'true',
      hideViewed: hideViewedParam === 'true',
      showCompleted: showCompletedParam === 'true',
      showFailed: showFailedParam === 'true',
      isNationalExam: isNationalExamParam === 'true' ? true : isNationalExamParam === 'false' ? false : undefined,
      dateStart: dateStartParam || null,
      dateEnd: dateEndParam || null,
    };
  };

  const [filters, setFilters] = useState<FilterState>(getInitialFilters);
  const [sortBy, setSortBy] = useState<SortOption>(
    (searchParams.get('sort') as SortOption) || 'newest'
  );
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<'card' | 'full'>('full'); // Default: full view
  const [showAllSolutions, setShowAllSolutions] = useState(false);
  const [itemProgress, setItemProgress] = useState<Record<string, Record<string, AssessmentStatus>>>({});
  const [itemValidations, setItemValidations] = useState<Record<string, Record<string, string | null>>>({});
  const [itemVotes, setItemVotes] = useState<Record<string, { vote: 1 | -1 | 0; count: number }>>({});
  const [itemBookmarks, setItemBookmarks] = useState<Record<string, boolean>>({});
  const [itemTimers, setItemTimers] = useState<Record<string, { isRunning: boolean; elapsed: number }>>({});
  const [savingTimer, setSavingTimer] = useState<Record<string, boolean>>({});
  const [sessionCounts, setSessionCounts] = useState<Record<string, number>>({});
  const [itemCompletions, setItemCompletions] = useState<Record<string, 'success' | 'review' | null>>({});
  const [completionDropdown, setCompletionDropdown] = useState<{ itemId: string | null; pos: { top: number; left: number } }>({ itemId: null, pos: { top: 0, left: 0 } });
  const [revisionListModal, setRevisionListModal] = useState<{ isOpen: boolean; itemId: string | null; itemTitle: string | null }>({
    isOpen: false,
    itemId: null,
    itemTitle: null
  });

  // Build query params for API
  const queryParams = useMemo((): ContentFilters => {
    const params: ContentFilters = {};

    // Pass arrays for multi-select filters
    if (filters.classLevels.length > 0) {
      params.classLevels = filters.classLevels;
    }
    if (filters.subjects.length > 0) {
      params.subjects = filters.subjects;
    }
    if (filters.subfields.length > 0) {
      params.subfields = filters.subfields;
    }
    if (filters.chapters.length > 0) {
      params.chapters = filters.chapters;
    }
    if (filters.theorems.length > 0) {
      params.theorems = filters.theorems;
    }
    if (filters.difficulties.length > 0) {
      params.difficulties = filters.difficulties;
    }
    if (sortBy) {
      params.sort = sortBy;
    }

    // Status filters
    if (filters.showViewed) params.showViewed = true;
    if (filters.hideViewed) params.hideViewed = true;
    if (filters.showCompleted) params.showCompleted = true;
    if (filters.showFailed) params.showFailed = true;

    return params;
  }, [filters, sortBy]);

  // Load content
  const loadContent = useCallback(async (isLoadMore = false) => {
    const setLoadingState = isLoadMore ? setLoadingMore : setIsLoading;

    try {
      setLoadingState(true);
      setError(null);

      const response = await config.api.list(queryParams, page);

      const loadedItems = response.results || [];

      if (isLoadMore) {
        setItems(prev => [...prev, ...loadedItems]);
      } else {
        setItems(loadedItems);
      }

      // Initialize vote and bookmark states from loaded items
      const newVoteState: Record<string, { vote: 1 | -1 | 0; count: number }> = {};
      const newBookmarkState: Record<string, boolean> = {};

      loadedItems.forEach(item => {
        newVoteState[item.id] = {
          vote: item.user_vote || 0,
          count: item.vote_count || 0
        };
        // API returns user_save, not is_saved
        newBookmarkState[item.id] = ('user_save' in item ? Boolean(item.user_save) : false);
      });

      setItemVotes(prev => ({ ...prev, ...newVoteState }));
      setItemBookmarks(prev => ({ ...prev, ...newBookmarkState }));

      // Initialize completion states from loaded items
      const newCompletionState: Record<string, 'success' | 'review' | null> = {};
      loadedItems.forEach(item => {
        newCompletionState[item.id] = ('user_complete' in item ? (item as any).user_complete : null);
      });
      setItemCompletions(prev => ({ ...prev, ...newCompletionState }));

      // Load progress for each item if authenticated and not lessons
      if (isAuthenticated && contentType !== 'lesson') {
        const progressPromises = loadedItems.map(async (item) => {
          try {
            const data = await config.api.getProgress(item.id.toString());
            return { id: item.id, progress: data.item_progress };
          } catch {
            return null;
          }
        });
        const results = await Promise.all(progressPromises);
        const newProgress: Record<string, Record<string, AssessmentStatus>> = {};
        const newValidations: Record<string, Record<string, string | null>> = {};
        results.forEach(result => {
          if (!result || !result.progress) return;
          const progressMap: Record<string, AssessmentStatus> = {};
          const validationMap: Record<string, string | null> = {};
          Object.entries(result.progress).forEach(([path, data]) => {
            if (data.status) progressMap[path] = data.status as AssessmentStatus;
            if (data.solution_validation) validationMap[path] = data.solution_validation;
          });
          if (Object.keys(progressMap).length > 0) newProgress[result.id] = progressMap;
          if (Object.keys(validationMap).length > 0) newValidations[result.id] = validationMap;
        });
        setItemProgress(prev => ({ ...prev, ...newProgress }));
        setItemValidations(prev => ({ ...prev, ...newValidations }));
      }

      setTotalCount(response.count || 0);
      setHasMore(!!response.next);
    } catch (err) {
      console.error('Failed to load content:', err);
      setError('Échec du chargement. Veuillez réessayer.');
      if (!isLoadMore) {
        setItems([]);
        setTotalCount(0);
      }
    } finally {
      setLoadingState(false);
    }
  }, [queryParams, page, config, isAuthenticated, contentType]);

  // Reset page and load when filters/sort change
  useEffect(() => {
    setPage(1);
  }, [filters, sortBy]);

  // Load content when page changes
  useEffect(() => {
    if (page === 1) {
      loadContent(false);
    } else {
      loadContent(true);
    }
  }, [page, loadContent]);

  // Update URL params when filters change
  const handleFilterChange = useCallback((newFilters: FilterState) => {
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
    if (newFilters.hideViewed) {
      params.set('hideViewed', 'true');
    }
    if (newFilters.showCompleted) {
      params.set('showCompleted', 'true');
    }
    if (newFilters.showFailed) {
      params.set('showFailed', 'true');
    }
    if (newFilters.isNationalExam !== undefined) {
      params.set('isNationalExam', String(newFilters.isNationalExam));
    }
    if (newFilters.dateStart) {
      params.set('dateStart', newFilters.dateStart);
    }
    if (newFilters.dateEnd) {
      params.set('dateEnd', newFilters.dateEnd);
    }
    if (sortBy !== 'newest') {
      params.set('sort', sortBy);
    }

    setSearchParams(params, { replace: true });
  }, [sortBy, setSearchParams]);

  const handleSortChange = useCallback((newSortOption: SortOption) => {
    if (listRef.current) {
      listRef.current.scrollTop = 0;
    }
    setSortBy(newSortOption);

    // Update URL
    const params = new URLSearchParams(searchParams);
    if (newSortOption !== 'newest') {
      params.set('sort', newSortOption);
    } else {
      params.delete('sort');
    }
    setSearchParams(params, { replace: true });
  }, [searchParams, setSearchParams]);

  const handleLoadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      if (listRef.current) {
        previousScrollPosition.current = listRef.current.scrollTop;
      }
      setPage(prev => prev + 1);
    }
  }, [loadingMore, hasMore]);

  const handleNewContentClick = useCallback(() => {
    if (!isAuthenticated) {
      openModal();
      return;
    }
    navigate(`${config.basePath}/new`);
  }, [isAuthenticated, navigate, openModal, config.basePath]);

  // Handle assessment for items in full view
  const handleAssess = useCallback(async (itemId: string, path: string, status: AssessmentStatus) => {
    if (!isAuthenticated) {
      openModal();
      return;
    }

    const previousStatus = itemProgress[itemId]?.[path];
    const isToggleOff = previousStatus === status;

    setItemProgress(prev => {
      if (isToggleOff) {
        const { [path]: _, ...rest } = prev[itemId] || {};
        return { ...prev, [itemId]: rest };
      }
      return { ...prev, [itemId]: { ...(prev[itemId] || {}), [path]: status } };
    });

    try {
      if (isToggleOff) {
        await config.api.removeAssessment(itemId, { item_path: path });
      } else {
        await config.api.assess(itemId, { item_path: path, assessment: status });
      }
    } catch (err) {
      console.error('Assessment failed:', err);
      setItemProgress(prev => {
        if (previousStatus) {
          return { ...prev, [itemId]: { ...(prev[itemId] || {}), [path]: previousStatus } };
        }
        const { [path]: _, ...rest } = prev[itemId] || {};
        return { ...prev, [itemId]: rest };
      });
    }
  }, [isAuthenticated, openModal, config.api, itemProgress]);

  // Handle solution validation
  const handleValidateSolution = useCallback(async (itemId: string, path: string, validation: string | null) => {
    if (!isAuthenticated) {
      openModal();
      return;
    }

    setItemValidations(prev => ({
      ...prev,
      [itemId]: { ...(prev[itemId] || {}), [path]: validation }
    }));

    try {
      await config.api.validateSolution(itemId, { item_path: path, validation });
    } catch (err) {
      console.error('Validation failed:', err);
    }
  }, [isAuthenticated, openModal, config.api]);

  // Handle vote
  const handleVote = useCallback(async (itemId: string, voteValue: 1 | -1) => {
    if (!isAuthenticated) {
      openModal();
      return;
    }

    const currentVote = itemVotes[itemId]?.vote || 0;
    const currentCount = itemVotes[itemId]?.count || 0;

    // Optimistic update
    const newVote = currentVote === voteValue ? 0 : voteValue;
    const countChange = newVote - currentVote;

    setItemVotes(prev => ({
      ...prev,
      [itemId]: {
        vote: newVote,
        count: currentCount + countChange
      }
    }));

    try {
      const response = await config.api.vote(itemId, voteValue);
      // Update with actual values from server
      if (response && response.item) {
        setItemVotes(prev => ({
          ...prev,
          [itemId]: {
            vote: response.item.user_vote || 0,
            count: response.item.vote_count || 0
          }
        }));
      }
    } catch (err) {
      console.error('Vote failed:', err);
      // Rollback on error
      setItemVotes(prev => ({
        ...prev,
        [itemId]: { vote: currentVote, count: currentCount }
      }));
    }
  }, [isAuthenticated, openModal, config.api, itemVotes]);

  // Handle bookmark
  const handleBookmark = useCallback(async (itemId: string) => {
    if (!isAuthenticated) {
      openModal();
      return;
    }

    const isCurrentlyBookmarked = itemBookmarks[itemId] || false;
    setItemBookmarks(prev => ({ ...prev, [itemId]: !isCurrentlyBookmarked }));

    try {
      if (isCurrentlyBookmarked) {
        await config.api.unsave(itemId);
      } else {
        await config.api.save(itemId);
      }
    } catch (err) {
      console.error('Bookmark failed:', err);
      setItemBookmarks(prev => ({ ...prev, [itemId]: isCurrentlyBookmarked }));
    }
  }, [isAuthenticated, openModal, config.api, itemBookmarks]);

  // Handle completion set
  const handleSetCompletion = useCallback(async (itemId: string, status: 'success' | 'review' | null) => {
    if (!isAuthenticated) {
      openModal();
      return;
    }
    const prev = itemCompletions[itemId];
    setItemCompletions(p => ({ ...p, [itemId]: status }));
    try {
      if (status === null) {
        await config.api.removeComplete(itemId);
      } else {
        await config.api.complete(itemId, status);
      }
    } catch (err) {
      console.error('Completion set failed:', err);
      setItemCompletions(p => ({ ...p, [itemId]: prev }));
    }
  }, [isAuthenticated, openModal, config.api, itemCompletions]);

  // Handle timer
  const handleToggleTimer = useCallback((itemId: string) => {
    setItemTimers(prev => {
      const current = prev[itemId] || { isRunning: false, elapsed: 0 };
      return {
        ...prev,
        [itemId]: { ...current, isRunning: !current.isRunning }
      };
    });
  }, []);

  const handleResetTimer = useCallback((itemId: string) => {
    setItemTimers(prev => ({
      ...prev,
      [itemId]: { isRunning: false, elapsed: 0 }
    }));
  }, []);

  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const loadSessionCount = useCallback(async (itemId: string) => {
    if (!isAuthenticated || contentType === 'lesson') return;

    try {
      const response = await config.api.getSessionStats?.(itemId);
      if (response && response.stats) {
        setSessionCounts(prev => ({ ...prev, [itemId]: response.stats.total_sessions || 0 }));
      }
    } catch (err) {
      console.error('Failed to load session count:', err);
    }
  }, [isAuthenticated, contentType, config.api]);

  // Load session counts when items load
  useEffect(() => {
    if (isAuthenticated && contentType !== 'lesson' && items.length > 0) {
      items.forEach(item => {
        loadSessionCount(item.id);
      });
    }
  }, [items, isAuthenticated, contentType, loadSessionCount]);

  const handleSaveTimerSession = useCallback(async (itemId: string) => {
    if (!isAuthenticated) {
      openModal();
      return;
    }

    const elapsed = itemTimers[itemId]?.elapsed || 0;
    if (elapsed === 0) return;

    try {
      setSavingTimer(prev => ({ ...prev, [itemId]: true }));
      await config.api.saveTimerSession(itemId, elapsed);
      // Reset timer after successful save
      handleResetTimer(itemId);
      // Reload session count
      await loadSessionCount(itemId);
    } catch (err) {
      console.error('Failed to save timer session:', err);
    } finally {
      setSavingTimer(prev => ({ ...prev, [itemId]: false }));
    }
  }, [isAuthenticated, openModal, config.api, itemTimers, handleResetTimer, loadSessionCount]);

  // Timer effect
  useEffect(() => {
    const interval = setInterval(() => {
      setItemTimers(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(itemId => {
          if (updated[itemId].isRunning) {
            updated[itemId] = {
              ...updated[itemId],
              elapsed: updated[itemId].elapsed + 1
            };
          }
        });
        return updated;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Restore scroll position after loading more
  useEffect(() => {
    if (!loadingMore && page > 1 && listRef.current) {
      listRef.current.scrollTop = previousScrollPosition.current;
    }
  }, [loadingMore, page]);

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  // Dynamic colors based on content type
  const getContentColors = () => {
    switch (contentType) {
      case 'exam':
        return {
          gradient: 'from-violet-600 via-violet-700 to-purple-700',
          titleGradient: 'from-violet-200 to-purple-200',
          buttonGradient: 'from-violet-200 via-purple-200 to-pink-200',
          buttonText: 'text-violet-900',
        };
      case 'lesson':
        return {
          gradient: 'from-emerald-600 via-emerald-700 to-teal-700',
          titleGradient: 'from-emerald-200 to-teal-200',
          buttonGradient: 'from-emerald-200 via-teal-200 to-cyan-200',
          buttonText: 'text-emerald-900',
        };
      case 'exercise':
      default:
        return {
          gradient: 'from-blue-600 via-blue-700 to-indigo-700',
          titleGradient: 'from-blue-200 to-indigo-200',
          buttonGradient: 'from-blue-200 via-indigo-200 to-purple-200',
          buttonText: 'text-blue-900',
        };
    }
  };

  const colors = getContentColors();

  return (
    <div style={{ minHeight: '100vh', background: '#f0effe', paddingBottom: 64 }}>
      {/* Header Section — lavender pill style */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 pt-6 pb-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <span
              className="inline-flex items-center gap-1.5"
              style={{
                background: '#eef2ff', color: '#4338ca',
                padding: '4px 12px', borderRadius: 99,
                fontSize: 11, fontWeight: 700, letterSpacing: '.04em',
              }}
            >
              {config.icon}
              <span>{contentType === 'exercise' ? 'PRATIQUE' : contentType === 'exam' ? 'EXAMENS' : 'COURS'}</span>
            </span>
            <h1 style={{ fontSize: 30, fontWeight: 800, color: '#1e1b4b', letterSpacing: '-0.03em', marginTop: 10, lineHeight: 1.1 }}>
              {config.title}
              <span style={{ color: '#9391b8', fontSize: 16, fontWeight: 500, marginLeft: 10, fontFamily: 'DM Mono' }}>
                · {totalCount}
              </span>
            </h1>
            <p style={{ fontSize: 13, color: '#7068a8', marginTop: 4 }}>{config.subtitle}</p>
          </div>

          <button
            onClick={handleNewContentClick}
            className="fd-btn-primary"
            style={{ padding: '10px 18px' }}
          >
            <Plus className="w-4 h-4" />
            {config.createLabel}
          </button>
        </div>
      </div>

      {/* Main layout */}
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        {/* Horizontal Filter Bar */}
        <HorizontalFilterBar
          contentType={contentType}
          filters={filters}
          onFilterChange={handleFilterChange}
          sortBy={sortBy}
          onSortChange={handleSortChange}
          accentColor={contentType === 'exam' ? 'violet' : contentType === 'lesson' ? 'emerald' : 'blue'}
        />

        {/* View Toggle */}
        <div className="flex items-center justify-end gap-2 mb-5 mt-4">
          <div
            className="inline-flex"
            style={{
              background: '#fff', border: '1px solid #ede9fe',
              borderRadius: 10, padding: 3,
            }}
          >
            <button
              onClick={() => setViewMode('full')}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '6px 14px', borderRadius: 8, border: 'none',
                background: viewMode === 'full' ? '#4f46e5' : 'transparent',
                color: viewMode === 'full' ? '#fff' : '#7068a8',
                fontSize: 12, fontWeight: viewMode === 'full' ? 600 : 500,
                fontFamily: 'DM Sans', cursor: 'pointer', transition: 'all .15s',
              }}
            >
              <ListIcon className="w-3.5 h-3.5" />
              Vue complète
            </button>
            <button
              onClick={() => setViewMode('card')}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '6px 14px', borderRadius: 8, border: 'none',
                background: viewMode === 'card' ? '#4f46e5' : 'transparent',
                color: viewMode === 'card' ? '#fff' : '#7068a8',
                fontSize: 12, fontWeight: viewMode === 'card' ? 600 : 500,
                fontFamily: 'DM Sans', cursor: 'pointer', transition: 'all .15s',
              }}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Vue cartes
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div ref={listRef}>
          {/* Error message */}
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

          {/* Content Grid/List */}
          {isLoading ? (
            <div className="flex justify-center items-center" style={{ height: 320 }}>
              <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" style={{ color: '#4f46e5' }} />
                <p style={{ fontSize: 13, color: '#7068a8', fontWeight: 500 }}>Chargement…</p>
              </div>
            </div>
          ) : items.length > 0 ? (
            viewMode === 'card' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {items.map((item) => (
                  <ContentListCard
                    key={item.id}
                    content={item}
                    contentType={contentType}
                    onEdit={(id) => navigate(`${config.basePath}/${id}/edit`)}
                    onDelete={async (id) => {
                      if (window.confirm('Êtes-vous sûr de vouloir supprimer ce contenu ?')) {
                        try {
                          await config.api.delete(id);
                          loadContent(false);
                        } catch (err) {
                          console.error('Delete failed:', err);
                        }
                      }
                    }}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-8 max-w-4xl mx-auto">
                {items.map((item, index) => {
                  const hasStructure = item.structure && typeof item.structure === 'object' && ('blocks' in item.structure || 'sections' in item.structure);

                  // Subject theme + difficulty config for the banner
                  const subjectName = item.subject
                    ? (typeof item.subject === 'string' ? item.subject : item.subject.name)
                    : '';
                  const itemTheme = getSubjectTheme(subjectName);
                  const itemTypeLabel = contentType === 'exam' ? 'Examen' : contentType === 'lesson' ? 'Leçon' : 'Exercice';
                  const itemDifficulty = ('difficulty' in item && item.difficulty
                    && item.difficulty in DIFFICULTY_CFG)
                    ? DIFFICULTY_CFG[item.difficulty as 'easy' | 'medium' | 'hard']
                    : null;
                  const itemIsNational = 'is_national_exam' in item && (item as any).is_national_exam;
                  const itemNationalYear = 'national_year' in item ? (item as any).national_year : undefined;
                  const itemIsSolved = itemCompletions[item.id] === 'success';

                  // Convert progress for ExerciseRenderer — merge assessments + validations
                  const progressEntries = itemProgress[item.id] || {};
                  const validationEntries = itemValidations[item.id] || {};
                  const allPaths = new Set([...Object.keys(progressEntries), ...Object.keys(validationEntries)]);
                  const progressData = allPaths.size > 0
                    ? Object.fromEntries(
                        [...allPaths].map(path => [
                          path,
                          {
                            status: progressEntries[path] || null,
                            solution_validation: validationEntries[path] || null,
                            assessed_at: new Date().toISOString()
                          }
                        ])
                      )
                    : undefined;

                  return (
                    <div
                      key={item.id}
                      className="fd-card"
                      style={{ overflow: 'hidden' }}
                    >
                      {/* Gradient banner — same as card view, taller for full layout */}
                      <ContentCardBanner
                        title={item.title}
                        subjectName={subjectName}
                        typeLabel={itemTypeLabel}
                        theme={itemTheme}
                        difficulty={itemDifficulty}
                        isSolved={itemIsSolved}
                        isNationalExam={!!itemIsNational}
                        nationalYear={itemNationalYear}
                        isSaved={!!itemBookmarks[item.id]}
                        onSave={(e) => { e.stopPropagation(); handleBookmark(item.id); }}
                        height={120}
                      />

                      {/* Controls strip below banner: type label + tags on left,
                          interactive widgets (timer, completion, revision) on right */}
                      <div className="px-6 pt-4 pb-3 flex flex-wrap items-center gap-3 justify-between">
                        <div className="flex items-center gap-2 flex-wrap min-w-0">
                          <span style={{
                            fontSize: 10, fontWeight: 700,
                            color: '#9391b8', letterSpacing: '.08em', textTransform: 'uppercase',
                            fontFamily: 'DM Mono',
                          }}>
                            {itemTypeLabel} #{item.id}
                          </span>
                          {item.chapters && item.chapters.length > 0 && (
                            <span style={{
                              background: '#f5f4ff', color: '#7068a8',
                              fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 99,
                              display: 'inline-flex', alignItems: 'center', gap: 4,
                            }}>
                              <BookOpen className="w-3 h-3" />
                              {typeof item.chapters[0] === 'string' ? item.chapters[0] : item.chapters[0].name}
                            </span>
                          )}
                          {item.theorems && item.theorems.length > 0 && (
                            <span style={{
                              background: '#f5f3ff', color: '#5b21b6',
                              fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 99,
                            }}>
                              {typeof item.theorems[0] === 'string' ? item.theorems[0] : item.theorems[0].name}
                            </span>
                          )}
                          {item.class_levels && item.class_levels.length > 0 && (
                            <span style={{ fontSize: 11, color: '#9391b8' }}>
                              {typeof item.class_levels[0] === 'string' ? item.class_levels[0] : item.class_levels[0].name}
                            </span>
                          )}
                        </div>

                        {/* Interactive widgets */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                            {/* Timer Widget - only for exercises/exams */}
                            {contentType !== 'lesson' && (
                              <div className={`
                                flex items-center gap-1.5 px-2 py-1.5 rounded-lg border transition-all
                                ${itemTimers[item.id]?.isRunning
                                  ? 'bg-emerald-50 border-emerald-200'
                                  : itemTimers[item.id]?.elapsed > 0
                                    ? 'bg-amber-50 border-amber-200'
                                    : 'bg-slate-50 border-slate-200'
                                }
                              `}>
                                <Clock className={`w-3.5 h-3.5 ${
                                  itemTimers[item.id]?.isRunning ? 'text-emerald-600' :
                                  itemTimers[item.id]?.elapsed > 0 ? 'text-amber-600' : 'text-slate-400'
                                }`} />
                                <span className={`font-mono text-xs font-semibold min-w-[2.5rem] ${
                                  itemTimers[item.id]?.isRunning ? 'text-emerald-700' :
                                  itemTimers[item.id]?.elapsed > 0 ? 'text-amber-700' : 'text-slate-500'
                                }`}>
                                  {formatTime(itemTimers[item.id]?.elapsed || 0)}
                                </span>

                                <button
                                  onClick={() => handleToggleTimer(item.id)}
                                  className={`p-1 rounded transition-colors ${
                                    itemTimers[item.id]?.isRunning
                                      ? 'bg-emerald-200 text-emerald-700 hover:bg-emerald-300'
                                      : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                                  }`}
                                  title={itemTimers[item.id]?.isRunning ? 'Pause' : 'Démarrer'}
                                >
                                  {itemTimers[item.id]?.isRunning ? (
                                    <Pause className="w-3 h-3" />
                                  ) : (
                                    <Play className="w-3 h-3" />
                                  )}
                                </button>

                                <button
                                  onClick={() => handleResetTimer(item.id)}
                                  disabled={(itemTimers[item.id]?.elapsed || 0) === 0 || itemTimers[item.id]?.isRunning}
                                  className="p-1 rounded bg-slate-200 text-slate-600 hover:bg-slate-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                  title="Réinitialiser"
                                >
                                  <RotateCcw className="w-3 h-3" />
                                </button>

                                {/* Save button - appears when timer > 0 */}
                                {(itemTimers[item.id]?.elapsed || 0) > 0 && (
                                  <button
                                    onClick={() => handleSaveTimerSession(item.id)}
                                    disabled={savingTimer[item.id] || itemTimers[item.id]?.isRunning}
                                    className="p-1 rounded bg-blue-100 text-blue-600 hover:bg-blue-200 transition-colors disabled:opacity-40"
                                    title="Enregistrer le temps"
                                  >
                                    {savingTimer[item.id] ? (
                                      <div className="w-3 h-3 border border-blue-300 border-t-blue-600 rounded-full animate-spin" />
                                    ) : (
                                      <Save className="w-3 h-3" />
                                    )}
                                  </button>
                                )}

                                {/* Session count badge */}
                                {sessionCounts[item.id] > 0 && (
                                  <Link
                                    to={`${config.basePath}/${item.id}`}
                                    className="px-2 py-0.5 text-xs font-medium bg-slate-200 text-slate-600 rounded-md hover:bg-slate-300 transition-colors"
                                    title={`${sessionCounts[item.id]} session${sessionCounts[item.id] > 1 ? 's' : ''} enregistrée${sessionCounts[item.id] > 1 ? 's' : ''}`}
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {sessionCounts[item.id]}
                                  </Link>
                                )}
                              </div>
                            )}

                            {/* Completion dropdown */}
                            <div className="relative">
                              <button
                                onClick={(e) => {
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  setCompletionDropdown(prev =>
                                    prev.itemId === item.id
                                      ? { itemId: null, pos: { top: 0, left: 0 } }
                                      : { itemId: item.id, pos: { top: rect.bottom + 4, left: rect.left } }
                                  );
                                }}
                                className={`p-1.5 rounded-lg transition-colors ${
                                  itemCompletions[item.id] === 'success'
                                    ? 'bg-emerald-100 text-emerald-600'
                                    : itemCompletions[item.id] === 'review'
                                      ? 'bg-red-100 text-red-600'
                                      : 'bg-slate-50 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                                }`}
                                title={itemCompletions[item.id] === 'success' ? 'Validé' : itemCompletions[item.id] === 'review' ? 'Échoué' : 'Terminer'}
                              >
                                {itemCompletions[item.id] === 'success' ? (
                                  <CheckCircle2 className="w-4 h-4" />
                                ) : itemCompletions[item.id] === 'review' ? (
                                  <X className="w-4 h-4" />
                                ) : (
                                  <Circle className="w-4 h-4" />
                                )}
                              </button>

                              {completionDropdown.itemId === item.id && (
                                <>
                                  <div
                                    className="fixed z-50 bg-white rounded-lg shadow-lg border border-slate-200 py-1 min-w-[130px]"
                                    style={{ top: completionDropdown.pos.top, left: completionDropdown.pos.left }}
                                  >
                                    <button
                                      onClick={() => {
                                        handleSetCompletion(item.id, itemCompletions[item.id] === 'success' ? null : 'success');
                                        setCompletionDropdown({ itemId: null, pos: { top: 0, left: 0 } });
                                      }}
                                      className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm transition-colors ${
                                        itemCompletions[item.id] === 'success'
                                          ? 'bg-emerald-100 text-emerald-700'
                                          : 'text-emerald-600 hover:bg-slate-50'
                                      }`}
                                    >
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                      <span>Validé</span>
                                    </button>
                                    <button
                                      onClick={() => {
                                        handleSetCompletion(item.id, itemCompletions[item.id] === 'review' ? null : 'review');
                                        setCompletionDropdown({ itemId: null, pos: { top: 0, left: 0 } });
                                      }}
                                      className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm transition-colors ${
                                        itemCompletions[item.id] === 'review'
                                          ? 'bg-red-100 text-red-700'
                                          : 'text-red-600 hover:bg-slate-50'
                                      }`}
                                    >
                                      <X className="w-3.5 h-3.5" />
                                      <span>Échoué</span>
                                    </button>
                                  </div>
                                  {/* Click-outside backdrop — AFTER dropdown per CLAUDE.md */}
                                  <div className="fixed inset-0 z-40" onClick={() => setCompletionDropdown({ itemId: null, pos: { top: 0, left: 0 } })} />
                                </>
                              )}
                            </div>

                            {/* Add to revision list - only for exercises/exams */}
                            {contentType !== 'lesson' && (
                              <button
                                onClick={() => {
                                  if (!isAuthenticated) {
                                    openModal();
                                    return;
                                  }
                                  setRevisionListModal({
                                    isOpen: true,
                                    itemId: item.id,
                                    itemTitle: item.title
                                  });
                                }}
                                className="p-1.5 rounded-lg transition-colors"
                                style={{
                                  background: '#f5f4ff', color: '#7068a8', border: '1px solid #ede9fe',
                                }}
                                title="Ajouter à une liste de révision"
                              >
                                <ListPlus className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                      </div>

                      {/* Divider */}
                      <div className="mx-6" style={{ borderTop: '1px solid #f0effe' }} />

                      {/* Content */}
                      <div className="px-6 py-4">
                        {hasStructure ? (
                          contentType === 'lesson' ? (
                            <LessonRenderer
                              structure={item.structure as FlexibleLessonStructure}
                            />
                          ) : (
                            <ExerciseRenderer
                              structure={item.structure as unknown as FlexibleExerciseStructure}
                              progress={progressData}
                              onAssess={(path, status) => handleAssess(item.id, path, status)}
                              onValidateSolution={(path, validation) => handleValidateSolution(item.id, path, validation)}
                              interactive={isAuthenticated}
                              showAllSolutions={showAllSolutions}
                            />
                          )
                        ) : (
                          <p style={{ fontSize: 13, color: '#9391b8', fontStyle: 'italic' }}>Ancien format — clique pour voir le détail.</p>
                        )}
                      </div>

                      {/* Footer */}
                      <div
                        className="px-6 py-3"
                        style={{ borderTop: '1px solid #f0effe', background: '#faf9ff' }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <VoteButtons
                              initialVotes={itemVotes[item.id]?.count || 0}
                              onVote={(value) => handleVote(item.id, value)}
                              vertical={false}
                              userVote={itemVotes[item.id]?.vote || 0}
                              size="sm"
                            />
                            <div className="flex items-center gap-1.5" style={{ color: '#7068a8' }}>
                              <Eye className="w-4 h-4" />
                              <span style={{ fontSize: 13, fontWeight: 600, fontFamily: 'DM Mono' }}>{item.view_count}</span>
                            </div>
                            {'comment_count' in item && (item as any).comment_count > 0 && (
                              <div className="flex items-center gap-1.5" style={{ color: '#7068a8' }}>
                                <MessageSquare className="w-4 h-4" />
                                <span style={{ fontSize: 13, fontWeight: 600, fontFamily: 'DM Mono' }}>{(item as any).comment_count}</span>
                              </div>
                            )}
                          </div>

                          <Link
                            to={`${config.basePath}/${item.id}`}
                            className="fd-btn-primary"
                            style={{ padding: '6px 14px', fontSize: 12, borderRadius: 9, textDecoration: 'none' }}
                          >
                            {contentType === 'lesson' ? 'Lire' : 'Commencer'} →
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            <div className="fd-card text-center" style={{ padding: 48 }}>
              <div
                className="inline-flex items-center justify-center mx-auto mb-4"
                style={{
                  width: 64, height: 64, borderRadius: 16,
                  background: 'linear-gradient(135deg,#eef2ff,#f0effe)',
                  color: '#7068a8',
                }}
              >
                {React.cloneElement(config.icon as React.ReactElement, { className: 'w-7 h-7' })}
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1e1b4b' }}>{config.emptyMessage}</h3>
              <p style={{ fontSize: 13, color: '#7068a8', marginTop: 6, maxWidth: 380, marginLeft: 'auto', marginRight: 'auto' }}>
                Essaie d'ajuster les filtres ou crée un nouveau contenu.
              </p>
              <button
                onClick={handleNewContentClick}
                className="fd-btn-primary"
                style={{ marginTop: 18 }}
              >
                <Plus className="w-4 h-4" />
                {config.createLabel}
              </button>
            </div>
          )}

          {/* Load More Button */}
          {hasMore && !isLoading && items.length > 0 && (
            <div className="mt-8 text-center">
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="fd-btn-ghost"
                style={{ padding: '10px 22px', fontSize: 13 }}
              >
                {loadingMore ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Chargement…</>
                ) : (
                  <>Charger plus <ChevronRight className="w-3 h-3" /></>
                )}
              </button>
            </div>
          )}

          {/* Pagination info */}
          {totalPages > 1 && !hasMore && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <span style={{ fontSize: 12, color: '#9391b8', fontFamily: 'DM Mono' }}>
                {items.length} / {totalCount} résultats
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Revision List Modal */}
      {contentType !== 'lesson' && revisionListModal.isOpen && revisionListModal.itemId && (
        <AddToRevisionListModal
          isOpen={revisionListModal.isOpen}
          onClose={() => setRevisionListModal({ isOpen: false, itemId: null, itemTitle: null })}
          contentType={contentType}
          contentId={Number(revisionListModal.itemId)}
          contentTitle={revisionListModal.itemTitle || undefined}
        />
      )}
    </div>
  );
};

export default ContentList;
