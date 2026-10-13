/**
 * Fenêtre « Nouveautés » à l'arrivée d'un membre (14/10/2026) : la liste à montrer vient avec son compte
 * (`user.nouveautes`, réponse de connexion ou GET /auth/user/ ; backend apps/users/nouveautes.py). Elle s'ouvre sur
 * une page calme (accueil, listes, Réviser, Ma progression, un profil — jamais pendant un quiz, un DS blanc, un
 * éditeur ou la lecture d'un contenu), quand aucune autre fenêtre ni visite guidée n'est à l'écran, avant la visite
 * automatique de la page (qui attend qu'elle se ferme). Marquée vue dès l'ouverture : une seule fois par compte.
 * `?nouveautes=1` (ou son id) la rouvre à la demande, sans rien marquer.
 */
import React, { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { marquerNouveauteVue } from '@/lib/api/nouveautesApi';
import { trackAction } from '@/lib/usage';
import { marquerVisiteVue, somethingOpen } from '@/components/tour/TourProvider';
import { DERNIERE, NOUVEAUTES, type Nouveaute } from './registre';
import type { Fin } from './NouveautesModal';

const NouveautesModal = lazy(() => import('./NouveautesModal'));

const PAGES_CALMES = [
  /^\/$/,
  /^\/(exercises|lessons|exams)\/?$/,
  /^\/(exercises|lessons|exams)\/niveau\/[^/]+(\/[^/]+)?\/?$/,
  /^\/exams\/nationaux(\/[^/]+)?\/?$/,
  /^\/(reviser|enregistrements|progression)\/?$/,
  /^\/profile\/[^/]+\/?$/,
];

// Déjà montrées à ce compte sur ce navigateur : pas de seconde fois avant que le serveur l'ait noté (ou s'il n'a pas pu).
const ici = (userId: string) => `fidni:nouveautes-vues:${userId}`;
const vuesIci = (userId: string): string[] => {
  try { return JSON.parse(localStorage.getItem(ici(userId)) || '[]') || []; } catch { return []; }
};
const marquerIci = (userId: string, id: string) => {
  try { localStorage.setItem(ici(userId), JSON.stringify([...new Set([...vuesIci(userId), id])])); } catch { /* stockage indisponible */ }
};

const TICK = 500;
const STABLE = 1000; // avant le lancement automatique des visites (1,2 s au plus tôt) : la visite attendra

export const Nouveautes: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const demande = params.get('nouveautes');
  const [ouverte, setOuverte] = useState<{ n: Nouveaute; apercu: boolean; finie: boolean } | null>(null);
  // Montrées pendant cette visite (le compte en mémoire les liste encore jusqu'au prochain GET /auth/user/).
  const [montrees, setMontrees] = useState<string[]>([]);

  const candidate = useMemo<{ n: Nouveaute; apercu: boolean } | null>(() => {
    if (!user) return null;
    if (demande) {
      const n = NOUVEAUTES[demande] ?? NOUVEAUTES[DERNIERE];
      return n ? { n, apercu: true } : null;
    }
    const deja = [...vuesIci(String(user.id)), ...montrees];
    const id = (user.nouveautes ?? []).find((x) => NOUVEAUTES[x] && !deja.includes(x));
    return id ? { n: NOUVEAUTES[id], apercu: false } : null;
  }, [user, demande, montrees]);

  // La fenêtre se charge à part : on la prépare dès qu'il y a quelque chose à montrer.
  useEffect(() => { if (candidate) void import('./NouveautesModal'); }, [candidate]);

  const calme = PAGES_CALMES.some((re) => re.test(location.pathname));
  const pret = !!candidate && !ouverte && (candidate.apercu || (calme && user?.profile?.onboarding_completed !== false));

  useEffect(() => {
    if (!pret || !candidate) return undefined;
    let stable = 0;
    const id = window.setInterval(() => {
      const occupe = document.hidden || somethingOpen() || !!document.querySelector('[data-tour-card]');
      stable = occupe ? 0 : stable + TICK;
      if (stable < STABLE) return;
      window.clearInterval(id);
      if (!candidate.apercu && user) {
        marquerIci(String(user.id), candidate.n.id);
        marquerNouveauteVue(candidate.n.id).catch(() => { /* revue au plus une fois ailleurs, sans gravité */ });
        trackAction('nouveautes-vue');
        setMontrees((m) => [...m, candidate.n.id]);
      }
      setOuverte({ ...candidate, finie: false });
    }, TICK);
    return () => window.clearInterval(id);
  }, [pret, candidate, user]);

  const onFinie = useCallback(() => {
    setOuverte((o) => (o ? { ...o, finie: true } : o));
    if (ouverte?.n.visite) marquerVisiteVue(ouverte.n.visite);
    if (ouverte && !ouverte.apercu) trackAction('nouveautes-finie');
  }, [ouverte]);

  const fermer = (fin: Fin) => {
    if (!ouverte) return;
    if (!ouverte.apercu && fin === 'cta') trackAction('nouveautes-cta');
    else if (!ouverte.apercu && !ouverte.finie) trackAction('nouveautes-passee');
    setOuverte(null);
    if (demande) {
      const next = new URLSearchParams(params);
      next.delete('nouveautes');
      setParams(next, { replace: true });
    }
    if (fin === 'cta' && location.pathname !== ouverte.n.cta.to) navigate(ouverte.n.cta.to);
  };

  if (!ouverte) return null;
  return (
    <Suspense fallback={null}>
      <NouveautesModal nouveaute={ouverte.n} onFinie={onFinie} onClose={fermer} />
    </Suspense>
  );
};

export default Nouveautes;
