/**
 * Confort de lecture de la page d'un contenu (refonte du 11/10/2026) : taille et interligne du texte,
 * formules KaTeX à la taille du texte (par défaut, KaTeX les grossit à 1,21 em : elles dépassaient),
 * espace entre les paragraphes. Limité aux zones `.fd-read` (énoncés, solutions) et `.fd-lesson` (leçon) :
 * les cartes des listes et les aperçus gardent leur rendu.
 * Leçon (11/10/2026) : la mise en forme de la leçon imprimée (PaperExport) — police de LaTeX, titres I. / 1.
 * numérotés en vert, encadrés fins à filet coloré, mêmes couleurs par nature d'encadré.
 */
import React from 'react';
import { PAPER_GLYPHS_FACE, PAPER_SERIF } from '@/lib/paperFont';

const CSS = `
${PAPER_GLYPHS_FACE}
.fd-read .tiptap-full-renderer .ProseMirror { font-size: 16.5px; line-height: 1.72; color: #1a1a1a; }
.fd-read .tiptap-full-renderer .ProseMirror p { margin-bottom: .55em; }
.fd-read .tiptap-full-renderer .ProseMirror > div > :last-child { margin-bottom: 0; }
.fd-read .tiptap-full-renderer .ProseMirror li { margin-bottom: .2em; }
.fd-read .tiptap-full-renderer .katex { font-size: 1.1em; }
.fd-read .tiptap-full-renderer .math-display { margin: .7em 0; }
.fd-read .fd-sol .tiptap-full-renderer .ProseMirror { font-size: 15.5px; line-height: 1.7; color: #33302b; }
.fd-read .fd-sol .tiptap-full-renderer .ProseMirror strong { color: #1a1a1a; }
.fd-read .tiptap-full-renderer .ProseMirror [data-callout-type] > :last-child,
.fd-lesson .tiptap-full-renderer .ProseMirror [data-callout-type] > :last-child,
.fd-lesson .tiptap-full-renderer .ProseMirror li > p { margin-bottom: 0; }

.fd-lesson { font-family: ${PAPER_SERIF}; color: #1a1a1a; }
.fd-lesson-h2 { font-size: 22px; font-weight: 700; line-height: 1.3; }
.fd-lesson-h3 { font-size: 18.5px; font-weight: 700; line-height: 1.35; }
.fd-lesson-num { color: #1a7a4a; }
.fd-lesson-sub { margin-left: 14px; }
.fd-lesson .tiptap-full-renderer .ProseMirror { font-size: 17.5px; line-height: 1.6; color: #1a1a1a; }
.fd-lesson .tiptap-full-renderer .ProseMirror p { margin-bottom: .5em; }
.fd-lesson .tiptap-full-renderer .ProseMirror > div > :last-child { margin-bottom: 0; }
.fd-lesson .tiptap-full-renderer .ProseMirror ul,
.fd-lesson .tiptap-full-renderer .ProseMirror ol { padding-left: 1.3em; margin-bottom: .5em; }
.fd-lesson .tiptap-full-renderer .ProseMirror li { margin-bottom: .15em; }
.fd-lesson .tiptap-full-renderer .katex { font-size: 1.08em; }
/* Formules dans la ligne, sans marge : même police que le texte, comme sur la feuille imprimée. */
.fd-lesson .tiptap-full-renderer .math-inline { display: inline; margin: 0; vertical-align: baseline; }
.fd-lesson .tiptap-full-renderer .math-display { margin: .45em 0; }
/* Encadrés comme sur la feuille imprimée : bord fin, filet coloré à gauche (vert ; or pour les résultats ;
   gris pour remarques, exemples, preuves ; rouge pour « Attention »), étiquette en petites capitales.
   Sélecteurs plus précis que ceux de TipTapRenderer, dont le style est inséré après celui-ci. */
.fd-lesson .tiptap-full-renderer [data-callout-type] {
  margin: 14px 0; padding: 10px 16px 11px; border-radius: 4px; color: #1a1a1a;
  border: 1px solid #e2ded6; border-left: 3px solid #1a7a4a; background: #fbfaf8;
}
.fd-lesson .tiptap-full-renderer .callout-head { margin-bottom: 3px; gap: 2px 8px; }
.fd-lesson .tiptap-full-renderer [data-callout-type] .callout-kind {
  font: 700 11.5px/1.5 'DM Sans', system-ui, sans-serif; letter-spacing: .08em; color: #15633c;
}
.fd-lesson .tiptap-full-renderer .callout-name { font-size: 16.5px; font-weight: 700; color: #1a1a1a; }
.fd-lesson .tiptap-full-renderer [data-callout-type="theorem"],
.fd-lesson .tiptap-full-renderer [data-callout-type="property"],
.fd-lesson .tiptap-full-renderer [data-callout-type="corollary"],
.fd-lesson .tiptap-full-renderer [data-callout-type="lemma"] { border-left-color: #c0892f; }
.fd-lesson .tiptap-full-renderer [data-callout-type="theorem"] .callout-kind,
.fd-lesson .tiptap-full-renderer [data-callout-type="property"] .callout-kind,
.fd-lesson .tiptap-full-renderer [data-callout-type="corollary"] .callout-kind,
.fd-lesson .tiptap-full-renderer [data-callout-type="lemma"] .callout-kind { color: #9a6e1c; }
.fd-lesson .tiptap-full-renderer [data-callout-type="remark"],
.fd-lesson .tiptap-full-renderer [data-callout-type="example"],
.fd-lesson .tiptap-full-renderer [data-callout-type="proof"] { border-left-color: #9a958c; }
.fd-lesson .tiptap-full-renderer [data-callout-type="warning"] { border-left-color: #a23b34; }
.fd-lesson .tiptap-full-renderer [data-callout-type="warning"] .callout-kind { color: #a23b34; }

@media (max-width: 640px) {
  .fd-read .tiptap-full-renderer .ProseMirror { font-size: 16px; line-height: 1.68; }
  .fd-read .fd-sol .tiptap-full-renderer .ProseMirror { font-size: 15px; }
  .fd-read .tiptap-full-renderer .katex { font-size: 1.06em; }
  .fd-lesson .tiptap-full-renderer .ProseMirror { font-size: 16.5px; line-height: 1.58; }
  .fd-lesson .tiptap-full-renderer .katex { font-size: 1.05em; }
  .fd-lesson-h2 { font-size: 20px; }
  .fd-lesson-h3 { font-size: 17px; }
  .fd-lesson-sub { margin-left: 6px; }
  .fd-lesson .tiptap-full-renderer [data-callout-type] { padding: 9px 12px 10px; margin: 12px 0; }
}

@media print {
  .fd-lesson .tiptap-full-renderer [data-callout-type] { break-inside: avoid; }
}
`;

/** Styles de lecture, une fois par page. */
export const ReadingStyles: React.FC = () => <style>{CSS}</style>;

export default ReadingStyles;
