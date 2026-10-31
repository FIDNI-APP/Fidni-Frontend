// Bouton « Continuer avec Google » de la fenêtre de connexion (10/10/2026).
// Dessiné par Google (iframe) à la largeur du formulaire ; le script n'est chargé qu'ici (lib/googleAuth.ts).
import React, { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { loadGoogleIdentity, nativeGoogleCredential, onGoogleCredential } from '@/lib/googleAuth';
import { isNativeApp } from '@/lib/native';
import { t, getLang } from '@/i18n';

interface GoogleButtonProps {
  /** Jeton d'identité renvoyé par Google, à envoyer au serveur. */
  onCredential: (credential: string) => void;
  /** Le jeton est en cours de vérification : le bouton est recouvert, plus de double clic. */
  busy?: boolean;
}

// Limites de largeur imposées par Google.
const MIN_W = 200;
const MAX_W = 400;
const clampWidth = (w: number) => Math.round(Math.min(MAX_W, Math.max(MIN_W, w)));

const WebGoogleButton: React.FC<GoogleButtonProps> = ({ onCredential, busy = false }) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const targetRef = useRef<HTMLDivElement>(null);
  const callbackRef = useRef(onCredential);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => { callbackRef.current = onCredential; }, [onCredential]);

  useEffect(() => {
    let cancelled = false;
    let drawnWidth = 0;
    let observer: ResizeObserver | null = null;
    const unplug = onGoogleCredential((c) => callbackRef.current(c));

    loadGoogleIdentity()
      .then((gsi) => {
        if (cancelled || !wrapRef.current || !targetRef.current) return;
        const draw = () => {
          const width = clampWidth(wrapRef.current?.clientWidth || MAX_W);
          if (!targetRef.current || Math.abs(width - drawnWidth) < 8) return;
          drawnWidth = width;
          gsi.renderButton(targetRef.current, {
            type: 'standard', theme: 'outline', size: 'large', shape: 'rectangular',
            text: 'continue_with', logo_alignment: 'left', locale: getLang(), width,
          });
        };
        draw();
        setState('ready');
        // Rotation du téléphone, fenêtre redimensionnée : le bouton suit la largeur du formulaire.
        if (typeof ResizeObserver !== 'undefined') {
          observer = new ResizeObserver(() => draw());
          observer.observe(wrapRef.current);
        }
      })
      .catch(() => { if (!cancelled) setState('error'); });

    return () => {
      cancelled = true;
      observer?.disconnect();
      unplug();
    };
  }, [attempt]);

  if (state === 'error') {
    return (
      <p className="rounded-lg border border-line bg-paper px-3 py-2.5 text-center text-[12.5px] leading-snug text-ink-faint">
        {t('Le bouton Google n’a pas pu se charger (bloqueur de contenu ou connexion).')}{' '}
        <button type="button" onClick={() => { setState('loading'); setAttempt((n) => n + 1); }}
          className="font-semibold text-brand-hover hover:text-brand">
          {t('Réessayer')}
        </button>
        {' '}{t('ou utilise ton e-mail ci-dessous.')}
      </p>
    );
  }

  return (
    <div ref={wrapRef} className="relative min-h-[44px]" aria-busy={state === 'loading' || busy}>
      {/* Rempli par Google : React n'y met rien d'autre. */}
      <div ref={targetRef} className="flex min-h-[44px] items-center justify-center" />
      {state === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center gap-2 rounded-lg border border-line bg-white text-[13px] text-ink-faint">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> {t('Chargement de Google…')}
        </div>
      )}
      {busy && (
        <div className="absolute inset-0 flex items-center justify-center gap-2 rounded-lg bg-white/85 text-[13px] font-medium text-ink-soft">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> {t('Connexion avec Google…')}
        </div>
      )}
    </div>
  );
};

/** Application Android : notre bouton (Google ne dessine pas le sien hors navigateur), puis le sélecteur de compte. */
const NativeGoogleButton: React.FC<GoogleButtonProps> = ({ onCredential, busy = false }) => {
  const [opening, setOpening] = useState(false);
  const [failed, setFailed] = useState(false);

  const start = async () => {
    setFailed(false);
    setOpening(true);
    try {
      const credential = await nativeGoogleCredential();
      if (credential) onCredential(credential);
    } catch (e) {
      console.error('Connexion Google (application) :', e);
      setFailed(true);
    } finally {
      setOpening(false);
    }
  };

  return (
    <div>
      <button type="button" onClick={start} disabled={opening || busy}
        className="flex min-h-[44px] w-full items-center justify-center gap-3 rounded-lg border border-line bg-white px-4 text-[14px] font-medium text-ink transition hover:bg-paper disabled:opacity-70">
        {opening || busy
          ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          : (
            <svg viewBox="0 0 48 48" className="h-[18px] w-[18px]" aria-hidden>
              <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
              <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
              <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
              <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
            </svg>
          )}
        {busy ? t('Connexion avec Google…') : t('Continuer avec Google')}
      </button>
      {failed && (
        <p className="mt-2 text-center text-[12.5px] leading-snug text-ink-faint">
          {t('La connexion avec Google a échoué. Réessaie.')}
        </p>
      )}
    </div>
  );
};

/** Bouton « Continuer avec Google » : celui de Google sur le site, le sélecteur du téléphone dans l'application. */
export const GoogleButton: React.FC<GoogleButtonProps> = (props) =>
  isNativeApp ? <NativeGoogleButton {...props} /> : <WebGoogleButton {...props} />;

export default GoogleButton;
