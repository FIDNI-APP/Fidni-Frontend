import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LayoutGrid, Map as MapIcon } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useHomeView, type HomeView } from '@/stores/homeViewStore';
import { loadMapImage } from './campusPins';

/** Pages où l'on ne propose pas le campus : onboarding, authentification, épreuve en cours, éditeurs, admin. */
const HIDDEN_ON: RegExp[] = [
  /^\/complete-profile/, /^\/login/, /^\/signup/, /^\/verify-email/, /^\/reset-password/,
  /^\/concours\/simulate\//, /^\/concours\/admin/, /^\/concours\/editor-test/, /^\/logs/,
  /\/new$/, /\/edit$/, /^\/learning-path\/create/, /\/chapters\/create$/,
];

/** Télécharge le plan et son illustration en avance (au survol du bouton) pour que la bascule soit immédiate. */
const preloadCampus = () => { void import('./CampusMap'); void loadMapImage(); };

/**
 * Sélecteur « Classique / Campus », toujours au même endroit : dans la barre du haut, sur toutes les pages.
 * Depuis une autre page, « Campus » ramène à l'accueil sur le plan du campus.
 */
export const CampusViewSwitch: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const view = useHomeView((s) => s.view);
  const setView = useHomeView((s) => s.setView);

  if (!isAuthenticated || HIDDEN_ON.some((re) => re.test(pathname))) return null;

  const onHome = pathname === '/';
  const current: HomeView = onHome ? view : 'classic';
  const choose = (v: HomeView) => {
    if (v === 'campus') { setView('campus'); if (!onHome) navigate('/'); }
    else if (onHome) setView('classic');
  };

  const item = (v: HomeView, label: string, Icon: React.ComponentType<{ className?: string }>, extra?: React.ButtonHTMLAttributes<HTMLButtonElement>) => {
    const active = current === v;
    return (
      <button
        type="button"
        onClick={() => choose(v)}
        aria-pressed={active}
        title={label}
        className="inline-flex items-center gap-2 transition-colors"
        style={{
          height: 32, padding: '0 11px', borderRadius: 8, fontSize: 12.5, fontWeight: 600, border: 'none', cursor: 'pointer',
          background: active ? '#1a1a1a' : 'transparent', color: active ? '#fff' : '#6b6862',
        }}
        {...extra}
      >
        <Icon className="w-4 h-4" />
        <span className="hidden lg:inline">{label}</span>
      </button>
    );
  };

  return (
    <div
      role="group"
      aria-label="Affichage de l'accueil : classique ou campus"
      className="inline-flex items-center flex-shrink-0"
      style={{ gap: 2, padding: 3, borderRadius: 11, background: '#fff', border: '1px solid #e7e3dc' }}
    >
      {item('classic', 'Classique', LayoutGrid)}
      {item('campus', 'Campus', MapIcon, { onMouseEnter: preloadCampus, onFocus: preloadCampus })}
    </div>
  );
};
