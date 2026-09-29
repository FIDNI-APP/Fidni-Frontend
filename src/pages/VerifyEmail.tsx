import React, { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Loader2, CheckCircle2, XCircle, ArrowRight } from 'lucide-react';
import { verifyEmail } from '@/lib/api/authApi';

type State = 'verifying' | 'success' | 'expired' | 'invalid';

/**
 * Target of the confirmation link emailed on signup: /verify-email?token=...
 * Confirms the address with the backend, then sends the student to login.
 */
export const VerifyEmail: React.FC = () => {
  const [params] = useSearchParams();
  const token = params.get('token');
  const [state, setState] = useState<State>('verifying');
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;      // guard against double-run (StrictMode)
    ran.current = true;

    if (!token) { setState('invalid'); return; }

    verifyEmail(token)
      .then(() => setState('success'))
      .catch((err) => {
        const code = err?.response?.data?.code;
        setState(code === 'token_expired' ? 'expired' : 'invalid');
      });
  }, [token]);

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

        {state === 'success' && (
          <>
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-brand-soft flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-brand-hover" />
            </div>
            <h1 className="fd-display text-ink" style={{ fontSize: 23, fontWeight: 600 }}>Adresse confirmée</h1>
            <p className="text-ink-faint text-sm mt-2 mb-6">
              Ton compte est activé. Tu peux maintenant te connecter.
            </p>
            <Link to="/login" className="fd-btn-primary inline-flex">
              Se connecter <ArrowRight className="w-4 h-4" />
            </Link>
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
            <Link to="/login" className="fd-btn-ghost inline-flex">
              Aller à la connexion <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </>
        )}
      </div>
    </div>
  );
};

export default VerifyEmail;
