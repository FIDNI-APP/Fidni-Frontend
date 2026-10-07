/**
 * ContentList - List page for structured content (exercises, exams, lessons)
 * Uses the structured API endpoints with HorizontalFilterBar
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Link, useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import type { HubInfo } from '@/lib/api/hubApi';
import { FloatingPanel } from '@/components/ui/FloatingPanel';
import {
  Plus,
  BookOpen,
  ChevronRight,
  Loader2,
  LayoutGrid,
  FileText,
  Clock,
  Play,
  Pause,
  RotateCcw,
  ListPlus,
  Save,
  Eye,
  MessageSquare,
  CheckCircle2,
  Circle,
  X,
} from 'lucide-react';
import { APlusIcon } from '@/components/icons/APlusIcon';
import { LessonIcon } from '@/components/icons/LessonIcon';
import { exerciseContentAPI, examContentAPI, lessonContentAPI } from '@/lib/api';
import type { PaginatedResponse } from '@/lib/api/contentItemApi';
import { ContentListCard } from '@/components/content/ContentListCard';
import {
  ContentCardBanner, getSubjectTheme, DIFFICULTY_CFG,
} from '@/components/content/ContentCardBanner';
import { CatchUpBanner } from '@/components/content/listing/CatchUpBanner';
import { HorizontalFilterBar } from '@/components/search/HorizontalFilterBar';
import { ExerciseRenderer } from '@/components/content/viewer/ExerciseRenderer';
import { LessonRenderer } from '@/components/content/viewer/LessonRenderer';
import type { FlexibleLessonStructure } from '@/components/content/editor/FlexibleLessonEditor';
import { VoteButtons } from '@/components/interactions/VoteButtons';
import { AddToRevisionListModal } from '@/components/revision/AddToRevisionListModal';
import { labelsFromContent } from '@/components/revision/RevisionLabelPicker';
import { SignupStrip } from '@/components/auth/SignupPrompt';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthModal } from '@/components/auth/AuthController';
import type { Difficulty, SortOption } from '@/types';
import type { ExerciseListItem, ExamListItem, LessonListItem, ContentFilters, AssessmentStatus } from '@/types/content';
import type { FlexibleExerciseStructure } from '@/components/content/editor/FlexibleExerciseEditor';
import { AdSlot } from '@/components/ads/AdSlot';
import { SEO } from '@/components/layout/SEO';
import { ClampedPreview } from '@/components/content/ClampedPreview';
import { trackAction, trackFilterChange } from '@/lib/usage';

type StructuredListItem = ExerciseListItem | ExamListItem | LessonListItem;

type ContentType = 'exercise' | 'exam' | 'lesson';

/** Ce que la page attend des trois API (les leçons n'ont ni solution ni sessions chronométrées). */
type ListPageAPI = Pick<typeof exerciseContentAPI,
  'assess' | 'complete' | 'delete' | 'getProgress' | 'removeAssessment' | 'removeComplete'
  | 'save' | 'saveTimerSession' | 'unsave' | 'validateSolution' | 'vote'> & {
  list: (filters?: ContentFilters, page?: number) => Promise<PaginatedResponse<StructuredListItem>>;
  getSolution?: typeof exerciseContentAPI.getSolution;
  getSessionStats?: typeof exerciseContentAPI.getSessionStats;
};

const CONTENT_TYPE_CONFIG: Record<ContentType, {
  title: string;
  subtitle: string;
  createLabel: string;
  emptyMessage: string;
  icon: React.ReactNode;
  accentColor: string;
  basePath: string;
  api: ListPageAPI;
}> = {
  exercise: {
    title: 'Exercices',
    subtitle: 'Entraîne-toi chapitre par chapitre, du plus simple au plus exigeant.',
    createLabel: 'Ajouter un exercice',
    emptyMessage: 'Aucun exercice trouvé',
    icon: <BookOpen className="w-5 h-5" />,
    accentColor: 'blue',
    basePath: '/exercises',
    api: exerciseContentAPI,
  },
  exam: {
    title: 'Examens',
    subtitle: 'Devoirs surveillés et devoirs maison, pour te mettre en conditions.',
    createLabel: 'Ajouter un examen',
    emptyMessage: 'Aucun examen trouvé',
    icon: <APlusIcon className="w-5 h-5" />,
    accentColor: 'purple',
    basePath: '/exams',
    api: examContentAPI,
  },
  lesson: {
    title: 'Leçons',
    subtitle: 'Les cours du programme, avec définitions, propriétés et méthodes.',
    createLabel: 'Ajouter une leçon',
    emptyMessage: 'Aucune leçon trouvée',
    icon: <LessonIcon className="w-5 h-5" />,
    accentColor: 'emerald',
    basePath: '/lessons',
    api: lessonContentAPI,
  },
};

const ITEMS_PER_PAGE = 12;

// Tri par défaut : « Pour toi » — d'abord ce qui suit son travail (chapitre en cours, à retravailler,
// nouveautés de ses chapitres), varié entre chapitres ; ce qu'il a réussi passe en dernier. Visiteur :
// nouveautés et plus aimés.
const DEFAULT_SORT: SortOption = 'recommended';

const LIST_SEO: Record<ContentType, { title: string; description: string }> = {
  exercise: {
    title: 'Exercices de maths corrigés – Tronc commun, 1ère et 2ème Bac (Maroc) | Fidni',
    description: 'Exercices de maths corrigés pour le lycée au Maroc : Tronc commun, 1ère Bac SM, 2ème Bac SM et PC (BIOF). Classés par chapitre, avec solutions détaillées. Gratuit.',
  },
  lesson: {
    title: 'Cours de maths – Tronc commun, 1ère et 2ème Bac (Maroc) | Fidni',
    description: 'Cours de maths du lycée au Maroc : définitions, théorèmes, propriétés et méthodes, du Tronc commun au 2ème Bac SM. Leçons claires, à imprimer ou à ranger dans ton cahier. Gratuit.',
  },
  exam: {
    title: 'Devoirs surveillés et examens de maths corrigés – Bac Maroc | Fidni',
    description: 'Devoirs surveillés et sujets d’examen de maths corrigés pour le Bac au Maroc : Tronc commun, 1ère Bac SM, 2ème Bac SM et PC. Barème, durée, corrigé détaillé et épreuve chronométrée.',
  },
};

interface ContentListProps {
  contentType?: ContentType;
  /** Page par niveau / chapitre : filtres imposés, titre et introduction propres (ContentHub). */
  hub?: HubInfo;
  /** Examens : true = section « Examens nationaux », sinon la section « Examens » ne montre que les devoirs. */
  national?: boolean;
}

// Section « Examens nationaux » : textes propres (la liste et ses filtres restent les mêmes).
const NATIONAL = {
  title: 'Examens nationaux',
  subtitle: 'Les sujets du Bac national, corrigés, pour t’entraîner en conditions réelles.',
  seoTitle: 'Examens nationaux de maths corrigés – Bac Maroc | Fidni',
  seoDescription: 'Sujets d’examen national de mathématiques du Bac marocain (2ème Bac SM et PC), avec corrigé détaillé et épreuve chronométrée.',
};

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
  hub,
  national = false,
}) => {
  const isNationalSection = contentType === 'exam' && national;
  const config = CONTENT_TYPE_CONFIG[contentType];
  const navigate = useNavigate();
  const location = useLocation();
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

    // Page par niveau / chapitre : le niveau et le chapitre viennent de l'adresse, pas des paramètres.
    const hubLevels = hub ? [String(hub.level.id)] : [];
    const hubChapters = hub?.chapter ? [String(hub.chapter.id)] : [];
    return {
      classLevels: classLevelsParam ? classLevelsParam.split(',') : hubLevels,
      subjects: subjectsParam ? subjectsParam.split(',') : [],
      subfields: subfieldsParam ? subfieldsParam.split(',') : [],
      chapters: chaptersParam ? chaptersParam.split(',') : hubChapters,
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
  const filtersRef = useRef(filters);
  filtersRef.current = filters;
  const [sortBy, setSortBy] = useState<SortOption>(
    (searchParams.get('sort') as SortOption) || DEFAULT_SORT
  );
  const [page, setPage] = useState(1);

  // Re-sync filters + sort from the URL whenever it changes externally
  // (e.g. class-level links in the sidebar), not only on first mount.
  // Seulement si l'URL dit autre chose que l'état actuel : sinon un nouvel objet identique
  // relançait un second chargement pour rien.
  useEffect(() => {
    const next = getInitialFilters();
    setFilters(prev => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
    setSortBy((searchParams.get('sort') as SortOption) || DEFAULT_SORT);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Deux affichages : Cartes (par défaut : un aperçu lisible de chaque contenu) et Énoncés (le texte
  // complet, interactif). Le choix de l'élève est retenu d'une visite à l'autre.
  type ViewMode = 'card' | 'full';
  const [viewMode, setViewModeState] = useState<ViewMode>(() => {
    try { return localStorage.getItem('fidni:affichage-liste') === 'full' ? 'full' : 'card'; } catch { return 'card'; }
  });
  const setViewMode = (mode: ViewMode) => {
    setViewModeState(mode);
    try { localStorage.setItem('fidni:affichage-liste', mode); } catch { /* stockage indisponible */ }
  };
  const [showAllSolutions] = useState(false);
  const [itemProgress, setItemProgress] = useState<Record<string, Record<string, AssessmentStatus>>>({});
  const [itemValidations, setItemValidations] = useState<Record<string, Record<string, string | null>>>({});
  const [itemVotes, setItemVotes] = useState<Record<string, { vote: number; count: number; likes: number; dislikes: number }>>({});
  const [itemBookmarks, setItemBookmarks] = useState<Record<string, boolean>>({});
  const [itemTimers, setItemTimers] = useState<Record<string, { isRunning: boolean; elapsed: number }>>({});
  const [savingTimer, setSavingTimer] = useState<Record<string, boolean>>({});
  const [sessionCounts, setSessionCounts] = useState<Record<string, number>>({});
  const [itemCompletions, setItemCompletions] = useState<Record<string, 'success' | 'review' | null>>({});
  // Évalué depuis le bandeau de rattrapage : la carte de la liste le montre tout de suite.
  const handleCatchUp = useCallback((id: number, result: 'success' | 'review') => {
    setItems((prev) => prev.map((it) => (String(it.id) === String(id) ? { ...it, user_complete: result } : it)));
    setItemCompletions((p) => ({ ...p, [String(id)]: result }));
  }, []);
  const [completionDropdown, setCompletionDropdown] = useState<{ itemId: string | number | null; pos: { top: number; left: number } }>({ itemId: null, pos: { top: 0, left: 0 } });
  // Bouton du menu ouvert : le menu s'y accroche (et suit la page quand elle défile).
  const completionAnchor = useRef<HTMLElement | null>(null);
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

    // Examens : chaque section ne montre que les siens ; la période porte sur l'année du Bac.
    if (contentType === 'exam') {
      params.is_national = isNationalSection;
      if (isNationalSection) {
        if (filters.dateStart) params.national_year_min = Number(filters.dateStart);
        if (filters.dateEnd) params.national_year_max = Number(filters.dateEnd);
      }
    }

    return params;
  }, [filters, sortBy, contentType, isNationalSection]);

  // Filtres + tri de la dernière liste demandée : une réponse pour d'AUTRES filtres (ex. la liste
  // complète, encore en cours quand on clique sur « 1ère Bac SM ») est ignorée au lieu d'écraser
  // la liste filtrée. Charger la page suivante (mêmes filtres) reste valable.
  const currentQuery = useRef('');

  // Load content
  const loadContent = useCallback(async (isLoadMore = false) => {
    const setLoadingState = isLoadMore ? setLoadingMore : setIsLoading;
    const query = JSON.stringify(queryParams);
    currentQuery.current = query;
    const stale = () => currentQuery.current !== query;

    try {
      setLoadingState(true);
      setError(null);

      const response = await config.api.list(queryParams, page);
      if (stale()) return;

      const loadedItems = response.results || [];

      if (isLoadMore) {
        setItems(prev => [...prev, ...loadedItems]);
      } else {
        setItems(loadedItems);
      }
      // Le total suit la liste affichée tout de suite (et non après la progression, plus lente).
      setTotalCount(response.count || 0);
      setHasMore(!!response.next);

      // Initialize vote and bookmark states from loaded items
      const newVoteState: Record<string, { vote: number; count: number; likes: number; dislikes: number }> = {};
      const newBookmarkState: Record<string, boolean> = {};

      loadedItems.forEach(item => {
        newVoteState[item.id] = {
          vote: item.user_vote || 0,
          count: item.vote_count || 0,
          likes: item.like_count ?? 0,
          dislikes: item.dislike_count ?? 0,
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
        if (stale()) return;
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
    } catch (err) {
      if (stale()) return;
      console.error('Failed to load content:', err);
      setError('Échec du chargement. Veuillez réessayer.');
      if (!isLoadMore) {
        setItems([]);
        setTotalCount(0);
      }
    } finally {
      // Chargement devenu obsolète : le nouveau gère l'indicateur principal ; celui de « page
      // suivante » n'appartient qu'à nous, on le libère.
      if (!stale() || isLoadMore) setLoadingState(false);
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

    trackFilterChange(filtersRef.current as unknown as Record<string, unknown>, newFilters as unknown as Record<string, unknown>);
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
    if (sortBy !== DEFAULT_SORT) {
      params.set('sort', sortBy);
    }

    if (hub) {
      // Sur une page de niveau / chapitre : rester sur une page de ce type tant que le choix s'y
      // ramène (un niveau, zéro ou un chapitre), sinon revenir à la liste générale filtrée.
      const lv = newFilters.classLevels;
      const chs = newFilters.chapters;
      let target: string | null = null;
      if (lv.length === 1 && lv[0] === String(hub.level.id)) {
        if (chs.length === 0) target = hub.level.url;
        else if (chs.length === 1) target = hub.chapters.find((c) => String(c.id) === chs[0])?.url ?? null;
      }
      if (target) {
        params.delete('classLevels');
        params.delete('chapters');
        const search = params.toString();
        if (target === location.pathname) setSearchParams(params, { replace: true });
        else navigate(`${target}${search ? `?${search}` : ''}`);
      } else {
        navigate(`${config.basePath}?${params.toString()}`);
      }
      return;
    }
    setSearchParams(params, { replace: true });
  }, [sortBy, setSearchParams, hub, location.pathname, navigate, config.basePath]);

  const handleSortChange = useCallback((newSortOption: SortOption) => {
    if (listRef.current) {
      listRef.current.scrollTop = 0;
    }
    trackAction('tri');
    setSortBy(newSortOption);

    // Update URL
    const params = new URLSearchParams(searchParams);
    if (newSortOption !== DEFAULT_SORT) {
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


  // Handle vote
  const handleVote = useCallback(async (itemId: string, voteValue: 1 | -1) => {
    if (!isAuthenticated) {
      openModal();
      return;
    }

    // Les nombres s'actualisent tout de suite dans le bouton ; ici on retient l'état d'avant (en cas d'échec).
    const before = itemVotes[itemId] ?? { vote: 0, count: 0, likes: 0, dislikes: 0 };

    try {
      const response = await config.api.vote(itemId, voteValue);
      // Valeurs réelles du serveur (avant, on lisait un champ inexistant : elles n'étaient jamais appliquées)
      if (response) {
        setItemVotes(prev => ({
          ...prev,
          [itemId]: {
            vote: response.user_vote || 0,
            count: response.vote_count || 0,
            likes: response.like_count ?? 0,
            dislikes: response.dislike_count ?? 0,
          }
        }));
      }
    } catch (err) {
      console.error('Vote failed:', err);
      // Rollback on error
      setItemVotes(prev => ({ ...prev, [itemId]: { ...before } }));
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
        loadSessionCount(String(item.id));
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

  // La matière n'est affichée que si la liste en mélange plusieurs (aujourd'hui, seulement les maths).
  const showSubject = useMemo(
    () => new Set(items.map((it) => (typeof it.subject === 'string' ? it.subject : it.subject?.name)).filter(Boolean)).size > 1,
    [items],
  );

  const viewToggle = (
            <div data-tour="liste-vue" role="radiogroup" aria-label="Affichage" className="inline-flex p-[3px] rounded-[10px] bg-[#f2f1ee]">
              {([
                ['card', 'Cartes', LayoutGrid],
                ['full', 'Énoncés', FileText],
              ] as const).map(([mode, label, Icon]) => (
                <button
                  key={mode}
                  type="button"
                  role="radio"
                  aria-checked={viewMode === mode}
                  onClick={() => setViewMode(mode)}
                  title={label}
                  className={`inline-flex items-center gap-1.5 h-9 px-2.5 lg:px-3 rounded-lg text-[12.5px] transition-colors ${
                    viewMode === mode ? 'bg-white text-ink font-semibold shadow-sm' : 'text-ink-faint font-medium hover:text-ink'}`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="sm:hidden lg:inline">{label}</span>
                </button>
              ))}
            </div>
  );

  const handleDeleteItem = async (id: string) => {
    if (!window.confirm('Supprimer définitivement ce contenu ?')) return;
    try {
      await config.api.delete(id);
      loadContent(false);
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  // Dynamic colors based on content type
  return (
    <div style={{ minHeight: '100vh', background: '#faf9f7', paddingBottom: 64 }}>
      {/* Mêmes titres que les pages pré-remplies par le serveur (backend/src/config/seo.py). */}
      {hub ? (
        <SEO title={hub.title} description={hub.description} canonicalUrl={hub.url} noindex={!hub.indexable} />
      ) : isNationalSection ? (
        <SEO title={NATIONAL.seoTitle} description={NATIONAL.seoDescription} canonicalUrl="/exams/nationaux" />
      ) : (
        <SEO title={LIST_SEO[contentType].title} description={LIST_SEO[contentType].description} canonicalUrl={config.basePath} />
      )}
      {/* En-tête compact : titre, nombre, une phrase ; le contenu commence tout de suite après. */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 pt-6 pb-4">
        <div className="flex items-end justify-between gap-4">
          <div className="min-w-0">
            {hub && (
              <nav aria-label="Fil d’Ariane" className="mb-1.5 flex flex-wrap items-center gap-1.5 text-[12.5px] text-ink-faint">
                <Link to={config.basePath} className="hover:text-ink">{config.title}</Link>
                <span aria-hidden>›</span>
                {hub.chapter ? <Link to={hub.level.url} className="hover:text-ink">{hub.level.name}</Link> : <span className="text-ink-soft">{hub.level.name}</span>}
                {hub.chapter && <><span aria-hidden>›</span><span className="text-ink-soft">{hub.chapter.name}</span></>}
              </nav>
            )}
            <h1 className="fd-display text-ink flex items-baseline gap-2.5 flex-wrap" style={{ fontSize: 'clamp(26px,3vw,32px)', fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
              {hub ? hub.h1 : isNationalSection ? NATIONAL.title : config.title}
              <span className="fd-nums text-[15px] font-medium text-ink-faint" style={{ letterSpacing: 0 }}>
                {totalCount > 0 ? totalCount : ''}
              </span>
            </h1>
            <p className="text-[13.5px] text-ink-faint mt-1.5 max-w-3xl">{hub ? hub.intro : isNationalSection ? NATIONAL.subtitle : config.subtitle}</p>
          </div>

          {/* Publier est réservé aux comptes : pour un visiteur, la page commence par le contenu. */}
          {isAuthenticated && (
            <button
              onClick={handleNewContentClick}
              data-tour="liste-creer"
              className="fd-btn-ghost flex-shrink-0"
              style={{ padding: '9px 14px' }}
              aria-label={config.createLabel}
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">{config.createLabel}</span>
            </button>
          )}
        </div>
      </div>

      {/* Page de niveau / chapitre : les chapitres du niveau et les autres rubriques, en liens. */}
      {hub && (hub.chapters.length > 0 || hub.related.length > 0) && (
        <div className="max-w-7xl mx-auto px-4 md:px-6 pb-4">
          {hub.chapters.length > 0 && (
            <div className="flex flex-wrap gap-1.5" aria-label="Chapitres">
              <Link to={hub.level.url}
                className={`rounded-full border px-3 py-1 text-[12.5px] transition-colors ${!hub.chapter ? 'border-ink bg-ink text-white' : 'border-line bg-white text-ink-soft hover:border-ink'}`}>
                Tous les chapitres
              </Link>
              {hub.chapters.map((ch) => {
                const active = hub.chapter?.id === ch.id;
                return (
                  <Link key={ch.id} to={ch.url} aria-current={active ? 'page' : undefined}
                    className={`rounded-full border px-3 py-1 text-[12.5px] transition-colors ${active ? 'border-ink bg-ink text-white' : 'border-line bg-white text-ink-soft hover:border-ink'}`}>
                    {ch.name} <span className={`fd-nums ${active ? 'text-white/70' : 'text-ink-faint'}`}>{ch.count}</span>
                  </Link>
                );
              })}
            </div>
          )}
          {hub.related.length > 0 && (
            <p className="mt-2.5 text-[12.5px] text-ink-faint">
              Aussi pour {hub.chapter ? `« ${hub.chapter.name} »` : `le ${hub.level.name}`} :{' '}
              {hub.related.map((r, i) => (
                <React.Fragment key={r.url}>
                  {i > 0 && ' · '}
                  <Link to={r.url} className="font-medium text-brand-hover hover:underline">{r.label}</Link>{' '}
                  <span className="fd-nums">({r.count})</span>
                </React.Fragment>
              ))}
            </p>
          )}
        </div>
      )}

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
          nationalSection={isNationalSection}
          trailing={<div className="hidden sm:block">{viewToggle}</div>}
        />
        {/* Téléphone : le choix d'affichage passe sous la barre, pour ne pas déborder. */}
        <div className="sm:hidden mt-3 flex justify-end">{viewToggle}</div>

        {/* Content Area */}
        <div ref={listRef} className="mt-4">
          {/* « Pour toi » : rattraper d'un clic ce qu'il a ouvert sans dire s'il l'a réussi. */}
          {isAuthenticated && sortBy === 'recommended' && contentType !== 'lesson' && (
            <CatchUpBanner kind={contentType} onEvaluated={handleCatchUp} />
          )}
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
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" style={{ color: '#1a1a1a' }} />
                <p style={{ fontSize: 13, color: '#6b6862', fontWeight: 500 }}>Chargement…</p>
              </div>
            </div>
          ) : items.length > 0 ? (
            viewMode === 'card' ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 min-[1700px]:grid-cols-3 gap-5">
                {items.map((item, i) => (
                  <React.Fragment key={item.id}>
                    <ContentListCard
                      content={item}
                      contentType={contentType}
                      first={i === 0}
                      showSubject={showSubject}
                      onEdit={(id) => navigate(`${config.basePath}/${id}/edit`)}
                      onDelete={handleDeleteItem}
                    />
                    {/* Visiteur : une invitation après les premières cartes, pas plus. */}
                    {!isAuthenticated && i === Math.min(3, items.length - 1) && (
                      <SignupStrip className="lg:col-span-2 min-[1700px]:col-span-3" />
                    )}
                  </React.Fragment>
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-8 max-w-4xl mx-auto">
                {items.map((item) => {
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
                        onSave={(e) => { e.stopPropagation(); handleBookmark(String(item.id)); }}
                        height={120}
                      />

                      {/* Controls strip below banner: type label + tags on left,
                          interactive widgets (timer, completion, revision) on right */}
                      <div className="px-6 pt-4 pb-3 flex flex-wrap items-center gap-3 justify-between">
                        <div className="flex items-center gap-2 flex-wrap min-w-0">
                          <span style={{
                            fontSize: 10, fontWeight: 700,
                            color: '#6b6862', letterSpacing: '.08em', textTransform: 'uppercase',
                            fontFamily: 'DM Mono',
                          }}>
                            {itemTypeLabel} #{item.id}
                          </span>
                          {item.chapters && item.chapters.length > 0 && (
                            <span style={{
                              background: '#f7f6f3', color: '#6b6862',
                              fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 99,
                              display: 'inline-flex', alignItems: 'center', gap: 4,
                            }}>
                              <BookOpen className="w-3 h-3" />
                              {typeof item.chapters[0] === 'string' ? item.chapters[0] : item.chapters[0].name}
                            </span>
                          )}
                          {item.theorems && item.theorems.length > 0 && (
                            <span style={{
                              background: '#f7f6f3', color: '#1a1a1a',
                              fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 99,
                            }}>
                              {typeof item.theorems[0] === 'string' ? item.theorems[0] : item.theorems[0].name}
                            </span>
                          )}
                          {item.class_levels && item.class_levels.length > 0 && (
                            <span style={{ fontSize: 11, color: '#6b6862' }}>
                              {typeof item.class_levels[0] === 'string' ? item.class_levels[0] : item.class_levels[0].name}
                            </span>
                          )}
                        </div>

                        {/* Interactive widgets */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                            {/* Timer Widget - only for exercises/exams */}
                            {contentType !== 'lesson' && (
                              <div data-tour="liste-chrono" className={`
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
                                  onClick={() => handleToggleTimer(String(item.id))}
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
                                  onClick={() => handleResetTimer(String(item.id))}
                                  disabled={(itemTimers[item.id]?.elapsed || 0) === 0 || itemTimers[item.id]?.isRunning}
                                  className="p-1 rounded bg-slate-200 text-slate-600 hover:bg-slate-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                  title="Réinitialiser"
                                >
                                  <RotateCcw className="w-3 h-3" />
                                </button>

                                {/* Save button - appears when timer > 0 */}
                                {(itemTimers[item.id]?.elapsed || 0) > 0 && (
                                  <button
                                    onClick={() => handleSaveTimerSession(String(item.id))}
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
                                  completionAnchor.current = e.currentTarget;
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
                                data-tour="liste-terminer"
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
                                <FloatingPanel anchorRef={completionAnchor} open
                                  onClose={() => setCompletionDropdown({ itemId: null, pos: { top: 0, left: 0 } })}
                                  className="bg-white rounded-lg shadow-lg border border-slate-200 py-1 min-w-[130px]">
                                    <button
                                      onClick={() => {
                                        handleSetCompletion(String(item.id), itemCompletions[item.id] === 'success' ? null : 'success');
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
                                        handleSetCompletion(String(item.id), itemCompletions[item.id] === 'review' ? null : 'review');
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
                                </FloatingPanel>
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
                                    itemId: String(item.id),
                                    itemTitle: item.title
                                  });
                                }}
                                className="p-1.5 rounded-lg transition-colors"
                                style={{
                                  background: '#f7f6f3', color: '#6b6862', border: '1px solid #e7e3dc',
                                }}
                                title="Ajouter à une liste de révision"
                                data-tour="liste-revision"
                              >
                                <ListPlus className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                      </div>

                      {/* Divider */}
                      <div className="mx-6" style={{ borderTop: '1px solid #faf9f7' }} />

                      {/* Content */}
                      <div className="px-6 py-4">
                        <ClampedPreview>
                        {hasStructure ? (
                          contentType === 'lesson' ? (
                            <LessonRenderer
                              structure={item.structure as FlexibleLessonStructure}
                            />
                          ) : (
                            <ExerciseRenderer
                              structure={item.structure as unknown as FlexibleExerciseStructure}
                              progress={progressData}
                              onAssess={(path, status) => handleAssess(String(item.id), path, status)}
                              interactive={isAuthenticated}
                              showAllSolutions={showAllSolutions}
                              compact={false}
                            />
                          )
                        ) : (
                          <p style={{ fontSize: 13, color: '#6b6862', fontStyle: 'italic' }}>Ancien format — clique pour voir le détail.</p>
                        )}
                        </ClampedPreview>
                      </div>

                      {/* Footer */}
                      <div
                        className="px-6 py-3"
                        style={{ borderTop: '1px solid #faf9f7', background: '#faf9ff' }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div data-tour="vote">
                            <VoteButtons
                              likes={itemVotes[item.id]?.likes ?? 0}
                              dislikes={itemVotes[item.id]?.dislikes ?? 0}
                              onVote={(value) => handleVote(String(item.id), value)}
                              vertical={false}
                              userVote={(itemVotes[item.id]?.vote || 0) as 1 | -1 | 0}
                              size="sm"
                            />
                            </div>
                            <div className="flex items-center gap-1.5" style={{ color: '#6b6862' }}>
                              <Eye className="w-4 h-4" />
                              <span style={{ fontSize: 13, fontWeight: 600, fontFamily: 'DM Mono' }}>{item.view_count}</span>
                            </div>
                            {'comment_count' in item && (item as any).comment_count > 0 && (
                              <div className="flex items-center gap-1.5" style={{ color: '#6b6862' }}>
                                <MessageSquare className="w-4 h-4" />
                                <span style={{ fontSize: 13, fontWeight: 600, fontFamily: 'DM Mono' }}>{(item as any).comment_count}</span>
                              </div>
                            )}
                          </div>

                          <Link
                            to={`${config.basePath}/${item.id}`}
                            data-tour="liste-ouvrir"
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
                  background: 'linear-gradient(135deg,#f2f1ee,#faf9f7)',
                  color: '#6b6862',
                }}
              >
                {React.cloneElement(config.icon as React.ReactElement, { className: 'w-7 h-7' })}
              </div>
              {/* Liste vide « pour de vrai » ou vide à cause des filtres : deux messages différents. */}
              {(() => {
                const filtered = Object.values(filters).some(v => (Array.isArray(v) ? v.length > 0 : !!v));
                return (
                  <>
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1a1a1a' }}>
                      {filtered ? config.emptyMessage : isNationalSection ? 'Les sujets nationaux arrivent bientôt' : 'Rien de publié ici pour le moment'}
                    </h3>
                    <p style={{ fontSize: 13, color: '#6b6862', marginTop: 6, maxWidth: 380, marginLeft: 'auto', marginRight: 'auto' }}>
                      {filtered
                        ? 'Aucun résultat avec ces filtres : essaie d’en retirer un.'
                        : isNationalSection
                          ? 'Les sujets du Bac national corrigés seront publiés ici. En attendant, entraîne-toi sur les devoirs surveillés.'
                          : 'Les premiers contenus arrivent bientôt. Tu peux aussi proposer le tien.'}
                    </p>
                  </>
                );
              })()}
              {/* Section nationale vide : on renvoie vers les devoirs (proposer un sujet national n'a pas de sens). */}
              {isNationalSection ? (
                <Link to="/exams" className="fd-btn-primary inline-flex" style={{ marginTop: 18 }}>Voir les devoirs surveillés</Link>
              ) : (
                <button
                  onClick={handleNewContentClick}
                  className="fd-btn-primary"
                  style={{ marginTop: 18 }}
                >
                  <Plus className="w-4 h-4" />
                  {config.createLabel}
                </button>
              )}
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

          {items.length > 0 && <AdSlot className="mt-10" />}

          {/* Pagination info */}
          {totalPages > 1 && !hasMore && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <span style={{ fontSize: 12, color: '#6b6862', fontFamily: 'DM Mono' }}>
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
          contentLabels={labelsFromContent(items.find((it) => String(it.id) === revisionListModal.itemId))}
        />
      )}
    </div>
  );
};

export default ContentList;
