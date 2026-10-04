import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { FloatingPanel } from '@/components/ui/FloatingPanel';
import {
  Home, BookOpen, Route, GraduationCap, Trophy,
  User, Bookmark as BookmarkIcon, Settings, LogOut,
  X, ChevronsLeft, ChevronsRight, ChevronDown, Loader2,
  NotebookPen, Brain, ListChecks, BarChart3, Target, Gauge,
} from 'lucide-react';
import { APlusIcon } from '@/components/icons/APlusIcon';
import { LessonIcon } from '@/components/icons/LessonIcon';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthModal } from '@/components/auth/AuthController';
import { getClassLevels } from '@/lib/api';
import { nameSaysPage, pinForPath } from '@/components/campus/campusPins';
import { useHomeView } from '@/stores/homeViewStore';
import { canSeeParcours } from '@/lib/features';
import Logo3 from '@/assets/logo3.svg';

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  match?: string[];
  /** Content type for the class-level quick-link dropdown (singular API form). */
  dropdown?: 'exercise' | 'lesson' | 'exam';
}

interface NavGroup {
  title?: string;
  items: NavItem[];
}

// Grouped information architecture — turns 7 flat tabs into 3 clear intents.
const NAV_GROUPS: NavGroup[] = [
  { items: [{ to: '/', label: 'Accueil', icon: Home, match: ['/'] }] },
  {
    title: 'Apprendre',
    items: [
      { to: '/lessons', label: 'Leçons', icon: LessonIcon, match: ['/lessons', '/lesson'], dropdown: 'lesson' },
      { to: '/learning-path', label: 'Parcours', icon: Route, match: ['/learning-path'] },
    ],
  },
  {
    title: "S'entraîner",
    items: [
      { to: '/exercises', label: 'Exercices', icon: BookOpen, match: ['/exercises', '/exercise', '/new', '/edit'], dropdown: 'exercise' },
      { to: '/exams', label: 'Examens', icon: APlusIcon, match: ['/exams', '/exam'], dropdown: 'exam' },
      { to: '/concours', label: 'Concours', icon: Trophy, match: ['/concours'] },
    ],
  },
  {
    title: 'Ma classe',
    items: [
      { to: '/classrooms', label: 'Classes', icon: GraduationCap, match: ['/classrooms'] },
    ],
  },
];

// Personal workspace — only shown to authenticated users. Groups the tools that
// used to be buried in the profile page so they're reachable in one click.
const MON_ESPACE_GROUP: NavGroup = {
  title: 'Mon espace',
  items: [
    { to: '/statistiques', label: 'Statistiques', icon: BarChart3, match: ['/statistiques'] },
    { to: '/notebooks', label: 'Cahiers', icon: NotebookPen, match: ['/notebooks'] },
    { to: '/skill-iq', label: 'Skill IQ', icon: Brain, match: ['/skill-iq'] },
    { to: '/revision-lists', label: 'Révisions', icon: ListChecks, match: ['/revision-lists', '/profile/revision-lists'] },
    { to: '/saved', label: 'Favoris', icon: BookmarkIcon, match: ['/saved'] },
  ],
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

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-[60]">
          <div
            className="absolute inset-0"
            style={{ background: 'rgba(20,18,16,.4)', backdropFilter: 'blur(2px)' }}
            onClick={onCloseMobile}
          />
          <aside
            className="absolute left-0 top-0 h-full flex flex-col"
            style={{
              width: 264, background: '#fff', borderRight: '1px solid #e7e3dc',
              animation: 'slideIn .25s ease both',
            }}
          >
            <SidebarInner collapsed={false} onCloseMobile={onCloseMobile} showClose />
          </aside>
        </div>
      )}
    </>
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
  const showParcours = canSeeParcours(user);
  // Campus affiché : chaque entrée montre son bâtiment et le met en valeur au survol.
  const immersive = useHomeView((s) => s.immersive);

  // Insert "Mon espace" right after "S'entraîner" for signed-in users.
  const groups = useMemo(() => {
    // Parcours n'est pas terminé : entrée visible des admins seulement (lib/features.ts).
    const base = NAV_GROUPS.map((g) => ({
      ...g,
      items: g.items.filter((it) => showParcours || it.to !== '/learning-path'),
    }));
    if (!isAuthenticated) return base;
    const next = [...base];
    next.splice(3, 0, MON_ESPACE_GROUP);
    return next;
  }, [isAuthenticated, showParcours]);

  const isActive = (item: NavItem) => {
    if (item.to === '/') return location.pathname === '/';
    return item.match?.some(p => location.pathname === p || location.pathname.startsWith(p + '/')) ?? false;
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
          <button onClick={onCloseMobile} aria-label="Fermer le menu" style={iconBtnStyle}>
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
          <div key={gi} className={gi > 0 ? 'mt-4' : ''} data-tour={group.title ? TOUR_GROUP[group.title] : undefined}>
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
                <NavItemRow key={item.to} item={item} active={isActive(item)} collapsed={collapsed} onClick={onCloseMobile} immersive={immersive} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* User / auth footer */}
      <div data-tour="nav-compte" style={{ borderTop: '1px solid #faf9f7', padding: collapsed ? '10px' : '12px', flexShrink: 0 }}>
        <SidebarUser collapsed={collapsed} onNavigate={onCloseMobile} />
      </div>
    </>
  );
};

const INK = '#1a1a1a';
/** Repères des visites guidées (lib/tours.ts). */
const TOUR_GROUP: Record<string, string> = {
  Apprendre: 'nav-apprendre', "S'entraîner": 'nav-entrainer', 'Ma classe': 'nav-classe', 'Mon espace': 'nav-espace',
};
/** Entrées de « Mon espace » que le cartable du campus ouvre aussi. */
const BAG_PATHS = ['/notebooks', '/revision-lists', '/saved'];

// Entrée active : fond encre, tuile d'icône dorée (repris du dock de la maquette du campus).
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

/** Libellé, avec le nom du bâtiment en dessous quand le campus est affiché. */
const RowLabel: React.FC<{ label: string; sub?: string; active: boolean }> = ({ label, sub, active }) => (
  <span className="min-w-0 flex flex-col" style={{ lineHeight: 1.2 }}>
    <span className="truncate">{label}</span>
    {sub && (
      <span className="truncate" style={{ fontSize: 11, fontWeight: 500, marginTop: 1, color: active ? 'rgba(255,255,255,.62)' : '#6b6862' }}>
        {sub}
      </span>
    )}
  </span>
);

const NavItemRow: React.FC<{ item: NavItem; active: boolean; collapsed: boolean; onClick?: () => void; immersive?: boolean }> = ({
  item, active, collapsed, onClick, immersive,
}) => {
  const hasDropdown = !!item.dropdown && !collapsed;
  const setHoverRoom = useHomeView((s) => s.setHoverRoom);
  const room = immersive ? pinForPath(item.to) : undefined;
  // Le bâtiment n'est rappelé que s'il ne dit pas déjà la page (« Bibliothèque » sous « Leçons », pas « Espace exercices » sous « Exercices »).
  const sub = room ? (nameSaysPage(room) ? undefined : room.name) : (immersive && BAG_PATHS.includes(item.to) ? 'Dans ton cartable' : undefined);
  const hoverIn = (el: HTMLElement) => { if (!active) el.style.background = '#f7f6f3'; if (room) setHoverRoom(room.id); };
  const hoverOut = (el: HTMLElement) => { if (!active) el.style.background = 'transparent'; if (room) setHoverRoom(null); };
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
      .then(data => { if (!cancelled) setLevels(data.map((l: any) => ({ id: String(l.id), name: l.name, slug: l.slug }))); })
      .catch(e => console.error('Sidebar: failed to load class levels', e))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [open, item.dropdown]);

  // Plain item (no dropdown, or collapsed rail) — a simple link.
  if (!hasDropdown) {
    return (
      <Link
        to={item.to} onClick={onClick} title={collapsed ? item.label : undefined}
        style={rowLinkStyle(active, collapsed)}
        onMouseEnter={(e) => hoverIn(e.currentTarget)}
        onMouseLeave={(e) => hoverOut(e.currentTarget)}
      >
        <IconTile icon={item.icon} active={active} />
        {!collapsed && <RowLabel label={item.label} sub={sub} active={active} />}
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
          style={{
            flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 10,
            padding: '5px 4px 5px 5px',
            color: active ? '#fff' : '#33302b',
            fontSize: 13.5, fontWeight: active ? 600 : 500, textDecoration: 'none',
          }}
        >
          <IconTile icon={item.icon} active={active} />
          <RowLabel label={item.label} sub={sub} active={active} />
        </Link>
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(o => !o); }}
          aria-label={open ? `Réduire ${item.label}` : `Déployer ${item.label}`}
          aria-expanded={open}
          style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 32, height: 36, border: 'none', background: 'transparent',
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
          {!loading && <SubLink to={item.to} label="Tout voir" onClick={onClick} muted active={onBase && !currentLevel} />}
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
        padding: '7px 10px', borderRadius: 8, fontSize: 12.5, ...rest,
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

const SidebarUser: React.FC<{ collapsed: boolean; onNavigate?: () => void }> = ({ collapsed, onNavigate }) => {
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuth();
  const { openModal, setInitialTab } = useAuthModal();
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
          onClick={() => { setInitialTab('login'); openModal(); }}
          aria-label="Connexion" title="Connexion"
          style={{ ...iconBtnStyle, width: '100%', height: 38 }}
        >
          <User className="w-4 h-4" />
        </button>
      );
    }
    return (
      <div className="flex flex-col gap-2">
        <button className="fd-btn-ghost" style={{ justifyContent: 'center' }} onClick={() => { setInitialTab('login'); openModal(); }}>
          Connexion
        </button>
        <button className="fd-btn-primary" style={{ justifyContent: 'center' }} onClick={() => { setInitialTab('signup'); openModal(); }}>
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

  return (
    <div className="relative" ref={accountRef}>
      <button
        onClick={() => setMenuOpen(v => !v)}
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

      <FloatingPanel anchorRef={accountRef} open={menuOpen} onClose={() => setMenuOpen(false)} placement="top-start"
        offset={8} matchWidth
          style={{
            background: '#fff', borderRadius: 12, border: '1px solid #e7e3dc',
            boxShadow: '0 14px 40px rgba(20,18,16,.18)', padding: 6,
            animation: 'fadeUp .18s ease',
          }}
        >
          <MenuItem icon={<User className="w-4 h-4" />} label="Mon profil" onClick={() => go(`/profile/${user.username}`)} />
          <MenuItem icon={<BarChart3 className="w-4 h-4" />} label="Statistiques" onClick={() => go('/statistiques')} />
          <MenuItem icon={<Target className="w-4 h-4" />} label="Progression" onClick={() => go(`/profile/${user.username}?tab=progress`)} />
          <MenuItem icon={<Settings className="w-4 h-4" />} label="Paramètres" onClick={() => go(`/profile/${user.username}?tab=settings`)} />
          {user.is_superuser && (
            <MenuItem icon={<Gauge className="w-4 h-4" />} label="Pilotage" onClick={() => go('/pilotage')} />
          )}
          {user.is_superuser && (
            <MenuItem icon={<Trophy className="w-4 h-4" />} label="Admin concours" onClick={() => go('/concours/admin')} />
          )}
          <div style={{ height: 1, background: '#faf9f7', margin: '4px 0' }} />
          <MenuItem icon={<LogOut className="w-4 h-4" />} label="Se déconnecter" onClick={handleLogout} danger />
      </FloatingPanel>
    </div>
  );
};

const MenuItem: React.FC<{ icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }> = ({
  icon, label, onClick, danger,
}) => (
  <button
    onClick={onClick}
    style={{
      display: 'flex', alignItems: 'center', gap: 10, width: '100%',
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
