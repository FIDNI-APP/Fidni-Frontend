// Types
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

export interface SubFormula {
  category: string;
  items: {
    latex: string;
    description: string;
  }[];
}

// Constants
export const colorOptions = [
  "#000000", "#e60000", "#ff9900", "#ffff00",
  "#008a00", "#0066cc", "#9933ff", "#ff0066",
  "#555555", "#ff6600", "#99cc00", "#00ccff",
  "#993366", "#c0c0c0", "#ff99cc", "#ffcc00"
];

export const editorThemes: EditorTheme[] = [
  { name: "Classique", bgColor: "bg-white", textColor: "text-gray-800", accentColor: "from-indigo-500 to-purple-600" },
  { name: "Sombre", bgColor: "bg-gray-900", textColor: "text-gray-100", accentColor: "from-purple-500 to-indigo-600" },
  { name: "Pastel", bgColor: "bg-blue-50", textColor: "text-gray-800", accentColor: "from-blue-400 to-indigo-500" },
  { name: "Académique", bgColor: "bg-amber-50", textColor: "text-gray-800", accentColor: "from-amber-500 to-orange-500" },
  { name: "Minimaliste", bgColor: "bg-gray-50", textColor: "text-gray-800", accentColor: "from-gray-500 to-gray-600" }
];

export const mathFormulaCategories: FormulaCategory[] = [
  {
    name: "Algèbre",
    formulas: [
      { name: "Équation quadratique", latex: "x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}", description: "Solution de ax² + bx + c = 0" },
      { name: "Binôme de Newton", latex: "(x+y)^n = \\sum_{k=0}^{n} \\binom{n}{k} x^{n-k} y^k", description: "Développement du binôme" },
      { name: "Factorielle", latex: "n! = n \\cdot (n-1) \\cdot (n-2) \\cdot \\ldots \\cdot 2 \\cdot 1", description: "Produit des entiers de 1 à n" },
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
      { name: "Intégrale indéfinie", latex: "\\int f(x) \\, dx", description: "Intégrale indéfinie de f(x)" },
      { name: "Limite", latex: "\\lim_{x \\to a} f(x)", description: "Limite de f(x) quand x tend vers a" },
      { name: "Somme", latex: "\\sum_{i=1}^{n} a_i", description: "Somme des termes a_i de i=1 à n" },
      { name: "Produit", latex: "\\prod_{i=1}^{n} a_i", description: "Produit des termes a_i de i=1 à n" },
    ]
  },
  {
    name: "Trigonométrie",
    formulas: [
      { name: "Sinus", latex: "\\sin(\\theta)", description: "Sinus de l'angle θ" },
      { name: "Cosinus", latex: "\\cos(\\theta)", description: "Cosinus de l'angle θ" },
      { name: "Tangente", latex: "\\tan(\\theta)", description: "Tangente de l'angle θ" },
      { name: "Identité fondamentale", latex: "\\sin^2(\\theta) + \\cos^2(\\theta) = 1", description: "Relation entre sin² et cos²" },
      { name: "Loi des sinus", latex: "\\frac{a}{\\sin(A)} = \\frac{b}{\\sin(B)} = \\frac{c}{\\sin(C)}", description: "Pour un triangle quelconque" },
      { name: "Loi des cosinus", latex: "c^2 = a^2 + b^2 - 2ab\\cos(C)", description: "Généralisation du théorème de Pythagore" },
    ]
  },
  {
    name: "Matrices",
    formulas: [
      { name: "Matrice 2×2", latex: "\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}", description: "Matrice carrée d'ordre 2" },
      { name: "Déterminant", latex: "\\det(A) = |A|", description: "Déterminant de la matrice A" },
      { name: "Matrice inverse", latex: "A^{-1}", description: "Inverse de la matrice A" },
      { name: "Système d'équations", latex: "\\begin{cases} a_1x + b_1y = c_1 \\\\ a_2x + b_2y = c_2 \\end{cases}", description: "Système de deux équations à deux inconnues" },
    ]
  },
  {
    name: "Statistiques",
    formulas: [
      { name: "Espérance", latex: "E(X) = \\sum_{i} x_i p_i", description: "Espérance de la variable aléatoire X" },
      { name: "Variance", latex: "\\operatorname{Var}(X) = E[(X - \\mu)^2]", description: "Variance de la variable aléatoire X" },
      { name: "Loi normale", latex: "f(x) = \\frac{1}{\\sigma\\sqrt{2\\pi}} e^{-\\frac{1}{2}(\\frac{x-\\mu}{\\sigma})^2}", description: "Densité de probabilité de la loi normale" },
      { name: "Binomiale", latex: "P(X = k) = \\binom{n}{k} p^k (1-p)^{n-k}", description: "Probabilité d'obtenir k succès parmi n essais" },
    ]
  }
];

export const subFormulas: SubFormula[] = [
  { category: "Fractions", items: [
    { latex: "\\frac{a}{b}", description: "Fraction simple" },
    { latex: "\\frac{\\partial f}{\\partial x}", description: "Dérivée partielle" }
  ]},
  { category: "Exposants", items: [
    { latex: "x^{n}", description: "Exposant" },
    { latex: "x_{i}", description: "Indice" },
    { latex: "x_{i}^{j}", description: "Exposant et indice" }
  ]},
  { category: "Racines", items: [
    { latex: "\\sqrt{x}", description: "Racine carrée" },
    { latex: "\\sqrt[n]{x}", description: "Racine n-ième" }
  ]},
  { category: "Symboles", items: [
    { latex: "\\infty", description: "Infini" },
    { latex: "\\approx", description: "Approximativement égal" },
    { latex: "\\neq", description: "Différent" },
    { latex: "\\leq", description: "Inférieur ou égal" },
    { latex: "\\geq", description: "Supérieur ou égal" }
  ]},
  { category: "Fonctions", items: [
    { latex: "\\sin(x)", description: "Sinus" },
    { latex: "\\cos(x)", description: "Cosinus" },
    { latex: "\\lim_{x \\to a}", description: "Limite" },
    { latex: "\\int_{a}^{b}", description: "Intégrale" }
  ]}
];