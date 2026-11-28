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
import { VisuApplications, VisuDivision, VisuEnsembles, VisuIdentites, VisuLogique, VisuPolynome, VisuTrinome, VisuValeurAbsolue } from './Algebre';
import { VisuBarycentre, VisuComplexe, VisuVecteurs } from './Geometrie';
import {
  VisuArithGeo, VisuAsymptote, VisuContinuite, VisuConvexite, VisuExp, VisuHomographique, VisuLn, VisuPrimitives, VisuSymetrie,
} from './Analyse';

/**
 * Une notion = un motif cherché dans le texte des encadrés et des titres de la leçon (sans accents, en minuscules),
 * éventuellement avec un mot exigé dans le même bloc (`exige`) pour éviter un faux ami.
 * 28/11/2026 : toutes les leçons du site ont au moins une visualisation (vérifié sur les 42 leçons).
 */
export const VISUALISATIONS: { id: string; motif: RegExp; Composant: React.FC; exige?: RegExp; chapitres?: RegExp }[] = [
  { id: 'tvi', motif: /valeurs intermediaires|\btvi\b/, Composant: VisuTVI },
  { id: 'rolle', motif: /\brolle\b/, Composant: VisuRolle },
  { id: 'taf', motif: /accroissements finis/, Composant: VisuTAF },
  { id: 'derivee', motif: /nombre derive|derivable en|taux d.accroissement|taux de variation|derivabilite/, chapitres: /derivation|limites|logarithm|exponentiel/, Composant: VisuDerivee },
  { id: 'continuite', motif: /continuite en un point|continue en a|continue en un point/, Composant: VisuContinuite },
  { id: 'convexite', motif: /concavite|convexite|inflexion/, Composant: VisuConvexite },
  { id: 'asymptote', motif: /asymptote oblique|branches? infinies?|branche parabolique/, Composant: VisuAsymptote },
  { id: 'symetrie', motif: /axe de symetrie|centre de symetrie/, Composant: VisuSymetrie },
  { id: 'primitives', motif: /primitive/, Composant: VisuPrimitives },
  { id: 'ln', motif: /logarithme|\bln\(|\bln x/, chapitres: /logarithm/, Composant: VisuLn },
  { id: 'exp', motif: /exponentielle|\bexp\(|e\^x|eˣ/, chapitres: /exponentiel/, Composant: VisuExp },
  { id: 'arith-geo', motif: /suite arithmetique|suite geometrique|suites arithmetiques/, Composant: VisuArithGeo },
  { id: 'homographique', motif: /homographique|\(ax\+b\)\/\(cx\+d\)/, Composant: VisuHomographique },
  { id: 'logique', motif: /implication|connecteurs? logiques?|table de verite/, Composant: VisuLogique },
  { id: 'division', motif: /division euclidienne/, exige: /entier|naturel|quotient|pgcd/, Composant: VisuDivision },
  { id: 'ensembles', motif: /intersection|reunion|complementaire/, exige: /ensemble/, Composant: VisuEnsembles },
  { id: 'applications', motif: /injective|surjective/, chapitres: /applications/, Composant: VisuApplications },
  { id: 'valeur-absolue', motif: /valeur absolue/, Composant: VisuValeurAbsolue },
  { id: 'identites', motif: /identites remarquables/, Composant: VisuIdentites },
  { id: 'trinome', motif: /discriminant|second degre|trinome|ax2\+bx\+c|ax²\+bx\+c/, chapitres: /equations|polynome|generalites/, Composant: VisuTrinome },
  { id: 'polynome', motif: /racine d.un polynome|racines? d.un polynome/, Composant: VisuPolynome },
  { id: 'vecteurs', motif: /addition|somme de deux vecteurs|chasles/, exige: /vecteur/, Composant: VisuVecteurs },
  { id: 'barycentre', motif: /barycentre/, Composant: VisuBarycentre },
  { id: 'complexe', motif: /nombres? complexes?|affixe|point image|distance et angles|cocyclicite/, chapitres: /complexes/, Composant: VisuComplexe },
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

type Regle = (typeof VISUALISATIONS)[number];

/** La notion d'un bloc de texte (encadré, titre), ou null ; `deja` : notions déjà placées dans la leçon. */
export function notionDuTexte(texte: string, chapitres: string[], deja: Set<string>): Regle | null {
  const chap = normaliserMots(chapitres.join(' | '));
  const mots = normaliserMots(texte), serre = normaliser(texte);
  for (const v of VISUALISATIONS) {
    if (deja.has(v.id) || (v.chapitres && chap && !v.chapitres.test(chap))) continue;
    if ((v.motif.test(mots) || v.motif.test(serre)) && (!v.exige || v.exige.test(mots) || v.exige.test(serre))) return v;
  }
  return null;
}

/** `chapitres` : noms des chapitres de la leçon ; une visualisation liée à un chapitre ne sort pas ailleurs (forme
 * exponentielle d'un complexe ≠ fonction exponentielle). Inconnus : pas de filtre. */
export function useVisualisations(container: React.RefObject<HTMLElement | null>, actif: boolean, deps: unknown[], chapitres: string[] = []): Emplacement[] {
  const [places, setPlaces] = useState<Emplacement[]>([]);
  useEffect(() => {
    const root = container.current;
    if (!actif || !root) return;
    let timer = 0;
    const placer = () => {
      root.querySelectorAll('.fd-visu-hote').forEach((x) => x.remove());
      const blocs = [...root.querySelectorAll<HTMLElement>('[data-callout-type], h2, h3')];
      const out: Emplacement[] = [];
      const chap = normaliserMots(chapitres.join(' | '));
      for (const v of VISUALISATIONS) {
        if (v.chapitres && chap && !v.chapitres.test(chap)) continue;
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
