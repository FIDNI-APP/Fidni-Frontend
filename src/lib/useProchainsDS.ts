// DS à venir de l'élève connecté (« Mon prochain DS », /api/devoirs/) : une seule requête pour toutes les cartes
// d'une liste, gardée 10 minutes. Sert au repère « Utile pour ton DS du 20 novembre » des cartes (14/11/2026).
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { devoirsApi, type UpcomingTest } from '@/lib/api/devoirsApi';

const DUREE = 10 * 60 * 1000;
let cache: { user: number; at: number; promise: Promise<UpcomingTest[]> } | null = null;

const charger = (userId: number): Promise<UpcomingTest[]> => {
  if (cache && cache.user === userId && Date.now() - cache.at < DUREE) return cache.promise;
  const promise = devoirsApi.list()
    .then((tests) => tests.filter((t) => t.days_left >= 0).sort((a, b) => a.days_left - b.days_left))
    .catch(() => [] as UpcomingTest[]);
  cache = { user: userId, at: Date.now(), promise };
  return promise;
};

/** Après la création ou la modification d'un DS : relire la liste au prochain affichage. */
export const oublierProchainsDS = () => { cache = null; };

/** DS à venir, du plus proche au plus lointain ([] pour un visiteur ou en cas d'erreur). */
export function useProchainsDS(): UpcomingTest[] {
  const { user, isAuthenticated } = useAuth();
  const id = isAuthenticated && user?.id ? Number(user.id) : null;
  const [tests, setTests] = useState<UpcomingTest[]>([]);
  useEffect(() => {
    if (id == null) { setTests([]); return; }
    let vivant = true;
    charger(id).then((t) => { if (vivant) setTests(t); });
    return () => { vivant = false; };
  }, [id]);
  return tests;
}

/** Le plus proche DS dont un chapitre est celui du contenu (et, s'il a un niveau, un niveau du contenu). */
export function dsPourContenu(
  tests: UpcomingTest[],
  content: { chapters?: { id: number }[] | null; class_levels?: { id: number | string }[] | null },
): UpcomingTest | null {
  const chapitres = new Set((content.chapters ?? []).map((c) => Number(c.id)));
  if (!chapitres.size) return null;
  const niveaux = new Set((content.class_levels ?? []).map((l) => Number(l.id)));
  return tests.find((t) => (!t.class_level || !niveaux.size || niveaux.has(Number(t.class_level.id)))
    && t.chapters.some((c) => chapitres.has(Number(c.id)))) ?? null;
}
