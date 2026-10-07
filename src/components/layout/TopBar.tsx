import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Menu, Search as SearchIcon, ChevronRight } from 'lucide-react';
import { useBreadcrumb, type Crumb } from '@/contexts/BreadcrumbContext';
import { TourHelpButton } from '@/components/tour/TourProvider';
import { NotificationBell } from './NotificationBell';
import { trackAction } from '@/lib/usage';

interface TopBarProps {
  onOpenMobile: () => void;
}

// First path segment → human label for the breadcrumb / page title.
const SECTION_LABELS: Record<string, string> = {
  '': 'Accueil',
  exercises: 'Exercices',
  exams: 'Examens',
  nationaux: 'Examens nationaux',
  lessons: 'Leçons',
  'learning-path': 'Parcours',
  classrooms: 'Classes',
  concours: 'Concours',
  profile: 'Profil',
  saved: 'Favoris',
  'revision-lists': 'Listes de révision',
  notebooks: 'Cahiers',
  'skill-iq': 'Skill IQ',
  settings: 'Paramètres',
  search: 'Recherche',
  login: 'Connexion',
  pilotage: 'Pilotage',
  statistiques: 'Statistiques',
};

export const TopBar: React.FC<TopBarProps> = ({ onOpenMobile }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { crumbs } = useBreadcrumb();
  const [searchValue, setSearchValue] = useState('');

  const parts = location.pathname.split('/').filter(Boolean);
  // /exams/nationaux est une section à part entière (pas une page de la section Examens).
  const segment = parts[0] === 'exams' && parts[1] === 'nationaux' ? 'nationaux' : (parts[0] ?? '');
  const sectionLabel = SECTION_LABELS[segment] ?? 'Fidni';
  const isHome = parts.length === 0;
  // A deeper segment (e.g. an id) means the section name should link back to
  // its listing; on the listing page itself it's the current crumb (plain).
  const hasDeeper = parts.length > (segment === 'nationaux' ? 2 : 1);

  // A page (e.g. content detail) can push a rich trail via context; otherwise
  // fall back to the current route's section label.
  const trail: Crumb[] = crumbs && crumbs.length
    ? crumbs
    : isHome
      ? []
      : [{ label: sectionLabel, to: hasDeeper ? (segment === 'nationaux' ? '/exams/nationaux' : `/${segment}`) : undefined }];

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchValue.trim();
    if (q) { trackAction('recherche'); navigate(`/search?q=${encodeURIComponent(q)}`); }
  };

  const crumbLink: React.CSSProperties = {
    fontSize: 13, color: '#6b6862', fontWeight: 500, textDecoration: 'none',
  };
  const crumbCurrent: React.CSSProperties = {
    fontSize: 15, fontWeight: 700, color: '#1a1a1a', letterSpacing: '-0.01em',
  };

  return (
    <header
      className="sticky top-0 z-30"
      style={{
        height: 60,
        background: 'rgba(255,255,255,.85)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid #e7e3dc',
      }}
    >
      <div className="h-full flex items-center gap-3 px-4 md:px-6">
        {/* Mobile menu trigger */}
        <button
          className="md:hidden inline-flex"
          onClick={onOpenMobile}
          aria-label="Ouvrir le menu"
          data-tour="menu-mobile"
          style={{
            alignItems: 'center', justifyContent: 'center',
            width: 38, height: 38, borderRadius: 10, border: '1px solid #e7e3dc',
            background: '#fff', color: '#1a1a1a', cursor: 'pointer', flexShrink: 0,
          }}
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Breadcrumb / page title */}
        <nav aria-label="Fil d'Ariane" className="flex items-center min-w-0" style={{ gap: 6 }}>
          {isHome ? (
            <span className="truncate" style={crumbCurrent}>Accueil</span>
          ) : (
            <>
              {/* Root + intermediate crumbs — hidden on mobile to save space */}
              <Link to="/" className="hidden sm:inline hover:underline" style={crumbLink}>Accueil</Link>
              {trail.map((c, i) => {
                const isLast = i === trail.length - 1;
                return (
                  <React.Fragment key={`${c.label}-${i}`}>
                    <ChevronRight
                      className="w-3.5 h-3.5 hidden sm:inline"
                      style={{ color: '#c9c5bd', flexShrink: 0 }}
                    />
                    {isLast ? (
                      <span aria-current="page" className="truncate" style={crumbCurrent}>{c.label}</span>
                    ) : c.to ? (
                      <Link to={c.to} className="hidden sm:inline hover:underline truncate" style={crumbLink}>{c.label}</Link>
                    ) : (
                      <span className="hidden sm:inline truncate" style={crumbLink}>{c.label}</span>
                    )}
                  </React.Fragment>
                );
              })}
            </>
          )}
        </nav>

        <div className="flex-1" />

        {/* Search — full field on larger screens */}
        <form
          onSubmit={handleSearchSubmit}
          data-tour="recherche"
          className="hidden sm:flex items-center w-full max-w-xs"
          style={{
            background: '#f7f6f3', border: '1.5px solid #e7e3dc',
            borderRadius: 10, padding: '7px 12px', gap: 8,
          }}
        >
          <SearchIcon className="w-4 h-4" style={{ color: '#6b6862' }} />
          <input
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="Rechercher un exercice, une leçon…"
            style={{
              flex: 1, border: 'none', outline: 'none', background: 'transparent',
              fontSize: 13, fontFamily: 'DM Sans', color: '#1a1a1a', minWidth: 0,
            }}
          />
        </form>

        {/* Search — icon only on mobile */}
        <button
          className="sm:hidden inline-flex"
          data-tour="recherche"
          onClick={() => navigate('/search')}
          aria-label="Rechercher"
          style={{
            alignItems: 'center', justifyContent: 'center',
            width: 38, height: 38, borderRadius: 10, border: '1px solid #e7e3dc',
            background: '#fff', color: '#1a1a1a', cursor: 'pointer', flexShrink: 0,
          }}
        >
          <SearchIcon className="w-5 h-5" />
        </button>

        {/* Notifications (membres connectés) : nouveaux commentaires, réponses */}
        <NotificationBell />

        {/* Guide de la page (visite guidée), s'il y en a un */}
        <TourHelpButton />
      </div>
    </header>
  );
};
