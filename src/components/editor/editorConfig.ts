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

export const editorThemes: EditorTheme[] = [
  { name: "Classique", bgColor: "bg-white", textColor: "text-gray-800", accentColor: "from-gray-800 to-gray-900" },
  { name: "Pastel", bgColor: "bg-blue-50", textColor: "text-gray-800", accentColor: "from-blue-400 to-indigo-500" },
  { name: "Académique", bgColor: "bg-amber-50", textColor: "text-gray-800", accentColor: "from-amber-500 to-orange-500" },
];

export const mathFormulaCategories: FormulaCategory[] = [
  {
    name: "Algèbre",
    formulas: [
      { name: "Équation quadratique", latex: "x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}", description: "Solution de ax² + bx + c = 0" },
      { name: "Binôme de Newton", latex: "(x+y)^n = \\sum_{k=0}^{n} \\binom{n}{k} x^{n-k} y^k", description: "Développement du binôme" },
      { name: "Fraction", latex: "\\frac{a}{b}", description: "Division de a par b" },
      { name: "Racine carrée", latex: "\\sqrt{x}", description: "Racine carrée de x" },
      { name: "Racine n-ième", latex: "\\sqrt[n]{x}", description: "Racine n-ième de x" },
    ]
  },
  {
    name: "Calcul",
    formulas: [
      { name: "Dérivée", latex: "\\frac{d}{dx}f(x)", description: "Dérivée de f(x) par rapport à x" },
      { name: "Intégrale définie", latex: "\\int_{a}^{b} f(x) \\, dx", description: "Intégrale de f(x) de a à b" },
      { name: "Limite", latex: "\\lim_{x \\to a} f(x)", description: "Limite de f(x) quand x tend vers a" },
      { name: "Somme", latex: "\\sum_{i=1}^{n} a_i", description: "Somme des termes" },
    ]
  },
  {
    name: "Trigonométrie",
    formulas: [
      { name: "Identité fondamentale", latex: "\\sin^2(\\theta) + \\cos^2(\\theta) = 1", description: "Relation entre sin² et cos²" },
      { name: "Loi des sinus", latex: "\\frac{a}{\\sin(A)} = \\frac{b}{\\sin(B)} = \\frac{c}{\\sin(C)}", description: "Pour un triangle quelconque" },
      { name: "Loi des cosinus", latex: "c^2 = a^2 + b^2 - 2ab\\cos(C)", description: "Généralisation de Pythagore" },
    ]
  },
  {
    name: "Matrices",
    formulas: [
      { name: "Matrice 2×2", latex: "\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}", description: "Matrice carrée d'ordre 2" },
      { name: "Système d'équations", latex: "\\begin{cases} a_1x + b_1y = c_1 \\\\ a_2x + b_2y = c_2 \\end{cases}", description: "Système de deux équations" },
    ]
  },
];

// Common math symbols for quick insertion
export const mathSymbols = [
  { latex: 'x^{2}', label: 'Puissance', display: 'x²' },
  { latex: '\\frac{a}{b}', label: 'Fraction', display: 'a/b' },
  { latex: '\\sqrt{x}', label: 'Racine', display: '√' },
  { latex: '\\sum', label: 'Somme', display: 'Σ' },
  { latex: '\\int', label: 'Intégrale', display: '∫' },
  { latex: '\\lim', label: 'Limite', display: 'lim' },
  { latex: '\\alpha', label: 'Alpha', display: 'α' },
  { latex: '\\beta', label: 'Beta', display: 'β' },
  { latex: '\\pi', label: 'Pi', display: 'π' },
  { latex: '\\theta', label: 'Theta', display: 'θ' },
  { latex: '\\infty', label: 'Infini', display: '∞' },
  { latex: '\\leq', label: 'Inférieur ou égal', display: '≤' },
  { latex: '\\geq', label: 'Supérieur ou égal', display: '≥' },
  { latex: '\\neq', label: 'Différent', display: '≠' },
  { latex: '\\times', label: 'Multiplication', display: '×' },
  { latex: '\\pm', label: 'Plus ou moins', display: '±' },
];