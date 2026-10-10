// Bouton « Continuer avec Google » de la fenêtre de connexion (10/10/2026).
// Dessiné par Google (iframe) à la largeur du formulaire ; le script n'est chargé qu'ici (lib/googleAuth.ts).
import React, { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { loadGoogleIdentity, onGoogleCredential } from '@/lib/googleAuth';

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

export const GoogleButton: React.FC<GoogleButtonProps> = ({ onCredential, busy = false }) => {
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
            text: 'continue_with', logo_alignment: 'left', locale: 'fr', width,
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
        Le bouton Google n’a pas pu se charger (bloqueur de contenu ou connexion).{' '}
        <button type="button" onClick={() => { setState('loading'); setAttempt((n) => n + 1); }}
          className="font-semibold text-brand-hover hover:text-brand">
          Réessayer
        </button>
        {' '}ou utilise ton e-mail ci-dessous.
      </p>
    );
  }

  return (
    <div ref={wrapRef} className="relative min-h-[44px]" aria-busy={state === 'loading' || busy}>
      {/* Rempli par Google : React n'y met rien d'autre. */}
      <div ref={targetRef} className="flex min-h-[44px] items-center justify-center" />
      {state === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center gap-2 rounded-lg border border-line bg-white text-[13px] text-ink-faint">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Chargement de Google…
        </div>
      )}
      {busy && (
        <div className="absolute inset-0 flex items-center justify-center gap-2 rounded-lg bg-white/85 text-[13px] font-medium text-ink-soft">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Connexion avec Google…
        </div>
      )}
    </div>
  );
};

export default GoogleButton;
