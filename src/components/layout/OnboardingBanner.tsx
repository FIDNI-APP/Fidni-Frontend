import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, GraduationCap } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const LATER_KEY = 'fidni:bandeau-onboarding';
const LATER_DAYS = 7;

const postponed = () => {
  try { return Number(localStorage.getItem(LATER_KEY) || 0) > Date.now(); } catch { return false; }
};

/**
 * Rappel en haut de page tant que le membre connecté n'a pas fini son onboarding. Jamais bloquant :
 * le bouton mène à /complete-profile (où le bandeau se masque) ; « Plus tard » le cache 7 jours.
 */
export const OnboardingBanner: React.FC = () => {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [later, setLater] = useState(postponed);

  const needsOnboarding =
    isAuthenticated &&
    user?.profile &&
    !user.profile.onboarding_completed &&
    location.pathname !== '/complete-profile';

  if (!needsOnboarding || later) return null;

  const postpone = () => {
    try { localStorage.setItem(LATER_KEY, String(Date.now() + LATER_DAYS * 86400000)); } catch { /* stockage indisponible */ }
    setLater(true);
  };

  return (
    <div
      className="flex items-center justify-center gap-x-3 gap-y-2 flex-wrap"
      style={{ padding: '8px 16px', background: '#fdf4dc', borderBottom: '1px solid #f0e0b4' }}
    >
      <span className="inline-flex items-center gap-2" style={{ fontSize: 13, color: '#7a5512', fontWeight: 500 }}>
        <GraduationCap className="w-4 h-4 flex-shrink-0" />
        Dis-nous ta classe pour voir les exercices de ton programme.
      </span>
      <span className="inline-flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => navigate('/complete-profile')}
          className="inline-flex items-center gap-1.5 flex-shrink-0"
          style={{
            minHeight: 36, padding: '0 14px', borderRadius: 99, border: 'none',
            background: '#8a5d14', color: '#fff', fontSize: 13, fontWeight: 600,
            cursor: 'pointer', transition: 'background .15s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = '#6f4a0f'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = '#8a5d14'; }}
        >
          Choisir ma classe <ArrowRight className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={postpone}
          style={{
            minHeight: 36, padding: '0 10px', borderRadius: 99, border: 'none',
            background: 'transparent', color: '#7a5512', fontSize: 13, fontWeight: 500, cursor: 'pointer',
          }}
        >
          Plus tard
        </button>
      </span>
    </div>
  );
};
