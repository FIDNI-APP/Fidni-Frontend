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
 * - 11/10/2026 (alléger) : en-tête des dossiers (chemin, titre, une ligne : combien, réussis, à revoir), barre
 *   de filtres plus légère (statut en onglets, le reste dans « Filtres »), cartes calmes, états vides utiles ;
 *   la présentation pour les moteurs de recherche passe en bas de page.
 */

import React, { useState, useEffect, useLayoutEffect, useCallback, useRef, useMemo } from 'react';
import { Link, useSearchParams, useNavigate, useLocation, useNavigationType } from 'react-router-dom';
import { hubPath, type HubInfo } from '@/lib/api/hubApi';
import {
  Plus,
  BookOpen,
  Check,
  FolderOpen,
  Loader2,
  LayoutGrid,
  FileText,
  RotateCcw,
  SearchX,
  X,
} from 'lucide-react';
import { APlusIcon } from '@/components/icons/APlusIcon';
import { LessonIcon } from '@/components/icons/LessonIcon';
import { exerciseContentAPI, examContentAPI, lessonContentAPI, markSolutionViewed } from '@/lib/api';
import type { AssessSource, PaginatedResponse } from '@/lib/api/contentItemApi';
import { ContentListCard } from '@/components/content/ContentListCard';
import { CatchUpBanner } from '@/components/content/listing/CatchUpBanner';
import { StatementCard } from '@/components/content/listing/StatementCard';
import { usePhone } from '@/components/content/listing/listingUtils';
import { FolderAbout, FolderHeader, RelatedLinks, type Crumb } from '@/components/content/folders/FolderHeader';
import { HorizontalFilterBar } from '@/components/search/HorizontalFilterBar';
import {
  clearedFilters, withoutChip, type ActiveChip, type FilterSlugs, type ListFilters,
} from '@/components/search/filterState';
import { AddToRevisionListModal } from '@/components/revision/AddToRevisionListModal';
import { labelsFromContent } from '@/components/revision/RevisionLabelPicker';
import { SignupStrip } from '@/components/auth/SignupPrompt';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthModal } from '@/components/auth/AuthController';
import { useBreadcrumb } from '@/contexts/BreadcrumbContext';
import { isModerator } from '@/lib/features';
import { Page, EmptyState } from '@/components/space/Page';
import type { Difficulty } from '@/types';
import type {
  ExerciseListItem, ExamListItem, LessonListItem, ContentFilters, AssessmentStatus, ListSort,
} from '@/types/content';
import { AdSlot } from '@/components/ads/AdSlot';
import { SEO } from '@/components/layout/SEO';
import { trackAction, trackFilterChange, trackHubChoice, trackSortValue } from '@/lib/usage';
import { LIST_SEO, NATIONAL, hasListParams, plural } from './sections';

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
  icon: React.ComponentType<{ className?: string }>;
  basePath: string;
  api: ListPageAPI;
}> = {
  exercise: {
    title: 'Exercices',
    subtitle: 'Entraîne-toi chapitre par chapitre, du plus simple au plus exigeant.',
    createLabel: 'Ajouter un exercice',
    emptyMessage: 'Aucun exercice trouvé',
    noun: ['exercice', 'exercices', 'd’exercice'],
    icon: BookOpen,
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
    icon: APlusIcon,
    basePath: '/exams',
    api: examContentAPI,
  },
  lesson: {
    title: 'Leçons',
    subtitle: 'Les cours du programme, avec définitions, propriétés et méthodes.',
    createLabel: 'Ajouter une leçon',
    emptyMessage: 'Aucune leçon trouvée',
    noun: ['leçon', 'leçons', 'de leçon'],
    icon: LessonIcon,
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

interface ContentListProps {
  contentType?: ContentType;
  /** Page par niveau / chapitre : filtres imposés, titre et introduction propres (ContentHub). */
  hub?: HubInfo;
  /** Examens : true = section « Examens nationaux », sinon la section « Examens » ne montre que les devoirs. */
  national?: boolean;
  /** Dossier d'une année du Bac national (/exams/nationaux/:annee) : « 2024 », ou « aucune » (sans année). */
  nationalYear?: string;
}

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

/** Cartes fantômes pendant le premier chargement (même forme que les cartes). */
const SkeletonCards: React.FC = () => (
  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2" role="status" aria-label="Chargement de la liste">
    {[0, 1, 2, 3].map((i) => (
      <div key={i} className="animate-pulse rounded-2xl border border-line bg-white">
        <div className="px-4 pb-4 pt-4 sm:px-5">
          <div className="flex items-center justify-between">
            <div className="h-4 w-24 rounded-full bg-[#f2f1ee]" />
            <div className="h-6 w-14 rounded-lg bg-[#f2f1ee]" />
          </div>
          <div className="mt-3 h-5 w-3/4 rounded bg-[#efece6]" />
          <div className="mt-2.5 h-3.5 w-1/2 rounded bg-[#f2f1ee]" />
          <div className="mt-4 space-y-2 border-l-2 border-[#efece6] pl-3">
            <div className="h-3 w-5/6 rounded bg-[#f4f2ee]" />
            <div className="h-3 w-2/3 rounded bg-[#f4f2ee]" />
          </div>
        </div>
        <div className="flex items-center justify-between border-t border-[#f0ede8] px-4 py-2.5">
          <div className="h-8 w-20 rounded-full bg-[#f2f1ee]" />
          <div className="h-9 w-28 rounded-xl bg-brand-soft" />
        </div>
      </div>
    ))}
  </div>
);

export const ContentList: React.FC<ContentListProps> = ({
  contentType = 'exercise',
  hub,
  national = false,
  nationalYear,
}) => {
  const isNationalSection = contentType === 'exam' && national;
  // Dossier d'une année du Bac national : la liste de l'année (le filtre « Année du Bac » disparaît).
  const yearFolder = isNationalSection && nationalYear ? nationalYear : null;
  const yearLabel = yearFolder === 'aucune' ? 'Année non précisée' : `Bac ${yearFolder}`;
  const baseConfig = CONTENT_TYPE_CONFIG[contentType];
  // Examens : « devoirs » dans la rubrique Devoirs (DS), « sujets » au Bac national (mêmes mots que les dossiers).
  const config = contentType !== 'exam' ? baseConfig : isNationalSection
    ? { ...baseConfig, emptyMessage: 'Aucun sujet trouvé', noun: ['sujet', 'sujets', 'de sujet'] as [string, string, string] }
    : { ...baseConfig, emptyMessage: 'Aucun devoir trouvé', noun: ['devoir', 'devoirs', 'de devoir'] as [string, string, string] };
  const navigate = useNavigate();
  const location = useLocation();
  const navigationType = useNavigationType();
  const [searchParams, setSearchParams] = useSearchParams();
  // Dossier « Sans chapitre » d'un niveau (contenus rangés dans aucun de ses chapitres, hubs.py `unfiled`).
  const unfiledOnly = searchParams.get('sansChapitre') === 'true';
  const { isAuthenticated, user } = useAuth();
  const { openModal } = useAuthModal();
  const phone = usePhone();
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
    if (unfiledOnly) params.sans_chapitre = true;

    // Mode Cartes : sans solutions ni énoncé complet (les leçons gardent leur texte : durée de lecture, sommaire).
    if (viewMode === 'card' && contentType !== 'lesson') params.view = 'card';

    // Examens : chaque section ne montre que les siens ; la période porte sur l'année du Bac.
    if (contentType === 'exam') {
      params.is_national = isNationalSection;
      if (yearFolder) {
        params.national_year = yearFolder === 'aucune' ? 'aucune' : Number(yearFolder);
      } else if (isNationalSection) {
        if (filters.dateStart) params.national_year_min = Number(filters.dateStart);
        if (filters.dateEnd) params.national_year_max = Number(filters.dateEnd);
      }
    }

    return params;
  }, [filters, sortBy, contentType, isNationalSection, viewMode, yearFolder, unfiledOnly]);
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

  // « Tous les niveaux » : les dossiers de niveaux, sans renvoyer l'élève dans le sien (ContentFolders).
  // L'arrivée sur /exercises sans paramètre est gérée par les dossiers (ContentHub.tsx, ContentSection).
  const allLevelsPath = `${config.basePath}?niveau=tous`;

  // Page de niveau / chapitre : fil de la barre du haut (sur téléphone, « ‹ 2ème Bac SM » ramène au niveau ;
  // sans lui, « ‹ Exercices » renvoyait l'élève… sur la page de son niveau).
  const { setCrumbs } = useBreadcrumb();
  useEffect(() => {
    if (yearFolder) {
      setCrumbs([{ label: NATIONAL.title, to: '/exams/nationaux' }, { label: yearLabel ?? '' }], '/exams/nationaux');
      return () => setCrumbs(null);
    }
    if (!hub) return;
    const root = { label: config.title, to: allLevelsPath };
    setCrumbs(hub.chapter
      ? [root, { label: hub.level.name, to: hub.level.url }, { label: hub.chapter.name }]
      : [root, { label: hub.level.name }], config.basePath);
    return () => setCrumbs(null);
  }, [hub, config.title, config.basePath, allLevelsPath, setCrumbs, yearFolder, yearLabel]);

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
    if (skipKey.current === listKey) return;
    skipKey.current = null;
    load(1);
  }, [load, listKey]);

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
    // Sous la barre du haut (60 px) ; téléphone : on laisse voir le bas de la barre de filtres (onglets du statut).
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
    if (unfiledOnly) params.set('sansChapitre', 'true');

    // Un seul niveau (± un chapitre) : la page de ce niveau ou de ce chapitre (pastilles des chapitres,
    // lien vers le cours, vraie adresse). Pas pour les examens nationaux (pas de page par niveau).
    const lv = newFilters.classLevels;
    const chs = newFilters.chapters;
    let target: string | null = null;
    if (!isNationalSection && !unfiledOnly && lv.length === 1 && chs.length <= 1) {
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
      if (!params.has('classLevels')) params.set('niveau', 'tous');
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
      // Plus aucun filtre : l'adresse nue afficherait les dossiers et renverrait l'élève dans son niveau ;
      // « niveau=tous » montre les dossiers de tous les niveaux, là où il était.
      if (!hub && !hasListParams(`?${params}`)) params.set('niveau', 'tous');
    }
    setSearchParams(params, { replace: true });
    scrollToList();
  }, [sortBy, setSearchParams, searchParams, hub, location.pathname, navigate, config.basePath, contentType, isNationalSection, scrollToList, unfiledOnly]);

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
      // Liste générale sans plus aucun paramètre : dossiers de tous les niveaux (voir handleFilterChange).
      if (!hub && !hasListParams(`?${params}`)) params.set('niveau', 'tous');
    }
    setSearchParams(params, { replace: true });
    scrollToList();
  }, [searchParams, setSearchParams, contentType, scrollToList, hub]);

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

  // Cartes / Énoncés (ordinateur seulement).
  const viewToggle = (
    <div data-tour="liste-vue" role="radiogroup" aria-label="Affichage" className="inline-flex rounded-xl border border-line bg-white p-0.5">
      {([
        ['card', 'Cartes', LayoutGrid],
        ['full', 'Énoncés', FileText],
      ] as const).map(([mode, label, Icon]) => (
        <button
          key={mode}
          type="button"
          role="radio"
          aria-checked={viewMode === mode}
          aria-label={label}
          onClick={() => setViewMode(mode)}
          title={label}
          className={`inline-flex h-9 items-center gap-1.5 rounded-[10px] px-2.5 text-[13px] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 ${
            viewMode === mode ? 'bg-[#f2f1ee] text-ink' : 'text-ink-faint hover:text-ink'}`}
        >
          <Icon className="h-4 w-4" />
          <span className="hidden xl:inline">{label}</span>
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
    <div role="alert" className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-[#f0d5d1] bg-[#fbecea] px-4 py-3">
      <p className="flex-1 text-[13.5px] font-medium text-[#a23b34]">
        {more ? 'La suite de la liste n’a pas pu se charger.' : 'La liste n’a pas pu se charger.'} Vérifie ta connexion.
      </p>
      <button type="button" onClick={() => load(more ? page + 1 : 1)} className="fd-btn-ghost min-h-10">
        <RotateCcw className="h-4 w-4" /> Réessayer
      </button>
    </div>
  );

  const chipBtn = 'inline-flex min-h-10 items-center gap-1.5 rounded-full bg-[#efece6] pl-3.5 pr-2.5 text-[13px] font-medium text-ink-soft transition-colors hover:bg-[#e7e3dc] hover:text-ink';

  // Liste vide : pourquoi, et quoi faire ensuite.
  const emptyState = () => {
    // Page de niveau / chapitre sans aucun contenu : rien à filtrer (pas de « Tout est réussi » trompeur
    // en arrivant par « S'entraîner », ni de « Retirer … »).
    const nothingHere = !!hub && hub.count === 0;
    const filterChips = nothingHere ? [] : chips;
    const only = filterChips.length === 1 ? filterChips[0].key : null;
    const onlyTodo = only === 'todo';
    let title: string;
    let text: string;
    let icon: React.ComponentType<{ className?: string }> = config.icon;
    let tone: 'brand' | 'gold' | 'ink' = 'ink';
    let actions: React.ReactNode = null;
    if (onlyTodo) {
      title = 'Tout est réussi ici, bravo !';
      text = `Tu as réussi tous les ${many} de cette liste. Choisis « Tout » pour les revoir.`;
      icon = Check;
      tone = 'brand';
    } else if (only === 'showFailed') {
      title = 'Rien à revoir ici';
      text = `Aucun ${one} marqué « À revoir » dans cette liste. Continue comme ça !`;
      icon = Check;
      tone = 'brand';
    } else if (only === 'showCompleted') {
      title = 'Rien de réussi ici pour l’instant';
      text = `Quand tu marques un ${one} « Réussi », il apparaît ici.`;
      icon = Check;
    } else if (filterChips.length > 0) {
      title = config.emptyMessage;
      text = 'Aucun résultat avec ces filtres : retire-en un.';
      icon = SearchX;
    } else if (hub?.chapter) {
      title = `Pas encore ${ofNoun} sur ce chapitre`;
      const hasNeighbours = hub.chapters.some((c) => c.id !== hub.chapter!.id && c.count > 0);
      text = hub.related.length > 0
        ? `Ça arrive bientôt. En attendant, ${hub.related.some((r) => r.section === 'lessons') ? 'lis le cours' : 'regarde les autres rubriques'}${hasNeighbours ? ' ou un chapitre voisin' : ''}.`
        : hasNeighbours ? 'Ça arrive bientôt. En attendant, essaie un chapitre voisin.' : 'Ça arrive bientôt.';
      icon = FolderOpen;
    } else if (hub) {
      title = `Pas encore ${ofNoun} pour ce niveau`;
      text = 'Ça arrive bientôt.';
      icon = FolderOpen;
    } else if (yearFolder) {
      title = 'Aucun sujet pour cette année';
      text = 'Les autres années du Bac national sont dans leurs dossiers.';
      actions = <Link to="/exams/nationaux" className="fd-btn-primary min-h-10">Toutes les années</Link>;
    } else if (isNationalSection) {
      title = 'Les sujets nationaux arrivent bientôt';
      text = 'Les sujets du Bac national corrigés seront publiés ici. En attendant, entraîne-toi sur les devoirs surveillés.';
      actions = <Link to="/exams" className="fd-btn-primary min-h-10">Voir les devoirs surveillés</Link>;
    } else {
      title = 'Rien de publié ici pour le moment';
      text = 'Les premiers contenus arrivent bientôt.';
    }

    if (only === 'todo' || only === 'showFailed' || only === 'showCompleted') {
      actions = (
        <button type="button" onClick={() => handleFilterChange(withoutChip(filters, only))} className="fd-btn-primary min-h-10">
          Tout afficher
        </button>
      );
    } else if (filterChips.length > 0) {
      actions = (
        <div className="flex flex-wrap items-center justify-center gap-2">
          {filterChips.map((chip) => (
            <button key={chip.key} type="button" onClick={() => handleFilterChange(withoutChip(filters, chip.key))} className={chipBtn}>
              Retirer {chip.label} <X className="h-3.5 w-3.5" />
            </button>
          ))}
          {filterChips.length > 1 && (
            <button type="button" onClick={() => handleFilterChange(clearedFilters(fixed))}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium text-ink-faint hover:bg-[#f2f1ee] hover:text-ink">
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
                <Link key={r.url} to={r.url} className="fd-btn-primary min-h-10">
                  {r.label} <span className="fd-nums opacity-80">({r.count})</span>
                </Link>
              ))}
            </div>
          )}
          {neighbours.length > 0 && (
            <div className="flex flex-wrap items-center justify-center gap-2">
              <span className="text-[12.5px] text-ink-faint">Chapitres voisins :</span>
              {neighbours.map((c) => (
                <Link key={c.id} to={c.url} className="inline-flex min-h-10 items-center rounded-full border border-line bg-white px-3.5 text-[13px] text-ink-soft hover:border-[#cfc9bf] hover:text-ink">
                  {c.name} <span className="fd-nums ml-1.5 text-ink-faint">{c.count}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      ) : null;
    } else if (!isNationalSection && canPublish) {
      actions = (
        <button type="button" onClick={handleNewContentClick} className="fd-btn-ghost min-h-10">
          <Plus className="h-4 w-4" /> {config.createLabel}
        </button>
      );
    }

    return <EmptyState icon={icon} tone={tone} title={title} text={text} action={actions} />;
  };

  // En-tête : les dossiers parents (chaque cran remonte d'un dossier), le titre, une ligne.
  const crumbs: Crumb[] = hub
    ? [{ label: config.title, to: allLevelsPath }, ...(hub.chapter ? [{ label: hub.level.name, to: hub.level.url }] : [])]
    : isNationalSection
      ? (yearFolder ? [{ label: NATIONAL.title, to: '/exams/nationaux' }] : [{ label: 'Toutes les années', to: '/exams/nationaux' }])
      : [{ label: 'Tous les niveaux', to: allLevelsPath }];
  const pageTitle = hub ? hub.h1
    : yearFolder ? (yearFolder === 'aucune' ? 'Bac national : année non précisée' : `Bac national ${yearFolder}`)
      : isNationalSection ? NATIONAL.title : unfiledOnly ? `${config.title} sans chapitre` : config.title;

  // Où en est l'élève dans ce dossier : seulement quand toute la liste est là (sinon les nombres mentiraient).
  const mine = useMemo(() => {
    if (!isAuthenticated || hasMore || !items.length) return null;
    let success = 0;
    let review = 0;
    items.forEach((it) => {
      const c = itemCompletions[String(it.id)] ?? it.user_complete ?? null;
      if (c === 'success') success++;
      else if (c === 'review') review++;
    });
    return { success, review };
  }, [isAuthenticated, hasMore, items, itemCompletions]);

  const summary = isLoading && !items.length ? (
    <span className="inline-block h-4 w-44 animate-pulse rounded bg-[#efece6]" aria-hidden />
  ) : totalCount > 0 ? (
    <p className="fd-nums">
      <span className="font-medium text-ink-soft">{plural(totalCount, [one, many])}</span>
      {mine && mine.success > 0 && (
        <> · <b className="font-semibold text-brand-hover">{mine.success}</b> {contentType === 'lesson' ? (mine.success > 1 ? 'lues' : 'lue') : (mine.success > 1 ? 'réussis' : 'réussi')}</>
      )}
      {mine && mine.review > 0 && <> · <b className="font-semibold text-gold-strong">{mine.review}</b> à revoir</>}
    </p>
  ) : null;

  const headerActions = (hub?.related.length || canPublish) ? (
    <>
      {hub && <RelatedLinks related={hub.related} />}
      {/* Publier : réservé aux auteurs et aux modérateurs. */}
      {canPublish && (
        <button onClick={handleNewContentClick} data-tour="liste-creer" className="fd-btn-ghost min-h-10" aria-label={config.createLabel}>
          <Plus className="h-4 w-4" />
          <span>{config.createLabel}</span>
        </button>
      )}
    </>
  ) : undefined;

  return (
    <div ref={rootRef}>
    <Page width="wide">
      {/* Mêmes titres que les pages pré-remplies par le serveur (backend/src/config/seo.py). */}
      {hub ? (
        <SEO title={hub.title} description={hub.description} canonicalUrl={hub.url} noindex={!hub.indexable} />
      ) : yearFolder ? (
        <SEO title={`${yearFolder === 'aucune' ? 'Bac national, année non précisée' : `Bac national ${yearFolder}`} : sujets de maths corrigés – Maroc | Fidni`}
          description={NATIONAL.seoDescription} canonicalUrl={`/exams/nationaux/${yearFolder}`}
          noindex={yearFolder === 'aucune' || (!isLoading && totalCount === 0)} />
      ) : isNationalSection ? (
        <SEO title={NATIONAL.seoTitle} description={NATIONAL.seoDescription} canonicalUrl="/exams/nationaux" />
      ) : (
        <SEO title={LIST_SEO[contentType].title} description={LIST_SEO[contentType].description} canonicalUrl={config.basePath} />
      )}

      <FolderHeader
        crumbs={crumbs}
        title={pageTitle}
        emphasis={hub ? (hub.chapter?.name ?? hub.level.name) : null}
        summary={summary}
        actions={headerActions}
      />

      {/* Dossier vide : rien à filtrer ni à trier. */}
      {!(hub && hub.count === 0) && <HorizontalFilterBar
        contentType={contentType}
        filters={filters}
        onFilterChange={handleFilterChange}
        sortBy={sortBy}
        onSortChange={handleSortChange}
        nationalSection={isNationalSection}
        inFolder={hub?.chapter ? 'chapter' : yearFolder ? 'year' : undefined}
        nationalYear={yearFolder ?? undefined}
        fixed={fixed}
        resultCount={totalCount}
        resultLoading={isLoading}
        onChipsChange={setChips}
        trailing={<div className="hidden sm:block">{viewToggle}</div>}
      />}

      <div ref={listRef}>
        {/* « Pour toi » : rattraper d'un clic ce qu'il a ouvert sans dire s'il l'a réussi (sur la page d'un
            chapitre, seulement ce chapitre). Pas sur une liste restaurée au retour : il décalerait la position. */}
        {isAuthenticated && sortBy === 'recommended' && contentType !== 'lesson' && skipKey.current !== listKey && (
          <CatchUpBanner kind={contentType} chapter={hub?.chapter?.id} onEvaluated={handleCatchUp} />
        )}
        {error && !error.more && errorBox(false)}

        {isLoading && items.length === 0 ? (
          <SkeletonCards />
        ) : items.length > 0 ? (
          <div aria-busy={isLoading} className={`transition-opacity ${isLoading ? 'pointer-events-none opacity-50' : ''}`}>
            {viewMode === 'card' ? (
              <ul className="grid grid-cols-1 gap-4 lg:grid-cols-2" aria-label={pageTitle}>
                {items.map((item, i) => (
                  <React.Fragment key={item.id}>
                    <li className="min-w-0">
                      <ContentListCard
                        content={item}
                        contentType={contentType}
                        first={i === 0}
                        showSubject={showSubject}
                        levelSlug={hub?.level.slug}
                        hideLevel={filters.classLevels.length === 1}
                        hideChapter={!!hub?.chapter || filters.chapters.length === 1}
                        hideNational={!!yearFolder}
                        onEdit={(id) => navigate(`${config.basePath}/${id}/edit`)}
                        onDelete={handleDeleteItem}
                      />
                    </li>
                    {/* Visiteur : une invitation après les premières cartes, pas plus. */}
                    {!isAuthenticated && i === Math.min(3, items.length - 1) && (
                      <li className="lg:col-span-2"><SignupStrip /></li>
                    )}
                  </React.Fragment>
                ))}
              </ul>
            ) : (
              <div className="mx-auto flex max-w-4xl flex-col gap-6">
                {items.map((item) => {
                  const id = String(item.id);
                  // Questions évaluées et validations de solution, réunies pour le rendu de l'énoncé.
                  const progressEntries = itemProgress[id] || {};
                  const validationEntries = itemValidations[id] || {};
                  const allPaths = new Set([...Object.keys(progressEntries), ...Object.keys(validationEntries)]);
                  const progressData = allPaths.size > 0
                    ? Object.fromEntries([...allPaths].map((path) => [path, {
                      status: progressEntries[path] || null,
                      solution_validation: validationEntries[path] || null,
                      assessed_at: new Date().toISOString(),
                    }]))
                    : undefined;
                  return (
                    <StatementCard
                      key={item.id}
                      item={item}
                      kind={contentType}
                      path={`${config.basePath}/${item.id}`}
                      from={listFrom}
                      isAuthenticated={isAuthenticated}
                      hideLevel={!!hub}
                      saved={!!itemBookmarks[id]}
                      onToggleSave={() => handleBookmark(id)}
                      completion={itemCompletions[id] ?? null}
                      onSetCompletion={(st) => handleSetCompletion(id, st)}
                      vote={itemVotes[id] ?? { vote: 0, likes: 0, dislikes: 0 }}
                      onVote={(v) => handleVote(id, v)}
                      timer={itemTimers[id] ?? { isRunning: false, elapsed: 0 }}
                      savingTimer={!!savingTimer[id]}
                      sessionCount={sessionCounts[id] ?? 0}
                      onToggleTimer={() => handleToggleTimer(id)}
                      onResetTimer={() => handleResetTimer(id)}
                      onSaveTimer={() => handleSaveTimerSession(id)}
                      onAddToList={() => {
                        if (!isAuthenticated) { openModal('liste-revision'); return; }
                        setRevisionListModal({ isOpen: true, itemId: id, itemTitle: item.title });
                      }}
                      progressData={progressData}
                      onAssess={(path, status, source) => handleAssess(id, path, status, source)}
                      onSolutionOpen={() => handleSolutionOpen(id)}
                      showAllSolutions={showAllSolutions}
                    />
                  );
                })}
              </div>
            )}
          </div>
        ) : !error ? (
          emptyState()
        ) : null}

        {error?.more && <div className="mt-6">{errorBox(true)}</div>}

        {/* La suite de la liste. */}
        {hasMore && !isLoading && items.length > 0 && !error?.more && (
          <div className="mt-8 flex flex-col items-center gap-2">
            <button type="button" onClick={handleLoadMore} disabled={loadingMore} className="fd-btn-ghost min-h-11 px-5 text-[13.5px]">
              {loadingMore ? <><Loader2 className="h-4 w-4 animate-spin" /> Chargement…</> : <>Voir la suite</>}
            </button>
            <p className="fd-nums text-[12px] text-ink-faint">{items.length} sur {totalCount} {totalCount > 1 ? many : one}</p>
          </div>
        )}

        {/* Toute la liste est là. */}
        {totalPages > 1 && !hasMore && (
          <p className="fd-nums mt-8 text-center text-[12px] text-ink-faint">{items.length} sur {totalCount} {totalCount > 1 ? many : one}</p>
        )}

        {items.length > 0 && <AdSlot className="mt-10" />}

        {/* Présentation pour les moteurs de recherche (même texte que la page pré-remplie), en bas de page. */}
        {hub?.intro && <FolderAbout>{hub.intro}</FolderAbout>}
      </div>

      {/* Liste de révision (affichage Énoncés). */}
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
    </Page>
    </div>
  );
};

export default ContentList;
