// Prochain DS de l'élève pour l'accueil (rappel, invitation à en annoncer un, « Tes 3 premiers pas »).
import { useCallback, useEffect, useState } from 'react';
import { devoirsApi, type UpcomingTest } from '@/lib/api/devoirsApi';

export interface NextTestState {
  loaded: boolean;
  /** DS dans les deux semaines (le rappel). */
  test: UpcomingTest | null;
  /** Au moins un DS annoncé, passé ou à venir (« Tes 3 premiers pas »). */
  announced: boolean;
  /** Un DS à venir, même au-delà de deux semaines : pas d'invitation à en annoncer un. */
  upcoming: boolean;
  reload: () => void;
}

/** Le prochain DS ; sans DS proche, la liste (petite) dit s'il y en a un plus loin ou déjà passé. */
export function useNextTest(): NextTestState {
  const [state, setState] = useState<Omit<NextTestState, 'reload'>>({ loaded: false, test: null, announced: false, upcoming: false });
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const test = await devoirsApi.next();
        if (test) { if (alive) setState({ loaded: true, test, announced: true, upcoming: true }); return; }
        const all = await devoirsApi.list().catch(() => [] as UpcomingTest[]);
        if (alive) setState({ loaded: true, test: null, announced: all.length > 0, upcoming: all.some((t) => t.days_left >= 0) });
      } catch {
        if (alive) setState({ loaded: true, test: null, announced: false, upcoming: false });
      }
    })();
    return () => { alive = false; };
  }, [tick]);
  const reload = useCallback(() => setTick((n) => n + 1), []);
  return { ...state, reload };
}
