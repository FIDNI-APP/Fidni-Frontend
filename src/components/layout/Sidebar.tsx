import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { FloatingPanel } from '@/components/ui/FloatingPanel';
import {
  Home, BookOpen, Route, GraduationCap, Trophy,
  User as UserIcon, Bookmark as BookmarkIcon, Settings, LogOut, LogIn,
  X, PanelLeftClose, PanelLeftOpen, ChevronsUpDown,
  Brain, TrendingUp, Gauge, Landmark, CalendarCheck, UserPlus,
} from 'lucide-react';
import { APlusIcon } from '@/components/icons/APlusIcon';
import { LessonIcon } from '@/components/icons/LessonIcon';
import { useAuth } from '@/contexts/AuthContext';
import { useBreadcrumb } from '@/contexts/BreadcrumbContext';
import { useOpenSignup } from '@/components/auth/SignupPrompt';
import { getClassLevels } from '@/lib/api';
import { canSeeParcours } from '@/lib/features';
import type { User } from '@/types';
import { sectionHome, studentLevelSlug, useHasClassroom } from './nav';
import Logo3 from '@/assets/logo3.svg';

type IconType = React.ComponentType<{ className?: string }>;
type LevelBase = '/exercises' | '/lessons' | '/exams';

interface NavItem {
  to: string;
  label: string;
  icon: IconType;
  match?: string[];
  /** Chemins qui ne l'activent pas malgré `match` (sous-section qui a sa propre entrée). */
  exclude?: string[];
  /** Rubrique rangée par niveaux : ses niveaux s'affichent dessous quand on y est (et seulement alors). */
  levels?: LevelBase;
}

interface NavGroup {
  title?: string;
  /** Repère des visites guidées (lib/tours.ts). */
  tour?: string;
  items: NavItem[];
}

const under = (p: string, base: string) => p === base || p.startsWith(`${base}/`);
const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

// Menu du 10/10/2026 : ce qu'on fait (Travailler), puis où on en est (Mon suivi). Les libellés disent
// ce que contient la page : « Examens » ne contenait que des DS, « Révisions » cachait la préparation d'un DS.
const HOME_GROUP: NavGroup = { items: [{ to: '/', label: 'Accueil', icon: Home, match: ['/'] }] };

const WORK_GROUP: NavGroup = {
  title: 'Travailler',
  tour: 'nav-travailler',
  items: [
    { to: '/lessons', label: 'Leçons', icon: LessonIcon, match: ['/lessons', '/lesson'], levels: '/lessons' },
    { to: '/learning-path', label: 'Parcours', icon: Route, match: ['/learning-path'] },
    { to: '/exercises', label: 'Exercices', icon: BookOpen, match: ['/exercises', '/exercise', '/new', '/edit'], levels: '/exercises' },
    { to: '/exams', label: 'Devoirs (DS)', icon: APlusIcon, match: ['/exams', '/exam'], exclude: ['/exams/nationaux'], levels: '/exams' },
    { to: '/exams/nationaux', label: 'Bac national', icon: Landmark, match: ['/exams/nationaux'] },
    { to: '/concours', label: 'Concours', icon: Trophy, match: ['/concours'] },
  ],
};

// Suivi personnel : seulement pour un membre connecté. Refonte du 11/10/2026 : quatre entrées au lieu de six,
// regroupées par intention (Réviser = prochain DS + à refaire + listes ; Mes enregistrements = favoris + cahiers).
const FOLLOW_GROUP: NavGroup = {
  title: 'Mon suivi',
  tour: 'nav-suivi',
  items: [
    { to: '/progression', label: 'Ma progression', icon: TrendingUp, match: ['/progression'] },
    { to: '/reviser', label: 'Réviser', icon: CalendarCheck, match: ['/reviser', '/revisions', '/revision-lists', '/profile/revision-lists'] },
    { to: '/skill-iq', label: 'Quiz par chapitre', icon: Brain, match: ['/skill-iq'] },
    { to: '/enregistrements', label: 'Mes enregistrements', icon: BookmarkIcon, match: ['/enregistrements', '/saved', '/notebooks'] },
  ],
};

// Prof, ou élève inscrit dans au moins une classe (sinon « Rejoindre une classe » dans le menu du compte).
const CLASS_GROUP: NavGroup = {
  tour: 'nav-classe',
  items: [{ to: '/classrooms', label: 'Classes', icon: GraduationCap, match: ['/classrooms'] }],
};

/* ────── Niveaux (sous-liens des rubriques Leçons / Exercices / Devoirs) ────── */

interface Level { id: string; name: string; slug?: string }

// Une seule requête par session : la liste des niveaux ne change pas d'une page à l'autre.
let levelsRequest: Promise<Level[]> | null = null;
const loadLevels = () => {
  levelsRequest ??= getClassLevels()
    .then((data) => data.map((l) => ({ id: String(l.id), name: l.name, slug: (l as { slug?: string }).slug })))
    .catch((e) => { levelsRequest = null; throw e; });
  return levelsRequest;
};

function useLevels(): Level[] | null {
  const [levels, setLevels] = useState<Level[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    loadLevels()
      .then((l) => { if (!cancelled) setLevels(l); })
      .catch((e) => console.error('Sidebar: niveaux indisponibles', e));
    return () => { cancelled = true; };
  }, []);
  return levels;
}

/** Adresse d'une page de niveau (/exercises/niveau/2eme-bac-sm[/chapitre]) : le slug du niveau. */
const NIVEAU_RE = /^\/(?:exercises|lessons|exams)\/niveau\/([^/?#]+)/;

/* ────── Barre latérale (ordinateur) + tiroir (téléphone) ────── */

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  collapsed, onToggleCollapsed, mobileOpen, onCloseMobile,
}) => (
  <>
    <aside
      className="hidden md:flex flex-col sticky top-0 h-screen flex-shrink-0 border-r border-line bg-white print:hidden"
      style={{ width: collapsed ? 72 : 240, transition: 'width .2s cubic-bezier(.25,.46,.45,.94)' }}
    >
      <SidebarInner collapsed={collapsed} onToggleCollapsed={onToggleCollapsed} />
    </aside>

    {mobileOpen && <MobileDrawer onClose={onCloseMobile} />}
  </>
);

/**
 * Tiroir du téléphone : une vraie fenêtre (annoncée comme telle, Échap pour fermer, focus dedans
 * puis rendu au bouton qui l'a ouverte). Il liste tout : rubriques, suivi, classe et compte.
 */
const MobileDrawer: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const panelRef = useRef<HTMLElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const panel = panelRef.current;
    panel?.querySelector<HTMLElement>('[data-drawer-close]')?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); closeRef.current(); return; }
      if (e.key !== 'Tab' || !panel || !panel.contains(document.activeElement)) return;
      // Le focus reste dans le tiroir (Tab en boucle).
      const focusables = Array.from(panel.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'))
        .filter((el) => el.offsetParent !== null);
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      if (previous && document.contains(previous)) previous.focus({ preventScroll: true });
    };
  }, []);

  return (
    <div className="md:hidden fixed inset-0 z-[60] print:hidden">
      <style>{`
        @keyframes fd-drawer-in { from { transform: translateX(-100%); } to { transform: none; } }
        @keyframes fd-veil-in { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
      <div
        aria-hidden
        className="absolute inset-0 bg-[rgba(20,18,16,.38)]"
        style={{ animation: 'fd-veil-in .2s ease both' }}
        onClick={onClose}
      />
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        className="absolute left-0 top-0 flex h-full flex-col bg-white shadow-[8px_0_32px_rgba(20,18,16,.12)]"
        style={{
          width: 'min(320px, 86vw)',
          paddingTop: 'env(safe-area-inset-top, 0px)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          animation: 'fd-drawer-in .24s cubic-bezier(.25,.46,.45,.94) both',
        }}
      >
        <SidebarInner collapsed={false} onClose={onClose} drawer />
      </aside>
    </div>
  );
};

/* ────── Contenu commun (barre latérale et tiroir) ────── */

const SidebarInner: React.FC<{
  collapsed: boolean;
  onToggleCollapsed?: () => void;
  onClose?: () => void;
  /** Tiroir du téléphone : cibles plus grandes, compte déplié. */
  drawer?: boolean;
}> = ({ collapsed, onToggleCollapsed, onClose, drawer }) => {
  const location = useLocation();
  const { isAuthenticated, user } = useAuth();
  const { crumbs, section: forcedSection } = useBreadcrumb();
  const showParcours = canSeeParcours(user);
  const hasClassroom = useHasClassroom();
  const levels = useLevels();

  const groups = useMemo(() => {
    // Parcours n'est pas terminé : entrée visible des admins seulement (lib/features.ts).
    const work = { ...WORK_GROUP, items: WORK_GROUP.items.filter((it) => showParcours || it.to !== '/learning-path') };
    if (!isAuthenticated) return [HOME_GROUP, work];
    return hasClassroom ? [HOME_GROUP, work, FOLLOW_GROUP, CLASS_GROUP] : [HOME_GROUP, work, FOLLOW_GROUP];
  }, [isAuthenticated, showParcours, hasClassroom]);

  // Section imposée par la page (ex. un sujet du Bac national, sous /exams/123 comme un DS) :
  // explicite (BreadcrumbContext.section), sinon l'adresse du premier élément du fil d'Ariane.
  const section = useMemo(() => {
    const wanted = forcedSection ?? crumbs?.[0]?.to ?? null;
    return wanted && groups.some((g) => g.items.some((it) => it.to === wanted)) ? wanted : null;
  }, [forcedSection, crumbs, groups]);

  const isActive = (item: NavItem) => {
    if (section) return item.to === section;
    const p = location.pathname;
    if (item.to === '/') return p === '/';
    if (item.exclude?.some(x => under(p, x))) return false;
    return item.match?.some(x => under(p, x)) ?? false;
  };

  // Niveau ouvert (adresse, sinon fil d'Ariane d'un contenu : Exercices › 2ème Bac SM › Limites).
  const openLevel = useMemo(() => {
    const fromPath = location.pathname.match(NIVEAU_RE)?.[1];
    if (fromPath) return fromPath;
    for (const c of crumbs ?? []) {
      const m = c.to?.match(NIVEAU_RE);
      if (m) return m[1];
    }
    return null;
  }, [location.pathname, crumbs]);

  return (
    <>
      {/* En-tête : logo + réduire / fermer */}
      <div className={cx('flex h-[60px] flex-shrink-0 items-center border-b border-line', collapsed ? 'justify-center' : 'justify-between pl-5 pr-3')}>
        {!collapsed && (
          <Link to="/" onClick={onClose} className="flex items-center rounded-lg" aria-label="Fidni, accueil">
            <img src={Logo3} alt="Fidni" className="h-8 w-auto object-contain" />
          </Link>
        )}
        {drawer ? (
          <button type="button" onClick={onClose} aria-label="Fermer le menu" data-drawer-close className={iconBtn}>
            <X className="h-5 w-5" />
          </button>
        ) : (
          <button
            type="button"
            onClick={onToggleCollapsed}
            aria-label={collapsed ? 'Déployer le menu' : 'Réduire le menu'}
            title={collapsed ? 'Déployer le menu' : 'Réduire le menu'}
            className={iconBtn}
          >
            {collapsed ? <PanelLeftOpen className="h-[18px] w-[18px]" /> : <PanelLeftClose className="h-[18px] w-[18px]" />}
          </button>
        )}
      </div>

      {/* Rubriques */}
      <nav aria-label="Menu principal" className={cx('flex-1 overflow-y-auto overflow-x-hidden', collapsed ? 'px-3 py-3' : 'px-3 py-4')}>
        {groups.map((group, gi) => (
          <NavSection key={gi} group={group} first={gi === 0} collapsed={collapsed} drawer={drawer}>
            {group.items.map((item) => {
              const active = isActive(item);
              const href = item.levels ? sectionHome(user, item.levels) : item.to;
              return (
                <li key={item.to}>
                  <NavRow item={item} href={href} active={active} collapsed={collapsed} drawer={drawer} onNavigate={onClose} />
                  {item.levels && active && !collapsed && (
                    <LevelLinks
                      base={item.levels} levels={levels} user={user} openLevel={openLevel}
                      drawer={drawer} onNavigate={onClose}
                    />
                  )}
                </li>
              );
            })}
          </NavSection>
        ))}

        {/* Tiroir : le compte déplié dans la liste (rien de caché derrière un bouton). */}
        {drawer && <DrawerAccount onNavigate={onClose} canJoinClass={isAuthenticated && !hasClassroom} />}
      </nav>

      {/* Compte (ordinateur) */}
      {!drawer && (
        <div data-tour="nav-compte" className="flex-shrink-0 border-t border-line p-3">
          <RailAccount collapsed={collapsed} canJoinClass={isAuthenticated && !hasClassroom} />
        </div>
      )}
    </>
  );
};

const iconBtn = 'inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-ink-faint transition-colors hover:bg-[#f2f1ee] hover:text-ink';

/** Un groupe du menu : titre discret (ou simple filet quand la barre est réduite). */
const NavSection: React.FC<{
  group: NavGroup; first: boolean; collapsed: boolean; drawer?: boolean; children: React.ReactNode;
}> = ({ group, first, collapsed, drawer, children }) => {
  const id = useId();
  return (
    <div data-tour={group.tour} className={cx(!first && (collapsed ? 'mt-3 border-t border-[#f2f1ee] pt-3' : drawer ? 'mt-6' : 'mt-5'))}>
      {group.title && !collapsed && (
        <p id={id} className="px-3 pb-1.5 text-[12px] font-medium tracking-[.01em] text-ink-faint">{group.title}</p>
      )}
      <ul className="flex flex-col gap-0.5" aria-labelledby={group.title && !collapsed ? id : undefined}>
        {children}
      </ul>
    </div>
  );
};

const NavRow: React.FC<{
  item: NavItem; href: string; active: boolean; collapsed: boolean; drawer?: boolean; onNavigate?: () => void;
}> = ({ item, href, active, collapsed, drawer, onNavigate }) => {
  const Icon = item.icon;
  return (
    <Link
      to={href}
      onClick={onNavigate}
      title={collapsed ? item.label : undefined}
      aria-label={collapsed ? item.label : undefined}
      aria-current={active ? 'page' : undefined}
      className={cx(
        'group flex items-center rounded-xl transition-colors',
        collapsed ? 'mx-auto h-11 w-11 justify-center' : cx('gap-3 px-3', drawer ? 'min-h-11 text-[15px]' : 'min-h-10 text-[14px]'),
        active ? 'bg-brand-soft font-semibold text-ink' : 'font-medium text-ink-soft hover:bg-[#f7f6f3] hover:text-ink',
      )}
    >
      <Icon className={cx('h-[18px] w-[18px] flex-shrink-0 transition-colors', active ? 'text-brand-hover' : 'text-ink-faint group-hover:text-ink-soft')} />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </Link>
  );
};

/**
 * Niveaux de la rubrique ouverte. Un élève qui a indiqué sa classe ne voit que son niveau (et celui qu'il
 * consulte) ; les autres voient tous les niveaux. « Tous les niveaux » mène aux dossiers de niveaux
 * (sans ?niveau=tous, l'élève serait renvoyé dans son niveau : pages/content/ContentFolders).
 */
const LevelLinks: React.FC<{
  base: LevelBase; levels: Level[] | null; user: User | null | undefined; openLevel: string | null;
  drawer?: boolean; onNavigate?: () => void;
}> = ({ base, levels, user, openLevel, drawer, onNavigate }) => {
  const location = useLocation();
  if (!levels) return null;
  const mine = studentLevelSlug(user);
  const onBase = location.pathname === base;
  const levelParam = new URLSearchParams(location.search).get('classLevels');
  const filtered = mine ? levels.filter((l) => l.slug === mine || l.slug === openLevel) : levels;
  const shown = filtered.length ? filtered : levels;

  return (
    <ul className="mb-2 ml-[21px] mt-1 flex flex-col gap-0.5 border-l border-line pl-2.5" aria-label="Niveaux">
      {shown.map((l) => {
        // Page du niveau (/exercises/niveau/2eme-bac-sm) : une vraie adresse, que Google indexe.
        const to = l.slug ? `${base}/niveau/${l.slug}` : `${base}?classLevels=${l.id}`;
        const here = (!!l.slug && location.pathname.startsWith(`${base}/niveau/${l.slug}`)) || (onBase && levelParam === l.id);
        return (
          <SubLink key={l.id} to={to} onClick={onNavigate} drawer={drawer}
            active={here || (!!l.slug && l.slug === openLevel)} current={here}
            label={mine && l.slug === mine && shown.length > 1 ? `${l.name} · mon niveau` : l.name} />
        );
      })}
      <SubLink to={`${base}?niveau=tous`} label="Tous les niveaux" onClick={onNavigate} drawer={drawer} muted
        active={onBase && !levelParam} current={onBase && !levelParam} />
    </ul>
  );
};

const SubLink: React.FC<{
  to: string; label: string; onClick?: () => void; muted?: boolean; active?: boolean; current?: boolean; drawer?: boolean;
}> = ({ to, label, onClick, muted, active, current, drawer }) => (
  <li className="relative">
    {active && <span aria-hidden className="absolute -left-[11.5px] top-2 bottom-2 w-[2px] rounded-full bg-brand" />}
    <Link
      to={to}
      onClick={onClick}
      aria-current={current ? 'page' : undefined}
      className={cx(
        'flex items-center rounded-lg px-2.5 transition-colors',
        drawer ? 'min-h-10 text-[14px]' : 'min-h-9 text-[13px]',
        active ? 'font-semibold text-brand-hover' : cx(muted ? 'text-ink-faint' : 'text-ink-soft', 'hover:bg-[#f7f6f3] hover:text-ink'),
      )}
    >
      <span className="truncate">{label}</span>
    </Link>
  </li>
);

/* ────── Compte ────── */

/** Photo du membre, ou son initiale (l'image par défaut n'existe pas). */
const Avatar: React.FC<{ user: User; size?: number }> = ({ user, size = 32 }) => {
  const [broken, setBroken] = useState(false);
  const src = user.profile?.avatar;
  return src && !broken ? (
    <img src={src} alt="" onError={() => setBroken(true)} className="flex-shrink-0 rounded-full object-cover" style={{ width: size, height: size }} />
  ) : (
    <span
      aria-hidden
      className="inline-flex flex-shrink-0 items-center justify-center rounded-full bg-gold-soft font-semibold uppercase text-gold-strong ring-1 ring-gold-line"
      style={{ width: size, height: size, fontSize: size * 0.42 }}
    >
      {user.username?.[0] ?? '?'}
    </span>
  );
};

/** Sous le pseudo : le niveau de l'élève, ou le rôle. */
const accountHint = (user: User) => {
  if (user.is_superuser) return 'Administrateur';
  if (user.profile?.user_type === 'teacher') return 'Professeur';
  const p = user.profile;
  const level = p?.class_level_name || (p?.class_level && typeof p.class_level === 'object' ? p.class_level.name : null);
  return level || 'Mon compte';
};

interface AccountEntry { key: string; icon: IconType; label: string; to?: string; onClick?: () => void; danger?: boolean }

/** Entrées du compte : profil et réglages (la progression et les révisions sont dans « Mon suivi »). */
function useAccountEntries(canJoinClass: boolean | undefined, onDone?: () => void): AccountEntry[] {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  if (!user) return [];
  const handleLogout = async () => {
    try { await logout(); onDone?.(); navigate('/'); } catch (err) { console.error('Logout failed:', err); }
  };
  return [
    { key: 'profil', icon: UserIcon, label: 'Mon profil', to: `/profile/${user.username}` },
    { key: 'reglages', icon: Settings, label: 'Paramètres', to: `/profile/${user.username}?tab=settings` },
    ...(canJoinClass ? [{ key: 'classe', icon: UserPlus, label: 'Rejoindre une classe', to: '/classrooms' }] : []),
    ...(user.is_superuser ? [
      { key: 'pilotage', icon: Gauge, label: 'Pilotage', to: '/pilotage' },
      { key: 'concours', icon: Trophy, label: 'Admin concours', to: '/concours/admin' },
    ] : []),
    { key: 'sortie', icon: LogOut, label: 'Se déconnecter', onClick: handleLogout, danger: true },
  ];
}

const entryClass = (danger?: boolean, big?: boolean) => cx(
  'flex w-full items-center gap-3 rounded-xl px-3 text-left font-medium transition-colors',
  big ? 'min-h-11 text-[15px]' : 'min-h-10 text-[13.5px]',
  danger ? 'text-[#a23b34] hover:bg-[#fbecea]' : 'text-ink-soft hover:bg-[#f7f6f3] hover:text-ink',
);

const EntryRow: React.FC<{ entry: AccountEntry; big?: boolean; onNavigate?: () => void; role?: string }> = ({ entry, big, onNavigate, role }) => {
  const Icon = entry.icon;
  const icon = <Icon className={cx('h-[18px] w-[18px] flex-shrink-0', entry.danger ? '' : 'text-ink-faint')} />;
  return entry.to ? (
    <Link to={entry.to} onClick={onNavigate} role={role} className={entryClass(entry.danger, big)}>{icon}{entry.label}</Link>
  ) : (
    <button type="button" onClick={entry.onClick} role={role} className={entryClass(entry.danger, big)}>{icon}{entry.label}</button>
  );
};

/** Visiteur : se connecter / s'inscrire. */
const GuestButtons: React.FC<{ collapsed?: boolean; big?: boolean }> = ({ collapsed, big }) => {
  const openSignup = useOpenSignup('sidebar');
  if (collapsed) {
    return (
      <button type="button" onClick={() => openSignup('login')} aria-label="Connexion" title="Connexion" className={cx(iconBtn, 'mx-auto flex h-11 w-11')}>
        <LogIn className="h-[18px] w-[18px]" />
      </button>
    );
  }
  const h = big ? 'min-h-11 text-[14px]' : 'min-h-10';
  return (
    <div className="flex flex-col gap-2">
      <button type="button" className={cx('fd-btn-primary justify-center', h)} onClick={() => openSignup('signup')}>
        S’inscrire
      </button>
      <button type="button" className={cx('fd-btn-ghost justify-center', h)} onClick={() => openSignup('login')}>
        Connexion
      </button>
    </div>
  );
};

/** Bas de la barre latérale : le membre (photo, pseudo, niveau) ; un clic ouvre son menu au-dessus. */
const RailAccount: React.FC<{ collapsed: boolean; canJoinClass?: boolean }> = ({ collapsed, canJoinClass }) => {
  const { isAuthenticated, user } = useAuth();
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const entries = useAccountEntries(canJoinClass, () => setOpen(false));

  useEffect(() => { setOpen(false); }, [location.pathname, location.search]);

  if (!isAuthenticated || !user) return <GuestButtons collapsed={collapsed} />;

  return (
    <div ref={anchorRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`Compte de ${user.username}`}
        title={collapsed ? user.username : undefined}
        className={cx(
          'flex items-center rounded-xl transition-colors hover:bg-[#f7f6f3]',
          open && 'bg-[#f7f6f3]',
          collapsed ? 'mx-auto h-11 w-11 justify-center' : 'w-full gap-3 px-2 py-2 text-left',
        )}
      >
        <Avatar user={user} size={collapsed ? 30 : 34} />
        {!collapsed && (
          <>
            <span className="min-w-0 flex-1 leading-tight">
              <span className="block truncate text-[13.5px] font-semibold text-ink">{user.username}</span>
              <span className="mt-0.5 block truncate text-[12px] text-ink-faint">{accountHint(user)}</span>
            </span>
            <ChevronsUpDown className="h-4 w-4 flex-shrink-0 text-ink-faint" />
          </>
        )}
      </button>

      <FloatingPanel
        anchorRef={anchorRef} open={open} onClose={() => setOpen(false)} placement="top-start" offset={8}
        role="menu"
        className="w-[232px] rounded-2xl border border-line bg-white p-1.5 shadow-[0_14px_40px_rgba(20,18,16,.16)]"
      >
        <div className="px-3 pb-2 pt-1.5">
          <p className="truncate text-[13px] font-semibold text-ink">{user.username}</p>
          {user.email && <p className="truncate text-[12px] text-ink-faint">{user.email}</p>}
        </div>
        <div className="flex flex-col gap-0.5 border-t border-[#f2f1ee] pt-1.5">
          {entries.map((e) => (
            <React.Fragment key={e.key}>
              {e.danger && <div className="my-1 h-px bg-[#f2f1ee]" />}
              <EntryRow entry={e} role="menuitem" onNavigate={() => setOpen(false)} />
            </React.Fragment>
          ))}
        </div>
      </FloatingPanel>
    </div>
  );
};

/** Tiroir du téléphone : le compte en clair, en fin de liste. */
const DrawerAccount: React.FC<{ onNavigate?: () => void; canJoinClass?: boolean }> = ({ onNavigate, canJoinClass }) => {
  const { isAuthenticated, user } = useAuth();
  const entries = useAccountEntries(canJoinClass, onNavigate);
  const id = useId();

  if (!isAuthenticated || !user) {
    return (
      <div data-tour="nav-compte" className="mt-6 border-t border-line px-1 pt-5">
        <p className="mb-3 px-2 text-[13px] leading-snug text-ink-faint">Crée ton compte pour garder ta progression et tes révisions.</p>
        <GuestButtons big />
      </div>
    );
  }

  const rest = entries.filter((e) => e.key !== 'profil');
  return (
    <div data-tour="nav-compte" className="mt-6 border-t border-line pt-4">
      <p id={id} className="px-3 pb-1.5 text-[12px] font-medium tracking-[.01em] text-ink-faint">Mon compte</p>
      <ul className="flex flex-col gap-0.5" aria-labelledby={id}>
        <li>
          <Link to={`/profile/${user.username}`} onClick={onNavigate} className="flex min-h-12 items-center gap-3 rounded-xl px-2.5 py-1.5 transition-colors hover:bg-[#f7f6f3]">
            <Avatar user={user} size={30} />
            <span className="min-w-0 flex-1 leading-tight">
              <span className="block truncate text-[15px] font-medium text-ink">Mon profil</span>
              <span className="block truncate text-[12px] text-ink-faint">{user.username} · {accountHint(user)}</span>
            </span>
          </Link>
        </li>
        {rest.map((e) => (
          <li key={e.key}><EntryRow entry={e} big onNavigate={onNavigate} /></li>
        ))}
      </ul>
    </div>
  );
};
