// Invitations à créer un compte, pour les visiteurs seulement, aux endroits où un compte change
// vraiment quelque chose (progression, révisions, cahiers, note d'examen). Sobres, jamais bloquantes.
import React, { useEffect, useState } from 'react';
import { Check, Sparkles, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthModal } from '@/components/auth/AuthController';
import { TABBAR_OFFSET } from '@/components/layout/nav';

/**
 * Ouvre la fenêtre de connexion / inscription. `source` = la porte d'entrée (vote, favori, solution,
 * evaluer, commentaire, liste, cahier, bandeau, carte, sidebar, barre-haut, hero, cta…), comptée dans
 * le Pilotage (lib/usage.ts trackAuthOpen, via AuthController.openModal).
 */
export function useOpenSignup(source = 'autre') {
  const { openModal, setInitialTab } = useAuthModal();
  return (tab: 'signup' | 'login' = 'signup') => { setInitialTab(tab); openModal(source); };
}

const BENEFITS = [
  'Ta progression suivie, question par question',
  'Tes listes de révision et tes cahiers de cours',
  'Tes favoris, tes quiz par chapitre et ta note aux examens',
];

/** Version large, pour une liste : le texte à gauche, les boutons à droite. */
export const SignupStrip: React.FC<{ className?: string; source?: string }> = ({ className = '', source = 'carte' }) => {
  const { isAuthenticated } = useAuth();
  const openSignup = useOpenSignup(source);
  if (isAuthenticated) return null;
  return (
    <div className={`rounded-2xl border border-brand-line bg-brand-soft/50 px-5 py-4 flex flex-col md:flex-row md:items-center gap-4 ${className}`}>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 text-[15px] font-semibold text-ink"><Sparkles className="h-4 w-4 text-brand" /> Travaille avec un compte, c’est gratuit</p>
        <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1">
          {BENEFITS.map((b) => (
            <li key={b} className="flex items-center gap-1.5 text-[13px] text-ink-soft"><Check className="h-3.5 w-3.5 shrink-0 text-brand" strokeWidth={3} /> {b}</li>
          ))}
        </ul>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button type="button" onClick={() => openSignup('signup')} className="fd-btn-primary">Créer mon compte</button>
        <button type="button" onClick={() => openSignup('login')} className="px-3 py-2 text-[13px] font-medium text-ink-faint hover:text-ink">Se connecter</button>
      </div>
    </div>
  );
};

/** Carte d'invitation (colonne latérale, liste, fin de page). */
export const SignupCard: React.FC<{ title?: string; text?: string; benefits?: boolean; className?: string; tour?: string; source?: string }> = ({
  title = 'Garde une trace de ton travail', text, benefits = true, className = '', tour, source = 'carte',
}) => {
  const { isAuthenticated } = useAuth();
  const openSignup = useOpenSignup(source);
  if (isAuthenticated) return null;
  return (
    <div className={`rounded-2xl border border-brand-line bg-brand-soft/50 p-5 ${className}`} data-tour={tour}>
      <p className="flex items-center gap-2 text-[15px] font-semibold text-ink">
        <Sparkles className="h-4 w-4 text-brand" /> {title}
      </p>
      {text && <p className="mt-1.5 text-[13px] leading-relaxed text-ink-soft">{text}</p>}
      {benefits && (
        <ul className="mt-3 flex flex-col gap-1.5">
          {BENEFITS.map((b) => (
            <li key={b} className="flex items-start gap-2 text-[13px] text-ink-soft">
              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand" strokeWidth={3} /> {b}
            </li>
          ))}
        </ul>
      )}
      <button type="button" onClick={() => openSignup('signup')} className="fd-btn-primary mt-4 w-full justify-center">
        Créer mon compte gratuit
      </button>
      <button type="button" onClick={() => openSignup('login')} className="mt-2 w-full text-center text-[12.5px] font-medium text-ink-faint hover:text-ink">
        J’ai déjà un compte
      </button>
    </div>
  );
};

const VIEWS_KEY = 'fidni:visites-contenus';
const DISMISS_KEY = 'fidni:bandeau-inscription';

/**
 * Bandeau en bas de page, pour un visiteur qui en est au moins à son 3e contenu de la session.
 * Refermé, il ne revient pas avant 7 jours.
 */
export const SignupBanner: React.FC<{ contentId?: string | number }> = ({ contentId }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const openSignup = useOpenSignup('bandeau');
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (isLoading || isAuthenticated || !contentId) return;
    let views = 0;
    try {
      const seen = new Set<string>(JSON.parse(sessionStorage.getItem(VIEWS_KEY) || '[]'));
      seen.add(String(contentId));
      sessionStorage.setItem(VIEWS_KEY, JSON.stringify([...seen]));
      views = seen.size;
      const until = Number(localStorage.getItem(DISMISS_KEY) || 0);
      if (until > Date.now()) return;
    } catch { return; }
    if (views >= 3) setShow(true);
  }, [contentId, isAuthenticated, isLoading]);

  if (!show || isAuthenticated) return null;
  const dismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, String(Date.now() + 7 * 86400000)); } catch { /* stockage indisponible */ }
    setShow(false);
  };
  return (
    // Au-dessus de la barre d'onglets du téléphone (sa hauteur, 0 sur ordinateur : MobileTabBar).
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 backdrop-blur shadow-[0_-8px_24px_rgba(20,18,16,.06)] print:hidden"
      style={{ bottom: TABBAR_OFFSET }}>
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 pr-12 sm:pr-4">
        <p className="min-w-0 flex-1 text-[13.5px] text-ink-soft">
          <b className="text-ink">Tu révises sur Fidni ?</b> Crée ton compte gratuit pour garder ta progression, tes révisions et tes cahiers.
        </p>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => openSignup('signup')} className="fd-btn-primary">Créer mon compte</button>
          <button type="button" onClick={() => openSignup('login')} className="hidden sm:inline-flex px-3 py-2 text-[13px] font-medium text-ink-faint hover:text-ink">Se connecter</button>
        </div>
        <button type="button" onClick={dismiss} aria-label="Fermer" className="absolute right-2 top-2 sm:static inline-flex h-9 w-9 items-center justify-center rounded-lg text-ink-faint hover:text-ink hover:bg-[#f2f1ee]">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
