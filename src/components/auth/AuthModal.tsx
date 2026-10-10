// src/components/AuthModal.tsx
import React, { useState, useEffect } from 'react';
import { X, LogIn, UserPlus, Loader2, Mail, Lock, User, CheckCircle, AlertCircle, ArrowLeft, KeyRound } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { requestPasswordReset, resendVerification, type SignupConsents } from '@/lib/api/authApi';
import { GoogleButton } from '@/components/auth/GoogleButton';
import { trackAction } from '@/lib/usage';
import { LEGAL } from '@/lib/legal';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'login' | 'signup';
}

/** Erreur axios telle que lue ici. */
type ApiError = { response?: { status?: number; data?: { code?: string; error?: string; email?: string; name?: string } } };

/** Message lisible pour une erreur d'API (le serveur répond parfois en anglais, ex. 429). */
function apiErrorMessage(err: ApiError | null | undefined, fallback: string): string {
  if (err?.response?.status === 429) return 'Trop de tentatives. Patiente quelques minutes avant de réessayer.';
  if (!err?.response) return 'Connexion au serveur impossible. Vérifie ta connexion internet.';
  return err.response.data?.error || fallback;
}

/** Refus de la connexion avec Google (POST /api/auth/google/) → message clair. */
function googleErrorMessage(err: ApiError): string {
  const code = err?.response?.data?.code;
  if (code === 'invalid_token') {
    return 'La connexion avec Google a échoué ou a expiré. Recommence avec le bouton Google, ou utilise ton e-mail.';
  }
  if (code === 'account_disabled') return `Ce compte Fidni est désactivé. Si c’est une erreur, écris à ${LEGAL.contactEmail}.`;
  if (code === 'google_unavailable') return 'Google ne répond pas pour le moment. Réessaie dans un instant.';
  return apiErrorMessage(err, 'La connexion avec Google a échoué. Réessaie.');
}

const inputClass =
  'w-full pl-10 pr-3 py-2 border border-line rounded-lg bg-white text-ink ' +
  'placeholder-[#9a958c] focus:outline-none focus:border-brand transition-colors';

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, initialTab = 'login' }) => {
  const [activeTab, setActiveTab] = useState(initialTab);
  const { user, login, loginWithGoogle, register } = useAuth();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [formValues, setFormValues] = useState({
    identifier: '',
    password: '',
    username: '',
    email: '',
    confirmPassword: ''
  });
  const [successMessage, setSuccessMessage] = useState('');
  // Deux cases obligatoires, jamais pré-cochées (RGPD / CNIL).
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [ageOk, setAgeOk] = useState(false);
  // After signup we don't log in — we wait for email confirmation.
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [emailSendFailed, setEmailSendFailed] = useState(false);
  const [resendMsg, setResendMsg] = useState('');
  const [needsVerification, setNeedsVerification] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState('');
  // « Mot de passe oublié » : sous-écran de l'onglet Connexion.
  const [forgot, setForgot] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  // Connexion avec Google : jeton en cours de vérification, puis étape « Encore une chose » pour un nouveau compte.
  const [googleBusy, setGoogleBusy] = useState(false);
  const [googleConsent, setGoogleConsent] = useState<{ credential: string; email: string; name: string } | null>(null);

  const handleResend = async (email: string) => {
    if (!email) return;
    try {
      await resendVerification(email);
    } catch { /* generic response regardless */ }
    setResendMsg('Si un compte existe, un nouveau lien vient d\'être envoyé.');
  };

  // Reset state when the modal opens.
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setError('');
      setSuccessMessage('');
      setIsSubmitting(false);
      setPendingEmail(null);
      setResendMsg('');
      setNeedsVerification(false);
      setForgot(false);
      setResetSent(false);
      setGoogleBusy(false);
      setGoogleConsent(null);
    }
  }, [isOpen, initialTab]);

  // Échap ferme la fenêtre (sauf pendant une vérification en cours).
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !isSubmitting && !googleBusy) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, isSubmitting, googleBusy, onClose]);

  const switchTab = (tab: 'login' | 'signup') => {
    setActiveTab(tab);
    setForgot(false);
    setResetSent(false);
    setGoogleConsent(null);
    setError('');
  };

  // Redirect after a login that set the user (e.g. via the login tab).
  useEffect(() => {
    if (user && activeTab === 'signup') {
      const timer = setTimeout(() => {
        onClose();
        if (user.profile && !user.profile.onboarding_completed) {
          navigate('/complete-profile');
        }
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [user, activeTab, onClose, navigate]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormValues(prev => ({ ...prev, [name]: value }));
  };

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      await login(formValues.identifier, formValues.password);
      setSuccessMessage('Connexion réussie !');
      setTimeout(() => { onClose(); }, 900);
    } catch (err) {
      const data = (err as ApiError)?.response?.data;
      // Le lien « renvoyer la confirmation » n'apparaît que si c'est vraiment le problème
      // (avant, il s'affichait aussi pour un simple mot de passe erroné).
      const unverified = data?.code === 'email_not_verified';
      setNeedsVerification(unverified);
      setUnverifiedEmail(unverified ? data?.email || formValues.identifier : '');
      setResendMsg('');
      setError(unverified ? 'Confirme ton adresse e-mail pour te connecter.'
        : apiErrorMessage(err as ApiError, 'Échec de la connexion. Réessaie.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    if (formValues.password !== formValues.confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      setIsSubmitting(false);
      return;
    }
    if (!acceptTerms || !ageOk) {
      setError(!acceptTerms
        ? 'Accepte les conditions d’utilisation et la politique de confidentialité pour créer ton compte.'
        : 'Coche la case sur l’âge : si tu as moins de 15 ans, demande d’abord l’accord d’un parent.');
      setIsSubmitting(false);
      return;
    }

    try {
      const res: { detail?: string; email?: string } | undefined = await register(formValues.username, formValues.email, formValues.password,
        { accept_terms: acceptTerms, age_ok: ageOk });
      if (res?.detail === 'verification_email_sent' || res?.detail === 'verification_email_failed') {
        // The account was created either way; only the email delivery differs.
        setPendingEmail(res.email || formValues.email);
        setEmailSendFailed(res.detail === 'verification_email_failed');
        setResendMsg('');
      }
    } catch (err) {
      setError(apiErrorMessage(err as ApiError, 'Échec de l\'inscription. Réessaie.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  /** Jeton Google → session. Nouveau compte : le serveur demande d'abord les deux cases (consent_required). */
  const handleGoogle = async (credential: string, consents?: SignupConsents) => {
    setGoogleBusy(true);
    setError('');
    setSuccessMessage('');
    setNeedsVerification(false);
    try {
      const data = await loginWithGoogle(credential, consents);
      trackAction('connexion-google');
      setGoogleConsent(null);
      if (data.created || (data.user?.profile && !data.user.profile.onboarding_completed)) {
        // Nouveau compte (ou profil jamais complété) : direction le profil, sans attendre.
        onClose();
        navigate('/complete-profile');
        return;
      }
      setSuccessMessage('Connexion réussie !');
      setTimeout(() => { onClose(); }, 900);
    } catch (err) {
      const data = (err as ApiError)?.response?.data;
      if (data?.code === 'consent_required') {
        setGoogleConsent({ credential, email: data.email || '', name: data.name || '' });
      } else {
        // Jeton refusé (souvent expiré) : retour au bouton Google pour en obtenir un nouveau.
        if (data?.code === 'invalid_token') setGoogleConsent(null);
        setError(googleErrorMessage(err as ApiError));
      }
    } finally {
      setGoogleBusy(false);
    }
  };

  const handleGoogleConsent = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!googleConsent) return;
    if (!acceptTerms || !ageOk) {
      setError(!acceptTerms
        ? 'Accepte les conditions d’utilisation et la politique de confidentialité pour créer ton compte.'
        : 'Coche la case sur l’âge : si tu as moins de 15 ans, demande d’abord l’accord d’un parent.');
      return;
    }
    handleGoogle(googleConsent.credential, { accept_terms: true, age_ok: true });
  };

  const handleForgot = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    try {
      await requestPasswordReset(formValues.identifier);
      setResetSent(true);
    } catch (err) {
      setError(apiErrorMessage(err as ApiError, 'Impossible d’envoyer le lien pour le moment. Réessaie dans un instant.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  // Consentements (RGPD) : cases non pré-cochées, liens vers les textes complets. Inscription ET compte Google.
  const consentFields = (
    <div className="space-y-2.5 pt-1">
      <label className="flex items-start gap-2.5 text-sm text-ink-soft cursor-pointer">
        <input type="checkbox" checked={acceptTerms} onChange={(e) => setAcceptTerms(e.target.checked)}
          className="mt-0.5 h-4 w-4 accent-[#1a7a4a] flex-shrink-0" />
        <span>
          J’accepte les{' '}
          <a href="/terms-of-service" target="_blank" rel="noopener noreferrer" className="text-brand-hover underline">conditions d’utilisation</a>
          {' '}et la{' '}
          <a href="/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-brand-hover underline">politique de confidentialité</a>.
        </span>
      </label>
      <label className="flex items-start gap-2.5 text-sm text-ink-soft cursor-pointer">
        <input type="checkbox" checked={ageOk} onChange={(e) => setAgeOk(e.target.checked)}
          className="mt-0.5 h-4 w-4 accent-[#1a7a4a] flex-shrink-0" />
        <span>J’ai 15 ans ou plus, <em>ou</em> un parent m’a donné son accord pour m’inscrire.</span>
      </label>
      <p className="text-xs text-ink-faint leading-relaxed">
        Tes données servent uniquement à faire fonctionner ton compte (suivi, classes, feuilles d’exercices).
        Elles ne sont ni vendues ni utilisées pour de la publicité ciblée. Tu peux les télécharger ou
        supprimer ton compte à tout moment depuis tes paramètres.
      </p>
    </div>
  );

  // Bouton Google en tête des deux onglets (pas sur « Mot de passe oublié » ni pendant une autre étape).
  const showGoogle = !pendingEmail && !googleConsent && !(activeTab === 'login' && forgot);

  const tabClass = (active: boolean) =>
    `relative flex-1 py-4 text-center font-medium transition-colors ${
      active ? 'text-ink' : 'text-ink-faint hover:text-ink'
    }`;

  return (
    // Le fond défile : sur un écran peu haut (ou zoomé), la fenêtre ne sort plus de l'écran,
    // on la fait défiler au lieu de devoir dézoomer. Centrée verticalement quand elle tient.
    <div className="fixed inset-0 z-50 overflow-y-auto overscroll-contain bg-black/50 backdrop-blur-sm">
      <div className="flex min-h-full items-center justify-center p-4 sm:p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        role="dialog" aria-modal="true" aria-labelledby="auth-modal-title"
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-line"
      >
        {/* Header — flat ink band (no gradient) */}
        <div className="bg-ink p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
          <h2 id="auth-modal-title" className="fd-display text-2xl" style={{ fontWeight: 600, letterSpacing: '-0.02em' }}>
            {googleConsent ? 'Encore une chose'
              : activeTab === 'signup' ? 'Rejoindre Fidni' : forgot ? 'Mot de passe oublié' : 'Content de te revoir'}
          </h2>
          <p className="mt-1 text-[#b8b4ac] text-sm">
            {googleConsent
              ? 'Deux cases à cocher, et ton compte est prêt.'
              : activeTab === 'signup'
                ? 'Crée un compte pour commencer à apprendre.'
                : forgot
                  ? 'On t’envoie un lien pour en choisir un nouveau.'
                  : 'Connecte-toi pour continuer à progresser.'}
          </p>
        </div>

        {/* Tabs (masqués pendant l'étape « Encore une chose » de Google) */}
        <div className={`flex border-b border-line ${googleConsent ? 'hidden' : ''}`}>
          <button onClick={() => switchTab('login')} className={tabClass(activeTab === 'login')}>
            <span className="flex items-center justify-center">
              <LogIn className="w-4 h-4 mr-2" />
              Connexion
            </span>
            {activeTab === 'login' && (
              <motion.div layoutId="authActiveTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand" />
            )}
          </button>
          <button onClick={() => switchTab('signup')} className={tabClass(activeTab === 'signup')}>
            <span className="flex items-center justify-center">
              <UserPlus className="w-4 h-4 mr-2" />
              Inscription
            </span>
            {activeTab === 'signup' && (
              <motion.div layoutId="authActiveTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand" />
            )}
          </button>
        </div>

        <div className="p-6">
          {/* Feedback */}
          <AnimatePresence>
            {error && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                className="mb-4 p-3 bg-[#fdeceb] border border-[#f3c9c5] text-[#a23b34] rounded-lg flex items-start">
                <AlertCircle className="w-5 h-5 mt-0.5 mr-2 flex-shrink-0" />
                <span className="text-sm">{error}</span>
              </motion.div>
            )}
            {successMessage && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                className="mb-4 p-3 bg-brand-soft border border-brand-line text-brand-hover rounded-lg flex items-start">
                <CheckCircle className="w-5 h-5 mt-0.5 mr-2 flex-shrink-0" />
                <span className="text-sm">{successMessage}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Check-your-inbox panel — after a successful signup */}
          {pendingEmail && (
            <div className="text-center py-4">
              <div
                className={`w-12 h-12 mx-auto mb-4 rounded-full flex items-center justify-center ${
                  emailSendFailed ? '' : 'bg-brand-soft'
                }`}
                style={emailSendFailed ? { background: '#faf3e2' } : undefined}
              >
                <Mail
                  className={`w-6 h-6 ${emailSendFailed ? '' : 'text-brand-hover'}`}
                  style={emailSendFailed ? { color: '#9a6e1c' } : undefined}
                />
              </div>
              <h3 className="fd-display text-ink" style={{ fontSize: 18, fontWeight: 600 }}>
                {emailSendFailed ? "Compte créé, mais l'e-mail n'est pas parti" : 'Vérifie ta boîte mail'}
              </h3>
              <p className="text-sm text-ink-faint mt-2">
                {emailSendFailed ? (
                  <>
                    Ton compte <strong className="text-ink">{pendingEmail}</strong> existe bien, mais on n'a pas réussi
                    à envoyer le lien de confirmation. Réessaie dans un instant — inutile de recréer un compte.
                  </>
                ) : (
                  <>
                    On a envoyé un lien de confirmation à <strong className="text-ink">{pendingEmail}</strong>. Clique
                    dessus pour activer ton compte, puis connecte-toi.
                  </>
                )}
              </p>
              <button type="button" onClick={() => handleResend(pendingEmail)}
                className="mt-4 text-sm font-semibold text-brand-hover hover:text-brand">
                Renvoyer le lien
              </button>
              {resendMsg && <p className="text-xs text-ink-faint mt-2">{resendMsg}</p>}
            </div>
          )}

          {/* Continuer avec Google, puis « ou » et le formulaire habituel */}
          {showGoogle && (
            <div className="mb-4">
              <GoogleButton onCredential={(c) => handleGoogle(c)} busy={googleBusy} />
              <div className="mt-4 flex items-center gap-3 text-xs text-ink-faint">
                <span className="h-px flex-1 bg-line" aria-hidden />
                ou
                <span className="h-px flex-1 bg-line" aria-hidden />
              </div>
            </div>
          )}

          {/* Nouveau compte avec Google : les deux cases de l'inscription, puis le même jeton renvoyé */}
          {googleConsent && !pendingEmail && (
            <form onSubmit={handleGoogleConsent} className="space-y-4">
              <p className="text-sm text-ink-soft leading-relaxed">
                {googleConsent.name ? <>Bienvenue, <strong className="text-ink">{googleConsent.name}</strong> ! </> : null}
                Tu vas créer ton compte Fidni avec ton adresse Google
                {googleConsent.email ? <> <strong className="text-ink break-words">{googleConsent.email}</strong></> : null}.
              </p>
              {consentFields}
              <Button type="submit" disabled={googleBusy}
                className="w-full py-2.5 bg-brand hover:bg-brand-hover text-white font-medium rounded-lg flex items-center justify-center">
                {googleBusy ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Création du compte…</>)
                            : (<><UserPlus className="mr-2 h-4 w-4" />Créer mon compte</>)}
              </Button>
              <div className="text-center text-sm">
                <button type="button" disabled={googleBusy} onClick={() => { setGoogleConsent(null); setError(''); }}
                  className="inline-flex items-center gap-1 text-brand-hover hover:text-brand font-medium">
                  <ArrowLeft className="w-4 h-4" /> Retour
                </button>
              </div>
            </form>
          )}

          {/* Forms */}
          {!pendingEmail && !googleConsent && (
            <AnimatePresence mode="wait">
              {activeTab === 'login' && forgot ? (
                <motion.div key="forgot"
                  initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}
                  transition={{ duration: 0.25 }}>
                  {resetSent ? (
                    <div className="text-center py-2">
                      <div className="w-12 h-12 mx-auto mb-4 rounded-full flex items-center justify-center bg-brand-soft">
                        <Mail className="w-6 h-6 text-brand-hover" />
                      </div>
                      <h3 className="fd-display text-ink" style={{ fontSize: 18, fontWeight: 600 }}>Regarde ta boîte mail</h3>
                      <p className="text-sm text-ink-faint mt-2">
                        Si un compte correspond, un lien vient d’être envoyé. Il est valable 2 heures et ne sert qu’une fois.
                        Pense à vérifier les spams.
                      </p>
                    </div>
                  ) : (
                    <form onSubmit={handleForgot} className="space-y-4">
                      <div className="space-y-2">
                        <label htmlFor="forgotIdentifier" className="block text-sm font-medium text-ink-soft">Ton e-mail (ou nom d'utilisateur)</label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Mail className="h-5 w-5 text-ink-faint" />
                          </div>
                          <input type="text" id="forgotIdentifier" name="identifier" value={formValues.identifier}
                            onChange={handleInputChange} required autoComplete="username" autoFocus
                            placeholder="ton.email@exemple.com" className={inputClass} />
                        </div>
                      </div>
                      <Button type="submit" disabled={isSubmitting}
                        className="w-full py-2.5 bg-brand hover:bg-brand-hover text-white font-medium rounded-lg flex items-center justify-center">
                        {isSubmitting ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Envoi…</>)
                                      : (<><KeyRound className="mr-2 h-4 w-4" />Recevoir le lien</>)}
                      </Button>
                    </form>
                  )}
                  <div className="text-center text-sm mt-4">
                    <button type="button" onClick={() => { setForgot(false); setResetSent(false); setError(''); }}
                      className="inline-flex items-center gap-1 text-brand-hover hover:text-brand font-medium">
                      <ArrowLeft className="w-4 h-4" /> Retour à la connexion
                    </button>
                  </div>
                </motion.div>
              ) : activeTab === 'login' ? (
                <motion.form key="login"
                  initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }}
                  transition={{ duration: 0.25 }} onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="identifier" className="block text-sm font-medium text-ink-soft">Email ou nom d'utilisateur</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Mail className="h-5 w-5 text-ink-faint" />
                      </div>
                      <input type="text" id="identifier" name="identifier" value={formValues.identifier}
                        onChange={handleInputChange} required autoComplete="username"
                        placeholder="ton.email@exemple.com" className={inputClass} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <label htmlFor="password" className="block text-sm font-medium text-ink-soft">Mot de passe</label>
                      <button type="button" onClick={() => { setForgot(true); setError(''); setNeedsVerification(false); }}
                        className="text-xs text-brand-hover hover:text-brand">Mot de passe oublié ?</button>
                    </div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock className="h-5 w-5 text-ink-faint" />
                      </div>
                      <input type="password" id="password" name="password" value={formValues.password}
                        onChange={handleInputChange} required autoComplete="current-password"
                        placeholder="••••••••" className={inputClass} />
                    </div>
                  </div>

                  <Button type="submit" disabled={isSubmitting}
                    className="w-full py-2.5 bg-brand hover:bg-brand-hover text-white font-medium rounded-lg flex items-center justify-center">
                    {isSubmitting ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Connexion…</>)
                                  : (<><LogIn className="mr-2 h-4 w-4" />Connexion</>)}
                  </Button>

                  <div className="text-center text-sm text-ink-faint mt-4">
                    Pas encore de compte ?{' '}
                    <button type="button" onClick={() => switchTab('signup')} className="text-brand-hover hover:text-brand font-medium">
                      Inscris-toi
                    </button>
                  </div>
                </motion.form>
              ) : (
                <motion.form key="signup"
                  initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}
                  transition={{ duration: 0.25 }} onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="username" className="block text-sm font-medium text-ink-soft">Nom d'utilisateur</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <User className="h-5 w-5 text-ink-faint" />
                      </div>
                      <input type="text" id="username" name="username" value={formValues.username}
                        onChange={handleInputChange} required autoComplete="username"
                        placeholder="jeandupont" className={inputClass} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="email" className="block text-sm font-medium text-ink-soft">Email</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Mail className="h-5 w-5 text-ink-faint" />
                      </div>
                      <input type="email" id="email" name="email" value={formValues.email}
                        onChange={handleInputChange} required autoComplete="email"
                        placeholder="jean.dupont@exemple.com" className={inputClass} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="signupPassword" className="block text-sm font-medium text-ink-soft">Mot de passe</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock className="h-5 w-5 text-ink-faint" />
                      </div>
                      <input type="password" id="signupPassword" name="password" value={formValues.password}
                        onChange={handleInputChange} required autoComplete="new-password" minLength={8}
                        placeholder="••••••••" className={inputClass} aria-describedby="signupPasswordHint" />
                    </div>
                    <p id="signupPasswordHint" className="text-xs text-ink-faint">
                      8 caractères minimum, pas uniquement des chiffres, et pas un mot de passe trop courant.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-ink-soft">Confirme le mot de passe</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock className="h-5 w-5 text-ink-faint" />
                      </div>
                      <input type="password" id="confirmPassword" name="confirmPassword" value={formValues.confirmPassword}
                        onChange={handleInputChange} required autoComplete="new-password"
                        placeholder="••••••••" className={inputClass} />
                    </div>
                  </div>

                  {consentFields}

                  <Button type="submit" disabled={isSubmitting}
                    className="w-full py-2.5 bg-brand hover:bg-brand-hover text-white font-medium rounded-lg flex items-center justify-center">
                    {isSubmitting ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Création du compte…</>)
                                  : (<><UserPlus className="mr-2 h-4 w-4" />Inscription</>)}
                  </Button>

                  <div className="text-center text-sm text-ink-faint mt-4">
                    Déjà un compte ?{' '}
                    <button type="button" onClick={() => switchTab('login')} className="text-brand-hover hover:text-brand font-medium">
                      Connecte-toi
                    </button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>
          )}

          {/* Resend confirmation — after a failed login */}
          {needsVerification && !pendingEmail && !googleConsent && activeTab === 'login' && !forgot && (
            <div className="mt-4 text-center text-xs text-ink-faint">
              Email non confirmé ?{' '}
              <button type="button" onClick={() => handleResend(unverifiedEmail || formValues.identifier)}
                className="font-semibold text-brand-hover hover:text-brand">
                Renvoyer le lien de confirmation
              </button>
              {resendMsg && <p className="mt-1">{resendMsg}</p>}
            </div>
          )}

          <div className="mt-6 text-center text-xs text-ink-faint">
            En continuant, tu acceptes les{' '}
            <Link to="/terms-of-service" className="text-brand-hover hover:text-brand">Conditions d'utilisation</Link>
            {' '}et la{' '}
            <Link to="/privacy-policy" className="text-brand-hover hover:text-brand">Politique de confidentialité</Link> de Fidni.
          </div>
        </div>
      </motion.div>
      </div>
    </div>
  );
};
