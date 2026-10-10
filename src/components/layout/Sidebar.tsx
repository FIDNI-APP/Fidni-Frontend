import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { FloatingPanel } from '@/components/ui/FloatingPanel';
import {
  Home, BookOpen, Route, GraduationCap, Trophy,
  User, Bookmark as BookmarkIcon, Settings, LogOut,
  X, ChevronsLeft, ChevronsRight, ChevronDown, Loader2,
  NotebookPen, Brain, ListChecks, TrendingUp, Gauge, Landmark, CalendarCheck, UserPlus,
} from 'lucide-react';
import { APlusIcon } from '@/components/icons/APlusIcon';
import { LessonIcon } from '@/components/icons/LessonIcon';
import { useAuth } from '@/contexts/AuthContext';
import { useBreadcrumb } from '@/contexts/BreadcrumbContext';
import { useOpenSignup } from '@/components/auth/SignupPrompt';
import { getClassLevels } from '@/lib/api';
import { canSeeParcours } from '@/lib/features';
import { revisionTab, useHasClassroom } from './nav';
import Logo3 from '@/assets/logo3.svg';

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  match?: string[];
  /** Chemins qui ne l'activent pas malgré `match` (sous-section qui a sa propre entrée). */
  exclude?: string[];
  /** Règle sur mesure quand l'adresse seule ne suffit pas (deux onglets d'une même page). */
  isActive?: (pathname: string, search: string) => boolean;
  /** Content type for the class-level quick-link dropdown (singular API form). */
  dropdown?: 'exercise' | 'lesson' | 'exam';
}

interface NavGroup {
  title?: string;
  /** Repère des visites guidées (lib/tours.ts). */
  tour?: string;
  items: NavItem[];
}

const under = (p: string, base: string) => p === base || p.startsWith(`${base}/`);

// Menu du 10/10/2026 : ce qu'on fait (Travailler), puis où on en est (Mon suivi). Les libellés disent
// ce que contient la page : « Examens » ne contenait que des DS, « Révisions » cachait la préparation d'un DS.
const HOME_GROUP: NavGroup = { items: [{ to: '/', label: 'Accueil', icon: Home, match: ['/'] }] };

const WORK_GROUP: NavGroup = {
  title: 'Travailler',
  tour: 'nav-travailler',
  items: [
    { to: '/lessons', label: 'Leçons', icon: LessonIcon, match: ['/lessons', '/lesson'], dropdown: 'lesson' },
    { to: '/learning-path', label: 'Parcours', icon: Route, match: ['/learning-path'] },
    { to: '/exercises', label: 'Exercices', icon: BookOpen, match: ['/exercises', '/exercise', '/new', '/edit'], dropdown: 'exercise' },
    { to: '/exams', label: 'Devoirs (DS)', icon: APlusIcon, match: ['/exams', '/exam'], exclude: ['/exams/nationaux'], dropdown: 'exam' },
    { to: '/exams/nationaux', label: 'Bac national', icon: Landmark, match: ['/exams/nationaux'] },
    { to: '/concours', label: 'Concours', icon: Trophy, match: ['/concours'] },
  ],
};

// Suivi personnel : seulement pour un membre connecté.
const FOLLOW_GROUP: NavGroup = {
  title: 'Mon suivi',
  tour: 'nav-suivi',
  items: [
    { to: '/progression', label: 'Ma progression', icon: TrendingUp, match: ['/progression'] },
    {
      to: '/revision-lists?onglet=ds', label: 'Préparer un DS', icon: CalendarCheck,
      isActive: (p, s) => under(p, '/revisions/ds') || (p === '/revision-lists' && revisionTab(s) === 'ds'),
    },
    {
      to: '/revision-lists?onglet=listes', label: 'Mes révisions', icon: ListChecks,
      isActive: (p, s) => (p === '/revision-lists' ? revisionTab(s) === 'listes'
        : under(p, '/revision-lists') || under(p, '/profile/revision-lists')),
    },
    { to: '/skill-iq', label: 'Quiz par chapitre', icon: Brain, match: ['/skill-iq'] },
    { to: '/notebooks', label: 'Cahiers', icon: NotebookPen, match: ['/notebooks'] },
    { to: '/saved', label: 'Favoris', icon: BookmarkIcon, match: ['/saved'] },
  ],
};

// Prof, ou élève inscrit dans au moins une classe (sinon « Rejoindre une classe » dans le menu du compte).
const CLASS_GROUP: NavGroup = {
  tour: 'nav-classe',
  items: [{ to: '/classrooms', label: 'Classes', icon: GraduationCap, match: ['/classrooms'] }],
};

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  collapsed, onToggleCollapsed, mobileOpen, onCloseMobile,
}) => {
  return (
    <>
      {/* Desktop rail */}
      <aside
        className="hidden md:flex flex-col sticky top-0 h-screen flex-shrink-0"
        style={{
          width: collapsed ? 72 : 240,
          background: '#fff',
          borderRight: '1px solid #e7e3dc',
          transition: 'width .2s cubic-bezier(.25,.46,.45,.94)',
        }}
      >
        <SidebarInner collapsed={collapsed} onToggleCollapsed={onToggleCollapsed} />
      </aside>

      {mobileOpen && <MobileDrawer onClose={onCloseMobile} />}
    </>
  );
};

/**
 * Tiroir du téléphone : une vraie fenêtre (annoncée comme telle, Échap pour fermer, focus dedans
 * puis rendu au bouton qui l'a ouverte).
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
    <div className="md:hidden fixed inset-0 z-[60]">
      <div
        aria-hidden
        className="absolute inset-0"
        style={{ background: 'rgba(20,18,16,.4)', backdropFilter: 'blur(2px)' }}
        onClick={onClose}
      />
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        className="absolute left-0 top-0 h-full flex flex-col"
        style={{
          width: 'min(288px, 86vw)', background: '#fff', borderRight: '1px solid #e7e3dc',
          animation: 'slideIn .25s ease both',
        }}
      >
        <SidebarInner collapsed={false} onCloseMobile={onClose} showClose />
      </aside>
    </div>
  );
};

/* ────── Shared inner content (rail + drawer) ────── */

const SidebarInner: React.FC<{
  collapsed: boolean;
  onToggleCollapsed?: () => void;
  onCloseMobile?: () => void;
  showClose?: boolean;
}> = ({ collapsed, onToggleCollapsed, onCloseMobile, showClose }) => {
  const location = useLocation();
  const { isAuthenticated, user } = useAuth();
  const { crumbs, section: forcedSection } = useBreadcrumb();
  const showParcours = canSeeParcours(user);
  const hasClassroom = useHasClassroom();

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
    if (item.isActive) return item.isActive(p, location.search);
    if (item.to === '/') return p === '/';
    if (item.exclude?.some(x => under(p, x))) return false;
    return item.match?.some(x => under(p, x)) ?? false;
  };

  return (
    <>
      {/* Header: logo + collapse / close control */}
      <div
        className="flex items-center"
        style={{
          height: 60, padding: collapsed ? '0' : '0 16px',
          justifyContent: collapsed ? 'center' : 'space-between',
          borderBottom: '1px solid #faf9f7', flexShrink: 0,
        }}
      >
        {!collapsed && (
          <Link to="/" onClick={onCloseMobile} className="flex items-center">
            <img src={Logo3} alt="Fidni" style={{ height: 38, width: 'auto', objectFit: 'contain' }} />
          </Link>
        )}
        {showClose ? (
          <button onClick={onCloseMobile} aria-label="Fermer le menu" data-drawer-close style={{ ...iconBtnStyle, width: 40, height: 40 }}>
            <X className="w-5 h-5" />
          </button>
        ) : (
          <button
            onClick={onToggleCollapsed}
            aria-label={collapsed ? 'Déployer le menu' : 'Réduire le menu'}
            title={collapsed ? 'Déployer' : 'Réduire'}
            style={iconBtnStyle}
          >
            {collapsed ? <ChevronsRight className="w-4 h-4" /> : <ChevronsLeft className="w-4 h-4" />}
          </button>
        )}
      </div>

      {/* Nav groups */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3" style={{ padding: collapsed ? '12px 10px' : '12px' }}>
        {groups.map((group, gi) => (
          <div key={gi} className={gi > 0 ? 'mt-4' : ''} data-tour={group.tour}>
            {group.title && !collapsed && (
              <div
                style={{
                  fontSize: 10, fontWeight: 700, color: '#6b6862',
                  letterSpacing: '.08em', textTransform: 'uppercase',
                  padding: '0 10px 6px',
                }}
              >
                {group.title}
              </div>
            )}
            {group.title && collapsed && gi > 0 && (
              <div style={{ height: 1, background: '#faf9f7', margin: '0 8px 8px' }} />
            )}
            <div className="flex flex-col gap-0.5">
              {group.items.map(item => (
                <NavItemRow key={item.to} item={item} active={isActive(item)} collapsed={collapsed} onClick={onCloseMobile} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* User / auth footer */}
      <div data-tour="nav-compte" style={{ borderTop: '1px solid #faf9f7', padding: collapsed ? '10px' : '12px', flexShrink: 0 }}>
        <SidebarUser collapsed={collapsed} onNavigate={onCloseMobile} canJoinClass={isAuthenticated && !hasClassroom} inline={showClose} />
      </div>
    </>
  );
};

const INK = '#1a1a1a';
// Entrée active : fond encre, tuile d'icône dorée.
const rowLinkStyle = (active: boolean, collapsed: boolean): React.CSSProperties => ({
  display: 'flex', alignItems: 'center', gap: 10,
  padding: collapsed ? '5px' : '5px 8px 5px 5px',
  justifyContent: collapsed ? 'center' : 'flex-start',
  borderRadius: 11,
  background: active ? INK : 'transparent',
  color: active ? '#fff' : '#33302b',
  fontSize: 13.5, fontWeight: active ? 600 : 500,
  textDecoration: 'none', transition: 'background .14s, color .14s',
});

/** L'icône posée dans une petite tuile ; dorée quand l'entrée est active. */
const IconTile: React.FC<{ icon: React.ComponentType<{ className?: string }>; active: boolean }> = ({ icon: Icon, active }) => (
  <span
    style={{
      width: 30, height: 30, borderRadius: 8, flexShrink: 0,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      background: active ? '#c0892f' : '#faf9f7',
      border: `1px solid ${active ? '#c0892f' : '#e7e3dc'}`,
      color: active ? INK : '#33302b',
      transition: 'background .14s, border-color .14s',
    }}
  >
    <Icon className="w-4 h-4" />
  </span>
);

const RowLabel: React.FC<{ label: string }> = ({ label }) => (
  <span className="min-w-0 flex flex-col" style={{ lineHeight: 1.2 }}>
    <span className="truncate">{label}</span>
  </span>
);

const NavItemRow: React.FC<{ item: NavItem; active: boolean; collapsed: boolean; onClick?: () => void }> = ({
  item, active, collapsed, onClick,
}) => {
  const hasDropdown = !!item.dropdown && !collapsed;
  const hoverIn = (el: HTMLElement) => { if (!active) el.style.background = '#f7f6f3'; };
  const hoverOut = (el: HTMLElement) => { if (!active) el.style.background = 'transparent'; };
  const [open, setOpen] = useState<boolean>(active && hasDropdown);
  const [levels, setLevels] = useState<{ id: string; name: string; slug?: string }[] | null>(null);
  const [loading, setLoading] = useState(false);
  // Sous-lien actif : même page ET même niveau dans l'URL (« Tout voir » = page sans niveau).
  const location = useLocation();
  const onBase = location.pathname === item.to;
  const currentLevel = new URLSearchParams(location.search).get('classLevels');

  useEffect(() => {
    if (!open || levels || !item.dropdown) return;
    let cancelled = false;
    setLoading(true);
    getClassLevels(item.dropdown)
      .then(data => { if (!cancelled) setLevels(data.map((l) => ({ id: String(l.id), name: l.name, slug: (l as { slug?: string }).slug }))); })
      .catch(e => console.error('Sidebar: failed to load class levels', e))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [open, item.dropdown]);

  // Plain item (no dropdown, or collapsed rail) — a simple link.
  if (!hasDropdown) {
    return (
      <Link
        to={item.to} onClick={onClick} title={collapsed ? item.label : undefined}
        aria-label={collapsed ? item.label : undefined}
        aria-current={active ? 'page' : undefined}
        style={rowLinkStyle(active, collapsed)}
        onMouseEnter={(e) => hoverIn(e.currentTarget)}
        onMouseLeave={(e) => hoverOut(e.currentTarget)}
      >
        <IconTile icon={item.icon} active={active} />
        {!collapsed && <RowLabel label={item.label} />}
      </Link>
    );
  }

  return (
    <div>
      <div
        className="flex items-center"
        style={{ borderRadius: 11, background: active ? INK : 'transparent', transition: 'background .14s' }}
        onMouseEnter={(e) => hoverIn(e.currentTarget)}
        onMouseLeave={(e) => hoverOut(e.currentTarget)}
      >
        <Link
          to={item.to} onClick={onClick}
          aria-current={active ? 'page' : undefined}
          style={{
            flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 10,
            padding: '5px 4px 5px 5px',
            color: active ? '#fff' : '#33302b',
            fontSize: 13.5, fontWeight: active ? 600 : 500, textDecoration: 'none',
          }}
        >
          <IconTile icon={item.icon} active={active} />
          <RowLabel label={item.label} />
        </Link>
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(o => !o); }}
          aria-label={open ? `Réduire ${item.label}` : `Déployer ${item.label}`}
          aria-expanded={open}
          style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 40, height: 40, border: 'none', background: 'transparent',
            color: active ? 'rgba(255,255,255,.7)' : '#6b6862', cursor: 'pointer', flexShrink: 0,
          }}
        >
          <ChevronDown className="w-4 h-4" style={{ transition: 'transform .18s', transform: open ? 'rotate(180deg)' : 'none' }} />
        </button>
      </div>

      {open && (
        <div
          style={{
            marginTop: 2, marginLeft: 16, paddingLeft: 11,
            borderLeft: '1px solid #e7e3dc',
            display: 'flex', flexDirection: 'column', gap: 1,
          }}
        >
          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', color: '#6b6862', fontSize: 12.5 }}>
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Chargement…
            </div>
          )}
          {!loading && levels?.map(l => (
            // Page du niveau (/exercises/niveau/2eme-bac-sm) : une vraie adresse, que Google indexe.
            <SubLink key={l.id} to={l.slug ? `${item.to}/niveau/${l.slug}` : `${item.to}?classLevels=${l.id}`} label={l.name} onClick={onClick}
              active={(onBase && currentLevel === l.id) || (!!l.slug && location.pathname.startsWith(`${item.to}/niveau/${l.slug}`))} />
          ))}
          {!loading && levels && levels.length === 0 && (
            <div style={{ padding: '7px 10px', color: '#6b6862', fontSize: 12 }}>Aucun niveau</div>
          )}
          {/* « Tout voir » : la liste de tous les niveaux (sans ?niveau=tous, un élève qui a indiqué sa classe
              serait renvoyé à la page de son niveau, voir ContentList). */}
          {!loading && <SubLink to={`${item.to}?niveau=tous`} label="Tout voir" onClick={onClick} muted active={onBase && !currentLevel} />}
        </div>
      )}
    </div>
  );
};

// Sous-lien (niveaux sous Exercices / Examens / Leçons). Actif : fond or pâle et trait or sur la
// ligne de l'arborescence, en écho à la tuile dorée de la section active.
const SubLink: React.FC<{ to: string; label: string; onClick?: () => void; muted?: boolean; active?: boolean }> = ({
  to, label, onClick, muted, active,
}) => {
  const rest = { background: active ? '#faf3e2' : 'transparent', color: active ? INK : muted ? '#6b6862' : '#33302b' };
  return (
    <Link
      to={to} onClick={onClick} className="truncate"
      aria-current={active ? 'page' : undefined}
      style={{
        padding: '9px 10px', borderRadius: 8, fontSize: 12.5, ...rest,
        boxShadow: active ? 'inset 3px 0 0 #c0892f' : 'none',
        fontWeight: active ? 700 : muted ? 600 : 500,
        textDecoration: 'none', transition: 'background .12s, color .12s',
      }}
      onMouseEnter={(e) => { if (!active) { e.currentTarget.style.background = '#f7f6f3'; e.currentTarget.style.color = '#15633c'; } }}
      onMouseLeave={(e) => { e.currentTarget.style.background = rest.background; e.currentTarget.style.color = rest.color; }}
    >
      {label}
    </Link>
  );
};

/* ────── User footer ────── */

const SidebarUser: React.FC<{ collapsed: boolean; onNavigate?: () => void; canJoinClass?: boolean; inline?: boolean }> = ({
  collapsed, onNavigate, canJoinClass, inline,
}) => {
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuth();
  const openSignup = useOpenSignup('sidebar');
  const [menuOpen, setMenuOpen] = React.useState(false);
  const accountRef = React.useRef<HTMLDivElement>(null);

  const go = (to: string) => { navigate(to); onNavigate?.(); setMenuOpen(false); };
  const handleLogout = async () => {
    try { await logout(); go('/'); } catch (err) { console.error('Logout failed:', err); }
  };

  if (!isAuthenticated || !user) {
    if (collapsed) {
      return (
        <button
          onClick={() => openSignup('login')}
          aria-label="Connexion" title="Connexion"
          style={{ ...iconBtnStyle, width: '100%', height: 38 }}
        >
          <User className="w-4 h-4" />
        </button>
      );
    }
    return (
      <div className="flex flex-col gap-2">
        <button className="fd-btn-ghost" style={{ justifyContent: 'center', minHeight: 40 }} onClick={() => openSignup('login')}>
          Connexion
        </button>
        <button className="fd-btn-primary" style={{ justifyContent: 'center', minHeight: 40 }} onClick={() => openSignup('signup')}>
          S'inscrire
        </button>
      </div>
    );
  }

  const avatar = (
    <img
      src={user.profile?.avatar || '/avatar-placeholder.jpg'}
      alt=""
      style={{ width: 30, height: 30, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
    />
  );

  if (collapsed) {
    return (
      <button
        onClick={() => go(`/profile/${user.username}`)}
        aria-label="Mon profil" title={user.username}
        style={{ ...iconBtnStyle, width: '100%', height: 40, padding: 0 }}
      >
        {avatar}
      </button>
    );
  }

  // Compte : profil et réglages seulement (la progression et les révisions sont dans « Mon suivi »).
  const items = (
    <>
      <MenuItem icon={<User className="w-4 h-4" />} label="Mon profil" onClick={() => go(`/profile/${user.username}`)} />
      <MenuItem icon={<Settings className="w-4 h-4" />} label="Paramètres" onClick={() => go(`/profile/${user.username}?tab=settings`)} />
      {canJoinClass && (
        <MenuItem icon={<UserPlus className="w-4 h-4" />} label="Rejoindre une classe" onClick={() => go('/classrooms')} />
      )}
      {user.is_superuser && (
        <MenuItem icon={<Gauge className="w-4 h-4" />} label="Pilotage" onClick={() => go('/pilotage')} />
      )}
      {user.is_superuser && (
        <MenuItem icon={<Trophy className="w-4 h-4" />} label="Admin concours" onClick={() => go('/concours/admin')} />
      )}
      <div style={{ height: 1, background: '#faf9f7', margin: '4px 0' }} />
      <MenuItem icon={<LogOut className="w-4 h-4" />} label="Se déconnecter" onClick={handleLogout} danger />
    </>
  );

  return (
    <div className="relative" ref={accountRef}>
      {/* Dans le tiroir du téléphone, le menu s'ouvre sur place (il reste dans la fenêtre du tiroir). */}
      {inline && menuOpen && (
        <div style={{ marginBottom: 8, padding: 6, borderRadius: 12, border: '1px solid #e7e3dc', background: '#fff' }}>
          {items}
        </div>
      )}
      <button
        onClick={() => setMenuOpen(v => !v)}
        aria-expanded={menuOpen}
        aria-label={`Compte de ${user.username}`}
        style={{
          display: 'flex', alignItems: 'center', gap: 10, width: '100%',
          padding: 8, borderRadius: 12, border: '1px solid #e7e3dc',
          background: menuOpen ? '#faf9f7' : '#fff', cursor: 'pointer',
          transition: 'background .15s',
        }}
      >
        {avatar}
        <div className="flex-1 min-w-0 text-left">
          <div style={{ fontSize: 12.5, fontWeight: 600, color: '#1a1a1a' }} className="truncate">{user.username}</div>
          <div style={{ fontSize: 10.5, color: '#6b6862' }} className="truncate">{user.email}</div>
        </div>
      </button>

      {!inline && (
        <FloatingPanel anchorRef={accountRef} open={menuOpen} onClose={() => setMenuOpen(false)} placement="top-start"
          offset={8} matchWidth
          style={{
            background: '#fff', borderRadius: 12, border: '1px solid #e7e3dc',
            boxShadow: '0 14px 40px rgba(20,18,16,.18)', padding: 6,
            animation: 'fadeUp .18s ease',
          }}
        >
          {items}
        </FloatingPanel>
      )}
    </div>
  );
};

const MenuItem: React.FC<{ icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }> = ({
  icon, label, onClick, danger,
}) => (
  <button
    onClick={onClick}
    style={{
      display: 'flex', alignItems: 'center', gap: 10, width: '100%', minHeight: 38,
      padding: '8px 10px', borderRadius: 9, border: 'none',
      background: 'transparent', color: danger ? '#b91c1c' : '#33302b',
      fontSize: 12.5, fontWeight: 500, fontFamily: 'DM Sans', cursor: 'pointer', textAlign: 'left',
    }}
    onMouseEnter={(e) => (e.currentTarget.style.background = danger ? '#fef2f2' : '#f7f6f3')}
    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
  >
    {icon}{label}
  </button>
);

const iconBtnStyle: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  width: 34, height: 34, borderRadius: 9, border: '1px solid #e7e3dc',
  background: '#fff', color: '#33302b', cursor: 'pointer',
};
