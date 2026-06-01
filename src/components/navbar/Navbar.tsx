import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  User, LogOut, BookOpen, Home, Settings, Bookmark as BookmarkIcon,
  Menu, X, Route, Shield, List, Search as SearchIcon, ChevronDown,
  GraduationCap, Trophy,
} from 'lucide-react';
import { APlusIcon } from '@/components/icons/APlusIcon';
import { LessonIcon } from '@/components/icons/LessonIcon';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthModal } from '@/components/auth/AuthController';
import { NavDropdown } from './NavbarDropdown';
import Logo2 from '@/assets/logo2.svg';
import Logo3 from '@/assets/logo3.svg';
import '@/lib/styles.css';

interface NavTab {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  dropdown?: 'exercises' | 'lessons' | 'exams';
  matchPrefix?: string[];
}

const TABS: NavTab[] = [
  { to: '/',              label: 'Accueil',   icon: Home },
  { to: '/exercises',     label: 'Exercices', icon: BookOpen,   dropdown: 'exercises', matchPrefix: ['/exercises', '/exercise', '/new', '/edit'] },
  { to: '/lessons',       label: 'Leçons',    icon: LessonIcon, dropdown: 'lessons',   matchPrefix: ['/lessons', '/lesson'] },
  { to: '/exams',         label: 'Examens',   icon: APlusIcon,  dropdown: 'exams',     matchPrefix: ['/exams', '/exam'] },
  { to: '/learning-path', label: 'Parcours',  icon: Route,      matchPrefix: ['/learning-path'] },
  { to: '/classrooms',    label: 'Classes',   icon: GraduationCap, matchPrefix: ['/classrooms'] },
  { to: '/concours',      label: 'Concours',  icon: Trophy,     matchPrefix: ['/concours'] },
];

const FidniLogo = () => {
  const [hover, setHover] = useState(false);
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ display: 'flex', alignItems: 'center', transition: 'transform .25s' }}
    >
      <img
        src={hover ? Logo2 : Logo3}
        alt="Fidni"
        style={{ height: 44, width: 'auto', objectFit: 'contain', transform: hover ? 'scale(1.04)' : 'none', transition: 'transform .25s' }}
      />
    </div>
  );
};

export const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user, logout } = useAuth();
  const { openModal, setInitialTab } = useAuthModal();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<'exercises' | 'lessons' | 'exams' | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  const userMenuRef = useRef<HTMLDivElement>(null);

  // Adjust body padding when navbar height changes
  useEffect(() => {
    const update = () => {
      const nav = document.querySelector('nav.fidni-navbar') as HTMLElement | null;
      if (nav) document.body.style.paddingTop = `${nav.offsetHeight}px`;
    };
    update();
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('resize', update);
      document.body.style.paddingTop = '';
    };
  }, [mobileOpen]);

  // Close dropdowns on route change
  useEffect(() => {
    setActiveDropdown(null);
    setUserMenuOpen(false);
    setMobileOpen(false);
  }, [location.pathname]);

  // Close user menu on outside click
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    if (userMenuOpen) document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [userMenuOpen]);

  const isTabActive = (tab: NavTab) => {
    if (tab.to === '/') return location.pathname === '/';
    return tab.matchPrefix?.some(p => location.pathname === p || location.pathname.startsWith(p + '/')) ?? false;
  };

  const handleLogout = async () => {
    try { await logout(); navigate('/'); }
    catch (err) { console.error('Logout failed:', err); }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchValue.trim();
    if (q) navigate(`/search?q=${encodeURIComponent(q)}`);
  };

  return (
    <nav
      className="fidni-navbar fixed top-0 left-0 right-0 z-50"
      style={{
        background: 'rgba(255,255,255,.85)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid #ede9fe',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <div className="flex items-center gap-4 h-[60px]">
          {/* Logo */}
          <Link to="/" className="flex-shrink-0">
            <FidniLogo />
          </Link>

          {/* Desktop nav tabs (pills) */}
          <div className="hidden md:flex items-center gap-1 ml-2">
            {TABS.map((tab) => {
              const active = isTabActive(tab);
              const Icon = tab.icon;
              return (
                <div key={tab.to} className="relative">
                  <button
                    onClick={() => {
                      if (tab.dropdown) {
                        setActiveDropdown(activeDropdown === tab.dropdown ? null : tab.dropdown);
                      } else {
                        navigate(tab.to);
                      }
                    }}
                    style={{
                      padding: '8px 16px',
                      borderRadius: 99,
                      border: 'none',
                      background: active ? '#4f46e5' : 'transparent',
                      color: active ? '#fff' : '#7068a8',
                      fontSize: 13,
                      fontWeight: active ? 600 : 500,
                      fontFamily: 'DM Sans',
                      cursor: 'pointer',
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      transition: 'all .18s',
                    }}
                    onMouseEnter={(e) => {
                      if (!active) {
                        (e.currentTarget as HTMLButtonElement).style.background = '#f0effe';
                        (e.currentTarget as HTMLButtonElement).style.color = '#4f46e5';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!active) {
                        (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                        (e.currentTarget as HTMLButtonElement).style.color = '#7068a8';
                      }
                    }}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {tab.label}
                    {tab.dropdown && <ChevronDown className={`w-3 h-3 transition-transform ${activeDropdown === tab.dropdown ? 'rotate-180' : ''}`} />}
                  </button>

                  {tab.dropdown && activeDropdown === tab.dropdown && (
                    <NavDropdown type={tab.dropdown} onClose={() => setActiveDropdown(null)} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Search bar (desktop) */}
          <form
            onSubmit={handleSearchSubmit}
            className="hidden lg:flex items-center flex-1 max-w-sm ml-auto"
            style={{
              background: '#f5f4ff',
              border: '1.5px solid #ede9fe',
              borderRadius: 10,
              padding: '6px 12px',
              gap: 8,
            }}
          >
            <SearchIcon className="w-4 h-4" style={{ color: '#9391b8' }} />
            <input
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder="Rechercher…"
              style={{
                flex: 1, border: 'none', outline: 'none',
                background: 'transparent', fontSize: 13, fontFamily: 'DM Sans',
                color: '#1e1b4b',
              }}
            />
          </form>

          {/* Spacer when search hidden */}
          <div className="flex-1 lg:hidden" />

          {/* Auth area */}
          <div className="hidden md:flex items-center gap-2">
            {isAuthenticated && user ? (
              <div ref={userMenuRef} className="relative">
                <button
                  onClick={() => setUserMenuOpen(v => !v)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                    padding: '4px 10px 4px 4px',
                    borderRadius: 99,
                    border: '1.5px solid #ede9fe',
                    background: userMenuOpen ? '#f0effe' : '#fff',
                    cursor: 'pointer',
                    transition: 'all .15s',
                  }}
                >
                  <img
                    src={user.profile?.avatar || '/avatar-placeholder.jpg'}
                    alt=""
                    style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }}
                  />
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#1e1b4b' }}>{user.username}</span>
                  <ChevronDown className="w-3 h-3" style={{ color: '#7068a8' }} />
                </button>

                {userMenuOpen && (
                  <div
                    className="absolute right-0 mt-2"
                    style={{
                      width: 240,
                      background: '#fff',
                      borderRadius: 14,
                      boxShadow: '0 14px 40px rgba(90,70,200,.18)',
                      border: '1px solid #ede9fe',
                      padding: 6,
                      animation: 'fadeUp .2s ease',
                    }}
                  >
                    <div style={{ padding: '10px 12px', borderBottom: '1px solid #f0effe', marginBottom: 4 }}>
                      <div style={{ fontSize: 10, color: '#9391b8', textTransform: 'uppercase', letterSpacing: '.06em' }}>Connecté</div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#1e1b4b', marginTop: 2 }}>{user.email}</div>
                    </div>
                    <UserMenuItem icon={<User className="w-4 h-4" />} label="Mon profil" onClick={() => navigate(`/profile/${user.username}`)} />
                    <UserMenuItem icon={<GraduationCap className="w-4 h-4" />} label="Mes classes" onClick={() => navigate('/classrooms')} />
                    <UserMenuItem icon={<BookmarkIcon className="w-4 h-4" />} label="Sauvegardés" onClick={() => navigate('/saved')} />
                    <UserMenuItem icon={<List className="w-4 h-4" />} label="Listes de révision" onClick={() => navigate('/revision-lists')} />
                    <UserMenuItem icon={<Settings className="w-4 h-4" />} label="Paramètres" onClick={() => navigate('/settings')} />
                    {user.is_superuser && (
                      <>
                        <UserMenuItem icon={<Shield className="w-4 h-4" />} label="Admin parcours" onClick={() => navigate('/admin/learning-paths')} />
                        <UserMenuItem icon={<Trophy className="w-4 h-4" />} label="Admin concours" onClick={() => navigate('/concours/admin')} />
                      </>
                    )}
                    <div style={{ height: 1, background: '#f0effe', margin: '4px 0' }} />
                    <UserMenuItem
                      icon={<LogOut className="w-4 h-4" />}
                      label="Se déconnecter"
                      onClick={handleLogout}
                      danger
                    />
                  </div>
                )}
              </div>
            ) : (
              <>
                <button
                  className="fd-btn-ghost"
                  onClick={() => { setInitialTab('login'); openModal(); }}
                >
                  Connexion
                </button>
                <button
                  className="fd-btn-primary"
                  onClick={() => { setInitialTab('signup'); openModal(); }}
                >
                  S'inscrire
                </button>
              </>
            )}
          </div>

          {/* Mobile burger */}
          <button
            className="md:hidden p-2"
            onClick={() => setMobileOpen(v => !v)}
            aria-label="Menu"
            style={{ background: 'transparent', border: 'none', color: '#1e1b4b', cursor: 'pointer' }}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div
          className="md:hidden"
          style={{ background: '#fff', borderTop: '1px solid #ede9fe', padding: '16px 16px 20px' }}
        >
          {/* Mobile search */}
          <form
            onSubmit={handleSearchSubmit}
            className="flex items-center mb-4"
            style={{
              background: '#f5f4ff', border: '1.5px solid #ede9fe',
              borderRadius: 10, padding: '8px 12px', gap: 8,
            }}
          >
            <SearchIcon className="w-4 h-4" style={{ color: '#9391b8' }} />
            <input
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder="Rechercher…"
              style={{
                flex: 1, border: 'none', outline: 'none',
                background: 'transparent', fontSize: 13, fontFamily: 'DM Sans', color: '#1e1b4b'
              }}
            />
          </form>

          <div className="flex flex-col gap-1">
            {TABS.map(tab => {
              const active = isTabActive(tab);
              const Icon = tab.icon;
              return (
                <Link
                  key={tab.to}
                  to={tab.to}
                  onClick={() => setMobileOpen(false)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 14px', borderRadius: 12,
                    background: active ? '#eef2ff' : 'transparent',
                    color: active ? '#4338ca' : '#4b4880',
                    fontSize: 13, fontWeight: active ? 700 : 500,
                    textDecoration: 'none',
                  }}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </Link>
              );
            })}
          </div>

          <div style={{ height: 1, background: '#f0effe', margin: '14px 0' }} />

          {isAuthenticated && user ? (
            <div className="flex flex-col gap-1">
              <div
                className="flex items-center gap-3 mb-2"
                style={{
                  padding: '10px 12px', borderRadius: 12, background: '#f5f4ff'
                }}
              >
                <img
                  src={user.profile?.avatar || '/avatar-placeholder.jpg'}
                  alt=""
                  style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }}
                />
                <div className="flex-1 min-w-0">
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#1e1b4b' }}>{user.username}</div>
                  <div style={{ fontSize: 11, color: '#7068a8' }} className="truncate">{user.email}</div>
                </div>
              </div>
              <MobileLink icon={<User className="w-4 h-4" />} label="Mon profil" to={`/profile/${user.username}`} onNav={() => setMobileOpen(false)} />
              <MobileLink icon={<GraduationCap className="w-4 h-4" />} label="Mes classes" to="/classrooms" onNav={() => setMobileOpen(false)} />
              <MobileLink icon={<BookmarkIcon className="w-4 h-4" />} label="Sauvegardés" to="/saved" onNav={() => setMobileOpen(false)} />
              <MobileLink icon={<List className="w-4 h-4" />} label="Listes de révision" to="/revision-lists" onNav={() => setMobileOpen(false)} />
              <MobileLink icon={<Settings className="w-4 h-4" />} label="Paramètres" to="/settings" onNav={() => setMobileOpen(false)} />
              <button
                onClick={handleLogout}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                  borderRadius: 12, border: 'none', background: '#fef2f2', color: '#b91c1c',
                  fontSize: 13, fontWeight: 600, fontFamily: 'DM Sans', cursor: 'pointer',
                }}
              >
                <LogOut className="w-4 h-4" /> Se déconnecter
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <button className="fd-btn-ghost" onClick={() => { setInitialTab('login'); openModal(); setMobileOpen(false); }}>Connexion</button>
              <button className="fd-btn-primary" onClick={() => { setInitialTab('signup'); openModal(); setMobileOpen(false); }}>S'inscrire</button>
            </div>
          )}
        </div>
      )}
    </nav>
  );
};

const UserMenuItem: React.FC<{ icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }> = ({ icon, label, onClick, danger }) => (
  <button
    onClick={onClick}
    style={{
      display: 'flex', alignItems: 'center', gap: 10, width: '100%',
      padding: '8px 12px', borderRadius: 9, border: 'none',
      background: 'transparent', color: danger ? '#b91c1c' : '#4b4880',
      fontSize: 12, fontWeight: 500, fontFamily: 'DM Sans', cursor: 'pointer',
      textAlign: 'left', transition: 'background .12s',
    }}
    onMouseEnter={(e) => (e.currentTarget.style.background = danger ? '#fef2f2' : '#f5f4ff')}
    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
  >
    {icon}
    {label}
  </button>
);

const MobileLink: React.FC<{ icon: React.ReactNode; label: string; to: string; onNav: () => void }> = ({ icon, label, to, onNav }) => (
  <Link
    to={to}
    onClick={onNav}
    style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
      borderRadius: 12, color: '#4b4880', fontSize: 13, fontWeight: 500,
      textDecoration: 'none',
    }}
  >
    {icon}
    {label}
  </Link>
);
