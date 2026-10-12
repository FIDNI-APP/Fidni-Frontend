/**
 * Styles de la feuille FIDNI (12/10/2026), communs à l'aperçu PDF (PaperExport), à l'écriture d'un
 * contenu sur la feuille (assistant « Ajouter un contenu ») et à l'éditeur de documents.
 *
 * Tout dépend de trois réglages, posés sur l'élément qui porte la classe `fp-content` :
 *   --fp-fs  taille du texte (11pt par défaut)
 *   --fp-lh  interligne (1.5)
 *   --fp-sp  facteur des espacements verticaux (1)
 * « Tenir sur une page » resserre ces réglages (et les marges) palier par palier : DENSITIES.
 */
import { PAPER_GLYPHS_FACE, PAPER_SERIF } from '@/lib/paperFont';
import type { PageGeometry } from './paginate';

export interface Density {
  label: string;
  fs: number;
  lh: number;
  sp: number;
  /** Marges de la page (mm). */
  margins: { top: number; right: number; bottom: number; left: number };
}

/** Du plus aéré au plus serré ; on ne descend jamais sous 9 pt (lisible imprimé). */
export const DENSITIES: Density[] = [
  { label: 'Normale', fs: 11, lh: 1.5, sp: 1, margins: { top: 15, right: 16, bottom: 17, left: 16 } },
  { label: 'Aérée -', fs: 11, lh: 1.42, sp: 0.75, margins: { top: 14, right: 15, bottom: 15, left: 15 } },
  { label: 'Compacte', fs: 10.5, lh: 1.38, sp: 0.6, margins: { top: 12, right: 13, bottom: 14, left: 13 } },
  { label: 'Serrée', fs: 10, lh: 1.34, sp: 0.5, margins: { top: 11, right: 12, bottom: 13, left: 12 } },
  { label: 'Très serrée', fs: 9.5, lh: 1.3, sp: 0.4, margins: { top: 10, right: 11, bottom: 12, left: 11 } },
  { label: 'Minimale', fs: 9, lh: 1.27, sp: 0.32, margins: { top: 9, right: 10, bottom: 11, left: 10 } },
];

export const densityVars = (d: Density) => ({
  '--fp-fs': `${d.fs}pt`,
  '--fp-lh': String(d.lh),
  '--fp-sp': String(d.sp),
}) as React.CSSProperties;

export const geometryOf = (d: Density, base: { width: number; height: number }): PageGeometry => ({
  width: base.width, height: base.height, ...d.margins,
});

/** Taille relative au texte de la feuille (évite les em composés). */
const f = (k: number) => `calc(var(--fp-fs, 11pt) * ${k})`;
/** Espacement vertical (pt) multiplié par le réglage de densité. */
const s = (pt: number) => `calc(${pt}pt * var(--fp-sp, 1))`;

/** Contenu de la feuille (sans la page) : en-tête, exercices, leçons, corrigé, contenu riche. */
export const SHEET_CONTENT_CSS = `
  ${PAPER_GLYPHS_FACE}
  .fp-content { color: #1a1a1a; font-family: ${PAPER_SERIF}; font-size: var(--fp-fs, 11pt); line-height: var(--fp-lh, 1.5);
    -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .fp-blk { display: flow-root; }

  .fp-top { display: flex; justify-content: space-between; align-items: center; gap: 12px;
    padding-bottom: ${s(8)}; border-bottom: 1.2pt solid #1a1a1a; font-family: 'DM Sans', system-ui, sans-serif; }
  .fp-brand { display: flex; align-items: center; gap: 8px; }
  .fp-brand img { width: 26px; height: 26px; border-radius: 6px; }
  .fp-brand strong { display: block; font-size: ${f(1.09)}; line-height: 1.1; }
  .fp-brand small, .fp-top-right small { display: block; font-size: ${f(0.773)}; color: #6b6862; }
  .fp-top-right { text-align: right; font-size: ${f(0.909)}; line-height: 1.3; }
  .fp-top-right strong { color: #1a7a4a; font-weight: 700; }

  .fp-info { display: flex; justify-content: space-between; gap: 16pt; padding: ${s(6)} 0 0;
    font-family: 'DM Sans', system-ui, sans-serif; font-size: ${f(0.864)}; line-height: 1.45; color: #1a1a1a; }
  .fp-info p { margin: 0; }
  .fp-info b { font-weight: 600; color: #6b6862; }
  .fp-info-right { text-align: right; }
  .fp-instructions { margin: 0 0 ${s(10)}; padding: ${s(5)} 9pt; border: 0.6pt solid #cfcdc8; border-radius: 3pt;
    font-size: ${f(0.909)}; font-style: italic; }
  .fp-instructions b { font-style: normal; }
  .fp-title { text-align: center; font-size: ${f(1.545)}; font-weight: 700; line-height: 1.25; margin: ${s(14)} 0 ${s(3)}; }
  .fp-desc { text-align: center; font-style: italic; color: #33302b; margin: 0 0 ${s(3)}; }
  .fp-facts { text-align: center; font-family: 'DM Sans', system-ui, sans-serif; font-size: ${f(0.773)};
    color: #6b6862; margin: 0 0 ${s(12)}; white-space: pre-wrap; }
  .fp-student { display: flex; gap: 18pt; font-size: ${f(0.909)}; padding: ${s(6)} 0 ${s(10)}; border-bottom: 0.6pt solid #cfcdc8;
    margin-bottom: ${s(4)}; }
  .fp-student span { display: flex; align-items: baseline; gap: 4pt; white-space: nowrap; }
  .fp-student span:first-child { flex: 1; }
  .fp-student i { flex: 1; min-width: 60pt; border-bottom: 0.8pt dotted #9a958c; transform: translateY(-2pt); }

  .fp-ex-head { display: flex; align-items: baseline; gap: 8pt; padding-bottom: ${s(3)}; margin: ${s(14)} 0 ${s(6)};
    border-bottom: 0.6pt solid #cfcdc8; }
  .fp-ex-label { font-family: 'DM Sans', system-ui, sans-serif; font-size: ${f(0.864)}; font-weight: 700;
    letter-spacing: .06em; text-transform: uppercase; color: #fff; background: #1a7a4a;
    padding: 1.5pt 6pt; border-radius: 3pt; white-space: nowrap; }
  .fp-ex-title { font-weight: 700; font-size: ${f(1.045)}; flex: 1; }
  .fp-ex-pts { font-family: 'DM Sans', system-ui, sans-serif; font-size: ${f(0.818)}; color: #33302b; white-space: nowrap; }
  .fp-ex-meta { font-family: 'DM Sans', system-ui, sans-serif; font-size: ${f(0.773)}; color: #6b6862; margin: ${s(-3)} 0 ${s(6)}; }

  .fp-context { margin-bottom: ${s(6)}; }
  .fp-part { display: flex; justify-content: space-between; align-items: baseline; gap: 8pt; font-weight: 700; margin: ${s(10)} 0 ${s(4)}; }
  .fp-part p { margin: 0; }
  .fp-q { display: grid; grid-template-columns: 7mm minmax(0, 1fr) auto; column-gap: 2mm; align-items: baseline;
    margin-bottom: ${s(2)}; }
  .fp-q-last { margin-bottom: ${s(7)}; }
  .fp-sq { margin-left: 7mm; grid-template-columns: 6mm minmax(0, 1fr) auto; }
  .fp-num { font-weight: 700; }
  .fp-pts { font-family: 'DM Sans', system-ui, sans-serif; font-size: ${f(0.773)}; color: #6b6862; white-space: nowrap; }
  .fp-sq-sol { margin-left: 15mm; }

  .fp-sol { margin: ${s(3)} 0 ${s(6)} 9mm; padding: ${s(4)} 8pt; border-left: 2pt solid #1a7a4a; background: #f3f8f5;
    font-size: ${f(0.909)}; }
  .fp-sq-sol .fp-sol { margin-left: 0; }
  .fp-sol-label { display: block; font-family: 'DM Sans', system-ui, sans-serif; font-size: ${f(0.682)}; font-weight: 700;
    letter-spacing: .08em; text-transform: uppercase; color: #15633c; margin-bottom: 1pt; }

  .fp-key-title { text-align: center; font-size: ${f(1.364)}; font-weight: 700; padding-bottom: ${s(6)}; margin: 0 0 ${s(8)};
    border-bottom: 1.2pt solid #1a1a1a; }
  .fp-key-ex-title { font-family: 'DM Sans', system-ui, sans-serif; font-size: ${f(0.909)}; font-weight: 700; color: #1a7a4a;
    margin: ${s(8)} 0 ${s(4)}; }
  .fp-key-ex-title span { color: #33302b; font-weight: 500; }
  .fp-key-q { grid-template-columns: 10mm minmax(0, 1fr) 0; }

  .fp-empty { color: #6b6862; font-style: italic; margin: ${s(12)} 0; }

  /* Leçons et cahiers */
  .fp-chap { margin: ${s(14)} 0 ${s(8)}; padding: ${s(8)} 0 ${s(5)}; border-bottom: 1.2pt solid #1a1a1a; font-size: ${f(1.364)}; font-weight: 700; }
  .fp-chap span { display: block; font-family: 'DM Sans', system-ui, sans-serif; font-size: ${f(0.773)}; font-weight: 700;
    letter-spacing: .1em; text-transform: uppercase; color: #9a6e1c; }
  .fp-l-h2 { font-size: ${f(1.18)}; font-weight: 700; margin: ${s(12)} 0 ${s(5)}; }
  .fp-l-h2 span, .fp-l-h3 span { color: #1a7a4a; }
  .fp-l-h3 { font-size: ${f(1.045)}; font-weight: 700; margin: ${s(8)} 0 ${s(4)}; }
  .fp-l-indent { margin-left: 3mm; }
  .fp-notes { margin: ${s(10)} 0 ${s(4)}; padding: ${s(5)} 9pt; border: 0.6pt dashed #cfcdc8; border-radius: 3pt; font-size: ${f(0.909)}; }

  /* Contenu riche (HTML des exercices, rendu KaTeX) */
  .fp-rich [data-callout-type] { border: 0.6pt solid #e2ded6 !important; border-left: 2.4pt solid #1a7a4a !important;
    border-radius: 3pt; padding: ${s(5)} 9pt !important; margin: ${s(6)} 0 !important; background: #fbfaf8 !important; color: inherit !important; }
  .fp-rich [data-callout-type="theorem"], .fp-rich [data-callout-type="property"], .fp-rich [data-callout-type="corollary"],
  .fp-rich [data-callout-type="lemma"] { border-left-color: #c0892f !important; }
  .fp-rich [data-callout-type="remark"], .fp-rich [data-callout-type="example"], .fp-rich [data-callout-type="proof"] { border-left-color: #9a958c !important; }
  .fp-rich [data-callout-type="warning"] { border-left-color: #a23b34 !important; }
  .fp-rich .callout-head { display: flex; gap: 5pt; align-items: baseline; margin-bottom: 2pt; }
  .fp-rich .callout-kind { font-family: 'DM Sans', system-ui, sans-serif; font-size: ${f(0.727)}; font-weight: 700; letter-spacing: .08em;
    text-transform: uppercase; color: #15633c; }
  .fp-rich [data-callout-type="theorem"] .callout-kind, .fp-rich [data-callout-type="property"] .callout-kind { color: #9a6e1c; }
  .fp-rich .callout-name { font-weight: 700; font-size: ${f(0.955)}; }
  .fp-rich p { margin: 0 0 ${s(3)}; }
  .fp-rich > :last-child, .fp-rich p:last-child { margin-bottom: 0; }
  .fp-rich ul { list-style: disc; padding-left: 16pt; margin: ${s(2)} 0 ${s(4)}; }
  .fp-rich ol { list-style: decimal; padding-left: 16pt; margin: ${s(2)} 0 ${s(4)}; }
  .fp-rich h1, .fp-rich h2, .fp-rich h3 { font-size: ${f(1.045)}; font-weight: 700; margin: ${s(4)} 0; }
  .fp-rich img { display: block; max-width: 100%; max-height: 85mm; margin: ${s(6)} auto; }
  .fp-rich .math-display { display: block; text-align: center; margin: ${s(5)} 0; overflow-x: auto; overflow-y: hidden; }
  .fp-rich .math-inline { display: inline; }
  .fp-rich .katex { font-size: 1.08em; }
  .fp-rich .math-error { color: #b42318; font-family: monospace; font-size: .9em; }
  .fp-rich table { border-collapse: collapse; margin: ${s(4)} auto; }
  .fp-rich td, .fp-rich th { border: 0.6pt solid #9a958c; padding: ${s(2)} 6pt; }
`;

/** Les pages : feuilles A4 posées sur le bureau à l'écran, une feuille = une page à l'impression. */
export const SHEET_PAGES_CSS = `
  .fp-pages { display: flex; flex-direction: column; align-items: center; gap: 18px; }
  .fp-page { position: relative; box-sizing: border-box; flex-shrink: 0; background: #fff; overflow: hidden;
    box-shadow: 0 1px 3px rgba(0,0,0,.08), 0 8px 24px rgba(0,0,0,.06); }
  .fp-page-foot { position: absolute; display: flex; justify-content: space-between; gap: 12px;
    font-family: 'DM Sans', sans-serif; font-size: 8pt; color: #9a958c; white-space: nowrap; }
  .fp-page-foot span:first-child { overflow: hidden; text-overflow: ellipsis; }
  .fp-measure { position: absolute; left: -10000px; top: 0; visibility: hidden; pointer-events: none; }
  @page { size: A4; margin: 0; }
  @media print {
    .fp-pages { display: block; zoom: 1 !important; }
    .fp-page { box-shadow: none; margin: 0; break-after: page; page-break-after: always; }
    .fp-page:last-child { break-after: auto; page-break-after: auto; }
    .fp-measure { display: none; }
    .fp-rich .math-display { overflow: visible; }
  }
`;
