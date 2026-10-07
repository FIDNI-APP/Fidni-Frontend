import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Loader2, CheckCircle2, XCircle, ArrowRight, Lock, KeyRound } from 'lucide-react';
import { confirmPasswordReset } from '@/lib/api/authApi';

type State = 'form' | 'success' | 'invalid';

const inputClass =
  'w-full pl-10 pr-3 py-2 border border-line rounded-lg bg-white text-ink ' +
  'placeholder-[#9a958c] focus:outline-none focus:border-brand transition-colors';

/**
 * Cible du lien « mot de passe oublié » : /reset-password?uid=...&token=...
 * L'élève choisit un nouveau mot de passe ; le lien ne sert qu'une fois.
 */
export const ResetPassword: React.FC = () => {
  const [params] = useSearchParams();
  const uid = params.get('uid') || '';
  const token = params.get('token') || '';
  const [state, setState] = useState<State>(uid && token ? 'form' : 'invalid');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) {
      setError('Les deux mots de passe ne correspondent pas.');
      return;
    }
    setSubmitting(true);
    try {
      await confirmPasswordReset(uid, token, password);
      setState('success');
    } catch (err: any) {
      const data = err?.response?.data;
      if (data?.code === 'token_invalid') setState('invalid');
      else if (err?.response?.status === 429) setError('Trop de tentatives. Patiente quelques minutes.');
      else setError(data?.error || 'Impossible de changer le mot de passe. Réessaie.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16 sm:py-24">
      <div className="fd-card p-8">
        {state === 'form' && (
          <>
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-brand-soft flex items-center justify-center">
              <KeyRound className="w-6 h-6 text-brand-hover" />
            </div>
            <h1 className="fd-display text-ink text-center" style={{ fontSize: 23, fontWeight: 600 }}>Nouveau mot de passe</h1>
            <p className="text-ink-faint text-sm mt-2 mb-6 text-center">
              Choisis-en un que tu n’utilises pas ailleurs.
            </p>
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="newPassword" className="block text-sm font-medium text-ink-soft">Nouveau mot de passe</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-ink-faint" />
                  </div>
                  <input type="password" id="newPassword" value={password} onChange={(e) => setPassword(e.target.value)}
                    required minLength={8} autoComplete="new-password" autoFocus placeholder="••••••••"
                    className={inputClass} aria-describedby="newPasswordHint" />
                </div>
                <p id="newPasswordHint" className="text-xs text-ink-faint">
                  8 caractères minimum, pas uniquement des chiffres, et pas un mot de passe trop courant.
                </p>
              </div>
              <div className="space-y-2">
                <label htmlFor="confirmNewPassword" className="block text-sm font-medium text-ink-soft">Confirme-le</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-ink-faint" />
                  </div>
                  <input type="password" id="confirmNewPassword" value={confirm} onChange={(e) => setConfirm(e.target.value)}
                    required autoComplete="new-password" placeholder="••••••••" className={inputClass} />
                </div>
              </div>
              {error && (
                <p role="alert" className="text-sm p-3 rounded-lg bg-[#fdeceb] border border-[#f3c9c5] text-[#a23b34]">{error}</p>
              )}
              <button type="submit" disabled={submitting} className="fd-btn-primary w-full justify-center">
                {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Enregistrement…</> : 'Changer mon mot de passe'}
              </button>
            </form>
          </>
        )}

        {state === 'success' && (
          <div className="text-center">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-brand-soft flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-brand-hover" />
            </div>
            <h1 className="fd-display text-ink" style={{ fontSize: 23, fontWeight: 600 }}>Mot de passe changé</h1>
            <p className="text-ink-faint text-sm mt-2 mb-6">Tu peux maintenant te connecter avec ton nouveau mot de passe.</p>
            <Link to="/login" className="fd-btn-primary inline-flex">
              Se connecter <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}

        {state === 'invalid' && (
          <div className="text-center">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-[#fdeceb] flex items-center justify-center">
              <XCircle className="w-6 h-6 text-[#c2564f]" />
            </div>
            <h1 className="fd-display text-ink" style={{ fontSize: 23, fontWeight: 600 }}>Lien plus valable</h1>
            <p className="text-ink-faint text-sm mt-2 mb-6">
              Ce lien a expiré (2 heures), a déjà servi, ou est incomplet. Refais une demande depuis
              « Mot de passe oublié ? » sur l’écran de connexion.
            </p>
            <Link to="/login" className="fd-btn-ghost inline-flex">
              Aller à la connexion <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
