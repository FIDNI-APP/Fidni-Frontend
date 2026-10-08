// ============================================
// FILE: editor/editorConfig.ts
// ============================================

export interface MathFormula {
  name: string;
  latex: string;
  description?: string;
}

export interface FormulaCategory {
  name: string;
  formulas: MathFormula[];
}

export interface EditorTheme {
  name: string;
  bgColor: string;
  textColor: string;
  accentColor: string;
}

// Page dimensions (A4 at 96 DPI)
export const PAGE_CONFIG = {
  width: 690,
  height: 900,
  marginTop: 60,
  marginBottom: 60,
  marginLeft: 70,
  marginRight: 70,
  get contentWidth() {
    return this.width - this.marginLeft - this.marginRight;
  },
  get contentHeight() {
    return this.height - this.marginTop - this.marginBottom;
  },
};

export const colorOptions = [
  "#000000", "#e60000", "#ff9900", "#ffff00",
  "#008a00", "#0066cc", "#9933ff", "#ff0066",
  "#555555", "#ff6600", "#99cc00", "#00ccff",
  "#993366", "#c0c0c0", "#ff99cc", "#ffcc00"
];

// Modèles du programme de lycée (Maroc) : insérés dans le champ « Formule », à compléter (08/10/2026).
export const mathFormulaCategories: FormulaCategory[] = [
  {
    name: "Limites et dérivées",
    formulas: [
      { name: "Limite en +∞", latex: "\\lim_{x \\to +\\infty} f(x)" },
      { name: "Limite en a", latex: "\\lim_{x \\to a} f(x)" },
      { name: "Nombre dérivé", latex: "\\lim_{h \\to 0} \\frac{f(a+h)-f(a)}{h}" },
      { name: "Dérivée", latex: "f'(x)" },
      { name: "Dérivée d'un quotient", latex: "\\left(\\frac{u}{v}\\right)' = \\frac{u'v - uv'}{v^2}" },
      { name: "Composée", latex: "(g \\circ f)'(x) = f'(x)\\,g'(f(x))" },
    ],
  },
  {
    name: "Suites",
    formulas: [
      { name: "Suite", latex: "(u_n)_{n \\in \\mathbb{N}}" },
      { name: "Récurrence", latex: "u_{n+1} = f(u_n)" },
      { name: "Arithmétique", latex: "u_n = u_0 + nr" },
      { name: "Géométrique", latex: "u_n = u_0\\, q^n" },
      { name: "Somme géométrique", latex: "\\sum_{k=0}^{n} q^k = \\frac{1-q^{n+1}}{1-q}" },
      { name: "Limite d'une suite", latex: "\\lim_{n \\to +\\infty} u_n = \\ell" },
    ],
  },
  {
    name: "Intégrales",
    formulas: [
      { name: "Intégrale", latex: "\\int_{a}^{b} f(x)\\,dx" },
      { name: "Primitive", latex: "\\left[F(x)\\right]_{a}^{b} = F(b) - F(a)" },
      { name: "Intégration par parties", latex: "\\int_{a}^{b} u'v\\,dx = \\left[uv\\right]_{a}^{b} - \\int_{a}^{b} uv'\\,dx" },
      { name: "Valeur moyenne", latex: "\\frac{1}{b-a}\\int_{a}^{b} f(x)\\,dx" },
    ],
  },
  {
    name: "ln et exp",
    formulas: [
      { name: "Logarithme", latex: "\\ln(x)" },
      { name: "Exponentielle", latex: "e^{x}" },
      { name: "ln d'un produit", latex: "\\ln(ab) = \\ln a + \\ln b" },
      { name: "Croissance comparée (ln)", latex: "\\lim_{x \\to +\\infty} \\frac{\\ln x}{x} = 0" },
      { name: "Croissance comparée (exp)", latex: "\\lim_{x \\to +\\infty} \\frac{e^{x}}{x} = +\\infty" },
      { name: "Logarithme de base a", latex: "\\log_{a}(x) = \\frac{\\ln x}{\\ln a}" },
    ],
  },
  {
    name: "Complexes",
    formulas: [
      { name: "Forme algébrique", latex: "z = a + ib" },
      { name: "Conjugué", latex: "\\overline{z} = a - ib" },
      { name: "Module", latex: "|z| = \\sqrt{a^2 + b^2}" },
      { name: "Forme exponentielle", latex: "z = r\\,e^{i\\theta}" },
      { name: "Moivre", latex: "(\\cos\\theta + i\\sin\\theta)^n = \\cos(n\\theta) + i\\sin(n\\theta)" },
    ],
  },
  {
    name: "Ensembles et logique",
    formulas: [
      { name: "Appartient à ℝ", latex: "x \\in \\mathbb{R}" },
      { name: "Pour tout", latex: "\\forall x \\in \\mathbb{R}" },
      { name: "Il existe", latex: "\\exists n \\in \\mathbb{N}" },
      { name: "Implication", latex: "P \\Rightarrow Q" },
      { name: "Équivalence", latex: "P \\Leftrightarrow Q" },
      { name: "Intervalle", latex: "]a\\,;\\,b[" },
    ],
  },
  {
    name: "Algèbre",
    formulas: [
      { name: "Fraction", latex: "\\frac{a}{b}" },
      { name: "Racine n-ième", latex: "\\sqrt[n]{x}" },
      { name: "Discriminant", latex: "\\Delta = b^2 - 4ac" },
      { name: "Racines du trinôme", latex: "x = \\frac{-b \\pm \\sqrt{\\Delta}}{2a}" },
      { name: "Identité remarquable", latex: "(a+b)^2 = a^2 + 2ab + b^2" },
      { name: "Système", latex: "\\begin{cases} ax + by = c \\\\ a'x + b'y = c' \\end{cases}" },
    ],
  },
];

export interface MathSymbol {
  latex: string;
  label: string;
  display: string;
  /** Morceau sélectionné après l'insertion (on tape directement par-dessus) ; remplacé par le texte
   *  sélectionné dans le champ s'il y en a un (sélectionner `3x+1` puis √ donne `\sqrt{3x+1}`). */
  select?: string;
  /** Bouton dessiné par KaTeX (caractères que les polices n'ont pas : flèche de vecteur…). */
  preview?: string;
}

// Palette du panneau « Formule » : insérés au curseur du champ LaTeX (08/10/2026).
export const mathSymbolGroups: { name: string; symbols: MathSymbol[] }[] = [
  {
    name: 'Courants',
    symbols: [
      { latex: '^{2}', label: 'Puissance (tape la base avant)', display: 'x²', select: '2' },
      { latex: '_{n}', label: 'Indice (tape la lettre avant)', display: 'xₙ', select: 'n' },
      { latex: '\\frac{a}{b}', label: 'Fraction', display: 'a⁄b', select: 'a' },
      { latex: '\\sqrt{x}', label: 'Racine carrée', display: '√x', select: 'x' },
      { latex: '\\left| x \\right|', label: 'Valeur absolue', display: '|x|', select: 'x' },
      { latex: '\\lim_{x \\to +\\infty}', label: 'Limite', display: 'lim' },
      { latex: '\\sum_{k=0}^{n}', label: 'Somme', display: 'Σ' },
      { latex: '\\int_{a}^{b}', label: 'Intégrale', display: '∫' },
      { latex: '\\infty', label: 'Infini', display: '∞' },
      { latex: '\\times', label: 'Multiplié par', display: '×' },
      { latex: '\\pm', label: 'Plus ou moins', display: '±' },
      { latex: '\\overrightarrow{AB}', label: 'Vecteur', display: 'AB', select: 'AB', preview: '\\overrightarrow{AB}' },
      { latex: '\\overline{z}', label: 'Conjugué', display: 'z', select: 'z', preview: '\\overline{z}' },
    ],
  },
  {
    name: 'Relations',
    symbols: [
      { latex: '\\leq', label: 'Inférieur ou égal', display: '≤' },
      { latex: '\\geq', label: 'Supérieur ou égal', display: '≥' },
      { latex: '\\neq', label: 'Différent', display: '≠' },
      { latex: '\\approx', label: 'Environ égal', display: '≈' },
      { latex: '\\to', label: 'Tend vers', display: '→' },
      { latex: '\\Rightarrow', label: 'Implique', display: '⇒' },
      { latex: '\\Leftrightarrow', label: 'Équivaut à', display: '⇔' },
      { latex: '\\forall', label: 'Pour tout', display: '∀' },
      { latex: '\\exists', label: 'Il existe', display: '∃' },
      { latex: '\\in', label: 'Appartient à', display: '∈' },
      { latex: '\\notin', label: 'N’appartient pas à', display: '∉' },
      { latex: '\\subset', label: 'Inclus dans', display: '⊂' },
    ],
  },
  {
    name: 'Ensembles',
    symbols: [
      { latex: '\\mathbb{N}', label: 'Entiers naturels', display: 'ℕ' },
      { latex: '\\mathbb{Z}', label: 'Entiers relatifs', display: 'ℤ' },
      { latex: '\\mathbb{Q}', label: 'Rationnels', display: 'ℚ' },
      { latex: '\\mathbb{R}', label: 'Réels', display: 'ℝ' },
      { latex: '\\mathbb{C}', label: 'Complexes', display: 'ℂ' },
      { latex: '\\mathbb{R}^{*}', label: 'Réels non nuls', display: 'ℝ*' },
      { latex: '[a\\,;\\,b]', label: 'Intervalle fermé', display: '[a;b]', select: 'a' },
      { latex: ']a\\,;\\,b[', label: 'Intervalle ouvert', display: ']a;b[', select: 'a' },
      { latex: '\\cup', label: 'Union', display: '∪' },
      { latex: '\\cap', label: 'Intersection', display: '∩' },
      { latex: '\\emptyset', label: 'Ensemble vide', display: '∅' },
      { latex: '\\circ', label: 'Composée', display: '∘' },
    ],
  },
  {
    name: 'Grec',
    symbols: [
      { latex: '\\alpha', label: 'Alpha', display: 'α' },
      { latex: '\\beta', label: 'Bêta', display: 'β' },
      { latex: '\\gamma', label: 'Gamma', display: 'γ' },
      { latex: '\\delta', label: 'Delta', display: 'δ' },
      { latex: '\\Delta', label: 'Delta majuscule', display: 'Δ' },
      { latex: '\\varepsilon', label: 'Epsilon', display: 'ε' },
      { latex: '\\theta', label: 'Thêta', display: 'θ' },
      { latex: '\\lambda', label: 'Lambda', display: 'λ' },
      { latex: '\\mu', label: 'Mu', display: 'μ' },
      { latex: '\\pi', label: 'Pi', display: 'π' },
      { latex: '\\sigma', label: 'Sigma', display: 'σ' },
      { latex: '\\varphi', label: 'Phi', display: 'φ' },
      { latex: '\\omega', label: 'Oméga', display: 'ω' },
    ],
  },
];

// Ancienne liste (éditeur A4 TipTapEditor) : les symboles courants.
export const mathSymbols = mathSymbolGroups[0].symbols.map((s) => ({ ...s, latex: s.latex.replace(/^([\^_])/, 'x$1') }));
