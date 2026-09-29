import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, UserCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Persistent reminder shown on every page while the signed-in user
 * hasn't finished onboarding. Non-blocking by design: the CTA leads to
 * /complete-profile, where the banner hides itself.
 */
export const OnboardingBanner: React.FC = () => {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const needsOnboarding =
    isAuthenticated &&
    user?.profile &&
    !user.profile.onboarding_completed &&
    location.pathname !== '/complete-profile';

  if (!needsOnboarding) return null;

  return (
    <div
      className="flex items-center justify-center gap-3 flex-wrap px-4"
      style={{
        padding: '9px 16px',
        background: '#fdf4dc',
        borderBottom: '1px solid #f0e0b4',
      }}
    >
      <span className="inline-flex items-center gap-2" style={{ fontSize: 13, color: '#8a6116', fontWeight: 500 }}>
        <UserCircle className="w-4 h-4 flex-shrink-0" />
        Ton profil est incomplet — termine ton onboarding pour des recommandations adaptées à ton niveau.
      </span>
      <button
        onClick={() => navigate('/complete-profile')}
        className="inline-flex items-center gap-1.5 flex-shrink-0"
        style={{
          padding: '5px 14px', borderRadius: 99, border: 'none',
          background: '#b7791f', color: '#fff', fontSize: 12.5, fontWeight: 600,
          cursor: 'pointer', transition: 'background .15s',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = '#96621a'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = '#b7791f'; }}
      >
        Compléter mon profil <ArrowRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
