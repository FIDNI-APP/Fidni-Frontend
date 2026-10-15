import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Menu, Moon, Search as SearchIcon, ChevronRight, ChevronLeft, Sun } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useBreadcrumb, type Crumb } from '@/contexts/BreadcrumbContext';
import { TourHelpButton } from '@/components/tour/TourProvider';
import { useAuth } from '@/contexts/AuthContext';
import { useOpenSignup } from '@/components/auth/SignupPrompt';
import { NotificationBell } from './NotificationBell';
import { useMobileTabBarVisible } from './nav';
import { trackAction } from '@/lib/usage';
import { t, useLang } from '@/i18n';
import Logo3 from '@/assets/logo3.svg';

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
  saved: 'Mes enregistrements',
  enregistrements: 'Mes enregistrements',
  documents: 'Mes documents',
  reviser: 'Réviser',
  'revision-lists': 'Réviser',
  revisions: 'Réviser',
  notebooks: 'Mes enregistrements',
  'skill-iq': 'Quiz par chapitre',
  settings: 'Paramètres',
  'mes-copies': 'Ma copie',
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

/** Bouton rond de la barre (recherche, cloche, aide) : 40 px, sans cadre, même survol partout. */
const BAR_ICON_BTN =
  'inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-ink-soft transition-colors hover:bg-[#f2f1ee] hover:text-ink';

export const TopBar: React.FC<TopBarProps> = ({ onOpenMobile }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { crumbs } = useBreadcrumb();
  const { isAuthenticated, isLoading } = useAuth();
  const openSignup = useOpenSignup('barre-haut');
  const tabBarVisible = useMobileTabBarVisible();
  const [searchValue, setSearchValue] = useState('');

  const parts = location.pathname.split('/').filter(Boolean);
  // /exams/nationaux est une section à part entière (pas une page de la section Examens), comme une liste
  // de révision ouverte (/profile/revision-lists/12 : « Mes révisions », pas le profil).
  const segment = parts[0] === 'exams' && parts[1] === 'nationaux' ? 'nationaux'
    : parts[0] === 'profile' && parts[1] === 'revision-lists' ? 'revision-lists'
      : (parts[0] ?? '');
  const sectionLabel = SECTION_LABELS[segment] ?? 'Fidni';
  const isHome = parts.length === 0;
  // A deeper segment (e.g. an id) means the section name should link back to
  // its listing; on the listing page itself it's the current crumb (plain).
  // Profil : la section est /profile/<pseudo> (il n'y a pas de page « /profile »).
  const hasDeeper = parts.length > (segment === 'nationaux' || parts[0] === 'profile' ? 2 : 1);
  const SECTION_PATHS: Record<string, string> = {
    nationaux: '/exams/nationaux',
    revisions: '/reviser',
    'revision-lists': '/reviser#mes-listes',
    notebooks: '/enregistrements?onglet=cahiers',
    saved: '/enregistrements',
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

  // Téléphone : un bouton retour vers le parent le plus proche, puis le titre de la page (le parent en petit
  // au-dessus). Si le dernier élément a une adresse, c'est un parent (la page elle-même n'est pas dans le fil).
  const last = trail[trail.length - 1];
  const current = last && !last.to ? last : null;
  const parents = current ? trail.slice(0, -1) : trail;
  const back = [...parents].reverse().find((c): c is Crumb & { to: string } => !!c.to) ?? null;

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchValue.trim();
    if (q) { trackAction('recherche'); navigate(`/search?q=${encodeURIComponent(q)}`); }
  };

  return (
    <header className="sticky top-0 z-30 h-[60px] border-b border-line bg-white/90 backdrop-blur-lg print:hidden">
      <div className="flex h-full items-center gap-1 ps-2 pe-2 sm:gap-2 sm:ps-4 sm:pe-3 md:px-6">
        {/* Téléphone : le menu est dans la barre du bas ; ce bouton ne revient que si elle est cachée. */}
        {!tabBarVisible && (
          <button
            type="button"
            className={`md:hidden ${BAR_ICON_BTN}`}
            onClick={onOpenMobile}
            aria-label={t('Ouvrir le menu')}
            aria-haspopup="dialog"
            data-tour="menu-mobile"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}

        {/* Fil d'Ariane / titre de la page */}
        <nav aria-label={t("Fil d'Ariane")} className="flex min-w-0 flex-1 items-center">
          {/* Téléphone */}
          <div className="flex min-w-0 items-center md:hidden">
            {isHome ? (
              <Link to="/" aria-label={t('Fidni, accueil')} className="flex items-center rounded-lg px-2">
                <img src={Logo3} alt="Fidni" className="h-7 w-auto object-contain" />
              </Link>
            ) : current && back ? (
              <>
                <Link to={back.to} aria-label={t('Retour : {label}', { label: t(back.label) })} className={BAR_ICON_BTN}>
                  <ChevronLeft className="h-5 w-5" />
                </Link>
                <span className="flex min-w-0 flex-col leading-tight">
                  <Link to={back.to} tabIndex={-1} className="truncate text-[12px] font-medium text-ink-faint">{t(back.label)}</Link>
                  <span aria-current="page" className="truncate text-[15px] font-semibold text-ink">{t(current.label)}</span>
                </span>
              </>
            ) : back ? (
              <Link to={back.to} className="flex h-10 min-w-0 items-center rounded-xl pe-2 text-ink transition-colors hover:bg-[#f2f1ee]">
                <span className="inline-flex h-10 w-9 flex-shrink-0 items-center justify-center text-ink-soft"><ChevronLeft className="h-5 w-5" /></span>
                <span className="truncate text-[15px] font-semibold">{t(back.label)}</span>
              </Link>
            ) : current ? (
              <span aria-current="page" className="truncate px-2 text-[16px] font-semibold text-ink">{t(current.label)}</span>
            ) : null}
          </div>

          {/* Ordinateur : le fil complet */}
          <ol className="hidden min-w-0 items-center gap-1.5 md:flex">
            {isHome ? (
              <li aria-current="page" className="truncate text-[15px] font-semibold text-ink">{t('Accueil')}</li>
            ) : (
              <>
                <li className="flex-shrink-0">
                  <Link to="/" className="text-[13px] font-medium text-ink-faint hover:text-ink hover:underline">{t('Accueil')}</Link>
                </li>
                {trail.map((c, i) => {
                  const isLast = i === trail.length - 1;
                  return (
                    <li key={`${c.label}-${i}`} className={`flex min-w-0 items-center gap-1.5 ${isLast ? '' : 'flex-shrink'}`}>
                      <ChevronRight aria-hidden className="h-3.5 w-3.5 flex-shrink-0 text-[#c9c5bd]" />
                      {isLast && !c.to ? (
                        <span aria-current="page" className="truncate text-[15px] font-semibold text-ink">{t(c.label)}</span>
                      ) : c.to ? (
                        <Link to={c.to} className="truncate text-[13px] font-medium text-ink-faint hover:text-ink hover:underline">{t(c.label)}</Link>
                      ) : (
                        <span className="truncate text-[13px] font-medium text-ink-faint">{t(c.label)}</span>
                      )}
                    </li>
                  );
                })}
              </>
            )}
          </ol>
        </nav>

        {/* Visiteur : la connexion à portée de main (avant, elle n'était qu'au pied du menu). */}
        {!isAuthenticated && !isLoading && (
          <button
            type="button"
            onClick={() => openSignup('login')}
            className="inline-flex h-10 flex-shrink-0 items-center rounded-xl border border-line bg-white px-3.5 text-[13.5px] font-semibold text-ink transition-colors hover:border-ink"
          >
            {t('Connexion')}
          </button>
        )}

        {/* Recherche — champ complet sur grand écran (sur tablette, il écrasait le fil d'Ariane) */}
        <form
          onSubmit={handleSearchSubmit}
          data-tour="recherche"
          role="search"
          className="hidden h-10 w-[280px] flex-shrink-0 items-center gap-2 rounded-xl border border-line bg-[#f7f6f3] px-3 transition-colors focus-within:border-[#cfc9bf] focus-within:bg-white lg:flex xl:w-[340px]"
        >
          <SearchIcon aria-hidden className="h-4 w-4 flex-shrink-0 text-ink-faint" />
          <input
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder={t('Rechercher un exercice, une leçon…')}
            aria-label={t('Rechercher')}
            className="min-w-0 flex-1 border-none bg-transparent text-[13.5px] text-ink outline-none placeholder:text-ink-faint focus-visible:outline-none"
          />
        </form>

        {/* Recherche — icône sur téléphone et tablette */}
        <button
          type="button"
          className={`lg:hidden ${BAR_ICON_BTN}`}
          data-tour="recherche"
          onClick={() => navigate('/search')}
          aria-label={t('Rechercher')}
        >
          <SearchIcon className="h-5 w-5" />
        </button>

        {/* Langue de l'interface : français / arabe (15/10/2026). */}
        <LangToggle />

        {/* Mode sombre / clair (15/10/2026) ; « comme l'appareil » reste dans Paramètres. */}
        <ThemeToggle />

        {/* Notifications (membres connectés) */}
        <NotificationBell />

        {/* Guide de la page (visite guidée), s'il y en a un : toujours tout à droite. */}
        <TourHelpButton
          className={BAR_ICON_BTN}
          style={{ width: undefined, height: undefined, border: 'none', borderRadius: undefined, background: undefined, color: undefined }}
        />
      </div>
    </header>
  );
};

/** « ع » / « FR » : passe l'interface en arabe ou en français (les contenus restent en français). */
const LangToggle: React.FC = () => {
  const { lang, setLang } = useLang();
  const ar = lang === 'ar';
  return (
    <button type="button" className={`${BAR_ICON_BTN} text-[14px] font-semibold`} lang={ar ? 'fr' : 'ar'}
      onClick={() => { trackAction(ar ? 'langue-fr' : 'langue-ar'); setLang(ar ? 'fr' : 'ar'); }}
      aria-label={ar ? 'Afficher le site en français' : 'عرض الموقع بالعربية'} title={ar ? 'Français' : 'العربية'}>
      {ar ? 'FR' : 'ع'}
    </button>
  );
};

/** Lune / soleil : bascule entre clair et sombre (le choix est gardé ; Paramètres propose aussi « comme l'appareil »). */
const ThemeToggle: React.FC = () => {
  const { effectiveTheme, setTheme } = useTheme();
  const dark = effectiveTheme === 'dark';
  return (
    <button type="button" className={BAR_ICON_BTN} onClick={() => { trackAction('mode-sombre'); setTheme(dark ? 'light' : 'dark'); }}
      aria-label={dark ? t('Passer en mode clair') : t('Passer en mode sombre')} title={dark ? t('Mode clair') : t('Mode sombre')}>
      {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  );
};
