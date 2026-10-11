// Prochain DS de l'élève pour l'accueil (carte « Ton prochain DS », invitation à en annoncer un, « Tes premiers pas »).
import { useCallback, useEffect, useState } from 'react';
import { devoirsApi, type UpcomingTest } from '@/lib/api/devoirsApi';

export interface NextTestState {
  loaded: boolean;
  /** DS dans les deux semaines (le rappel). */
  test: UpcomingTest | null;
  /** Au moins un DS annoncé, passé ou à venir (« Tes premiers pas »). */
  announced: boolean;
  /** Un DS à venir, même au-delà de deux semaines : pas d'invitation à en annoncer un. */
  upcoming: boolean;
  reload: () => void;
}

/** DS dans ces jours-là : rappelé sur l'accueil (comme /api/devoirs/prochain/). */
const SOON_DAYS = 14;

/**
 * Le prochain DS. Lu dans la liste des DS (petite) plutôt que /api/devoirs/prochain/ : elle porte aussi la
 * préparation (`readiness`, `weak_chapters`) et dit s'il y a un DS plus loin ou déjà passé, en une requête.
 */
export function useNextTest(): NextTestState {
  const [state, setState] = useState<Omit<NextTestState, 'reload'>>({ loaded: false, test: null, announced: false, upcoming: false });
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const all = await devoirsApi.list();
        const ahead = all.filter((t) => t.days_left >= 0).sort((a, b) => a.days_left - b.days_left || a.id - b.id);
        const test = ahead[0] && ahead[0].days_left <= SOON_DAYS ? ahead[0] : null;
        if (alive) setState({ loaded: true, test, announced: all.length > 0, upcoming: ahead.length > 0 });
      } catch {
        // Liste indisponible : au moins le rappel.
        const test = await devoirsApi.next().catch(() => null);
        if (alive) setState({ loaded: true, test, announced: !!test, upcoming: !!test });
      }
    })();
    return () => { alive = false; };
  }, [tick]);
  const reload = useCallback(() => setTick((n) => n + 1), []);
  return { ...state, reload };
}

/* ── Invitation « Annoncer mon DS » de l'accueil : « Plus tard » la masque 14 jours. ── */

const LATER_KEY = 'fidni:annoncer-ds:plus-tard';
const LATER_DAYS = 14;

const hiddenForNow = () => {
  try { return Number(localStorage.getItem(LATER_KEY) || 0) > Date.now(); } catch { return false; }
};

/** « Plus tard » sur l'invitation : masquée 14 jours (même clé qu'avant la refonte). */
export function useAnnounceLater() {
  const [later, setLater] = useState(hiddenForNow);
  const dismiss = useCallback(() => {
    try { localStorage.setItem(LATER_KEY, String(Date.now() + LATER_DAYS * 86400000)); } catch { /* stockage indisponible */ }
    setLater(true);
  }, []);
  return { later, dismiss };
}

/** Le bloc a-t-il quelque chose à montrer ? (l'accueil s'en sert pour sa mise en page) */
export const nextTestVisible = (state: NextTestState, later: boolean) =>
  !!state.test || (state.loaded && !state.upcoming && !later);
