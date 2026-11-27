/**
 * Où placer les visualisations dans une leçon (27/11/2026, Natsu : « des visualisations pour comprendre certains
 * concepts : Rolle, TVI, accroissements finis, suites, dérivée… », à la place du graphe de n'importe quelle formule).
 *
 * On lit le texte des encadrés de la leçon (théorème, propriété, définition…) ; le premier qui parle d'une notion
 * reçoit la visualisation juste en dessous, dans la feuille. Une seule visualisation par notion et par leçon. Rien n'est
 * écrit dans la leçon elle-même : l'impression et le PDF ne changent pas (.fd-visu-hote masqué à l'impression).
 */
import React, { useEffect, useState } from 'react';
import { VisuRolle, VisuTAF, VisuTVI } from './Theoremes';
import { VisuDerivee, VisuReciproque } from './Fonctions';
import { VisuAdjacentes, VisuLimiteSuite, VisuSuiteRecurrente } from './Suites';

export const VISUALISATIONS: { id: string; motif: RegExp; Composant: React.FC; exige?: RegExp }[] = [
  { id: 'tvi', motif: /valeurs intermediaires|\btvi\b/, Composant: VisuTVI },
  { id: 'rolle', motif: /\brolle\b/, Composant: VisuRolle },
  { id: 'taf', motif: /accroissements finis/, Composant: VisuTAF },
  { id: 'derivee', motif: /nombre derive|derivable en|taux d.accroissement/, Composant: VisuDerivee },
  { id: 'reciproque', motif: /fonction reciproque|bijection reciproque|reciproque de f/, Composant: VisuReciproque },
  { id: 'recurrente', motif: /un\+1=f\(un\)|suites? recurrentes?/, Composant: VisuSuiteRecurrente },
  { id: 'adjacentes', motif: /adjacentes/, Composant: VisuAdjacentes },
  { id: 'limite-suite', motif: /convergente|converge vers|tend vers/, exige: /suite|\(un\)/, Composant: VisuLimiteSuite },
];

/** Texte comparable : sans accents, en minuscules, sans espaces ni caractères invisibles (rendu KaTeX). */
const normaliser = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  .replace(/[\u200b\u2060\s]+/g, '').replace(/[\u2019']/g, "'");
const normaliserMots = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[\u200b\u2060]/g, '').replace(/[\u2019']/g, "'");

export interface Emplacement { id: string; hote: HTMLElement; Composant: React.FC }

export function useVisualisations(container: React.RefObject<HTMLElement | null>, actif: boolean, deps: unknown[]): Emplacement[] {
  const [places, setPlaces] = useState<Emplacement[]>([]);
  useEffect(() => {
    const root = container.current;
    if (!actif || !root) return;
    let timer = 0;
    const placer = () => {
      root.querySelectorAll('.fd-visu-hote').forEach((x) => x.remove());
      const blocs = [...root.querySelectorAll<HTMLElement>('[data-callout-type], h2, h3')];
      const out: Emplacement[] = [];
      for (const v of VISUALISATIONS) {
        const bloc = blocs.find((b) => {
          const mots = normaliserMots(b.textContent || '');
          const serre = normaliser(b.textContent || '');
          return (v.motif.test(mots) || v.motif.test(serre)) && (!v.exige || v.exige.test(mots) || v.exige.test(serre));
        });
        if (!bloc) continue;
        const hote = document.createElement('div');
        hote.className = 'fd-visu-hote';
        hote.setAttribute('contenteditable', 'false');
        // Après l'encadré ; après un titre, on laisse passer le paragraphe qui le suit.
        const apres = /^H[23]$/.test(bloc.tagName) ? (bloc.nextElementSibling as HTMLElement | null) ?? bloc : bloc;
        apres.insertAdjacentElement('afterend', hote);
        out.push({ id: v.id, hote, Composant: v.Composant });
      }
      setPlaces(out);
    };
    // Les blocs de la leçon s'affichent parfois après coup : on attend qu'ils soient là.
    timer = window.setTimeout(placer, 250);
    return () => {
      window.clearTimeout(timer);
      root.querySelectorAll('.fd-visu-hote').forEach((x) => x.remove());
      setPlaces([]);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return places;
}
