/**
 * Listes en dossiers (10/10/2026) : le menu mène aux maths (seule matière), rangées comme des dossiers.
 *  - `levels`   : /exercises, /lessons, /exams — un dossier par niveau. Un élève qui a indiqué sa classe
 *                 arrive directement dans son niveau ; « ?niveau=tous » montre tous les niveaux.
 *  - `chapters` : /…/niveau/:level — un dossier par chapitre du programme ; un chapitre sans contenu est
 *                 un dossier grisé, « Vide pour l'instant », non cliquable.
 *  - `years`    : /exams/nationaux — un dossier par année du Bac national.
 * Dans un dossier de chapitre ou d'année, les « fichiers » sont les cartes habituelles (ContentList).
 * Données : GET /api/hubs/niveaux/, /api/hubs/ (folders), /api/hubs/nationaux/ (backend caracteristics/hubs.py).
 */
import React, { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { Link, Navigate, useLocation, useNavigationType } from 'react-router-dom';
import { ArrowRight, Landmark, Plus, RotateCcw } from 'lucide-react';
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

const SUBJECT = 'Mathématiques';
// Lien « remonter d'un cran » : une vraie cible au doigt (40 px de haut).
const UP_LINK = 'inline-flex min-h-10 items-center text-[13px] font-medium text-brand-hover hover:underline';

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

/** En-tête commun : fil d'Ariane (chaque cran remonte d'un dossier), titre, phrase, résumé. */
const Header: React.FC<{
  trail: { label: string; to?: string }[];
  title: string;
  intro: string;
  summary?: string;
  action?: React.ReactNode;
}> = ({ trail, title, intro, summary, action }) => (
  <div className="pb-4 pt-5 sm:pt-6">
    {trail.length > 0 && (
      // Téléphone : la barre du haut porte déjà le retour (« ‹ Exercices »).
      <nav aria-label="Fil d’Ariane" className="mb-1.5 hidden flex-wrap items-center gap-1.5 text-[12.5px] text-ink-faint sm:flex">
        {trail.map((c, i) => (
          <React.Fragment key={`${c.label}-${i}`}>
            {i > 0 && <span aria-hidden>›</span>}
            {c.to ? <Link to={c.to} className="hover:text-ink hover:underline">{c.label}</Link>
              : <span className="text-ink-soft" aria-current="page">{c.label}</span>}
          </React.Fragment>
        ))}
      </nav>
    )}
    <div className="flex items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="fd-display text-ink" style={{ fontSize: 'clamp(24px,3vw,32px)', fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
          {title}
        </h1>
        <p className="mt-1.5 max-w-3xl text-[13.5px] text-ink-faint line-clamp-2 sm:line-clamp-none">{intro}</p>
        {summary && <p className="fd-nums mt-1 text-[12.5px] font-medium text-ink-soft">{summary}</p>}
      </div>
      {action}
    </div>
  </div>
);

const ErrorBox: React.FC<{ onRetry: () => void }> = ({ onRetry }) => (
  <div role="alert" className="flex flex-col gap-3 rounded-xl border border-[#f0d5d1] bg-[#fbecea] p-4 sm:flex-row sm:items-center">
    <p className="flex-1 text-[14px] font-medium text-[#a23b34]">Les dossiers n’ont pas pu se charger. Vérifie ta connexion.</p>
    <button type="button" onClick={onRetry}
      className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-[#e8c4bf] bg-white px-4 text-[13.5px] font-semibold text-ink hover:bg-[#fdf6f5]">
      <RotateCcw className="h-4 w-4" /> Réessayer
    </button>
  </div>
);

const Page: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ minHeight: '100vh', background: '#faf9f7', paddingBottom: 64 }}>
    <div className="mx-auto max-w-7xl px-4 md:px-6">{children}</div>
  </div>
);

/** Publier : auteurs (profs) et modérateurs. */
const CreateButton: React.FC<{ kind: ContentKind }> = ({ kind }) => {
  const { user } = useAuth();
  if (!(isModerator(user) || user?.profile?.user_type === 'teacher')) return null;
  const t = SECTION_TEXT[kind];
  return (
    <Link to={`${t.basePath}/new`} className="fd-btn-ghost flex-shrink-0" style={{ padding: '9px 14px' }} aria-label={t.createLabel}>
      <Plus className="h-4 w-4" /> <span className="hidden sm:inline">{t.createLabel}</span>
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

  const subject = data?.subject || SUBJECT;
  const groups: FolderGroup[] = data ? [{
    title: null,
    items: data.levels.map((lv) => ({
      key: lv.id,
      name: lv.name,
      to: lv.url,
      count: lv.count,
      countLabel: plural(lv.count, t.noun),
      sub: lv.chapters_total ? `${lv.chapters_filled} chapitre${lv.chapters_filled > 1 ? 's' : ''} sur ${lv.chapters_total}` : undefined,
      badge: myLevel && String(lv.id) === myLevel.id ? 'Ton niveau' : undefined,
      onOpen: () => trackAction('dossier-niveau'),
    })),
  }] : [];
  const total = data ? data.levels.reduce((n, lv) => n + lv.count, 0) : 0;

  return (
    <Page>
      <SEO title={LIST_SEO[kind].title} description={LIST_SEO[kind].description} canonicalUrl={t.basePath} />
      <Header trail={[{ label: subject }]} title={t.title} intro={t.intro}
        summary={data ? `${plural(total, t.noun)} · ${plural(data.levels.length, ['niveau', 'niveaux'])}` : undefined}
        action={<CreateButton kind={kind} />} />
      {error ? <ErrorBox onRetry={() => setAttempt((n) => n + 1)} />
        : !data || (authLoading && !allLevels) ? <FolderSkeleton n={4} />
          : <FolderGrid groups={groups} label={`Niveaux – ${t.title}`} />}
      {kind === 'exam' && (
        <Link to="/exams/nationaux"
          className="mt-5 inline-flex items-center gap-2 rounded-xl border border-line bg-white px-4 py-3 text-[13.5px] text-ink-soft hover:border-ink">
          <Landmark className="h-4 w-4 text-ink-faint" />
          Les sujets du Bac national ont leur rubrique : <b className="font-semibold text-ink">Bac national</b>
          <ArrowRight className="h-4 w-4" />
        </Link>
      )}
    </Page>
  );
};

/* ───────────────────────── Chapitres d'un niveau ───────────────────────── */

/** Dossiers regroupés par sous-domaine, dans l'ordre reçu (le serveur les trie déjà). */
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
  const { isAuthenticated } = useAuth();
  const { setCrumbs } = useBreadcrumb();
  const levelsPath = `${t.basePath}?niveau=tous`;
  const subject = hub.subject || SUBJECT;

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

  // Serveur plus ancien (sans `folders`) : les chapitres qui ont du contenu.
  const folders: HubFolder[] = useMemo(
    () => hub.folders ?? hub.chapters.map((c) => ({ ...c, subfield: null })),
    [hub.folders, hub.chapters],
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

  return (
    <Page>
      <SEO title={hub.title} description={hub.description} canonicalUrl={hub.url} noindex={!hub.indexable} />
      <Header
        trail={[{ label: subject, to: levelsPath }, { label: hub.level.name }]}
        title={hub.h1}
        intro={hub.intro}
        summary={`${plural(folders.length, ['chapitre', 'chapitres'])} · ${filled} avec des ${t.noun[1]} · ${plural(hub.count, t.noun)}`}
        action={<CreateButton kind={kind} />}
      />
      <Link to={levelsPath} className={`mb-2 ${UP_LINK}`}>‹ Tous les niveaux</Link>
      {/* À évaluer : seulement ce niveau ; une évaluation met à jour les dossiers (« 3 faits »). */}
      {isAuthenticated && kind !== 'lesson' && (
        <div className="mb-4"><CatchUpBanner kind={kind} level={hub.level.id} onEvaluated={onProgress} /></div>
      )}
      {folders.length === 0 ? (
        <p className="fd-card p-6 text-center text-[13.5px] text-ink-faint">Aucun chapitre n’est encore rattaché à ce niveau.</p>
      ) : (
        <FolderGrid groups={groups} label={`Chapitres – ${hub.level.name}`} />
      )}
      {hub.related.length > 0 && (
        <p className="mt-6 text-[12.5px] text-ink-faint">
          Aussi pour le {hub.level.name} :{' '}
          {hub.related.map((r, i) => (
            <React.Fragment key={r.url}>
              {i > 0 && ' · '}
              <Link to={r.url} className="font-medium text-brand-hover hover:underline">{r.label}</Link>{' '}
              <span className="fd-nums">({r.count})</span>
            </React.Fragment>
          ))}
        </p>
      )}
      {section === 'exams' && (
        <p className="mt-2 text-[12.5px] text-ink-faint">
          Les sujets du Bac national sont dans <Link to="/exams/nationaux" className="font-medium text-brand-hover hover:underline">Bac national</Link>.
        </p>
      )}
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
    <Page>
      <SEO title={NATIONAL.seoTitle} description={NATIONAL.seoDescription} canonicalUrl="/exams/nationaux" />
      <Header trail={[{ label: data?.subject || SUBJECT }]} title={NATIONAL.title}
        intro={`${NATIONAL.subtitle} Un dossier par année.`}
        summary={data && data.years.length ? `${plural(total, ['sujet', 'sujets'])} · ${plural(data.years.length, ['année', 'années'])}` : undefined}
        action={<CreateButton kind="exam" />} />
      {error ? <ErrorBox onRetry={() => setAttempt((n) => n + 1)} />
        : !data ? <FolderSkeleton n={6} />
          : data.years.length === 0 ? (
            <div className="fd-card text-center" style={{ padding: '40px 20px' }}>
              <h2 className="text-[16px] font-bold text-ink">Les sujets nationaux arrivent bientôt</h2>
              <p className="mx-auto mt-1.5 max-w-md text-[13px] text-ink-faint">
                Les sujets du Bac national corrigés seront publiés ici. En attendant, entraîne-toi sur les devoirs surveillés.
              </p>
              <Link to="/exams" className="fd-btn-primary mt-4 inline-flex">Voir les devoirs surveillés</Link>
            </div>
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
