/**
 * Confort de lecture de la page d'un contenu (refonte du 11/10/2026) : taille et interligne du texte,
 * formules KaTeX à la taille du texte (par défaut, KaTeX les grossit à 1,21 em : elles dépassaient),
 * espace entre les paragraphes, encadrés des leçons. Limité aux zones `.fd-read` (énoncés, solutions)
 * et `.fd-lesson` (leçon) : les cartes des listes et les aperçus gardent leur rendu.
 */
import React from 'react';

const CSS = `
.fd-read .tiptap-full-renderer .ProseMirror { font-size: 16.5px; line-height: 1.72; color: #1a1a1a; }
.fd-read .tiptap-full-renderer .ProseMirror p { margin-bottom: .55em; }
.fd-read .tiptap-full-renderer .ProseMirror > div > :last-child { margin-bottom: 0; }
.fd-read .tiptap-full-renderer .ProseMirror li { margin-bottom: .2em; }
.fd-read .tiptap-full-renderer .katex { font-size: 1.1em; }
.fd-read .tiptap-full-renderer .math-display { margin: .7em 0; }
.fd-read .fd-sol .tiptap-full-renderer .ProseMirror { font-size: 15.5px; line-height: 1.7; color: #33302b; }
.fd-read .fd-sol .tiptap-full-renderer .ProseMirror strong { color: #1a1a1a; }

.fd-lesson .tiptap-full-renderer .ProseMirror { font-size: 16.5px; line-height: 1.75; color: #1a1a1a; }
.fd-lesson .tiptap-full-renderer .ProseMirror p { margin-bottom: .7em; }
.fd-lesson .tiptap-full-renderer .ProseMirror > div > :last-child { margin-bottom: 0; }
.fd-lesson .tiptap-full-renderer .ProseMirror li { margin-bottom: .25em; }
.fd-lesson .tiptap-full-renderer .katex { font-size: 1.1em; }
.fd-lesson .tiptap-full-renderer .math-display { margin: .8em 0; }
.fd-lesson .tiptap-full-renderer [data-callout-type] {
  margin: 20px 0; padding: 14px 18px 15px; border-radius: 14px;
  border: 1px solid #e7e3dc; border-left-width: 4px; background: #fff;
}
.fd-lesson .tiptap-full-renderer .callout-head { margin-bottom: 8px; gap: 2px 10px; }
.fd-lesson .tiptap-full-renderer .callout-kind { font: 700 11px/1.5 'DM Sans', system-ui, sans-serif; letter-spacing: .1em; }
.fd-lesson .tiptap-full-renderer .callout-name { font-size: 15px; }
.fd-lesson .tiptap-full-renderer [data-callout-type="definition"] { background: #faf9f7; border-left-color: #1a1a1a; }
.fd-lesson .tiptap-full-renderer [data-callout-type="theorem"],
.fd-lesson .tiptap-full-renderer [data-callout-type="property"],
.fd-lesson .tiptap-full-renderer [data-callout-type="corollary"],
.fd-lesson .tiptap-full-renderer [data-callout-type="lemma"] { background: #f3f8f5; border-color: #d7eadf; border-left-color: #1a7a4a; }
.fd-lesson .tiptap-full-renderer [data-callout-type="example"],
.fd-lesson .tiptap-full-renderer [data-callout-type="method"] { background: #fcf8f1; border-color: #efe3c8; border-left-color: #c0892f; }
.fd-lesson .tiptap-full-renderer [data-callout-type="remark"],
.fd-lesson .tiptap-full-renderer [data-callout-type="proof"] { background: #fff; border-left-color: #b8b4ac; }
.fd-lesson .tiptap-full-renderer [data-callout-type="warning"] { background: #fcf4f2; border-color: #f1d9d5; border-left-color: #a23b34; }

@media (max-width: 640px) {
  .fd-read .tiptap-full-renderer .ProseMirror,
  .fd-lesson .tiptap-full-renderer .ProseMirror { font-size: 16px; line-height: 1.68; }
  .fd-read .fd-sol .tiptap-full-renderer .ProseMirror { font-size: 15px; }
  .fd-read .tiptap-full-renderer .katex,
  .fd-lesson .tiptap-full-renderer .katex { font-size: 1.06em; }
  .fd-lesson .tiptap-full-renderer [data-callout-type] { padding: 12px 14px 13px; margin: 16px 0; border-radius: 12px; }
}

@media print {
  .fd-lesson .tiptap-full-renderer [data-callout-type] { break-inside: avoid; }
}
`;

/** Styles de lecture, une fois par page. */
export const ReadingStyles: React.FC = () => <style>{CSS}</style>;

export default ReadingStyles;
