import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, CheckCircle2, XCircle, ArrowRight } from 'lucide-react';
import { verifyEmail } from '@/lib/api/authApi';
import { useAuth } from '@/contexts/AuthContext';
import { useOpenSignup } from '@/components/auth/SignupPrompt';
import { SEO } from '@/components/layout/SEO';
import { t } from '@/i18n';

type State = 'verifying' | 'success' | 'already' | 'expired' | 'invalid' | 'unavailable' | 'new-email';

/**
 * Target of the confirmation link emailed on signup: /verify-email?token=...
 * The first confirmation logs the student in and sends them on to complete their profile.
 * A link already used only confirms (it is not a reusable login): the student logs in.
 */
export const VerifyEmail: React.FC = () => {
  const [params] = useSearchParams();
  const token = params.get('token');
  const [state, setState] = useState<State>('verifying');
  const verification = useRef<{ token: string; request: ReturnType<typeof verifyEmail> } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const openLogin = useOpenSignup();

  useEffect(() => {
    if (!token) { setState('invalid'); return; }
    let active = true;
    if (verification.current?.token !== token) {
      verification.current = { token, request: verifyEmail(token) };
    }
    setState('verifying');
    verification.current.request
      .then(async (data) => {
        if (!active) return;
        // Nouvelle adresse d'un compte existant (changée dans les réglages) : confirmée, sans ouvrir de session.
        if (data?.detail === 'new_email_verified') { setState('new-email'); await refreshUser().catch(() => {}); return; }
        if (!data?.access) { setState('already'); return; }
        setState('success');
        await refreshUser();
        const done = data.user?.profile?.onboarding_completed;
        if (active) navigate(done ? '/' : '/complete-profile', { replace: true });
      })
      .catch((err) => {
        if (!active) return;
        const { status, data } = err?.response ?? {};
        if (data?.code === 'token_expired') setState('expired');
        else if (!status || status === 429 || status >= 500) setState('unavailable');
        else setState('invalid');
      });
    return () => { active = false; };
  }, [token, attempt]); // eslint-disable-line react-hooks/exhaustive-deps

  const goLogin = () => {
    if (user) { navigate('/'); return; }
    openLogin('login');
  };

  return (
    <div className="max-w-md mx-auto px-4 py-8 sm:py-16 text-center">
      <SEO title="Confirmer mon adresse – Fidni" description="Confirmation de l’adresse e-mail d’un compte Fidni." noindex />
      <div className="fd-card p-6 sm:p-8" aria-live="polite">
        {state === 'verifying' && (
          <>
            <Loader2 className="w-9 h-9 mx-auto mb-4 animate-spin text-brand" />
            <h1 className="fd-display text-ink" style={{ fontSize: 22, fontWeight: 600 }}>{t('Confirmation…')}</h1>
            <p className="text-ink-faint text-sm mt-2">{t('On vérifie ton lien, un instant.')}</p>
          </>
        )}

        {state === 'new-email' && (
          <>
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-brand-soft flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-brand-hover" />
            </div>
            <h1 className="fd-display text-ink" style={{ fontSize: 23, fontWeight: 600 }}>{t('Nouvelle adresse confirmée')}</h1>
            <p className="text-ink-faint text-sm mt-2 mb-6">{t('C’est désormais elle qui sert pour te connecter et recevoir nos e-mails.')}</p>
            <button type="button" onClick={goLogin} className="fd-btn-primary inline-flex">
              {user ? t('Aller à l’accueil') : t('Se connecter')} <ArrowRight className="w-4 h-4" />
            </button>
          </>
        )}

        {(state === 'success' || state === 'already') && (
          <>
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-brand-soft flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-brand-hover" />
            </div>
            <h1 className="fd-display text-ink" style={{ fontSize: 23, fontWeight: 600 }}>{t('Adresse confirmée')}</h1>
            {state === 'success' ? (
              <p className="text-ink-faint text-sm mt-2 flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> {t("Ton compte est activé, on t'ouvre ta session…")}
              </p>
            ) : (
              <>
                <p className="text-ink-faint text-sm mt-2 mb-6">
                  {user ? t('Ton adresse est déjà confirmée.') : t('Ton adresse est déjà confirmée. Connecte-toi pour continuer.')}
                </p>
                <button type="button" onClick={goLogin} className="fd-btn-primary inline-flex">
                  {user ? t('Aller à l’accueil') : t('Se connecter')} <ArrowRight className="w-4 h-4" />
                </button>
              </>
            )}
          </>
        )}

        {state === 'unavailable' && (
          <>
            <h1 className="fd-display text-[23px] text-ink">{t('Confirmation de l’e-mail')}</h1>
            <p className="my-4 text-sm text-ink-soft">{t('Vérifie ta connexion, puis réessaie.')}</p>
            <button type="button" className="fd-btn-primary" onClick={() => {
              verification.current = null;
              setAttempt((value) => value + 1);
            }}>{t('Réessayer')}</button>
          </>
        )}

        {(state === 'expired' || state === 'invalid') && (
          <>
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-[#fdeceb] flex items-center justify-center">
              <XCircle className="w-6 h-6 text-[#c2564f]" />
            </div>
            <h1 className="fd-display text-ink" style={{ fontSize: 23, fontWeight: 600 }}>
              {state === 'expired' ? t('Lien expiré') : t('Lien invalide')}
            </h1>
            <p className="text-ink-faint text-sm mt-2 mb-6">
              {state === 'expired'
                ? t('Ce lien de confirmation a expiré. Connecte-toi pour en recevoir un nouveau.')
                : t("Ce lien n'est pas valide. Vérifie que tu as ouvert le lien complet, ou connecte-toi pour en recevoir un nouveau.")}
            </p>
            <button type="button" onClick={goLogin} className="fd-btn-ghost inline-flex">
              {t('Aller à la connexion')} <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default VerifyEmail;
