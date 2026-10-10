import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Menu, Search as SearchIcon, ChevronRight, ChevronLeft } from 'lucide-react';
import { useBreadcrumb, type Crumb } from '@/contexts/BreadcrumbContext';
import { TourHelpButton } from '@/components/tour/TourProvider';
import { useAuth } from '@/contexts/AuthContext';
import { useOpenSignup } from '@/components/auth/SignupPrompt';
import { NotificationBell } from './NotificationBell';
import { revisionTab } from './nav';
import { trackAction } from '@/lib/usage';

interface TopBarProps {
  onOpenMobile: () => void;
}

// First path segment → human label for the breadcrumb / page title (mêmes mots que le menu).
const SECTION_LABELS: Record<string, string> = {
  '': 'Accueil',
  exercises: 'Exercices',
  exams: 'Devoirs (DS)',
  nationaux: 'Bac national',
  lessons: 'Leçons',
  'learning-path': 'Parcours',
  classrooms: 'Classes',
  concours: 'Concours',
  profile: 'Profil',
  saved: 'Favoris',
  'revision-lists': 'Mes révisions',
  revisions: 'Préparer un DS',
  notebooks: 'Cahiers',
  'skill-iq': 'Quiz par chapitre',
  settings: 'Paramètres',
  search: 'Recherche',
  login: 'Connexion',
  signup: 'Inscription',
  pilotage: 'Pilotage',
  statistiques: 'Ma progression',
  progression: 'Ma progression',
  'complete-profile': 'Ton profil',
  'verify-email': 'Confirmation de l’e-mail',
  'reset-password': 'Nouveau mot de passe',
  logs: 'Journaux',
};

export const TopBar: React.FC<TopBarProps> = ({ onOpenMobile }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { crumbs } = useBreadcrumb();
  const { isAuthenticated, isLoading } = useAuth();
  const openSignup = useOpenSignup('barre-haut');
  const [searchValue, setSearchValue] = useState('');

  const parts = location.pathname.split('/').filter(Boolean);
  // /exams/nationaux est une section à part entière (pas une page de la section Examens), comme une liste
  // de révision ouverte (/profile/revision-lists/12 : « Mes révisions », pas le profil).
  const segment = parts[0] === 'exams' && parts[1] === 'nationaux' ? 'nationaux'
    : parts[0] === 'profile' && parts[1] === 'revision-lists' ? 'revision-lists'
      : (parts[0] ?? '');
  // /revision-lists : deux onglets, deux entrées du menu (Préparer un DS / Mes révisions).
  const sectionLabel = segment === 'revision-lists' && parts.length === 1 && revisionTab(location.search) === 'ds'
    ? 'Préparer un DS'
    : SECTION_LABELS[segment] ?? 'Fidni';
  const isHome = parts.length === 0;
  // A deeper segment (e.g. an id) means the section name should link back to
  // its listing; on the listing page itself it's the current crumb (plain).
  // Profil : la section est /profile/<pseudo> (il n'y a pas de page « /profile »).
  const hasDeeper = parts.length > (segment === 'nationaux' || parts[0] === 'profile' ? 2 : 1);
  const SECTION_PATHS: Record<string, string> = {
    nationaux: '/exams/nationaux',
    revisions: '/revision-lists?onglet=ds',
    'revision-lists': '/revision-lists?onglet=listes',
    profile: `/profile/${parts[1] ?? ''}`,
  };
  const sectionPath = SECTION_PATHS[segment] ?? `/${segment}`;

  // A page (e.g. content detail) can push a rich trail via context; otherwise
  // fall back to the current route's section label.
  const trail: Crumb[] = crumbs && crumbs.length
    ? crumbs
    : isHome
      ? []
      : [{ label: sectionLabel, to: hasDeeper ? sectionPath : undefined }];

  // Téléphone : un seul lien de retour « ‹ Limites » (le parent le plus proche) au lieu du fil complet.
  // Si le dernier élément a une adresse, c'est un parent (la page elle-même n'est pas dans le fil).
  const last = trail[trail.length - 1];
  const current = last && !last.to ? last : null;
  const parents = current ? trail.slice(0, -1) : trail;
  const back = [...parents].reverse().find((c) => c.to) ?? null;

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
  const squareBtn: React.CSSProperties = {
    alignItems: 'center', justifyContent: 'center',
    width: 38, height: 38, borderRadius: 10, border: '1px solid #e7e3dc',
    background: '#fff', color: '#1a1a1a', cursor: 'pointer', flexShrink: 0,
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
      <div className="h-full flex items-center gap-2 sm:gap-3 px-4 md:px-6">
        {/* Mobile menu trigger */}
        <button
          className="md:hidden inline-flex"
          onClick={onOpenMobile}
          aria-label="Ouvrir le menu"
          aria-haspopup="dialog"
          data-tour="menu-mobile"
          style={squareBtn}
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Breadcrumb / page title */}
        <nav aria-label="Fil d'Ariane" className="flex items-center min-w-0" style={{ gap: 6 }}>
          {isHome ? (
            <span className="truncate" style={crumbCurrent}>Accueil</span>
          ) : (
            <>
              {/* Téléphone : retour au parent le plus proche, la page en cours en dessous. */}
              <span className="sm:hidden flex flex-col min-w-0" style={{ lineHeight: 1.2 }}>
                {back && (
                  <Link to={back.to!} className="inline-flex items-center min-w-0"
                    style={current
                      ? { fontSize: 12, color: '#6b6862', fontWeight: 500, textDecoration: 'none', minHeight: 20 }
                      : { ...crumbCurrent, textDecoration: 'none', minHeight: 36 }}>
                    <ChevronLeft className={current ? 'w-3.5 h-3.5 flex-shrink-0 -ml-1' : 'w-4 h-4 flex-shrink-0 -ml-1'} aria-hidden />
                    <span className="truncate">{back.label}</span>
                  </Link>
                )}
                {current && <span aria-current="page" className="truncate" style={back ? { ...crumbCurrent, fontSize: 14 } : crumbCurrent}>{current.label}</span>}
              </span>

              {/* Plus large : le fil complet */}
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
                      <span aria-current="page" className="hidden sm:inline truncate" style={crumbCurrent}>{c.label}</span>
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

        {/* Notifications (membres connectés) : à gauche de la recherche ; l'aide reste tout à droite. */}
        <NotificationBell />

        {/* Visiteur : la connexion à portée de main (avant, elle n'était qu'au pied du menu). */}
        {!isAuthenticated && !isLoading && (
          <button
            type="button"
            onClick={() => openSignup('login')}
            className="inline-flex items-center flex-shrink-0 rounded-[10px] border border-line bg-white px-3 text-[13px] font-semibold text-ink hover:border-ink transition-colors"
            style={{ height: 38 }}
          >
            Connexion
          </button>
        )}

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
            aria-label="Rechercher"
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
          style={squareBtn}
        >
          <SearchIcon className="w-5 h-5" />
        </button>

        {/* Guide de la page (visite guidée), s'il y en a un */}
        <TourHelpButton />
      </div>
    </header>
  );
};
