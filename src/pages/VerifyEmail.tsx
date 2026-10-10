import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, CheckCircle2, XCircle, ArrowRight } from 'lucide-react';
import { verifyEmail } from '@/lib/api/authApi';
import { useAuth } from '@/contexts/AuthContext';
import { useOpenSignup } from '@/components/auth/SignupPrompt';

type State = 'verifying' | 'success' | 'already' | 'expired' | 'invalid' | 'new-email';

/**
 * Target of the confirmation link emailed on signup: /verify-email?token=...
 * The first confirmation logs the student in and sends them on to complete their profile.
 * A link already used only confirms (it is not a reusable login): the student logs in.
 */
export const VerifyEmail: React.FC = () => {
  const [params] = useSearchParams();
  const token = params.get('token');
  const [state, setState] = useState<State>('verifying');
  const ran = useRef(false);
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const openLogin = useOpenSignup();

  useEffect(() => {
    if (ran.current) return;      // guard against double-run (StrictMode)
    ran.current = true;

    if (!token) { setState('invalid'); return; }

    verifyEmail(token)
      .then(async (data) => {
        // Nouvelle adresse d'un compte existant (changée dans les réglages) : confirmée, sans ouvrir de session.
        if (data?.detail === 'new_email_verified') { setState('new-email'); await refreshUser().catch(() => {}); return; }
        if (!data?.access) { setState('already'); return; }
        setState('success');
        await refreshUser();
        const done = data.user?.profile?.onboarding_completed;
        navigate(done ? '/' : '/complete-profile', { replace: true });
      })
      .catch((err) => {
        const code = err?.response?.data?.code;
        setState(code === 'token_expired' ? 'expired' : 'invalid');
      });
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  const goLogin = () => {
    if (user) { navigate('/'); return; }
    openLogin('login');
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16 sm:py-24 text-center">
      <div className="fd-card p-8">
        {state === 'verifying' && (
          <>
            <Loader2 className="w-9 h-9 mx-auto mb-4 animate-spin text-brand" />
            <h1 className="fd-display text-ink" style={{ fontSize: 22, fontWeight: 600 }}>Confirmation…</h1>
            <p className="text-ink-faint text-sm mt-2">On vérifie ton lien, un instant.</p>
          </>
        )}

        {state === 'new-email' && (
          <>
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-brand-soft flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-brand-hover" />
            </div>
            <h1 className="fd-display text-ink" style={{ fontSize: 23, fontWeight: 600 }}>Nouvelle adresse confirmée</h1>
            <p className="text-ink-faint text-sm mt-2 mb-6">C’est désormais elle qui sert pour te connecter et recevoir nos e-mails.</p>
            <button type="button" onClick={goLogin} className="fd-btn-primary inline-flex">
              {user ? 'Aller à l’accueil' : 'Se connecter'} <ArrowRight className="w-4 h-4" />
            </button>
          </>
        )}

        {(state === 'success' || state === 'already') && (
          <>
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-brand-soft flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-brand-hover" />
            </div>
            <h1 className="fd-display text-ink" style={{ fontSize: 23, fontWeight: 600 }}>Adresse confirmée</h1>
            {state === 'success' ? (
              <p className="text-ink-faint text-sm mt-2 flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Ton compte est activé, on t'ouvre ta session…
              </p>
            ) : (
              <>
                <p className="text-ink-faint text-sm mt-2 mb-6">
                  {user ? 'Ton adresse est déjà confirmée.' : 'Ton adresse est déjà confirmée. Connecte-toi pour continuer.'}
                </p>
                <button type="button" onClick={goLogin} className="fd-btn-primary inline-flex">
                  {user ? 'Aller à l’accueil' : 'Se connecter'} <ArrowRight className="w-4 h-4" />
                </button>
              </>
            )}
          </>
        )}

        {(state === 'expired' || state === 'invalid') && (
          <>
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-[#fdeceb] flex items-center justify-center">
              <XCircle className="w-6 h-6 text-[#c2564f]" />
            </div>
            <h1 className="fd-display text-ink" style={{ fontSize: 23, fontWeight: 600 }}>
              {state === 'expired' ? 'Lien expiré' : 'Lien invalide'}
            </h1>
            <p className="text-ink-faint text-sm mt-2 mb-6">
              {state === 'expired'
                ? 'Ce lien de confirmation a expiré. Connecte-toi pour en recevoir un nouveau.'
                : "Ce lien n'est pas valide. Vérifie que tu as ouvert le lien complet, ou connecte-toi pour en recevoir un nouveau."}
            </p>
            <button type="button" onClick={goLogin} className="fd-btn-ghost inline-flex">
              Aller à la connexion <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default VerifyEmail;
