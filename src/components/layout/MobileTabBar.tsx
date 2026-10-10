/**
 * Barre d'onglets du téléphone (10/10/2026) : les pages qui font revenir l'élève à portée de pouce,
 * sans passer par le menu. Elle se cache pendant une épreuve chronométrée (simulation de concours,
 * DS blanc, épreuve d'un examen) : rien ne doit inviter à quitter sa copie.
 *
 * Sa hauteur est publiée dans la variable CSS --fd-tabbar-h (0 sur ordinateur ou quand elle est
 * cachée) : les éléments fixés en bas de l'écran s'en servent pour ne pas passer dessous
 * (`bottom: TABBAR_OFFSET`, components/layout/nav.ts). Une page peut la cacher avec useHideMobileTabBar.
 */
import React, { useEffect, useSyncExternalStore } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BookOpen, GraduationCap, Home, ListChecks, Menu, TrendingUp } from 'lucide-react';
import { APlusIcon } from '@/components/icons/APlusIcon';
import { LessonIcon } from '@/components/icons/LessonIcon';
import { useAuth } from '@/contexts/AuthContext';
import { trackAction } from '@/lib/usage';
import { TABBAR_VAR, exercisesHome, subscribeTabBar, tabBarForcedHidden } from './nav';

// 56 px d'onglets + 1 px de bordure, plus la zone du geste d'accueil (iPhone).
const TABBAR_HEIGHT = 'calc(57px + env(safe-area-inset-bottom, 0px))';

// Pages d'épreuve : la barre n'y a pas sa place. L'onboarding garde aussi toute l'attention.
// L'épreuve d'un examen (/exams/:id) la cache elle-même pendant le chrono (ExamView, useHideMobileTabBar).
// Les pages qui ont leur propre barre collée en bas (enregistrer le profil, révéler les corrigés d'une
// annale de concours) se placent au-dessus d'elle avec TABBAR_OFFSET.
const HIDDEN_ROUTES = [
  /^\/concours\/simulate\//, /^\/revisions\/ds\/[^/]+\/blanc\/?$/, /^\/complete-profile\/?$/,
];

interface Tab {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  active: (pathname: string) => boolean;
}

const startsWith = (p: string, base: string) => p === base || p.startsWith(`${base}/`);

export const MobileTabBar: React.FC<{ menuOpen: boolean; onOpenMenu: () => void }> = ({ menuOpen, onOpenMenu }) => {
  const { pathname } = useLocation();
  const { isAuthenticated, user } = useAuth();
  const forced = useSyncExternalStore(subscribeTabBar, tabBarForcedHidden);
  const visible = !forced && !HIDDEN_ROUTES.some((r) => r.test(pathname));

  // Hauteur publiée pour les éléments fixés en bas (0 sur ordinateur : la barre y est masquée).
  useEffect(() => {
    const root = document.documentElement;
    const mq = window.matchMedia('(min-width: 768px)');
    const apply = () => root.style.setProperty(TABBAR_VAR, visible && !mq.matches ? TABBAR_HEIGHT : '0px');
    apply();
    mq.addEventListener('change', apply);
    return () => { mq.removeEventListener('change', apply); root.style.setProperty(TABBAR_VAR, '0px'); };
  }, [visible]);

  if (!visible) return null;

  const home: Tab = { to: '/', label: 'Accueil', icon: Home, active: (p) => p === '/' };
  const isTeacher = user?.profile?.user_type === 'teacher';
  const tabs: Tab[] = !isAuthenticated
    ? [
      home,
      { to: '/exercises', label: 'Exercices', icon: BookOpen, active: (p) => startsWith(p, '/exercises') },
      { to: '/lessons', label: 'Leçons', icon: LessonIcon, active: (p) => startsWith(p, '/lessons') },
      { to: '/exams', label: 'Examens', icon: APlusIcon, active: (p) => startsWith(p, '/exams') },
    ]
    : isTeacher
      ? [
        home,
        { to: '/exercises', label: 'Exercices', icon: BookOpen, active: (p) => startsWith(p, '/exercises') },
        { to: '/exams', label: 'Devoirs', icon: APlusIcon, active: (p) => startsWith(p, '/exams') },
        { to: '/classrooms', label: 'Classes', icon: GraduationCap, active: (p) => startsWith(p, '/classrooms') },
      ]
      : [
        home,
        // Sa page de niveau : ses chapitres, sans repasser par les filtres.
        { to: exercisesHome(user), label: 'Exercices', icon: BookOpen, active: (p) => startsWith(p, '/exercises') },
        {
          to: '/revision-lists', label: 'Réviser', icon: ListChecks,
          active: (p) => startsWith(p, '/revision-lists') || startsWith(p, '/revisions') || startsWith(p, '/profile/revision-lists'),
        },
        { to: '/progression', label: 'Progression', icon: TrendingUp, active: (p) => startsWith(p, '/progression') },
      ];

  const cell = 'flex flex-1 min-w-0 flex-col items-center justify-center gap-0.5 h-14 text-[11px] leading-none transition-colors';
  return (
    <nav
      aria-label="Navigation principale"
      data-tour="barre-mobile"
      className="md:hidden fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 backdrop-blur print:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <ul className="flex items-stretch">
        {tabs.map(({ to, label, icon: Icon, active }) => {
          const on = active(pathname);
          return (
            <li key={label} className="flex flex-1 min-w-0">
              <Link
                to={to}
                onClick={() => trackAction('barre-mobile')}
                aria-current={on ? 'page' : undefined}
                className={`${cell} relative ${on ? 'text-brand-hover font-semibold' : 'text-ink-faint font-medium'}`}
              >
                {on && <span aria-hidden className="absolute top-0 h-[3px] w-8 rounded-b-full bg-brand" />}
                <Icon className="h-5 w-5" />
                <span className="max-w-full truncate px-0.5">{label}</span>
              </Link>
            </li>
          );
        })}
        <li className="flex flex-1 min-w-0">
          <button
            type="button"
            onClick={() => { trackAction('barre-mobile'); onOpenMenu(); }}
            aria-label="Ouvrir le menu"
            aria-haspopup="dialog"
            aria-expanded={menuOpen}
            className={`${cell} font-medium ${menuOpen ? 'text-ink' : 'text-ink-faint'}`}
          >
            <Menu className="h-5 w-5" />
            <span>Menu</span>
          </button>
        </li>
      </ul>
    </nav>
  );
};

export default MobileTabBar;
