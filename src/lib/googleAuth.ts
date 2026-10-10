// Connexion avec Google (Google Identity Services, 10/10/2026).
// Le script de Google n'est chargé qu'à l'ouverture de la fenêtre de connexion (AuthModal → GoogleButton),
// jamais sur les autres pages : même principe que loadAdSense (lib/ads.ts). Google renvoie un jeton
// d'identité que le serveur vérifie (POST /api/auth/google/, backend apps/authentication/google.py).

/** Client ID OAuth PUBLIC (console Google Cloud). Le code secret n'est ni utilisé ni stocké côté site. */
export const GOOGLE_CLIENT_ID = '344349997591-ns0tpm59m2ugm33783rsrvl60avp9eeb.apps.googleusercontent.com';
const GSI_SRC = 'https://accounts.google.com/gsi/client';
const LOAD_TIMEOUT_MS = 15000;

// ---- Types minimaux de window.google.accounts.id (seulement ce qu'on utilise)
export interface GoogleCredentialResponse { credential: string; select_by?: string }

interface GoogleIdConfiguration {
  client_id: string;
  callback: (response: GoogleCredentialResponse) => void;
  ux_mode?: 'popup' | 'redirect';
  auto_select?: boolean;
  cancel_on_tap_outside?: boolean;
  context?: 'signin' | 'signup' | 'use';
}

export interface GoogleButtonOptions {
  type?: 'standard' | 'icon';
  theme?: 'outline' | 'filled_blue' | 'filled_black';
  size?: 'large' | 'medium' | 'small';
  text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
  shape?: 'rectangular' | 'pill' | 'circle' | 'square';
  logo_alignment?: 'left' | 'center';
  /** En pixels, de 200 à 400 (limites de Google). */
  width?: number;
  locale?: string;
}

interface GoogleIdApi {
  initialize: (config: GoogleIdConfiguration) => void;
  renderButton: (parent: HTMLElement, options: GoogleButtonOptions) => void;
  cancel: () => void;
}

declare global {
  interface Window { google?: { accounts?: { id?: GoogleIdApi } } }
}

// ---- Un seul initialize() par page (Google n'en garde qu'un) ; le bouton affiché reçoit le jeton.
let handler: ((credential: string) => void) | null = null;
let initialized = false;
let loading: Promise<GoogleIdApi> | null = null;

/** Branche le bouton affiché sur le jeton renvoyé par Google. Renvoie de quoi le débrancher. */
export function onGoogleCredential(fn: (credential: string) => void): () => void {
  handler = fn;
  return () => { if (handler === fn) handler = null; };
}

function ready(): GoogleIdApi | null {
  const id = window.google?.accounts?.id;
  if (!id) return null;
  if (!initialized) {
    id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: (r) => { if (r?.credential) handler?.(r.credential); },
      ux_mode: 'popup',
      auto_select: false,
    });
    initialized = true;
  }
  return id;
}

/**
 * Charge le script de Google (une fois) et renvoie window.google.accounts.id, initialisé.
 * Échec (bloqueur, hors ligne, délai dépassé) : la promesse est rejetée et un nouvel appel réessaie.
 */
export function loadGoogleIdentity(): Promise<GoogleIdApi> {
  const now = ready();
  if (now) return Promise.resolve(now);
  if (loading) return loading;
  loading = new Promise<GoogleIdApi>((resolve, reject) => {
    let script = document.querySelector<HTMLScriptElement>('script[data-fidni-gsi]');
    const fail = () => {
      window.clearTimeout(timer);
      script?.remove();
      loading = null;
      reject(new Error('Script Google indisponible'));
    };
    const timer = window.setTimeout(fail, LOAD_TIMEOUT_MS);
    const done = () => {
      const id = ready();
      if (!id) { fail(); return; }
      window.clearTimeout(timer);
      resolve(id);
    };
    if (!script) {
      script = document.createElement('script');
      script.async = true;
      script.defer = true;
      script.src = GSI_SRC;
      script.dataset.fidniGsi = '1';
      document.head.appendChild(script);
    }
    script.addEventListener('load', done, { once: true });
    script.addEventListener('error', fail, { once: true });
  });
  return loading;
}
