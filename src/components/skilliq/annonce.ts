// « Nouveau » pour faire découvrir les quiz par chapitre (13/10/2026 : presque personne ne les ouvrait, l'entrée
// était rangée dans « Mon suivi », et derrière « Menu » sur téléphone). Bandeau de l'accueil (dashboard/QuizAnnonce),
// pastille dans le menu (Sidebar) et point sur l'onglet « Menu » (MobileTabBar) : seulement si des quiz sont prêts
// pour le niveau du membre (n'importe quel niveau s'il n'en a pas indiqué). Tout disparaît dès que la page des quiz
// a été ouverte (SkillIQSection) ; la croix du bandeau ne masque que le bandeau. Fin le 15/11/2026.
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import type { User } from '@/types';
import { getAvailableAll } from './api';

const DECOUVERT = 'fidni:quiz-decouvert';
const FERME = 'fidni:quiz-bandeau-ferme';
const FIN = new Date(2026, 10, 15).getTime();

const lu = (key: string) => { try { return !!localStorage.getItem(key); } catch { return false; } };
const ecrit = (key: string) => { try { localStorage.setItem(key, new Date().toISOString()); } catch { /* stockage indisponible */ } };

const abonnes = new Set<() => void>();
const prevenir = () => abonnes.forEach((f) => f());

// Une seule requête par session : les quiz prêts ne changent pas d'une page à l'autre.
let disponibles: Promise<Record<string, Record<string, number>>> | null = null;

export const quizDejaDecouvert = () => lu(DECOUVERT);

/** Page des quiz ouverte : plus de « Nouveau » nulle part. */
export function quizDecouvert() {
  ecrit(DECOUVERT);
  prevenir();
}

export function fermerBandeauQuiz() {
  ecrit(FERME);
  prevenir();
}

const niveauDe = (user: User | null | undefined) => {
  const l = user?.profile?.class_level;
  if (l == null || l === '') return null;
  return String(typeof l === 'object' ? l.id : l);
};

/** `menu` : pastille du menu ; `bandeau` : bandeau de l'accueil ; `nombre` : quiz prêts (son niveau, sinon tous). */
export function useQuizNouveau() {
  const { isAuthenticated, user } = useAuth();
  const [, rafraichir] = useState(0);
  const [nombre, setNombre] = useState(0);
  const niveau = niveauDe(user);
  const actif = isAuthenticated && Date.now() < FIN && !lu(DECOUVERT);

  useEffect(() => {
    const f = () => rafraichir((n) => n + 1);
    abonnes.add(f);
    return () => { abonnes.delete(f); };
  }, []);

  useEffect(() => {
    if (!actif) return;
    let vivant = true;
    disponibles ??= getAvailableAll().catch(() => { disponibles = null; return {}; });
    disponibles.then((tous) => {
      if (!vivant) return;
      const n = niveau
        ? Object.keys(tous[niveau] ?? {}).length
        : Object.values(tous).reduce((s, chapitres) => s + Object.keys(chapitres).length, 0);
      setNombre(n);
    });
    return () => { vivant = false; };
  }, [actif, niveau]);

  const pret = actif && nombre > 0;
  return { menu: pret, bandeau: pret && !lu(FERME), nombre, aSonNiveau: !!niveau };
}
