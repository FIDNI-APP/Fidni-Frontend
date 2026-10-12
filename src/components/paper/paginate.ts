/**
 * Pagination des feuilles A4 (12/10/2026) : la feuille est découpée en vraies pages à l'écran, et
 * l'impression reprend exactement ces pages (une page à l'écran = une page imprimée). Avant, une seule
 * longue feuille était coupée par le navigateur au moment d'imprimer : on ne savait pas où.
 *
 * Les blocs (en-tête, question, sous-question, partie, paragraphe…) ne sont jamais coupés ; un titre
 * reste avec ce qui le suit (`keepWithNext`) ; un bloc peut imposer une nouvelle page (`breakBefore`,
 * corrigé à la fin). Un bloc plus haut qu'une page occupe une page à lui seul.
 */

export const MM = 96 / 25.4; // px CSS par mm

export interface PageGeometry {
  /** Format de la page, en mm. */
  width: number;
  height: number;
  /** Marges, en mm (le pied de page est dans la marge du bas). */
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export const A4: PageGeometry = { width: 210, height: 297, top: 15, right: 16, bottom: 17, left: 16 };

export const landscape = (g: PageGeometry): PageGeometry => ({ ...g, width: g.height, height: g.width });

/** Hauteur utile d'une page (zone de texte), en px. */
export const contentHeight = (g: PageGeometry) => (g.height - g.top - g.bottom) * MM;
export const contentWidth = (g: PageGeometry) => (g.width - g.left - g.right) * MM;

export interface MeasuredBlock {
  /** Hauteur occupée (px), marges internes comprises. */
  height: number;
  keepWithNext?: boolean;
  breakBefore?: boolean;
}

/** Page de chaque bloc (0, 1, 2…), et nombre de pages. */
export function paginate(blocks: MeasuredBlock[], pageHeight: number): { pageOf: number[]; pages: number } {
  const pageOf: number[] = [];
  const limit = Math.max(1, pageHeight);
  let page = 0;
  let y = 0;
  for (let i = 0; i < blocks.length; i += 1) {
    const b = blocks[i];
    if (b.breakBefore && y > 0) { page += 1; y = 0; }
    // Un titre et ce qu'il annonce : la chaîne « garder avec le suivant » doit tenir d'un bloc.
    let needed = b.height;
    if (b.keepWithNext) {
      let j = i;
      while (blocks[j]?.keepWithNext && j + 1 < blocks.length) { j += 1; needed += blocks[j].height; }
      needed = Math.min(needed, limit); // chaîne plus haute qu'une page : on ne la repousse pas indéfiniment
    }
    if (y > 0 && y + needed > limit + 0.5) { page += 1; y = 0; }
    pageOf.push(page);
    y += b.height;
    // Bloc plus haut qu'une page : seul sur la sienne, la suite repart sur la suivante.
    if (y > limit + 0.5) { page += 1; y = 0; }
  }
  return { pageOf, pages: pageOf.length ? pageOf[pageOf.length - 1] + 1 : 1 };
}

/**
 * Pagination d'un flux qu'on ne déplace pas (éditeur) : espace à ajouter AVANT chaque bloc pour qu'il
 * commence en haut de la page suivante. `gap` = hauteur entre deux zones de texte (marges du bas et du
 * haut + espace entre les feuilles à l'écran).
 */
export function spacers(blocks: MeasuredBlock[], pageHeight: number, gap: number): { before: number[]; pageOf: number[]; pages: number } {
  const { pageOf, pages } = paginate(blocks, pageHeight);
  const before = blocks.map(() => 0);
  let y = 0; // position dans la page courante
  let page = 0;
  for (let i = 0; i < blocks.length; i += 1) {
    if (pageOf[i] !== page) {
      // Le bloc saute à la page suivante : il faut combler la fin de page puis l'intervalle.
      const skipped = pageOf[i] - page;
      before[i] = Math.max(0, pageHeight - y) + gap + (skipped - 1) * (pageHeight + gap);
      page = pageOf[i];
      y = 0;
    }
    y += blocks[i].height;
    if (y > pageHeight + 0.5) {
      // Bloc trop haut : il déborde, la page suivante commence après lui.
      y = pageHeight;
    }
  }
  return { before, pageOf, pages };
}
