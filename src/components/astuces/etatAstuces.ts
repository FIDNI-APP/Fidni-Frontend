/**
 * La section Astuces est-elle ouverte à tous les membres ? (interrupteur de l'équipe, 27/11/2026)
 * Lu une fois par visite (GET /api/astuces/etat/) pour le menu ; l'interrupteur de la page prévient le menu tout de suite.
 */
import { useEffect, useState } from 'react';
import { getEtatAstuces } from '@/lib/api/astucesApi';

let ouvert: boolean | null = null;
let enCours: Promise<void> | null = null;
const abonnes = new Set<(v: boolean) => void>();

export function signalerChangementAstuces(v: boolean) {
  ouvert = v;
  abonnes.forEach((f) => f(v));
}

export function useAstucesOuvertes(): boolean {
  const [v, setV] = useState<boolean>(ouvert ?? false);
  useEffect(() => {
    abonnes.add(setV);
    if (ouvert === null && !enCours) {
      enCours = getEtatAstuces().then((e) => signalerChangementAstuces(e.ouvert)).catch(() => { /* fermé par défaut */ });
    }
    return () => { abonnes.delete(setV); };
  }, []);
  return v;
}
