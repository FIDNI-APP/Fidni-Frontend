/**
 * Listes en dossiers (10/10/2026) : le menu mène aux maths (seule matière), rangées comme des dossiers.
 *  - `levels`   : /exercises, /lessons, /exams — un dossier par niveau. Un élève qui a indiqué sa classe
 *                 arrive directement dans son niveau ; « ?niveau=tous » montre tous les niveaux.
 *  - `chapters` : /…/niveau/:level — un dossier par chapitre du programme ; un chapitre sans contenu est
 *                 un dossier grisé, « Vide pour l'instant », non cliquable.
 *  - `years`    : /exams/nationaux — un dossier par année du Bac national.
 * Dans un dossier de chapitre ou d'année, les « fichiers » sont les cartes habituelles (ContentList).
 * Données : GET /api/hubs/niveaux/, /api/hubs/ (folders), /api/hubs/nationaux/ (backend caracteristics/hubs.py).
 * 11/10/2026 : même en-tête que la liste (FolderHeader : chemin, titre, une ligne, liens), la présentation pour
 * les moteurs de recherche en bas de page.
 */
import React, { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { Link, Navigate, useLocation, useNavigationType } from 'react-router-dom';
import { ArrowRight, Landmark, Plus, RotateCcw } from 'lucide-react';
import { Page, EmptyState } from '@/components/space/Page';
import { FolderAbout, FolderHeader, RelatedLinks } from '@/components/content/folders/FolderHeader';
import { useAuth } from '@/contexts/AuthContext';
import { useBreadcrumb } from '@/contexts/BreadcrumbContext';
import { SEO } from '@/components/layout/SEO';
import { CatchUpBanner } from '@/components/content/listing/CatchUpBanner';
import { FolderGrid, FolderSkeleton, type FolderGroup } from '@/components/content/folders/FolderGrid';
import {
  getLevelFolders, getNationalYears, hubPath, profileLevel, yearPath,
  type HubFolder, type HubInfo, type LevelFolders, type YearFolders,
} from '@/lib/api/hubApi';
import { isModerator } from '@/lib/features';
import { trackAction, trackHubChoice } from '@/lib/usage';
import { LIST_SEO, NATIONAL, SECTION_OF, SECTION_TEXT, plural, type ContentKind } from './sections';

/** Retour (« Précédent ») sur une page de dossiers : la même hauteur qu'au départ (comme ContentList). */
function useScrollMemory(ready: boolean) {
  const { pathname, search } = useLocation();
  const navigationType = useNavigationType();
  const key = `fidni:dossiers:${pathname}${search}`;
  useLayoutEffect(() => {
    if (!ready || navigationType !== 'POP') return;
    try {
      const y = Number(sessionStorage.getItem(key));
      if (y > 0) window.scrollTo(0, y);
    } catch { /* stockage indisponible */ }
  }, [ready, key, navigationType]);
  useEffect(() => () => {
    try { sessionStorage.setItem(key, String(window.scrollY)); } catch { /* stockage indisponible */ }
  }, [key]);
}

const ErrorBox: React.FC<{ onRetry: () => void }> = ({ onRetry }) => (
  <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl border border-[#f0d5d1] bg-[#fbecea] px-4 py-3">
    <p className="flex-1 text-[13.5px] font-medium text-[#a23b34]">Les dossiers n’ont pas pu se charger. Vérifie ta connexion.</p>
    <button type="button" onClick={onRetry} className="fd-btn-ghost min-h-10">
      <RotateCcw className="h-4 w-4" /> Réessayer
    </button>
  </div>
);

/** Publier : auteurs (profs) et modérateurs. */
const CreateButton: React.FC<{ kind: ContentKind }> = ({ kind }) => {
  const { user } = useAuth();
  if (!(isModerator(user) || user?.profile?.user_type === 'teacher')) return null;
  const t = SECTION_TEXT[kind];
  return (
    <Link to={`${t.basePath}/new`} className="fd-btn-ghost min-h-10 flex-shrink-0" aria-label={t.createLabel}>
      <Plus className="h-4 w-4" /> <span>{t.createLabel}</span>
    </Link>
  );
};

/* ───────────────────────── Niveaux ───────────────────────── */

const LevelsView: React.FC<{ kind: ContentKind }> = ({ kind }) => {
  const section = SECTION_OF[kind];
  const t = SECTION_TEXT[kind];
  const location = useLocation();
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const myLevel = profileLevel(user);
  const allLevels = new URLSearchParams(location.search).get('niveau') === 'tous';
  const redirect = !allLevels && !authLoading && isAuthenticated && myLevel ? hubPath(section, myLevel.slug) : null;
  const [data, setData] = useState<LevelFolders | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  // Visiteur (et robot de Google) : seulement les niveaux qui ont du contenu, sans « 3 chapitres sur 12 ».
  const member = useMemberView();

  useEffect(() => {
    if (redirect) return;
    let cancelled = false;
    setError(false);
    getLevelFolders(section)
      .then((d) => { if (!cancelled) setData(d); })
      .catch(() => { if (!cancelled) setError(true); });
    return () => { cancelled = true; };
  }, [section, redirect, attempt]);
  useScrollMemory(!!data && !redirect);

  // Élève qui a indiqué sa classe : directement les chapitres de son niveau (il remonte d'un cran pour les autres).
  if (redirect) return <Navigate to={redirect} replace state={{ auto: true }} />;

  const groups: FolderGroup[] = data ? [{
    title: null,
    items: data.levels.filter((lv) => member || lv.count > 0).map((lv) => ({
      key: lv.id,
      name: lv.name,
      to: lv.url,
      count: lv.count,
      countLabel: plural(lv.count, t.noun),
      sub: !lv.chapters_total ? undefined
        : member ? `${lv.chapters_filled} chapitre${lv.chapters_filled > 1 ? 's' : ''} sur ${lv.chapters_total}`
          : `${lv.chapters_filled} chapitre${lv.chapters_filled > 1 ? 's' : ''}`,
      badge: myLevel && String(lv.id) === myLevel.id ? 'Ton niveau' : undefined,
      onOpen: () => trackAction('dossier-niveau'),
    })),
  }] : [];
  const total = data ? data.levels.reduce((n, lv) => n + lv.count, 0) : 0;

  return (
    <Page width="wide">
      <SEO title={LIST_SEO[kind].title} description={LIST_SEO[kind].description} canonicalUrl={t.basePath} />
      <FolderHeader title={t.title} count={data ? total : null}
        summary={<p>{t.intro}</p>}
        actions={<CreateButton kind={kind} />} />
      {error ? <ErrorBox onRetry={() => setAttempt((n) => n + 1)} />
        : !data || (authLoading && !allLevels) ? <FolderSkeleton n={4} />
          : <FolderGrid groups={groups} label={`Niveaux – ${t.title}`} />}
      {kind === 'exam' && (
        <Link to="/exams/nationaux"
          className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-2xl border border-line bg-white px-4 py-3 text-[13.5px] text-ink-soft transition-[border-color,box-shadow] hover:border-[#cfc9bf] hover:shadow-[0_6px_16px_rgba(20,18,16,.06)]">
          <Landmark className="h-4 w-4 text-ink-faint" />
          Les sujets du Bac national ont leur rubrique : <b className="font-semibold text-ink">Bac national</b>
          <ArrowRight className="h-4 w-4" />
        </Link>
      )}
    </Page>
  );
};

/** Vue « membre » (carte complète du programme, dossiers vides compris) : connecté, ou session en cours de
 *  chargement (pas de dossiers qui disparaissent puis reviennent au démarrage). */
function useMemberView() {
  const { isAuthenticated, isLoading } = useAuth();
  const hadSession = useMemo(() => { try { return !!localStorage.getItem('token'); } catch { return false; } }, []);
  return isAuthenticated || (isLoading && hadSession);
}

/* ───────────────────────── Chapitres d'un niveau ───────────────────────── */

/** Dossiers regroupés par sous-domaine, dans l'ordre reçu (le serveur les trie dans l'ordre du programme officiel). */
function groupFolders(folders: HubFolder[], kind: ContentKind): FolderGroup[] {
  const t = SECTION_TEXT[kind];
  const groups: FolderGroup[] = [];
  for (const f of folders) {
    const title = f.subfield ?? null;
    let g = groups.find((x) => x.title === title);
    if (!g) { g = { title, items: [] }; groups.push(g); }
    g.items.push({
      key: f.id,
      name: f.name,
      to: f.url,
      count: f.count,
      countLabel: plural(f.count, t.noun),
      progress: f.mine ?? null,
      doneWord: t.doneWord,
      aussi: f.aussi,
      // Le chapitre choisi est compté à l'ouverture de sa liste (ContentList, trackHubChoice).
      onOpen: () => trackAction('dossier-chapitre'),
    });
  }
  return groups;
}

const ChaptersView: React.FC<{ kind: ContentKind; hub: HubInfo; onProgress?: () => void }> = ({ kind, hub, onProgress }) => {
  const t = SECTION_TEXT[kind];
  const section = SECTION_OF[kind];
  const location = useLocation();
  const navigationType = useNavigationType();
  const { isAuthenticated, user } = useAuth();
  const canCreate = isModerator(user) || user?.profile?.user_type === 'teacher';
  const { setCrumbs } = useBreadcrumb();
  const levelsPath = `${t.basePath}?niveau=tous`;

  // Barre du haut (téléphone : « ‹ Exercices » remonte aux niveaux) et entrée du menu.
  useEffect(() => {
    setCrumbs([{ label: t.title, to: levelsPath }, { label: hub.level.name }], t.basePath);
    return () => setCrumbs(null);
  }, [hub.level.name, t.title, t.basePath, levelsPath, setCrumbs]);

  // Niveau choisi depuis le site, mesuré comme un filtre. Pas une arrivée directe (location.key « default »), ni un
  // retour (« Précédent »), ni la redirection automatique de l'élève vers son niveau (state.auto).
  useEffect(() => {
    const auto = (location.state as { auto?: boolean } | null)?.auto;
    if (location.key !== 'default' && navigationType !== 'POP' && !auto) trackHubChoice(kind, hub.level.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hub.level.id, kind]);
  useScrollMemory(true);

  // Serveur plus ancien (sans `folders`) : les chapitres qui ont du contenu. Visiteur (et robot de Google) :
  // pas de dossiers vides (« Vide pour l'instant » faisait site en construction) ; un membre voit tout le programme.
  const member = useMemberView();
  const folders: HubFolder[] = useMemo(
    () => (hub.folders ?? hub.chapters.map((c) => ({ ...c, subfield: null }))).filter((f) => member || f.count > 0),
    [hub.folders, hub.chapters, member],
  );
  const groups = useMemo(() => {
    const g = groupFolders(folders, kind);
    // Contenus du niveau rangés dans aucun de ses chapitres : un dossier à part, sinon introuvables d'ici.
    if (hub.unfiled) {
      g.push({ title: 'Autres', items: [{
        key: 'sans-chapitre', name: 'Sans chapitre', count: hub.unfiled, countLabel: plural(hub.unfiled, t.noun),
        to: `${t.basePath}?classLevels=${hub.level.id}&sansChapitre=true`, onOpen: () => trackAction('dossier-chapitre'),
      }] });
    }
    return g;
  }, [folders, kind, hub.unfiled, hub.level.id, t.noun, t.basePath]);
  const filled = folders.filter((f) => f.count > 0).length;
  // Où en est l'élève dans ce niveau (contenus terminés, tous chapitres confondus).
  const done = folders.reduce((n, f) => n + (f.mine?.done ?? 0), 0);
  const success = folders.reduce((n, f) => n + (f.mine?.success ?? 0), 0);

  return (
    <Page width="wide">
      <SEO title={hub.title} description={hub.description} canonicalUrl={hub.url} noindex={!hub.indexable} />
      <FolderHeader
        crumbs={[{ label: t.title, to: levelsPath }]}
        title={hub.h1}
        emphasis={hub.level.name}
        summary={(
          <p className="fd-nums">
            <span className="font-medium text-ink-soft">{plural(hub.count, t.noun)}</span>
            {' '}dans {filled} chapitre{filled > 1 ? 's' : ''}{member && <> sur {folders.length}</>}
            {isAuthenticated && done > 0 && (
              <>
                {' · '}<b className="font-semibold text-ink-soft">{done}</b> {done > 1 ? t.doneWord[1] : t.doneWord[0]}
                {kind !== 'lesson' && success > 0 && <> · <b className="font-semibold text-brand-hover">{success}</b> réussi{success > 1 ? 's' : ''}</>}
                {kind !== 'lesson' && done - success > 0 && <> · <b className="font-semibold text-gold-strong">{done - success}</b> à revoir</>}
              </>
            )}
          </p>
        )}
        actions={hub.related.length > 0 || canCreate ? <><RelatedLinks related={hub.related} /><CreateButton kind={kind} /></> : undefined}
      />
      {/* À évaluer : seulement ce niveau ; une évaluation met à jour les dossiers (« 3 faits »). */}
      {isAuthenticated && kind !== 'lesson' && (
        <CatchUpBanner kind={kind} level={hub.level.id} onEvaluated={onProgress} />
      )}
      {folders.length === 0 ? (
        <EmptyState icon={Landmark} tone="ink" compact title="Aucun chapitre pour l’instant"
          text="Aucun chapitre n’est encore rattaché à ce niveau." />
      ) : (
        <FolderGrid groups={groups} label={`Chapitres – ${hub.level.name}`} />
      )}
      {section === 'exams' && (
        <p className="mt-6 text-[13px] text-ink-faint">
          Les sujets du Bac national sont dans <Link to="/exams/nationaux" className="font-semibold text-brand-hover hover:underline">Bac national</Link>.
        </p>
      )}
      {/* Présentation pour les moteurs de recherche (même texte que la page pré-remplie), en bas de page. */}
      {hub.intro && <FolderAbout>{hub.intro}</FolderAbout>}
    </Page>
  );
};

/* ───────────────────────── Bac national : années ───────────────────────── */

const YearsView: React.FC = () => {
  const [data, setData] = useState<YearFolders | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setError(false);
    getNationalYears()
      .then((d) => { if (!cancelled) setData(d); })
      .catch(() => { if (!cancelled) setError(true); });
    return () => { cancelled = true; };
  }, [attempt]);
  useScrollMemory(!!data);

  const groups: FolderGroup[] = data ? [{
    title: null,
    items: data.years.map((y) => ({
      key: y.year ?? 'aucune',
      name: y.year ? `Bac ${y.year}` : 'Année non précisée',
      to: yearPath(y.year),
      count: y.count,
      countLabel: plural(y.count, ['sujet', 'sujets']),
      sub: y.levels.length ? y.levels.join(' · ') : undefined,
      onOpen: () => trackAction('dossier-annee'),
    })),
  }] : [];
  const total = data ? data.years.reduce((n, y) => n + y.count, 0) : 0;

  return (
    <Page width="wide">
      <SEO title={NATIONAL.seoTitle} description={NATIONAL.seoDescription} canonicalUrl="/exams/nationaux"
        noindex={!!data && data.years.length === 0} />
      <FolderHeader title={NATIONAL.title} count={data ? total : null}
        summary={<p>{NATIONAL.subtitle} Un dossier par année.</p>}
        actions={<CreateButton kind="exam" />} />
      {error ? <ErrorBox onRetry={() => setAttempt((n) => n + 1)} />
        : !data ? <FolderSkeleton n={6} />
          : data.years.length === 0 ? (
            <EmptyState icon={Landmark} tone="gold" title="Les sujets nationaux arrivent bientôt"
              text="Les sujets du Bac national corrigés seront publiés ici. En attendant, entraîne-toi sur les devoirs surveillés."
              action={<Link to="/exams" className="fd-btn-primary min-h-10">Voir les devoirs surveillés</Link>} />
          ) : <FolderGrid groups={groups} label="Années du Bac national" />}
    </Page>
  );
};

type Props =
  | { view: 'levels'; contentType: ContentKind }
  | { view: 'chapters'; contentType: ContentKind; hub: HubInfo; onProgress?: () => void }
  | { view: 'years' };

export const ContentFolders: React.FC<Props> = (props) => {
  if (props.view === 'years') return <YearsView />;
  if (props.view === 'chapters') return <ChaptersView kind={props.contentType} hub={props.hub} onProgress={props.onProgress} />;
  return <LevelsView kind={props.contentType} />;
};

export default ContentFolders;
