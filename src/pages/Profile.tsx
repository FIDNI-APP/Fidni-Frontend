/**
 * Profil (/profile/:username). Refonte du 11/10/2026, profil public enrichi le 09/11/2026 (apps/communaute) :
 *  - En-tête : bannière à étoiles, photo entourée de l'ornement du badge mis en avant, rôle et niveau, objectif,
 *    abonnés et abonnements, S'abonner, vitrine de badges, puis les chiffres (série du défi, exercices réussis…).
 *  - Corps (ProfilContenu), le même pour tous : badges, chapitres maîtrisés, discussions, publications, défi du jour,
 *    abonnés. Les blocs que le membre masque n'arrivent pas du serveur.
 *  - Propriétaire : « Personnaliser » (bannière, objectif, vitrine, blocs visibles, abonnements) et ses onglets gardés
 *    dans l'adresse : ?tab=overview (Profil) · progress (Réussis / à revoir) · messages · settings ; enseignant :
 *    overview · students (Mes élèves) · messages · settings.
 * Anciens onglets (propriétaire) : statistics → /progression, revisionlists → /reviser#mes-listes,
 * saved → /enregistrements, notebooks → /enregistrements?onglet=cahiers, skilliq → /skill-iq.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  BadgeCheck, Ban, CalendarDays, Eye, FileText, Flame, GraduationCap, HandHeart, Lock, MapPin, Mountain, MoreHorizontal,
  MessageCircle, Palette, Pencil, PenLine, Phone, RotateCcw, Target, ThumbsUp, UserX, Users, Video,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import { MESSAGERIE_ACTIVE } from '@/lib/features';
import { useMessagerieFacultative } from '@/contexts/MessagerieContext';
import { messagerieApi, raisonRefus } from '@/lib/api/messagerieApi';
import { SEO } from '@/components/layout/SEO';
import { FloatingPanel } from '@/components/ui/FloatingPanel';
import { api } from '@/lib/api/apiClient';
import { identityFromUser } from '@/lib/identity';
import { communauteApi, type Chiffre, type ProfilPublic as Pub, type Reglages } from '@/lib/api/communauteApi';
import { confirmer } from '@/lib/confirmer';
import type { Content } from '@/types';
import { CardsSkeleton, EmptyState, Page, Segmented } from '@/components/space/Page';
import type { Goal, PublishedItem } from '@/components/profile/ProfileBilanSection';
import { ProfilContenu, textePalier } from '@/components/profile/ProfilContenu';
import { ProgressSection } from '@/components/profile/ProgressSection';
import { SettingsSection } from '@/components/profile/SettingsSection';
import { MessagesSection } from '@/components/profile/MessagesSection';
import TeacherStudentsPanel from '@/components/profile/TeacherStudentsPanel';
import { ModerationDeleteButton } from '@/components/profile/ModerationDeleteButton';
import { AvatarOrne, BanniereArt, Medaille, palierVisuel } from '@/components/communaute/art';
import { BoutonSuivre } from '@/components/communaute/BoutonSuivre';
import { ListeMembres } from '@/components/communaute/ListeMembres';
import { Personnaliser } from '@/components/communaute/Personnaliser';
import { roleTexte } from '@/components/communaute/CarteMembre';
import { t, dateLocale } from '@/i18n';
import { nomAffiche } from '@/lib/nomAffiche';

type TabId = 'overview' | 'progress' | 'students' | 'messages' | 'settings';

const TABS: Record<'student' | 'teacher', { key: TabId; label: string }[]> = {
  student: [
    { key: 'overview', label: 'Profil' },
    { key: 'progress', label: 'Réussis / à revoir' },
    { key: 'messages', label: MESSAGERIE_ACTIVE ? 'Messages de l’équipe' : 'Messages' },
    { key: 'settings', label: 'Paramètres' },
  ],
  teacher: [
    { key: 'overview', label: 'Profil' },
    { key: 'students', label: 'Mes élèves' },
    { key: 'messages', label: MESSAGERIE_ACTIVE ? 'Messages de l’équipe' : 'Messages' },
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

/** Chiffres de l'en-tête : libellé, icône, couleur de la pastille. */
const CHIFFRES: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; ton: string }> = {
  serie: { label: 'Série du défi', icon: Flame, ton: 'bg-gold-soft text-[#e07a1f]' },
  exercices: { label: 'Exercices réussis', icon: PenLine, ton: 'bg-brand-soft text-brand-hover' },
  maitrise: { label: 'Chapitres maîtrisés', icon: GraduationCap, ton: 'bg-brand-soft text-brand-hover' },
  approfondi: { label: 'Chapitres approfondis', icon: Mountain, ton: 'bg-gold-soft text-gold-strong' },
  entraide: { label: '« Utile » reçus', icon: HandHeart, ton: 'bg-brand-soft text-brand-hover' },
  publications: { label: 'Publications', icon: FileText, ton: 'bg-[#f2f1ee] text-ink-soft' },
  vues: { label: 'Vues', icon: Eye, ton: 'bg-[#f2f1ee] text-ink-soft' },
  votes: { label: 'Votes reçus', icon: ThumbsUp, ton: 'bg-brand-soft text-brand-hover' },
  eleves: { label: 'Élèves', icon: Users, ton: 'bg-gold-soft text-gold-strong' },
};

/** Colonnes de la rangée des chiffres sur ordinateur, selon leur nombre (classes écrites en entier pour Tailwind). */
const COLONNES: Record<number, string> = { 1: 'md:grid-cols-1', 2: 'md:grid-cols-2', 3: 'md:grid-cols-3', 4: 'md:grid-cols-4', 5: 'md:grid-cols-5' };

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
  pub: Pub | null;
  contributions: PublishedItem[];
}

const HeroSkeleton: React.FC = () => (
  <div role="status" aria-label={t('Chargement du profil')}>
    <div className="animate-pulse overflow-hidden rounded-3xl border border-line bg-white">
      <div className="h-28 border-b border-line bg-[#f4f1ea] sm:h-40" />
      <div className="flex items-end gap-4 px-5 pb-6 sm:px-8">
        <div className="-mt-10 h-[88px] w-[88px] shrink-0 rounded-full bg-[#efece6] ring-4 ring-white sm:-mt-12 sm:h-[112px] sm:w-[112px]" />
        <div className="flex-1 pb-1">
          <div className="h-3 w-14 rounded bg-[#f2f1ee]" />
          <div className="mt-2 h-6 w-40 max-w-full rounded bg-[#efece6]" />
        </div>
      </div>
    </div>
    <CardsSkeleton n={2} className="mt-10" />
  </div>
);

const ChiffreTuile: React.FC<{ c: Chiffre }> = ({ c }) => {
  const def = CHIFFRES[c.id];
  if (!def) return null;
  const Icon = def.icon;
  return (
    <div className="flex items-center gap-3 bg-[#fcfbf9] px-4 py-3.5 max-md:last:odd:col-span-2 sm:px-5">
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${def.ton}`} aria-hidden><Icon className="h-5 w-5" /></span>
      <div className="min-w-0">
        <p className="fd-nums text-[20px] font-semibold leading-none text-ink">{c.valeur.toLocaleString(dateLocale())}</p>
        <p className="mt-1 text-[12px] leading-tight text-ink-faint">
          {t(def.label)}
          {/* Le record seulement s'il dépasse la série en cours (sinon c'est le même nombre). */}
          {c.id === 'serie' && (c.record ?? 0) > c.valeur && <span className="block">{t('record {r}', { r: c.record ?? 0 })}</span>}
        </p>
      </div>
    </div>
  );
};

/** Abonnés mutuels : écrire, appeler, visio (apps/messagerie, 13/11/2026). */
const ActionsContact: React.FC<{ username: string }> = ({ username }) => {
  const navigate = useNavigate();
  const m = useMessagerieFacultative();
  const appeler = async (video: boolean) => {
    try {
      const c = await messagerieApi.creer([username]);
      await m?.lancer(c.id, video);
    } catch (e) {
      toast.error(raisonRefus(e, t('Appel impossible pour le moment.')));
    }
  };
  const icone = 'inline-flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-white text-ink-soft transition-colors hover:text-ink disabled:opacity-40';
  return (
    <>
      <button type="button" onClick={() => navigate(`/messages?avec=${encodeURIComponent(username)}`)} className="fd-btn-ghost min-h-10">
        <MessageCircle className="h-4 w-4" /> {t('Écrire')}
      </button>
      <button type="button" onClick={() => void appeler(false)} disabled={!!m?.appel} aria-label={t('Appeler {name}', { name: username })} title={t('Appel audio')} className={icone}>
        <Phone className="h-[18px] w-[18px]" />
      </button>
      <button type="button" onClick={() => void appeler(true)} disabled={!!m?.appel} aria-label={t('Appel vidéo avec {name}', { name: username })} title={t('Appel vidéo')} className={icone}>
        <Video className="h-5 w-5" />
      </button>
    </>
  );
};

/** « … » d'un autre membre : bloquer / débloquer. */
const MenuMembre: React.FC<{ username: string; bloque: boolean; onChange: (b: boolean) => void }> = ({ username, bloque, onChange }) => {
  const [ouvert, setOuvert] = useState(false);
  const ancre = useRef<HTMLDivElement>(null);
  const basculer = async () => {
    setOuvert(false);
    if (!bloque && !await confirmer(t('Bloquer {name} ? Vous ne pourrez plus vous suivre.', { name: username }), { action: t('Bloquer'), danger: true })) return;
    try {
      if (bloque) await communauteApi.debloquer(username); else await communauteApi.bloquer(username);
      onChange(!bloque);
      toast.success(bloque ? t('Membre débloqué') : t('Membre bloqué'));
    } catch {
      toast.error(t('Action impossible pour le moment.'));
    }
  };
  return (
    <div ref={ancre}>
      <button type="button" onClick={() => setOuvert((v) => !v)} aria-label={t('Plus d’actions')} aria-haspopup="menu" aria-expanded={ouvert}
        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-white text-ink-soft transition-colors hover:text-ink">
        <MoreHorizontal className="h-5 w-5" />
      </button>
      <FloatingPanel anchorRef={ancre} open={ouvert} onClose={() => setOuvert(false)} placement="bottom-end" offset={6} role="menu"
        className="w-[220px] rounded-2xl border border-line bg-white p-1.5 shadow-[0_14px_40px_rgba(20,18,16,.16)]">
        <button type="button" role="menuitem" onClick={basculer}
          className="flex min-h-10 w-full items-center gap-2.5 rounded-xl px-3 text-start text-[13.5px] font-medium text-[#a23b34] hover:bg-[#fbecea]">
          <Ban className="h-4 w-4" /> {bloque ? t('Débloquer') : t('Bloquer')}
        </button>
      </FloatingPanel>
    </div>
  );
};

export const ProfilePage: React.FC = () => {
  const { username = '' } = useParams<{ username: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user: currentUser, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [data, setData] = useState<Loaded | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'notfound' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);
  const [liste, setListe] = useState<'abonnes' | 'abonnements' | null>(null);
  const [perso, setPerso] = useState(false);

  useEffect(() => {
    if (!username) return;
    let alive = true;
    setState('loading');
    const u = encodeURIComponent(username);
    Promise.all([
      api.get(`/users/${u}/`).then((r) => r.data as ProfileData),
      // Profil public (apps/communaute) : s'il ne répond pas, la page reste lisible avec l'en-tête simple.
      communauteApi.profil(username).catch(() => null),
      api.get(`/users/${u}/contributions/`).then((r) => r.data).catch(() => []),
    ]).then(([profile, pub, contribs]) => {
      if (!alive) return;
      const items = Array.isArray(contribs) ? contribs : (contribs as { results?: PublishedItem[] })?.results ?? [];
      setData({ for: username, profile, pub, contributions: items });
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

  // « ?abonnes=1 » (notification d'un nouvel abonné ou d'une demande, via /membres fermée) : la fenêtre des abonnés, au
  // propriétaire seulement, puis l'adresse redevient celle du profil.
  useEffect(() => {
    if (state !== 'ready' || !isOwner || searchParams.get('abonnes') === null) return;
    setListe('abonnes');
    const next = new URLSearchParams(searchParams);
    next.delete('abonnes');
    setSearchParams(next, { replace: true });
  }, [state, isOwner, searchParams, setSearchParams]);

  // Lien « #badges » (notification d'un badge gagné) : on descend jusqu'aux badges une fois la page chargée.
  useEffect(() => {
    if (state === 'ready' && window.location.hash === '#badges') {
      requestAnimationFrame(() => document.getElementById('badges')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    }
  }, [state]);

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
    // Le prénom et le nom sont le titre du profil (13/11/2026) ; seul l'établissement reste privé.
    return identityFromUser(currentUser).school.name || '';
  }, [isOwner, currentUser]);

  const majPub = (f: (p: Pub) => Pub) => setData((d) => (d && d.pub ? { ...d, pub: f(d.pub) } : d));
  // Après « Personnaliser » : le profil public relu sur place (bannière, vitrine, blocs), sans repasser par le squelette.
  const rechargerPub = () => {
    communauteApi.profil(username).then((pub) => setData((d) => (d && d.for === username ? { ...d, pub } : d))).catch(() => {});
  };

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

  if (!shown) return <Page width="wide"><HeroSkeleton /></Page>;

  const p = shown.profile.profile ?? {};
  const pub = shown.pub;
  const name = shown.profile.username || username;
  // 13/11/2026 : prénom et nom pour un membre connecté (le serveur décide, lib/nomAffiche), pseudo sinon.
  const nom = nomAffiche(pub) || nomAffiche(shown.profile) || name;
  const joined = pub?.depuis ?? p.joined_at ?? shown.profile.date_joined;
  const since = joined ? new Date(joined).toLocaleDateString(dateLocale(), { month: 'long', year: 'numeric' }) : null;
  const ville = pub ? pub.ville : p.location;
  const editUrl = `/profile/${name}/edit`;
  const vitrine = pub?.vitrine ?? [];
  const orne = vitrine[0] ? palierVisuel(vitrine[0]) : 0;
  // Les autres ne voient pas les zéros (« 0 élève », « 0 jour ») : le propriétaire, lui, voit tout ce qu'il peut faire monter.
  const chiffres = (pub?.chiffres ?? []).filter((c) => isOwner || c.valeur > 0);
  const role = pub ? roleTexte(pub.role, pub.level) : (userType === 'teacher' ? t('Professeur') : p.class_level_name || t('Élève'));
  const meta = [
    pub?.objectif && { icon: Target, text: pub.objectif, gold: true },
    ville && { icon: MapPin, text: ville },
    since && { icon: CalendarDays, text: t('Membre depuis {since}', { since }) },
  ].filter(Boolean) as { icon: typeof MapPin; text: string; gold?: boolean }[];

  const panel = (id: TabId, node: React.ReactNode) =>
    id === tab || visited.has(`${username}:${id}`) ? (
      <div key={id} role="tabpanel" aria-label={t(tabs.find((tb) => tb.key === id)?.label ?? '')} hidden={id !== tab}>{node}</div>
    ) : null;

  const contenu = pub ? (
    <ProfilContenu pub={pub} proprietaire={isOwner} userType={userType} profile={p}
      goals={isOwner && userType !== 'teacher' ? (p.subject_grades ?? []) : undefined}
      editUrl={editUrl} contributions={shown.contributions} onOuvrirListe={setListe} />
  ) : null;

  return (
    <Page width="wide">
      {seo}
      {/* ── En-tête : qui est cette personne ── */}
      <header className="overflow-hidden rounded-3xl border border-line bg-white">
        <div className="relative h-28 sm:h-40">
          <BanniereArt banniere={pub?.banniere ?? 'zellige-vert'} className="h-full" />
          {isOwner && pub?.reglages && (
            <button type="button" onClick={() => setPerso(true)} data-tour="profil-personnaliser"
              className="fd-fixe absolute end-3 top-3 inline-flex min-h-9 items-center gap-1.5 rounded-xl bg-black/40 px-3 text-[12.5px] font-semibold text-white backdrop-blur transition-colors hover:bg-black/55">
              <Palette className="h-4 w-4" aria-hidden /> {t('Personnaliser')}
            </button>
          )}
        </div>

        <div className="px-5 pb-5 sm:px-8 sm:pb-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex min-w-0 items-end gap-4" data-tour="profil-identite">
              <div className="-mt-12 shrink-0 sm:hidden"><AvatarOrne src={p.avatar} nom={nom} taille={84} palier={orne} /></div>
              <div className="-mt-16 hidden shrink-0 sm:block"><AvatarOrne src={p.avatar} nom={nom} taille={112} palier={orne} /></div>
              <div className="min-w-0 pb-1">
                <p className="text-[12.5px] font-medium text-ink-faint">{role}</p>
                <h1 className="fd-display flex min-w-0 items-center gap-2 text-ink" style={{ fontSize: 'clamp(26px, 3vw, 36px)', lineHeight: 1.1 }}>
                  <span className="truncate">{nom}</span>
                  {pub?.verifie && <BadgeCheck className="h-6 w-6 shrink-0 text-brand" aria-label={t('Professeur vérifié')} />}
                </h1>
                {nom !== name && <p className="mt-0.5 truncate text-[13px] text-ink-faint" dir="ltr">@{name}</p>}
                {pub && (
                  <p className="fd-nums mt-1 flex flex-wrap items-center gap-x-3 text-[13px] text-ink-soft">
                    <button type="button" onClick={() => setListe('abonnes')} disabled={!pub.listes_visibles}
                      className="rounded hover:underline disabled:no-underline disabled:cursor-default">
                      <b className="font-semibold text-ink">{pub.abonnes.toLocaleString(dateLocale())}</b> {pub.abonnes > 1 ? t('abonnés') : t('abonné')}
                    </button>
                    <button type="button" onClick={() => setListe('abonnements')} disabled={!pub.listes_visibles}
                      className="rounded hover:underline disabled:no-underline disabled:cursor-default">
                      <b className="font-semibold text-ink">{pub.abonnements.toLocaleString(dateLocale())}</b> {pub.abonnements > 1 ? t('abonnements') : t('abonnement')}
                    </button>
                    {pub.relation.me_suit && <span className="rounded-full bg-[#f2f1ee] px-2 py-0.5 text-[11.5px] font-semibold text-ink-soft">{t('Te suit')}</span>}
                  </p>
                )}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:pb-1">
              {isOwner ? (
                <>
                  {!!pub?.reglages?.demandes && (
                    <button type="button" onClick={() => setListe('abonnes')}
                      className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-gold-line bg-gold-soft px-3 text-[13px] font-semibold text-gold-strong">
                      {pub.reglages.demandes > 1 ? t('{n} demandes', { n: pub.reglages.demandes }) : t('1 demande')}
                    </button>
                  )}
                  {userType === 'student' && !p.class_level && !p.class_level_name && (
                    <Link to={editUrl + '#scolarite'} className="fd-btn-primary min-h-10">{t('Indiquer ma classe')}</Link>
                  )}
                  <Link to={editUrl} className="fd-btn-ghost min-h-10" data-tour="profil-modifier">
                    <Pencil className="h-4 w-4" /> {t('Modifier mon profil')}
                  </Link>
                </>
              ) : (
                <>
                  {pub && !pub.relation.bloque && (
                    <BoutonSuivre username={name} abonne={pub.relation.abonne} meSuit={pub.relation.me_suit}
                      onChange={(s) => majPub((x) => ({
                        ...x, relation: { ...x.relation, abonne: s },
                        abonnes: x.abonnes + (s === 'accepte' ? 1 : x.relation.abonne === 'accepte' && !s ? -1 : 0),
                      }))} />
                  )}
                  {MESSAGERIE_ACTIVE && pub?.relation.peut_ecrire && <ActionsContact username={name} />}
                  {pub?.relation.connecte && (
                    <MenuMembre username={name} bloque={pub.relation.bloque}
                      onChange={(b) => majPub((x) => ({ ...x, relation: { ...x.relation, bloque: b, abonne: b ? null : x.relation.abonne } }))} />
                  )}
                  {currentUser?.is_superuser && <ModerationDeleteButton username={name} />}
                </>
              )}
            </div>
          </div>

          {MESSAGERIE_ACTIVE && !isOwner && pub?.relation.connecte && !pub.relation.bloque && !pub.relation.peut_ecrire && (
            <p className="mt-3 text-[12.5px] text-ink-faint">
              {pub.relation.abonne === 'accepte'
                ? t('Quand {name} te suivra aussi, vous pourrez vous écrire et vous appeler.', { name })
                : pub.relation.abonne === 'en_attente'
                  ? t('Ta demande est en attente. Une fois acceptée, et si {name} te suit, vous pourrez vous écrire.', { name })
                  : t('Suivez-vous tous les deux pour pouvoir vous écrire et vous appeler.')}
            </p>
          )}

          {meta.length > 0 && (
            <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-[13px] text-ink-soft" aria-label={t('En bref')}>
              {meta.map(({ icon: Icon, text, gold }) => (
                <li key={text} className={`inline-flex items-center gap-1.5 ${gold ? 'font-semibold text-gold-strong' : ''}`}>
                  <Icon className={`h-3.5 w-3.5 ${gold ? '' : 'text-ink-faint'}`} aria-hidden /> {text}
                </li>
              ))}
            </ul>
          )}

          {(pub?.bio || p.bio) && <p dir="auto" className="mt-3 max-w-2xl whitespace-pre-line text-start text-[14px] leading-relaxed text-ink-soft">{pub?.bio || p.bio}</p>}

          {/* Établissement : rappelé au propriétaire seulement, jamais montré aux autres. */}
          {isOwner && privateLine && (
            <p className="mt-3 inline-flex max-w-full flex-wrap items-center gap-x-1.5 rounded-lg bg-[#f2f1ee] px-2.5 py-1.5 text-[12.5px] text-ink-soft"
              title={t('Visible de toi seul')}>
              <Lock className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <span className="min-w-0">{privateLine}</span>
              <span className="text-ink-faint">· {t('visible de toi seul')}</span>
            </p>
          )}

          {vitrine.length > 0 && (
            <ul className="mt-5 grid grid-cols-1 gap-2.5 sm:grid-cols-3" aria-label={t('Vitrine')}>
              {vitrine.map((b) => (
                <li key={b.id} className="flex items-center gap-3 rounded-2xl border border-gold-line bg-[#fffaf0] p-2.5">
                  <Medaille badge={b.id} palier={b.palier} taille={52} />
                  <span className="min-w-0">
                    <span className="block truncate text-[14px] font-semibold text-ink">{t(b.nom)}</span>
                    <span className="block truncate text-[12px] text-ink-faint">{textePalier(b)}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
          {isOwner && pub?.reglages && vitrine.length === 0 && (pub.badges ?? []).some((b) => b.palier > 0) && (
            <button type="button" onClick={() => setPerso(true)}
              className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl border border-dashed border-gold-line px-3.5 text-[13px] font-semibold text-gold-strong hover:bg-gold-soft">
              <Palette className="h-4 w-4" aria-hidden /> {t('Choisir les badges de ma vitrine')}
            </button>
          )}
        </div>

        {/* Pied : les chiffres (rien si le membre les masque). */}
        {chiffres.length > 0 && (
          // Filets entre les cases : l'écart d'un pixel laisse voir le fond de la grille (couleur des bordures).
          <div className={`grid grid-cols-2 gap-px border-t border-line bg-line ${COLONNES[chiffres.length] ?? 'md:grid-cols-5'}`}>
            {chiffres.map((c) => <ChiffreTuile key={c.id} c={c} />)}
          </div>
        )}
      </header>

      {isOwner ? (
        <>
          <div className="mt-8" data-tour="profil-onglets">
            <Segmented<TabId> label={t('Ton profil')} value={tab} onChange={selectTab} options={tabs.map((o) => ({ ...o, label: t(o.label) }))} />
          </div>
          <div className="mt-8">
            {panel('overview', contenu)}
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
            {panel('messages', <MessagesSection />)}
            {panel('settings', <SettingsSection />)}
          </div>
        </>
      ) : (
        <div className="mt-10">{contenu}</div>
      )}

      {pub && (
        <ListeMembres username={name} sens={liste} proprietaire={isOwner} onClose={() => setListe(null)}
          onChange={(quoi) => majPub((x) => ({
            ...x,
            abonnes: Math.max(0, x.abonnes + (quoi === 'accepte' ? 1 : quoi === 'retire' ? -1 : 0)),
            reglages: x.reglages && quoi !== 'retire' ? { ...x.reglages, demandes: Math.max(0, x.reglages.demandes - 1) } : x.reglages,
          }))} />
      )}
      {isOwner && pub?.reglages && (
        <Personnaliser open={perso} onClose={() => setPerso(false)} reglages={pub.reglages} badges={pub.badges ?? []}
          onSaved={(r: Reglages) => { majPub((x) => ({ ...x, reglages: r })); rechargerPub(); }} />
      )}
    </Page>
  );
};

export default ProfilePage;
