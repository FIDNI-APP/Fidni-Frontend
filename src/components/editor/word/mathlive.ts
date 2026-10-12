/**
 * MathLive (MIT) : le champ d'équation « professionnel » de l'éditeur de documents (12/10/2026).
 * On tape une formule comme dans Word : `/` fait une fraction, `^` un exposant, `sqrt` une racine,
 * `alpha` donne α, Tab passe à la case suivante ; sur téléphone, un clavier mathématique s'ouvre.
 *
 * Chargé à la demande (seulement quand on ouvre une équation : ~800 Ko). Les polices viennent du
 * bundle (mathlive/fonts.css), pas d'un dossier deviné à l'exécution ; pas de sons.
 * Le LaTeX produit est ramené à ce que KaTeX sait afficher (formules enregistrées en `$…$`).
 */
import type { MathfieldElement } from 'mathlive';

let loading: Promise<typeof MathfieldElement> | null = null;

export function loadMathLive(): Promise<typeof MathfieldElement> {
  loading ??= Promise.all([import('mathlive'), import('mathlive/fonts.css')])
    .then(([ml]) => {
      const MF = ml.MathfieldElement;
      MF.fontsDirectory = null;
      MF.soundsDirectory = null;
      MF.plonkSound = null;
      MF.keypressSound = null;
      try { MF.locale = 'fr'; } catch { /* langue non disponible : anglais */ }
      return MF;
    })
    .catch((e) => { loading = null; throw e; });
  return loading;
}

/** Commandes propres à MathLive → équivalents KaTeX. */
const REPLACEMENTS: [RegExp, string][] = [
  [/\\differentialD\b/g, '\\mathrm{d}'],
  [/\\capitalDifferentialD\b/g, '\\mathrm{D}'],
  [/\\exponentialE\b/g, '\\mathrm{e}'],
  [/\\imaginaryI\b/g, '\\mathrm{i}'],
  [/\\imaginaryJ\b/g, '\\mathrm{j}'],
  [/\\placeholder(\[[^\]]*\])?\{\}/g, ''],
  [/\\placeholder(\[[^\]]*\])?/g, ''],
  [/\\N\b/g, '\\mathbb{N}'],
  [/\\Z\b/g, '\\mathbb{Z}'],
  [/\\Q\b/g, '\\mathbb{Q}'],
  [/\\R\b/g, '\\mathbb{R}'],
  [/\\C\b/g, '\\mathbb{C}'],
  [/\\P\b/g, '\\mathbb{P}'],
  [/\\mathrlap\b/g, '\\rlap'],
];

/** LaTeX sorti de MathLive → LaTeX enregistré (KaTeX). Les `$` n'y ont pas leur place (délimiteurs). */
export function toStoredLatex(latex: string): string {
  let s = latex;
  for (const [re, by] of REPLACEMENTS) s = s.replace(re, by);
  return s.replace(/\$/g, '\\$').trim();
}
