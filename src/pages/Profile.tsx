/**
 * Profil (/profile/:username, refonte du 11/10/2026).
 *  - Propriétaire : un en-tête (photo, pseudo, niveau, « membre depuis », Modifier mon profil), puis trois onglets
 *    gardés dans l'adresse : ?tab=overview (Profil, par défaut) · progress (Réussis / à revoir) · settings (Paramètres) ;
 *    enseignant : overview · students (Mes élèves) · settings.
 *  - Visiteur : l'en-tête et les publications, rien d'autre (le serveur ne lui envoie pas le reste).
 * Anciens onglets (propriétaire) : statistics → /progression, revisionlists → /reviser#mes-listes,
 * saved → /enregistrements, notebooks → /enregistrements?onglet=cahiers, skilliq → /skill-iq.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { CalendarDays, GraduationCap, Lock, MapPin, Pencil, Plus, RotateCcw, UserX } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { SEO } from '@/components/layout/SEO';
import { api } from '@/lib/api/apiClient';
import { identityFromUser } from '@/lib/identity';
import type { Content } from '@/types';
import { CardsSkeleton, EmptyState, Page, Section, Segmented } from '@/components/space/Page';
import { PublicationsList, type Goal, type PublishedItem } from '@/components/profile/ProfileBilanSection';
import { ProfileOverview } from '@/components/profile/ProfileOverview';
import { ProgressSection } from '@/components/profile/ProgressSection';
import { SettingsSection } from '@/components/profile/SettingsSection';
import TeacherStudentsPanel from '@/components/profile/TeacherStudentsPanel';
import { ModerationDeleteButton } from '@/components/profile/ModerationDeleteButton';
import { t, dateLocale } from '@/i18n';

type TabId = 'overview' | 'progress' | 'students' | 'settings';

const TABS: Record<'student' | 'teacher', { key: TabId; label: string }[]> = {
  student: [
    { key: 'overview', label: 'Profil' },
    { key: 'progress', label: 'Réussis / à revoir' },
    { key: 'settings', label: 'Paramètres' },
  ],
  teacher: [
    { key: 'overview', label: 'Profil' },
    { key: 'students', label: 'Mes élèves' },
    { key: 'settings', label: 'Paramètres' },
  ],
};

/** Anciens onglets du profil, devenus des pages (liens gardés dans les favoris, les e-mails…). */
const LEGACY: Record<string, string> = {
  statistics: '/progression',
  revisionlists: '/reviser#mes-listes',
  saved: '/enregistrements',
  notebooks: '/enregistrements?onglet=cahiers',
  skilliq: '/skill-iq',
};

/** Profil tel que renvoyé par GET /users/<u>/ (les champs privés n'arrivent qu'au propriétaire). */
interface ProfileData {
  id: number | string;
  username: string;
  date_joined?: string;
  profile?: {
    user_type?: string;
    avatar?: string | null;
    bio?: string;
    location?: string;
    class_level?: number | string | { id: string | number; name: string } | null;
    class_level_name?: string | null;
    joined_at?: string;
    subject_grades?: Goal[];
  };
}

interface Loaded {
  for: string;
  profile: ProfileData;
  stats: { contribution_stats?: { total_contributions?: number; upvotes_received?: number; view_count?: number } } | null;
  contributions: PublishedItem[];
}

const PAPER: React.CSSProperties = {
  backgroundColor: '#f4f1ea',
  backgroundImage: 'linear-gradient(#e6e0d4 1px, transparent 1px), linear-gradient(90deg, #e6e0d4 1px, transparent 1px)',
  backgroundSize: '22px 22px',
};

/** Photo de profil ; si elle ne se charge pas, l'initiale (avant : le texte de remplacement en grand). */
const Avatar: React.FC<{ src?: string | null; name: string; className?: string }> = ({ src, name, className = '' }) => {
  const [broken, setBroken] = useState(false);
  useEffect(() => { setBroken(false); }, [src]);
  return (
    <span className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-ink font-bold text-white ring-4 ring-white ${className}`}>
      {src && !broken
        ? <img src={src} alt="" onError={() => setBroken(true)} className="h-full w-full object-cover" />
        : <span aria-hidden>{name.charAt(0).toUpperCase()}</span>}
    </span>
  );
};

const HeroSkeleton: React.FC = () => (
  <div role="status" aria-label={t('Chargement du profil')}>
    <div className="animate-pulse overflow-hidden rounded-3xl border border-line bg-white">
      <div className="h-14 border-b border-line bg-[#f4f1ea] sm:h-20" />
      <div className="flex items-end gap-4 px-5 pb-6 sm:px-7">
        <div className="-mt-9 h-[72px] w-[72px] shrink-0 rounded-full bg-[#efece6] ring-4 ring-white sm:-mt-11 sm:h-[88px] sm:w-[88px]" />
        <div className="flex-1 pb-1">
          <div className="h-3 w-14 rounded bg-[#f2f1ee]" />
          <div className="mt-2 h-6 w-40 max-w-full rounded bg-[#efece6]" />
        </div>
      </div>
    </div>
    <CardsSkeleton n={2} className="mt-10" />
  </div>
);

export const ProfilePage: React.FC = () => {
  const { username = '' } = useParams<{ username: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user: currentUser, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [data, setData] = useState<Loaded | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'notfound' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!username) return;
    let alive = true;
    setState('loading');
    const u = encodeURIComponent(username);
    Promise.all([
      api.get(`/users/${u}/`).then((r) => r.data as ProfileData),
      api.get(`/users/${u}/stats/`).then((r) => r.data).catch(() => null),
      api.get(`/users/${u}/contributions/`).then((r) => r.data).catch(() => []),
    ]).then(([profile, stats, contribs]) => {
      if (!alive) return;
      const items = Array.isArray(contribs) ? contribs : (contribs as { results?: PublishedItem[] })?.results ?? [];
      setData({ for: username, profile, stats, contributions: items });
      setState('ready');
    }).catch((err) => {
      if (alive) setState((err as { response?: { status?: number } })?.response?.status === 404 ? 'notfound' : 'error');
    });
    return () => { alive = false; };
  }, [username, attempt]);

  const profile = data?.profile;
  // Pseudo qui vient de changer (Paramètres) : l'adresse suit, le profil affiché reste celui du propriétaire.
  const isOwner = !!currentUser && (currentUser.username === username || (!!profile && String(profile.id) === String(currentUser.id)));
  const renaming = state === 'loading' && !!data && data.for !== username && !!currentUser
    && currentUser.username === username && String(data.profile.id) === String(currentUser.id);
  const shown = state === 'ready' || renaming ? data : null;

  const userType: 'student' | 'teacher' = profile?.profile?.user_type === 'teacher' ? 'teacher' : 'student';
  const tabs = isOwner ? TABS[userType] : [];
  const requested = searchParams.get('tab');
  const tab: TabId = tabs.find((tb) => tb.key === requested)?.key ?? 'overview';

  // Anciens onglets : leur page pour le propriétaire ; pour les autres, le profil simplement.
  useEffect(() => {
    const target = LEGACY[requested ?? ''];
    if (!target || authLoading) return;
    if (currentUser?.username === username) {
      navigate(target, { replace: true });
    } else if (state !== 'loading') {
      const next = new URLSearchParams(searchParams);
      next.delete('tab');
      setSearchParams(next, { replace: true });
    }
  }, [requested, authLoading, currentUser?.username, username, state, navigate, searchParams, setSearchParams]);

  const selectTab = (id: TabId) => {
    const next = new URLSearchParams(searchParams);
    if (id === 'overview') next.delete('tab');
    else next.set('tab', id);
    setSearchParams(next);
  };

  // Onglets déjà ouverts : ils restent montés (cachés), on y revient instantanément.
  const [visited, setVisited] = useState<Set<string>>(() => new Set());
  const visitKey = `${username}:${tab}`;
  useEffect(() => { setVisited((prev) => (prev.has(visitKey) ? prev : new Set(prev).add(visitKey))); }, [visitKey]);

  // Réussis / à revoir : chargés à la première ouverture de l'onglet (le serveur les refuse aux visiteurs).
  const [progress, setProgress] = useState<{ for: string; success: Content[]; review: Content[] } | null>(null);
  const [progressFailed, setProgressFailed] = useState(false);
  const asked = useRef<string | null>(null);
  const loadProgress = useCallback(() => {
    const u = username;
    asked.current = u;
    setProgressFailed(false);
    const list = (status: 'success' | 'review') =>
      api.get(`/users/${encodeURIComponent(u)}/${status}_thing/`).then((r) => (Array.isArray(r.data) ? r.data as Content[] : []));
    Promise.all([list('success'), list('review')])
      .then(([success, review]) => { if (asked.current === u) setProgress({ for: u, success, review }); })
      .catch(() => { if (asked.current === u) setProgressFailed(true); });
  }, [username]);
  useEffect(() => {
    if (tab === 'progress' && isOwner && asked.current !== username) loadProgress();
  }, [tab, isOwner, username, loadProgress]);

  // Prénom, nom, établissement : le propriétaire se relit, les visiteurs ne reçoivent même pas ces champs.
  const privateLine = useMemo(() => {
    if (!isOwner || !currentUser) return '';
    const id = identityFromUser(currentUser);
    const civ = id.gender === 'M' ? `${t('M.')} ` : id.gender === 'F' ? `${t('Mme')} ` : '';
    const name = `${id.firstName} ${id.lastName}`.trim();
    return [name && `${civ}${name}`, id.school.name].filter(Boolean).join(' · ');
  }, [isOwner, currentUser]);

  // Profils de membres : pas à indexer (pages de personnes, peu de contenu propre).
  const seo = <SEO title={`${username || t('Profil')} – Fidni`} description={t('Profil d’un membre de Fidni.')} noindex />;

  if (state === 'notfound') {
    return (
      <Page width="narrow">
        {seo}
        <EmptyState icon={UserX} tone="ink" title={t('Ce profil n’existe pas (ou plus)')}
          text={t('Le pseudo a peut-être changé, ou le compte a été supprimé.')}
          action={<Link to="/" className="fd-btn-primary min-h-10">{t('Retour à l’accueil')}</Link>} />
      </Page>
    );
  }

  if (state === 'error' && !renaming) {
    return (
      <Page>
        <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl border border-[#f0d5d1] bg-[#fbecea] px-4 py-3">
          <p className="flex-1 text-[13.5px] font-medium text-[#a23b34]">{t('Ce profil n’a pas pu se charger. Vérifie ta connexion.')}</p>
          <button type="button" onClick={() => setAttempt((n) => n + 1)} className="fd-btn-ghost min-h-10"><RotateCcw className="h-4 w-4" /> {t('Réessayer')}</button>
        </div>
      </Page>
    );
  }

  if (!shown) return <Page><HeroSkeleton /></Page>;

  const p = shown.profile.profile ?? {};
  const name = shown.profile.username || username;
  const joined = p.joined_at ?? shown.profile.date_joined;
  const since = joined ? new Date(joined).toLocaleDateString(dateLocale(), { month: 'long', year: 'numeric' }) : null;
  const meta = [
    p.class_level_name && { icon: GraduationCap, text: p.class_level_name },
    p.location && { icon: MapPin, text: p.location },
    since && { icon: CalendarDays, text: t('Membre depuis {since}', { since }) },
  ].filter(Boolean) as { icon: typeof MapPin; text: string }[];

  const cs = shown.stats?.contribution_stats;
  const figures = [
    // `total_contributions` ne compte que les exercices : on préfère la vraie liste.
    { label: 'Publications', value: shown.contributions.length || (cs?.total_contributions ?? 0) },
    { label: 'Votes reçus', value: cs?.upvotes_received ?? 0 },
    { label: 'Vues', value: cs?.view_count ?? 0 },
  ];
  const showFigures = figures.some((f) => f.value > 0);
  const editUrl = `/profile/${name}/edit`;
  const missing = isOwner ? [
    !p.bio && { label: 'Présentation', to: `${editUrl}#photo` },
    userType !== 'teacher' && !p.class_level && { label: 'Niveau', to: `${editUrl}#scolarite` },
  ].filter(Boolean) as { label: string; to: string }[] : [];

  const panel = (id: TabId, node: React.ReactNode) =>
    id === tab || visited.has(`${username}:${id}`) ? (
      <div key={id} role="tabpanel" aria-label={t(tabs.find((tb) => tb.key === id)?.label ?? '')} hidden={id !== tab}>{node}</div>
    ) : null;

  return (
    <Page>
      {seo}
      {/* ── En-tête : qui est cette personne ── */}
      <header className="overflow-hidden rounded-3xl border border-line bg-white">
        {/* Bandeau papier quadrillé, même motif que les cahiers. */}
        <div aria-hidden className="h-14 border-b border-line sm:h-20" style={PAPER} />
        <div className="px-5 pb-5 sm:px-7 sm:pb-6">
          {/* Ordinateur : l'action à droite du nom ; téléphone : à la fin de l'en-tête, après les détails. */}
          <div className="grid gap-x-4 sm:grid-cols-[minmax(0,1fr)_auto]">
            <div className="flex min-w-0 items-end gap-4 sm:col-start-1 sm:row-start-1" data-tour="profil-identite">
              <Avatar src={p.avatar} name={name}
                className="-mt-9 h-[72px] w-[72px] text-[28px] sm:-mt-11 sm:h-[88px] sm:w-[88px] sm:text-[34px]" />
              <div className="min-w-0 pb-0.5">
                <p className="text-[11px] font-bold uppercase tracking-[.1em] text-gold-strong">{userType === 'teacher' ? t('Enseignant') : t('Élève')}</p>
                <h1 className="fd-display truncate text-ink" style={{ fontSize: 'clamp(26px, 3vw, 34px)', lineHeight: 1.12 }}>{name}</h1>
              </div>
            </div>
            {(isOwner || currentUser?.is_superuser) && (
              <div className="order-last mt-4 sm:order-none sm:col-start-2 sm:row-start-1 sm:mt-0 sm:self-end">
                {isOwner ? (
                  <Link to={editUrl} className="fd-btn-ghost min-h-10" data-tour="profil-modifier">
                    <Pencil className="h-4 w-4" /> {t('Modifier mon profil')}
                  </Link>
                ) : <ModerationDeleteButton username={name} />}
              </div>
            )}

            <div className="min-w-0 sm:col-span-2">
              {meta.length > 0 && (
                <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[13px] text-ink-soft" aria-label={t('En bref')}>
                  {meta.map(({ icon: Icon, text }) => (
                    <li key={text} className="inline-flex items-center gap-1.5"><Icon className="h-3.5 w-3.5 text-ink-faint" aria-hidden /> {text}</li>
                  ))}
                </ul>
              )}

              {p.bio && <p className="mt-3 max-w-2xl whitespace-pre-line text-[14px] leading-relaxed text-ink-soft">{p.bio}</p>}

              {/* Identité réelle : rappelée au propriétaire seulement, jamais montrée aux visiteurs. */}
              {isOwner && privateLine && (
                <p className="mt-3 inline-flex max-w-full flex-wrap items-center gap-x-1.5 rounded-lg bg-[#f2f1ee] px-2.5 py-1.5 text-[12.5px] text-ink-soft"
                  title={t('Visible de toi seul : ton pseudo reste ton nom public')}>
                  <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  <span className="min-w-0">{privateLine}</span>
                  <span className="text-ink-faint">· {t('visible de toi seul')}</span>
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Pied : ce que la personne a apporté (rien tant que tout est à zéro), ce qui manque au profil. */}
        {(showFigures || missing.length > 0) && (
          <div className="flex flex-col gap-3 border-t border-line bg-[#fcfbf9] px-5 py-3.5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:px-7">
            {showFigures && (
              <dl className="flex flex-wrap gap-x-7 gap-y-2">
                {figures.map((f) => (
                  <div key={f.label} className="flex flex-col-reverse">
                    <dt className="text-[11.5px] text-ink-faint">{t(f.label)}</dt>
                    <dd className="fd-nums text-[18px] font-bold leading-tight text-ink">{f.value.toLocaleString(dateLocale())}</dd>
                  </div>
                ))}
              </dl>
            )}
            {missing.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[12.5px] font-medium text-ink-soft">{t('Complète ton profil :')}</span>
                {missing.map((m) => (
                  <Link key={m.label} to={m.to}
                    className="inline-flex min-h-10 items-center gap-1 rounded-full border border-gold-line bg-gold-soft px-3.5 text-[12.5px] font-semibold text-gold-strong transition-colors hover:border-gold">
                    <Plus className="h-3.5 w-3.5" aria-hidden /> {t(m.label)}
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </header>

      {isOwner ? (
        <>
          <div className="mt-8" data-tour="profil-onglets">
            <Segmented<TabId> label={t('Ton profil')} value={tab} onChange={selectTab} options={tabs.map((o) => ({ ...o, label: t(o.label) }))} />
          </div>
          <div className="mt-8">
            {panel('overview', (
              <ProfileOverview
                profile={p}
                userType={userType}
                goals={userType !== 'teacher' ? (p.subject_grades ?? []) : undefined}
                editUrl={editUrl}
                contributions={shown.contributions}
              />
            ))}
            {userType === 'student' && panel('progress', (
              <ProgressSection
                successExercises={progress?.for === username ? progress.success : []}
                reviewExercises={progress?.for === username ? progress.review : []}
                isLoading={progress?.for !== username && !progressFailed}
                failed={progressFailed}
                onRetry={loadProgress}
              />
            ))}
            {userType === 'teacher' && panel('students', <TeacherStudentsPanel />)}
            {panel('settings', <SettingsSection />)}
          </div>
        </>
      ) : (
        <Section id="publications" title={t('Publications')} count={shown.contributions.length} className="mt-10">
          <PublicationsList items={shown.contributions} isOwner={false} />
        </Section>
      )}
    </Page>
  );
};

export default ProfilePage;
