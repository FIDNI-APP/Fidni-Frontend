/**
 * Barre d'onglets du téléphone (10/10/2026) : les pages qui font revenir l'élève à portée de pouce,
 * sans passer par le menu. Elle se cache pendant une épreuve chronométrée (simulation de concours,
 * DS blanc, épreuve d'un examen) : rien ne doit inviter à quitter sa copie.
 *
 * Sa hauteur est publiée dans la variable CSS --fd-tabbar-h (0 sur ordinateur ou quand elle est
 * cachée) : les éléments fixés en bas de l'écran s'en servent pour ne pas passer dessous
 * (`bottom: TABBAR_OFFSET`, components/layout/nav.ts). Une page peut la cacher avec useHideMobileTabBar.
 *
 * 11/10/2026 : l'élève a « Devoirs » à la place de « Progression » (les DS corrigés sont ce qu'il lit
 * le plus ; Ma progression reste dans le menu, sous « Mon suivi »). Onglet actif : pastille verte.
 */
import React, { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BookOpen, GraduationCap, Home, ListChecks, Menu } from 'lucide-react';
import { APlusIcon } from '@/components/icons/APlusIcon';
import { LessonIcon } from '@/components/icons/LessonIcon';
import { useAuth } from '@/contexts/AuthContext';
import { useBreadcrumb } from '@/contexts/BreadcrumbContext';
import { trackAction } from '@/lib/usage';
import { useQuizNouveau } from '@/components/skilliq/annonce';
import { TABBAR_VAR, sectionHome, useMobileTabBarVisible } from './nav';
import { t } from '@/i18n';

// 56 px d'onglets + 1 px de bordure, plus la zone du geste d'accueil (iPhone).
const TABBAR_HEIGHT = 'calc(57px + env(safe-area-inset-bottom, 0px))';

interface Tab {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
}

const startsWith = (p: string, base: string) => p === base || p.startsWith(`${base}/`);

export const MobileTabBar: React.FC<{ menuOpen: boolean; onOpenMenu: () => void }> = ({ menuOpen, onOpenMenu }) => {
  const { pathname } = useLocation();
  const { isAuthenticated, user } = useAuth();
  const { crumbs, section } = useBreadcrumb();
  const visible = useMobileTabBarVisible();
  const quizNouveau = useQuizNouveau().menu;

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

  // Un sujet du Bac national vit sous /exams/123 comme un DS : la page le signale (BreadcrumbContext).
  const pageSection = section ?? crumbs?.[0]?.to ?? null;
  const onNational = startsWith(pathname, '/exams/nationaux') || pageSection === '/exams/nationaux';
  const onExams = startsWith(pathname, '/exams') && !onNational;
  const onExercises = startsWith(pathname, '/exercises');

  const home: Tab = { to: '/', label: 'Accueil', icon: Home, active: pathname === '/' };
  const isTeacher = user?.profile?.user_type === 'teacher';
  const tabs: Tab[] = !isAuthenticated
    ? [
      home,
      { to: '/exercises', label: 'Exercices', icon: BookOpen, active: onExercises },
      { to: '/lessons', label: 'Leçons', icon: LessonIcon, active: startsWith(pathname, '/lessons') },
      { to: '/exams', label: 'Devoirs', icon: APlusIcon, active: onExams },
    ]
    : isTeacher
      ? [
        home,
        { to: '/exercises', label: 'Exercices', icon: BookOpen, active: onExercises },
        { to: '/exams', label: 'Devoirs', icon: APlusIcon, active: onExams },
        { to: '/classrooms', label: 'Classes', icon: GraduationCap, active: startsWith(pathname, '/classrooms') },
      ]
      : [
        home,
        // Sa page de niveau : ses chapitres, sans repasser par les dossiers de niveaux.
        { to: sectionHome(user, '/exercises'), label: 'Exercices', icon: BookOpen, active: onExercises },
        { to: sectionHome(user, '/exams'), label: 'Devoirs', icon: APlusIcon, active: onExams },
        {
          to: '/reviser', label: 'Réviser', icon: ListChecks,
          active: ['/reviser', '/revision-lists', '/revisions', '/profile/revision-lists'].some((b) => startsWith(pathname, b)),
        },
      ];

  const cell = 'flex h-14 flex-1 min-w-0 flex-col items-center justify-center gap-1 text-[11px] leading-none transition-colors';
  const pill = (on: boolean) => `inline-flex h-7 w-12 items-center justify-center rounded-full transition-colors ${on ? 'bg-brand-soft text-brand-hover' : ''}`;
  return (
    <nav
      aria-label={t('Navigation principale')}
      data-tour="barre-mobile"
      className="md:hidden fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 backdrop-blur print:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <ul className="mx-auto flex max-w-lg items-stretch px-1">
        {tabs.map(({ to, label, icon: Icon, active }) => (
          <li key={label} className="flex flex-1 min-w-0">
            <Link
              to={to}
              onClick={() => trackAction('barre-mobile')}
              aria-current={active ? 'page' : undefined}
              className={`${cell} ${active ? 'font-semibold text-ink' : 'font-medium text-ink-faint hover:text-ink-soft'}`}
            >
              <span aria-hidden className={pill(active)}><Icon className="h-5 w-5" /></span>
              <span className="max-w-full truncate px-0.5">{t(label)}</span>
            </Link>
          </li>
        ))}
        <li className="flex flex-1 min-w-0">
          <button
            type="button"
            onClick={() => { trackAction('barre-mobile'); onOpenMenu(); }}
            aria-label={t('Ouvrir le menu')}
            aria-haspopup="dialog"
            aria-expanded={menuOpen}
            data-tour="menu-mobile"
            className={`${cell} ${menuOpen ? 'font-semibold text-ink' : 'font-medium text-ink-faint hover:text-ink-soft'}`}
          >
            <span aria-hidden className={`relative ${pill(menuOpen)}`}>
              <Menu className="h-5 w-5" />
              {/* « Nouveau » dans le menu (quiz par chapitre, skilliq/annonce.ts) : on l'ouvre pour le voir. */}
              {quizNouveau && <span className="absolute end-2 top-0.5 h-2.5 w-2.5 rounded-full bg-gold ring-2 ring-white" />}
            </span>
            <span>{t('Menu')}</span>
          </button>
        </li>
      </ul>
    </nav>
  );
};

export default MobileTabBar;
