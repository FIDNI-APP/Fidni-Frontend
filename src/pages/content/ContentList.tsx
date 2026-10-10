/**
 * ContentList — liste des exercices, examens ou leçons, et pages par niveau / chapitre (via ContentHub).
 * - Un seul niveau (± un chapitre) choisi dans les filtres : on passe sur la page de ce niveau / chapitre.
 * - Élève connecté arrivé sur /exercises sans paramètre : la page de son niveau (« Tous les niveaux » :
 *   /exercises?niveau=tous).
 * - Retour depuis un contenu (POP) : la liste, la page chargée et la position reviennent telles quelles
 *   (sessionStorage, par adresse).
 * - Mode Cartes : énoncés allégés par le serveur (view=card), progression de l'élève dans chaque ligne
 *   (user_progress) ; le mode Énoncés (ordinateur seulement) charge le détail de chaque contenu.
 * - Liens « S'entraîner » (Ma progression, plan de DS, quiz) : ?sort=easiest&todo=true, lus dans l'adresse
 *   comme les autres filtres (pages de niveau et de chapitre comprises).
 */

import React, { useState, useEffect, useLayoutEffect, useCallback, useRef, useMemo } from 'react';
import { Link, useSearchParams, useNavigate, useLocation, useNavigationType } from 'react-router-dom';
import { hubPath, profileLevel, type HubInfo } from '@/lib/api/hubApi';
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
import { exerciseContentAPI, examContentAPI, lessonContentAPI, markSolutionViewed } from '@/lib/api';
import type { AssessSource, PaginatedResponse } from '@/lib/api/contentItemApi';
import { ContentListCard } from '@/components/content/ContentListCard';
import {
  ContentCardBanner, getSubjectTheme, DIFFICULTY_CFG,
} from '@/components/content/ContentCardBanner';
import { CatchUpBanner } from '@/components/content/listing/CatchUpBanner';
import { usePhone } from '@/components/content/listing/listingUtils';
import { HorizontalFilterBar } from '@/components/search/HorizontalFilterBar';
import {
  clearedFilters, withoutChip, type ActiveChip, type FilterSlugs, type ListFilters,
} from '@/components/search/filterState';
import { ExerciseRenderer } from '@/components/content/viewer/ExerciseRenderer';
import { LessonRenderer } from '@/components/content/viewer/LessonRenderer';
import type { FlexibleLessonStructure } from '@/components/content/editor/FlexibleLessonEditor';
import { VoteButtons } from '@/components/interactions/VoteButtons';
import { AddToRevisionListModal } from '@/components/revision/AddToRevisionListModal';
import { labelsFromContent } from '@/components/revision/RevisionLabelPicker';
import { SignupStrip } from '@/components/auth/SignupPrompt';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthModal } from '@/components/auth/AuthController';
import { useBreadcrumb } from '@/contexts/BreadcrumbContext';
import { isModerator } from '@/lib/features';
import type { Difficulty } from '@/types';
import type {
  ExerciseListItem, ExamListItem, LessonListItem, ContentFilters, AssessmentStatus, ListSort,
} from '@/types/content';
import type { FlexibleExerciseStructure } from '@/components/content/editor/FlexibleExerciseEditor';
import { AdSlot } from '@/components/ads/AdSlot';
import { SEO } from '@/components/layout/SEO';
import { ClampedPreview } from '@/components/content/ClampedPreview';
import { trackAction, trackFilterChange, trackHubChoice, trackSortValue } from '@/lib/usage';

type StructuredListItem = ExerciseListItem | ExamListItem | LessonListItem;

type ContentType = 'exercise' | 'exam' | 'lesson';

/** Ce que la page attend des trois API (les leçons n'ont ni solution ni sessions chronométrées). */
type ListPageAPI = Pick<typeof exerciseContentAPI,
  'assess' | 'complete' | 'delete' | 'getProgress' | 'removeAssessment' | 'removeComplete'
  | 'save' | 'unsave' | 'validateSolution' | 'vote'> & {
  list: (filters?: ContentFilters, page?: number) => Promise<PaginatedResponse<StructuredListItem>>;
  saveTimerSession: (id: string, durationSeconds: number) => Promise<unknown>;
  getSolution?: typeof exerciseContentAPI.getSolution;
  getSessionStats?: typeof exerciseContentAPI.getSessionStats;
};

const CONTENT_TYPE_CONFIG: Record<ContentType, {
  title: string;
  subtitle: string;
  createLabel: string;
  emptyMessage: string;
  /** « exercice », « exercices » ; « d’exercice » (pas encore d'…). */
  noun: [string, string, string];
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
    noun: ['exercice', 'exercices', 'd’exercice'],
    icon: <BookOpen className="w-5 h-5" />,
    accentColor: 'blue',
    basePath: '/exercises',
    api: exerciseContentAPI,
  },
  exam: {
    // Mêmes mots que le menu : la section ne montre que les devoirs (le Bac national a sa page).
    title: 'Devoirs (DS)',
    subtitle: 'Devoirs surveillés et devoirs maison, pour te mettre en conditions.',
    createLabel: 'Ajouter un examen',
    emptyMessage: 'Aucun examen trouvé',
    noun: ['examen', 'examens', 'd’examen'],
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
    noun: ['leçon', 'leçons', 'de leçon'],
    icon: <LessonIcon className="w-5 h-5" />,
    accentColor: 'emerald',
    basePath: '/lessons',
    api: lessonContentAPI,
  },
};

// Même taille de page que le serveur (things/views.py, page_size = 20).
const ITEMS_PER_PAGE = 20;

// Tri par défaut : « Pour toi » — d'abord ce qui suit son travail (chapitre en cours, à retravailler,
// nouveautés de ses chapitres), varié entre chapitres ; ce qu'il a réussi passe en dernier. Visiteur :
// « Recommandés » (nouveautés et plus aimés).
const DEFAULT_SORT: ListSort = 'recommended';

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

// Section « Bac national » (examens nationaux) : textes propres (la liste et ses filtres restent les mêmes).
const NATIONAL = {
  title: 'Bac national',
  subtitle: 'Les sujets du Bac national, corrigés, pour t’entraîner en conditions réelles.',
  seoTitle: 'Examens nationaux de maths corrigés – Bac Maroc | Fidni',
  seoDescription: 'Sujets d’examen national de mathématiques du Bac marocain (2ème Bac SM et PC), avec corrigé détaillé et épreuve chronométrée.',
};

type FilterState = ListFilters;

/* ── Retour à la liste : ce qui était affiché, gardé pour la session (par adresse) ── */

interface ListSnapshot {
  /** Filtres, tri, affichage et connexion de la liste : on ne restaure que la même liste. */
  key: string;
  items: StructuredListItem[];
  page: number;
  totalCount: number;
  hasMore: boolean;
  scrollY: number;
  at: number;
}
const SNAP_PREFIX = 'fidni:liste:';
const SNAP_INDEX = 'fidni:listes';
const SNAP_MAX = 5;
const SNAP_TTL = 30 * 60 * 1000;
// Chargement de ce module (donc de la page dans l'onglet) : une liste gardée avant vient d'une visite précédente.
const LOADED_AT = Date.now();

function readSnapshot(url: string): ListSnapshot | null {
  try {
    const raw = sessionStorage.getItem(SNAP_PREFIX + url);
    if (!raw) return null;
    const snap = JSON.parse(raw) as ListSnapshot;
    return Array.isArray(snap.items) && Date.now() - snap.at < SNAP_TTL ? snap : null;
  } catch {
    return null;
  }
}

function writeSnapshot(url: string, snap: ListSnapshot) {
  try {
    // Les 5 dernières listes seulement : le stockage de la session est limité.
    let index: string[] = [];
    try { index = JSON.parse(sessionStorage.getItem(SNAP_INDEX) || '[]'); } catch { index = []; }
    index = [...index.filter((u) => u !== url), url];
    while (index.length > SNAP_MAX) sessionStorage.removeItem(SNAP_PREFIX + index.shift());
    sessionStorage.setItem(SNAP_INDEX, JSON.stringify(index));
    sessionStorage.setItem(SNAP_PREFIX + url, JSON.stringify(snap));
  } catch {
    /* stockage plein ou indisponible : le retour rechargera la liste */
  }
}

/** Statuts des questions d'un contenu, sans celui de `path`. */
const withoutPath = (progress: Record<string, AssessmentStatus> | undefined, path: string) =>
  Object.fromEntries(Object.entries(progress || {}).filter(([p]) => p !== path)) as Record<string, AssessmentStatus>;

/** Cartes fantômes pendant le premier chargement. */
const SkeletonCards: React.FC = () => (
  <div className="grid grid-cols-1 lg:grid-cols-2 min-[1700px]:grid-cols-3 gap-5" role="status" aria-label="Chargement de la liste">
    {[0, 1, 2, 3].map((i) => (
      <div key={i} className="rounded-2xl border border-line bg-white px-5 pt-4 pb-3 animate-pulse">
        <div className="flex gap-1.5">
          <div className="h-5 w-28 rounded-full bg-[#f2f1ee]" />
          <div className="h-5 w-16 rounded-full bg-[#f2f1ee]" />
        </div>
        <div className="mt-3 h-5 w-3/4 rounded bg-[#efece6]" />
        <div className="mt-2 h-3.5 w-1/3 rounded bg-[#f2f1ee]" />
        <div className="mt-3 h-24 rounded-xl border border-[#efece6] bg-[#fcfbf9]" />
        <div className="mt-3 flex items-center justify-between">
          <div className="h-7 w-24 rounded bg-[#f2f1ee]" />
          <div className="h-9 w-28 rounded-[10px] bg-[#efece6]" />
        </div>
      </div>
    ))}
  </div>
);

export const ContentList: React.FC<ContentListProps> = ({
  contentType = 'exercise',
  hub,
  national = false,
}) => {
  const isNationalSection = contentType === 'exam' && national;
  const config = CONTENT_TYPE_CONFIG[contentType];
  const navigate = useNavigate();
  const location = useLocation();
  const navigationType = useNavigationType();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const { openModal } = useAuthModal();
  const phone = usePhone();
  const myLevel = profileLevel(user);
  // Publier : auteurs (profs) et modérateurs ; pour un élève, le bouton ne servait à rien.
  const canPublish = isModerator(user) || user?.profile?.user_type === 'teacher';

  const listRef = useRef<HTMLDivElement>(null);

  // Initialize filters from URL
  const getInitialFilters = (): FilterState => {
    const list = (name: string) => searchParams.get(name)?.split(',').filter(Boolean) ?? null;
    const isNationalExamParam = searchParams.get('isNationalExam');
    // Page par niveau / chapitre : le niveau et le chapitre viennent de l'adresse, pas des paramètres.
    const hubLevels = hub ? [String(hub.level.id)] : [];
    const hubChapters = hub?.chapter ? [String(hub.chapter.id)] : [];
    return {
      classLevels: list('classLevels') ?? hubLevels,
      subjects: list('subjects') ?? [],
      subfields: list('subfields') ?? [],
      chapters: list('chapters') ?? hubChapters,
      theorems: list('theorems') ?? [],
      difficulties: (list('difficulties') ?? []) as Difficulty[],
      showViewed: searchParams.get('showViewed') === 'true',
      hideViewed: searchParams.get('hideViewed') === 'true',
      showCompleted: searchParams.get('showCompleted') === 'true',
      showFailed: searchParams.get('showFailed') === 'true',
      todo: searchParams.get('todo') === 'true',
      isNationalExam: isNationalExamParam === 'true' ? true : isNationalExamParam === 'false' ? false : undefined,
      dateStart: searchParams.get('dateStart') || null,
      dateEnd: searchParams.get('dateEnd') || null,
    };
  };

  const [filters, setFilters] = useState<FilterState>(getInitialFilters);
  // Filtres imposés par la page de niveau / chapitre (pas d'étiquette « Retirer » pour eux).
  const fixed = useMemo(() => (hub ? {
    classLevels: [String(hub.level.id)],
    chapters: hub.chapter ? [String(hub.chapter.id)] : [],
  } : undefined), [hub]);

  // Niveau / chapitre choisi en ouvrant sa page depuis le site (pas une arrivée directe : location.key « default »).
  const hubLevelId = hub?.level.id;
  const hubChapterId = hub?.chapter?.id;
  useEffect(() => {
    if (hubLevelId && location.key !== 'default') trackHubChoice(contentType, hubLevelId, hubChapterId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hubLevelId, hubChapterId, contentType]);
  const filtersRef = useRef(filters);
  filtersRef.current = filters;
  const [sortBy, setSortBy] = useState<ListSort>(
    (searchParams.get('sort') as ListSort) || DEFAULT_SORT
  );

  // Re-sync filters + sort from the URL whenever it changes externally
  // (e.g. class-level links in the sidebar), not only on first mount.
  // Seulement si l'URL dit autre chose que l'état actuel : sinon un nouvel objet identique
  // relançait un second chargement pour rien.
  useEffect(() => {
    const next = getInitialFilters();
    setFilters(prev => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
    setSortBy((searchParams.get('sort') as ListSort) || DEFAULT_SORT);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Deux affichages : Cartes (par défaut : un aperçu lisible de chaque contenu) et Énoncés (le texte
  // complet, interactif). Le choix de l'élève est retenu d'une visite à l'autre. Sur téléphone, Cartes
  // seulement (les énoncés complets y sont peu lisibles, et le choix prenait une ligne).
  type ViewMode = 'card' | 'full';
  const [viewModeChoice, setViewModeState] = useState<ViewMode>(() => {
    try { return localStorage.getItem('fidni:affichage-liste') === 'full' ? 'full' : 'card'; } catch { return 'card'; }
  });
  const viewMode: ViewMode = phone ? 'card' : viewModeChoice;
  const setViewMode = (mode: ViewMode) => {
    if (mode === 'full' && viewModeChoice !== 'full') trackAction('affichage-enonces');
    setViewModeState(mode);
    try { localStorage.setItem('fidni:affichage-liste', mode); } catch { /* stockage indisponible */ }
  };

  // Build query params for API
  const rawQuery = useMemo((): ContentFilters => {
    const params: ContentFilters = {};

    // Pass arrays for multi-select filters
    if (filters.classLevels.length > 0) params.classLevels = filters.classLevels;
    if (filters.subjects.length > 0) params.subjects = filters.subjects;
    if (filters.subfields.length > 0) params.subfields = filters.subfields;
    if (filters.chapters.length > 0) params.chapters = filters.chapters;
    if (filters.theorems.length > 0) params.theorems = filters.theorems;
    if (filters.difficulties.length > 0) params.difficulties = filters.difficulties;
    if (sortBy) params.sort = sortBy;

    // Status filters
    if (filters.showViewed) params.showViewed = true;
    if (filters.hideViewed) params.hideViewed = true;
    if (filters.showCompleted) params.showCompleted = true;
    if (filters.showFailed) params.showFailed = true;
    if (filters.todo) params.todo = true;

    // Mode Cartes : sans solutions ni énoncé complet (les leçons gardent leur texte : durée de lecture, sommaire).
    if (viewMode === 'card' && contentType !== 'lesson') params.view = 'card';

    // Examens : chaque section ne montre que les siens ; la période porte sur l'année du Bac.
    if (contentType === 'exam') {
      params.is_national = isNationalSection;
      if (isNationalSection) {
        if (filters.dateStart) params.national_year_min = Number(filters.dateStart);
        if (filters.dateEnd) params.national_year_max = Number(filters.dateEnd);
      }
    }

    return params;
  }, [filters, sortBy, contentType, isNationalSection, viewMode]);
  // Mêmes paramètres = même objet : des filtres relus de l'adresse à l'identique ne rechargent pas la liste.
  const queryJson = JSON.stringify(rawQuery);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const queryParams = useMemo(() => rawQuery, [queryJson]);

  // Une liste = ses paramètres + l'état de connexion (statuts et progression de l'élève).
  const listKey = `${queryJson}|${isAuthenticated ? 'u' : 'v'}`;

  // Retour (bouton Précédent) sur la même liste : on réaffiche ce qui l'était, à la même hauteur.
  const restoredRef = useRef<ListSnapshot | null | undefined>(undefined);
  if (restoredRef.current === undefined) {
    const snap = navigationType === 'POP' ? readSnapshot(location.pathname + location.search) : null;
    // Pas après un rechargement de la page : seulement un retour dans la même visite.
    restoredRef.current = snap && snap.key === listKey && snap.at > LOADED_AT ? snap : null;
  }
  const restored = restoredRef.current;

  // Data
  const [items, setItems] = useState<StructuredListItem[]>(() => restored?.items ?? []);
  const [totalCount, setTotalCount] = useState(() => restored?.totalCount ?? 0);
  const [page, setPage] = useState(() => restored?.page ?? 1);
  const [hasMore, setHasMore] = useState(() => restored?.hasMore ?? false);
  const [isLoading, setIsLoading] = useState(!restored);
  const [loadingMore, setLoadingMore] = useState(false);
  // Erreur du premier chargement (more = false) ou de « Charger plus ».
  const [error, setError] = useState<{ more: boolean } | null>(null);
  // Étiquettes des filtres actifs (barre de filtres) : « Retirer … × » quand la liste est vide.
  const [chips, setChips] = useState<ActiveChip[]>([]);

  // Élève connecté arrivé sur /exercises sans paramètre : la page de son niveau. Décidé une fois, à l'arrivée :
  // un visiteur qui filtre puis se connecte reste sur sa liste.
  const [bareArrival, setBareArrival] = useState(() => contentType === 'exercise' && !hub && !national && !location.search);
  const levelHome = bareArrival && !authLoading && isAuthenticated && myLevel ? hubPath('exercises', myLevel.slug) : null;
  const holdForAuth = bareArrival && authLoading;
  useEffect(() => {
    if (levelHome) navigate(levelHome, { replace: true });
    else if (bareArrival && (!authLoading || location.search)) setBareArrival(false);
  }, [levelHome, navigate, bareArrival, authLoading, location.search]);
  // « Tous les niveaux » : la liste générale, sans cette redirection.
  const allLevelsPath = contentType === 'exercise' && isAuthenticated && myLevel ? '/exercises?niveau=tous' : config.basePath;

  // Page de niveau / chapitre : fil de la barre du haut (sur téléphone, « ‹ 2ème Bac SM » ramène au niveau ;
  // sans lui, « ‹ Exercices » renvoyait l'élève… sur la page de son niveau).
  const { setCrumbs } = useBreadcrumb();
  useEffect(() => {
    if (!hub) return;
    const root = { label: config.title, to: allLevelsPath };
    setCrumbs(hub.chapter
      ? [root, { label: hub.level.name, to: hub.level.url }, { label: hub.chapter.name }]
      : [root, { label: hub.level.name }], config.basePath);
    return () => setCrumbs(null);
  }, [hub, config.title, config.basePath, allLevelsPath, setCrumbs]);

  const [showAllSolutions] = useState(false);
  const [itemProgress, setItemProgress] = useState<Record<string, Record<string, AssessmentStatus>>>({});
  const [itemValidations, setItemValidations] = useState<Record<string, Record<string, string | null>>>({});
  const [itemVotes, setItemVotes] = useState<Record<string, { vote: number; count: number; likes: number; dislikes: number }>>({});
  const [itemBookmarks, setItemBookmarks] = useState<Record<string, boolean>>({});
  const [itemTimers, setItemTimers] = useState<Record<string, { isRunning: boolean; elapsed: number }>>({});
  const [savingTimer, setSavingTimer] = useState<Record<string, boolean>>({});
  const [sessionCounts, setSessionCounts] = useState<Record<string, number>>({});
  const [itemCompletions, setItemCompletions] = useState<Record<string, 'success' | 'review' | null>>({});

  // Votes, favoris et statuts du mode Énoncés, à partir des lignes reçues.
  const initItemState = useCallback((loaded: StructuredListItem[]) => {
    const votes: Record<string, { vote: number; count: number; likes: number; dislikes: number }> = {};
    const bookmarks: Record<string, boolean> = {};
    const completions: Record<string, 'success' | 'review' | null> = {};
    loaded.forEach((item) => {
      votes[item.id] = {
        vote: item.user_vote || 0,
        count: item.vote_count || 0,
        likes: item.like_count ?? 0,
        dislikes: item.dislike_count ?? 0,
      };
      bookmarks[item.id] = Boolean(item.user_save);
      completions[item.id] = item.user_complete ?? null;
    });
    setItemVotes((prev) => ({ ...prev, ...votes }));
    setItemBookmarks((prev) => ({ ...prev, ...bookmarks }));
    setItemCompletions((prev) => ({ ...prev, ...completions }));
  }, []);

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

  // Chaque premier chargement (nouveaux filtres, tri…) ouvre une « génération » : une réponse d'une
  // génération précédente est ignorée au lieu d'écraser la liste affichée. « Charger plus » reste dans
  // la génération en cours.
  const generation = useRef(0);

  const load = useCallback(async (pageToLoad: number) => {
    const more = pageToLoad > 1;
    const gen = more ? generation.current : ++generation.current;
    const stale = () => generation.current !== gen;
    const setBusy = more ? setLoadingMore : setIsLoading;

    try {
      setBusy(true);
      setError(null);
      const response = await config.api.list(queryParams, pageToLoad);
      if (stale()) return;
      const loaded = response.results || [];
      setItems((prev) => {
        if (!more) return loaded;
        const known = new Set(prev.map((it) => String(it.id)));
        return [...prev, ...loaded.filter((it) => !known.has(String(it.id)))];
      });
      setPage(pageToLoad);
      setTotalCount(response.count || 0);
      setHasMore(!!response.next);
      initItemState(loaded);
    } catch (err) {
      if (stale()) return;
      console.error('Failed to load content:', err);
      setError({ more });
      if (!more) {
        setItems([]);
        setTotalCount(0);
        setHasMore(false);
      }
    } finally {
      // Chargement devenu obsolète : le nouveau gère l'indicateur principal ; celui de « page
      // suivante » n'appartient qu'à nous, on le libère.
      if (!stale() || more) setBusy(false);
    }
  }, [queryParams, config.api, initItemState]);

  // Nouveaux filtres, tri, affichage ou connexion : la première page. Liste restaurée : rien à recharger
  // tant que ses paramètres ne changent pas.
  const skipKey = useRef<string | null>(restored ? listKey : null);
  useEffect(() => {
    if (holdForAuth || levelHome) return;
    if (skipKey.current === listKey) return;
    skipKey.current = null;
    load(1);
  }, [load, listKey, holdForAuth, levelHome]);

  // Liste restaurée : ses statuts ont pu changer pendant que l'élève était sur un contenu (réussi,
  // à revoir, questions évaluées) ; une requête rafraîchit ces champs, sans toucher à l'ordre.
  useEffect(() => {
    if (restored) initItemState(restored.items);
    if (!restored || !isAuthenticated) return;
    let cancelled = false;
    const size = Math.min(100, Math.max(ITEMS_PER_PAGE, restored.items.length));
    config.api.list({ ...queryParams, page_size: size }, 1)
      .then((r) => {
        if (cancelled) return;
        const fresh = new Map((r.results || []).map((it) => [String(it.id), it]));
        setItems((prev) => prev.map((it) => {
          const f = fresh.get(String(it.id));
          return f ? {
            ...it,
            user_complete: f.user_complete, user_progress: f.user_progress, user_save: f.user_save,
            user_vote: f.user_vote, vote_count: f.vote_count, like_count: f.like_count, dislike_count: f.dislike_count,
            felt: f.felt,
          } as StructuredListItem : it;
        }));
        const shown = new Set(restored.items.map((it) => String(it.id)));
        initItemState([...fresh.values()].filter((it) => shown.has(String(it.id))));
      })
      .catch(() => { /* la liste restaurée reste affichée */ });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Position de défilement, suivie en continu : au moment où la page change, elle est peut-être déjà perdue.
  // Seulement tant que la liste est affichée : la remise en haut de la page suivante, ou la liste masquée
  // pendant le chargement de cette page (Suspense), ne doivent pas écraser la position à retrouver.
  const scrollYRef = useRef(restored?.scrollY ?? 0);
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onScroll = () => {
      const root = rootRef.current;
      if (root && root.isConnected && root.offsetHeight > 0) scrollYRef.current = window.scrollY;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // En quittant la page : ce qui est affiché, pour le retour.
  const snapRef = useRef({ url: '', key: '', items, page, totalCount, hasMore, busy: isLoading || !!error });
  snapRef.current = {
    url: location.pathname + location.search, key: listKey, items, page, totalCount, hasMore, busy: isLoading || !!error,
  };
  useEffect(() => () => {
    const s = snapRef.current;
    if (s.busy || !s.items.length) return;
    writeSnapshot(s.url, {
      key: s.key, items: s.items, page: s.page, totalCount: s.totalCount, hasMore: s.hasMore,
      scrollY: scrollYRef.current, at: Date.now(),
    });
  }, []);

  // Liste restaurée : retour à la même hauteur (après le rendu, puis une image plus tard pour les formules).
  useLayoutEffect(() => {
    if (!restored) return;
    window.scrollTo(0, restored.scrollY);
    const raf = window.requestAnimationFrame(() => window.scrollTo(0, restored.scrollY));
    return () => window.cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Après un changement de filtre ou de tri : remonter au début de la liste si on l'avait dépassé. */
  const scrollToList = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    // Sous la barre du haut (60 px) et la barre de filtres collante du téléphone.
    const top = el.getBoundingClientRect().top + window.scrollY - (phone ? 150 : 80);
    if (window.scrollY > top) window.scrollTo({ top: Math.max(0, top) });
  }, [phone]);

  // Update URL params when filters change
  const handleFilterChange = useCallback((newFilters: FilterState, slugs?: FilterSlugs) => {
    // Statut « À faire » compris (filtre-statut, valeur « statut:todo »).
    trackFilterChange(filtersRef.current as unknown as Record<string, unknown>, newFilters as unknown as Record<string, unknown>, contentType);

    const params = new URLSearchParams();
    const setList = (name: string, values: string[]) => { if (values.length > 0) params.set(name, values.join(',')); };
    setList('classLevels', newFilters.classLevels);
    setList('subjects', newFilters.subjects);
    setList('subfields', newFilters.subfields);
    setList('chapters', newFilters.chapters);
    setList('theorems', newFilters.theorems);
    setList('difficulties', newFilters.difficulties);
    if (newFilters.showViewed) params.set('showViewed', 'true');
    if (newFilters.hideViewed) params.set('hideViewed', 'true');
    if (newFilters.showCompleted) params.set('showCompleted', 'true');
    if (newFilters.showFailed) params.set('showFailed', 'true');
    if (newFilters.todo) params.set('todo', 'true');
    if (newFilters.isNationalExam !== undefined) params.set('isNationalExam', String(newFilters.isNationalExam));
    if (newFilters.dateStart) params.set('dateStart', newFilters.dateStart);
    if (newFilters.dateEnd) params.set('dateEnd', newFilters.dateEnd);
    if (sortBy !== DEFAULT_SORT) params.set('sort', sortBy);

    // Un seul niveau (± un chapitre) : la page de ce niveau ou de ce chapitre (pastilles des chapitres,
    // lien vers le cours, vraie adresse). Pas pour les examens nationaux (pas de page par niveau).
    const lv = newFilters.classLevels;
    const chs = newFilters.chapters;
    let target: string | null = null;
    if (!isNationalSection && lv.length === 1 && chs.length <= 1) {
      const onHubLevel = !!hub && lv[0] === String(hub.level.id);
      const levelSlug = onHubLevel ? hub!.level.slug : slugs?.level;
      let chapterSlug: string | undefined;
      if (chs.length === 1) {
        const fromHub = onHubLevel
          ? hub!.chapters.find((c) => String(c.id) === chs[0])?.slug
            ?? (hub!.chapter && String(hub!.chapter.id) === chs[0] ? hub!.chapter.slug : undefined)
          : undefined;
        chapterSlug = fromHub ?? slugs?.chapter;
      }
      if (levelSlug && (chs.length === 0 || chapterSlug)) target = hubPath(config.basePath.slice(1), levelSlug, chapterSlug);
    }

    // Autre page : elle chargera sa liste ; celle-ci ne change plus.
    if (target && target !== location.pathname) {
      params.delete('classLevels');
      params.delete('chapters');
      const search = params.toString();
      navigate(`${target}${search ? `?${search}` : ''}`);
      return;
    }
    if (!target && hub) {
      // Plusieurs niveaux ou chapitres : la liste générale, filtrée (sans renvoyer l'élève à son niveau).
      if (contentType === 'exercise' && !params.has('classLevels')) params.set('niveau', 'tous');
      navigate(`${config.basePath}?${params.toString()}`);
      return;
    }
    setFilters(newFilters);
    if (target) {
      params.delete('classLevels');
      params.delete('chapters');
    } else {
      const keep = searchParams.get('niveau');
      if (keep) params.set('niveau', keep);
    }
    setSearchParams(params, { replace: true });
    scrollToList();
  }, [sortBy, setSearchParams, searchParams, hub, location.pathname, navigate, config.basePath, contentType, isNationalSection, scrollToList]);

  const handleSortChange = useCallback((newSortOption: ListSort) => {
    trackAction('tri');
    trackSortValue(contentType, newSortOption);
    setSortBy(newSortOption);

    // Update URL
    const params = new URLSearchParams(searchParams);
    if (newSortOption !== DEFAULT_SORT) {
      params.set('sort', newSortOption);
    } else {
      params.delete('sort');
    }
    setSearchParams(params, { replace: true });
    scrollToList();
  }, [searchParams, setSearchParams, contentType, scrollToList]);

  const handleLoadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      trackAction('charger-plus');
      load(page + 1);
    }
  }, [loadingMore, hasMore, load, page]);

  const handleNewContentClick = useCallback(() => {
    if (!isAuthenticated) {
      openModal('publier');
      return;
    }
    navigate(`${config.basePath}/new`);
  }, [isAuthenticated, navigate, openModal, config.basePath]);

  // Handle assessment for items in full view (source : « Tu avais trouvé ? » sous une solution → apres_solution).
  const handleAssess = useCallback(async (itemId: string, path: string, status: AssessmentStatus, source: AssessSource = 'question') => {
    if (!isAuthenticated) {
      openModal('auto-evaluation');
      return;
    }

    const previousStatus = itemProgress[itemId]?.[path];
    const isToggleOff = previousStatus === status;

    setItemProgress(prev => {
      if (isToggleOff) return { ...prev, [itemId]: withoutPath(prev[itemId], path) };
      return { ...prev, [itemId]: { ...(prev[itemId] || {}), [path]: status } };
    });

    try {
      if (isToggleOff) {
        await config.api.removeAssessment(itemId, { item_path: path });
      } else {
        await config.api.assess(itemId, { item_path: path, assessment: status, source });
      }
    } catch (err) {
      console.error('Assessment failed:', err);
      setItemProgress(prev => {
        if (previousStatus) {
          return { ...prev, [itemId]: { ...(prev[itemId] || {}), [path]: previousStatus } };
        }
        return { ...prev, [itemId]: withoutPath(prev[itemId], path) };
      });
    }
  }, [isAuthenticated, openModal, config.api, itemProgress]);

  // Mode Énoncés : solution ouverte enregistrée une fois par contenu, comme sur sa page (ContentDetail).
  const solutionMarked = useRef(new Set<string>());
  const handleSolutionOpen = useCallback((itemId: string) => {
    if (!isAuthenticated || contentType === 'lesson' || solutionMarked.current.has(itemId)) return;
    solutionMarked.current.add(itemId);
    markSolutionViewed(contentType, itemId).catch(() => { solutionMarked.current.delete(itemId); });
  }, [isAuthenticated, contentType]);

  // Handle vote
  const handleVote = useCallback(async (itemId: string, voteValue: 1 | -1) => {
    if (!isAuthenticated) {
      openModal('vote');
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
      openModal('favori');
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
      openModal('statut');
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

  // Mode Énoncés seulement : progression question par question et sessions chronométrées de chaque
  // contenu, une seule fois par contenu (le mode Cartes s'en passe : user_progress est dans la liste).
  const detailLoaded = useRef(new Set<string>());
  useEffect(() => { detailLoaded.current.clear(); }, [isAuthenticated]);
  useEffect(() => {
    if (viewMode !== 'full' || !isAuthenticated || contentType === 'lesson') return;
    const fresh = items.filter((it) => !detailLoaded.current.has(String(it.id)));
    if (!fresh.length) return;
    fresh.forEach((it) => detailLoaded.current.add(String(it.id)));
    fresh.forEach((it) => loadSessionCount(String(it.id)));
    Promise.all(fresh.map((item) => config.api.getProgress(String(item.id))
      .then((data) => ({ id: item.id, progress: data.item_progress }))
      .catch(() => null)))
      .then((results) => {
        const newProgress: Record<string, Record<string, AssessmentStatus>> = {};
        const newValidations: Record<string, Record<string, string | null>> = {};
        results.forEach((result) => {
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
        setItemProgress((prev) => ({ ...prev, ...newProgress }));
        setItemValidations((prev) => ({ ...prev, ...newValidations }));
      });
  }, [items, viewMode, isAuthenticated, contentType, config.api, loadSessionCount]);

  const handleSaveTimerSession = useCallback(async (itemId: string) => {
    if (!isAuthenticated) {
      openModal('chrono');
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
        const running = Object.keys(prev).filter((id) => prev[id].isRunning);
        if (!running.length) return prev;
        const updated = { ...prev };
        running.forEach((id) => { updated[id] = { ...updated[id], elapsed: updated[id].elapsed + 1 }; });
        return updated;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  // La matière n'est affichée que si la liste en mélange plusieurs (aujourd'hui, seulement les maths).
  const showSubject = useMemo(
    () => new Set(items.map((it) => (typeof it.subject === 'string' ? it.subject : it.subject?.name)).filter(Boolean)).size > 1,
    [items],
  );

  // Pastilles des chapitres (téléphone : une ligne qui défile) : la pastille de la page ramenée en vue.
  const pillsRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const row = pillsRef.current;
    const active = row?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!row || !active || row.scrollWidth <= row.clientWidth) return;
    row.scrollLeft = Math.max(0, active.offsetLeft - row.offsetLeft - (row.clientWidth - active.offsetWidth) / 2);
  }, [hub?.chapter?.id]);

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
      load(1);
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const [one, many, ofNoun] = config.noun;
  const listFrom = location.pathname + location.search;

  const errorBox = (more: boolean) => (
    <div role="alert" className="mb-6 flex flex-col gap-3 rounded-xl border border-[#f0d5d1] bg-[#fbecea] p-4 sm:flex-row sm:items-center">
      <p className="flex-1 text-[14px] font-medium text-[#a23b34]">
        {more ? 'La suite de la liste n’a pas pu se charger.' : 'La liste n’a pas pu se charger.'} Vérifie ta connexion.
      </p>
      <button type="button" onClick={() => load(more ? page + 1 : 1)}
        className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-[#e8c4bf] bg-white px-4 text-[13.5px] font-semibold text-ink hover:bg-[#fdf6f5]">
        <RotateCcw className="h-4 w-4" /> Réessayer
      </button>
    </div>
  );

  // Liste vide : pourquoi, et quoi faire ensuite.
  const emptyState = () => {
    // Page de niveau / chapitre sans aucun contenu : rien à filtrer (pas de « Tout est réussi » trompeur
    // en arrivant par « S'entraîner », ni de « Retirer … »).
    const nothingHere = !!hub && hub.count === 0;
    const filterChips = nothingHere ? [] : chips;
    const onlyTodo = filterChips.length === 1 && filterChips[0].key === 'todo';
    let title: string;
    let text: string;
    let actions: React.ReactNode = null;
    if (onlyTodo) {
      title = 'Tout est réussi ici, bravo !';
      text = `Tu as réussi tous les ${many} de cette liste. Retire « À faire » pour les revoir.`;
    } else if (filterChips.length > 0) {
      title = config.emptyMessage;
      text = 'Aucun résultat avec ces filtres.';
    } else if (hub?.chapter) {
      title = `Pas encore ${ofNoun} sur ce chapitre`;
      text = 'Ça arrive bientôt.';
    } else if (hub) {
      title = `Pas encore ${ofNoun} pour ce niveau`;
      text = 'Ça arrive bientôt.';
    } else if (isNationalSection) {
      title = 'Les sujets nationaux arrivent bientôt';
      text = 'Les sujets du Bac national corrigés seront publiés ici. En attendant, entraîne-toi sur les devoirs surveillés.';
      actions = <Link to="/exams" className="fd-btn-primary inline-flex">Voir les devoirs surveillés</Link>;
    } else {
      title = 'Rien de publié ici pour le moment';
      text = 'Les premiers contenus arrivent bientôt.';
    }

    if (filterChips.length > 0) {
      actions = (
        <div className="flex flex-wrap items-center justify-center gap-2">
          {filterChips.map((chip) => (
            <button key={chip.key} type="button" onClick={() => handleFilterChange(withoutChip(filters, chip.key))}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-indigo-100 pl-3 pr-2 text-sm font-medium text-indigo-700 hover:bg-indigo-200">
              Retirer {chip.label} <X className="h-3.5 w-3.5" />
            </button>
          ))}
          {filterChips.length > 1 && (
            <button type="button" onClick={() => handleFilterChange(clearedFilters(fixed))}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-ink-faint hover:bg-[#f2f1ee] hover:text-ink">
              <RotateCcw className="h-3.5 w-3.5" /> Tout effacer
            </button>
          )}
        </div>
      );
    } else if (hub) {
      // Page de niveau / chapitre vide : le cours et les autres rubriques, puis les chapitres voisins.
      const index = hub.chapter ? hub.chapters.findIndex((c) => c.id === hub.chapter!.id) : -1;
      const neighbours = hub.chapter
        ? hub.chapters
          .map((c, i) => ({ c, d: Math.abs(i - index) }))
          .filter(({ c }) => c.id !== hub.chapter!.id && c.count > 0)
          .sort((a, b) => a.d - b.d)
          .slice(0, 3)
          .map(({ c }) => c)
        : [];
      actions = (hub.related.length > 0 || neighbours.length > 0) ? (
        <div className="flex flex-col items-center gap-3">
          {hub.related.length > 0 && (
            <div className="flex flex-wrap justify-center gap-2">
              {hub.related.map((r) => (
                <Link key={r.url} to={r.url} className="fd-btn-primary inline-flex" style={{ padding: '9px 14px' }}>
                  {r.label} <span className="fd-nums opacity-80">({r.count})</span>
                </Link>
              ))}
            </div>
          )}
          {neighbours.length > 0 && (
            <div className="flex flex-wrap items-center justify-center gap-2">
              <span className="text-[12.5px] text-ink-faint">Chapitres voisins :</span>
              {neighbours.map((c) => (
                <Link key={c.id} to={c.url} className="inline-flex h-9 items-center rounded-full border border-line bg-white px-3 text-[13px] text-ink-soft hover:border-ink">
                  {c.name} <span className="fd-nums ml-1 text-ink-faint">{c.count}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      ) : null;
    } else if (!isNationalSection && canPublish) {
      actions = (
        <button type="button" onClick={handleNewContentClick} className="fd-btn-ghost inline-flex" style={{ padding: '9px 14px' }}>
          <Plus className="w-4 h-4" /> {config.createLabel}
        </button>
      );
    }

    return (
      <div className="fd-card text-center" style={{ padding: '40px 20px' }}>
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
        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#1a1a1a' }}>{title}</h3>
        <p style={{ fontSize: 13, color: '#6b6862', marginTop: 6, maxWidth: 420, marginLeft: 'auto', marginRight: 'auto' }}>{text}</p>
        {actions && <div style={{ marginTop: 18 }}>{actions}</div>}
      </div>
    );
  };

  // Dynamic colors based on content type
  return (
    <div ref={rootRef} style={{ minHeight: '100vh', background: '#faf9f7', paddingBottom: 64 }}>
      {/* Mêmes titres que les pages pré-remplies par le serveur (backend/src/config/seo.py). */}
      {hub ? (
        <SEO title={hub.title} description={hub.description} canonicalUrl={hub.url} noindex={!hub.indexable} />
      ) : isNationalSection ? (
        <SEO title={NATIONAL.seoTitle} description={NATIONAL.seoDescription} canonicalUrl="/exams/nationaux" />
      ) : (
        <SEO title={LIST_SEO[contentType].title} description={LIST_SEO[contentType].description} canonicalUrl={config.basePath} />
      )}
      {/* En-tête compact : titre, nombre, une phrase ; le contenu commence tout de suite après. */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 pt-5 sm:pt-6 pb-3 sm:pb-4">
        <div className="flex items-end justify-between gap-4">
          <div className="min-w-0">
            {/* Téléphone : la barre du haut porte déjà le retour (« ‹ 2ème Bac SM ») ; la liste commence plus haut. */}
            {hub && (
              <nav aria-label="Fil d’Ariane" className="mb-1.5 hidden sm:flex flex-wrap items-center gap-1.5 text-[12.5px] text-ink-faint">
                <Link to={allLevelsPath} className="hover:text-ink">{config.title}</Link>
                <span aria-hidden>›</span>
                {hub.chapter ? <Link to={hub.level.url} className="hover:text-ink">{hub.level.name}</Link> : <span className="text-ink-soft">{hub.level.name}</span>}
                {hub.chapter && <><span aria-hidden>›</span><span className="text-ink-soft">{hub.chapter.name}</span></>}
                {!hub.chapter && (
                  <>
                    <span aria-hidden>·</span>
                    <Link to={allLevelsPath} className="font-medium text-brand-hover hover:underline">Tous les niveaux</Link>
                  </>
                )}
              </nav>
            )}
            <h1 className="fd-display text-ink flex items-baseline gap-2.5 flex-wrap" style={{ fontSize: 'clamp(24px,3vw,32px)', fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
              {hub ? hub.h1 : isNationalSection ? NATIONAL.title : config.title}
              <span className="fd-nums text-[15px] font-medium text-ink-faint" style={{ letterSpacing: 0 }}>
                {totalCount > 0 ? totalCount : ''}
              </span>
            </h1>
            <p className="text-[13.5px] text-ink-faint mt-1.5 max-w-3xl line-clamp-2 sm:line-clamp-none">{hub ? hub.intro : isNationalSection ? NATIONAL.subtitle : config.subtitle}</p>
          </div>

          {/* Publier : réservé aux auteurs et aux modérateurs. */}
          {canPublish && (
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
        <div className="max-w-7xl mx-auto px-4 md:px-6 pb-3 sm:pb-4">
          {hub.chapters.length > 0 && (
            // Téléphone : une seule ligne qui défile (avant, une quinzaine de pastilles sur 6 à 8 lignes).
            <nav ref={pillsRef} aria-label="Chapitres"
              className="-mx-4 px-4 md:mx-0 md:px-0 flex gap-1.5 overflow-x-auto sm:flex-wrap sm:overflow-visible scrollbar-hide">
              <Link to={hub.level.url} aria-current={!hub.chapter ? 'page' : undefined}
                className={`inline-flex h-9 sm:h-auto shrink-0 items-center whitespace-nowrap rounded-full border px-3 sm:py-1 text-[12.5px] transition-colors ${!hub.chapter ? 'border-ink bg-ink text-white' : 'border-line bg-white text-ink-soft hover:border-ink'}`}>
                Tous les chapitres
              </Link>
              {hub.chapters.map((ch) => {
                const active = hub.chapter?.id === ch.id;
                return (
                  <Link key={ch.id} to={ch.url} aria-current={active ? 'page' : undefined}
                    className={`inline-flex h-9 sm:h-auto shrink-0 items-center gap-1 whitespace-nowrap rounded-full border px-3 sm:py-1 text-[12.5px] transition-colors ${active ? 'border-ink bg-ink text-white' : 'border-line bg-white text-ink-soft hover:border-ink'}`}>
                    {ch.name} <span className={`fd-nums ${active ? 'text-white/70' : 'text-ink-faint'}`}>{ch.count}</span>
                  </Link>
                );
              })}
            </nav>
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
          fixed={fixed}
          resultCount={totalCount}
          resultLoading={isLoading}
          onChipsChange={setChips}
          trailing={<div className="hidden sm:block">{viewToggle}</div>}
        />

        {/* Content Area */}
        <div ref={listRef}>
          {/* « Pour toi » : rattraper d'un clic ce qu'il a ouvert sans dire s'il l'a réussi (sur la page d'un
              chapitre, seulement ce chapitre). Pas sur une liste restaurée au retour : il décalerait la position. */}
          {isAuthenticated && sortBy === 'recommended' && contentType !== 'lesson' && skipKey.current !== listKey && (
            <CatchUpBanner kind={contentType} chapter={hub?.chapter?.id} onEvaluated={handleCatchUp} />
          )}
          {error && !error.more && errorBox(false)}

          {/* Content Grid/List */}
          {isLoading && items.length === 0 ? (
            <SkeletonCards />
          ) : items.length > 0 ? (
            <div aria-busy={isLoading} className={`transition-opacity ${isLoading ? 'opacity-50 pointer-events-none' : ''}`}>
            {viewMode === 'card' ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 min-[1700px]:grid-cols-3 gap-4 sm:gap-5">
                {items.map((item, i) => (
                  <React.Fragment key={item.id}>
                    <ContentListCard
                      content={item}
                      contentType={contentType}
                      first={i === 0}
                      showSubject={showSubject}
                      levelSlug={hub?.level.slug}
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
                  const itemIsNational = 'is_national_exam' in item && item.is_national_exam;
                  const itemNationalYear = 'national_year' in item ? item.national_year ?? undefined : undefined;
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
                                    state={{ from: listFrom }}
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
                                title={itemCompletions[item.id] === 'success' ? 'Réussi' : itemCompletions[item.id] === 'review' ? 'À revoir' : 'Pas encore fait : dis si tu l’as réussi'}
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
                                      <span>Réussi</span>
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
                                      <span>À revoir</span>
                                    </button>
                                </FloatingPanel>
                              )}
                            </div>

                            {/* Add to revision list - only for exercises/exams */}
                            {contentType !== 'lesson' && (
                              <button
                                onClick={() => {
                                  if (!isAuthenticated) {
                                    openModal('liste-revision');
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
                              onAssess={(path, status, source) => handleAssess(String(item.id), path, status, source)}
                              onSolutionOpen={() => handleSolutionOpen(String(item.id))}
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
                            {(item.comment_count ?? 0) > 0 && (
                              <div className="flex items-center gap-1.5" style={{ color: '#6b6862' }}>
                                <MessageSquare className="w-4 h-4" />
                                <span style={{ fontSize: 13, fontWeight: 600, fontFamily: 'DM Mono' }}>{item.comment_count}</span>
                              </div>
                            )}
                          </div>

                          <Link
                            to={`${config.basePath}/${item.id}`}
                            state={{ from: listFrom }}
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
            )}
            </div>
          ) : !error ? (
            emptyState()
          ) : null}

          {error?.more && <div className="mt-6">{errorBox(true)}</div>}

          {/* Load More Button */}
          {hasMore && !isLoading && items.length > 0 && !error?.more && (
            <div className="mt-8 text-center">
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="fd-btn-ghost"
                style={{ padding: '10px 22px', fontSize: 13, minHeight: 44 }}
              >
                {loadingMore ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Chargement…</>
                ) : (
                  <>Charger plus <ChevronRight className="w-3 h-3" /></>
                )}
              </button>
              <p className="mt-2 text-[12px] text-ink-faint fd-nums">{items.length} sur {totalCount} {totalCount > 1 ? many : one}</p>
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
