/**
 * Police des feuilles imprimées (PDF : PaperExport) et de la leçon à l'écran (LessonReader) : celle de
 * LaTeX (Computer Modern, servie par KaTeX sous le nom KaTeX_Main, déjà chargée pour les formules).
 * KaTeX_Main dessine mal °, « », № et € : ces seuls caractères viennent d'une serif classique.
 */
export const PAPER_SERIF = "'FidniPaperGlyphs', 'KaTeX_Main', 'Latin Modern Roman', 'Times New Roman', serif";

export const PAPER_GLYPHS_FACE = `@font-face { font-family: 'FidniPaperGlyphs'; src: local('Times New Roman'), local('Georgia'), local('Noto Serif'),
    local('DejaVu Serif'); unicode-range: U+00AB, U+00B0, U+00BB, U+2116, U+20AC; }`;

/** Numéros des parties d'une leçon : I, II, III… (sous-parties : 1, 2, 3…). */
export const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX'];
