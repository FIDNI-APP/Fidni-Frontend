/**
 * Galeries de l'onglet « Équation » (12/10/2026), portées de wordcraft (`crates/engine/src/math_gallery.rs`) :
 * structures (fractions, scripts, radicaux, intégrales, grands opérateurs, crochets, fonctions, accents,
 * limites et logarithmes, opérateurs, matrices), jeux de symboles et équations prêtes.
 *
 * Comme dans wordcraft, `⬚` marque une case vide. Les modèles sont écrits en LaTeX (le format que FIDNI
 * enregistre) : `forEditing` en fait des `\placeholder{}` de MathLive (on passe d'une case à l'autre avec
 * Tab), `forPreview` des carrés gris pour les vignettes KaTeX. Ajouts propres au programme marocain :
 * intervalles à la française (`]a;b[`, `⟦1;n⟧`), vecteurs, limites en ±∞.
 */

export interface MathTemplate {
  id: string;
  label: string;
  /** LaTeX ; `⬚` = case vide. */
  tex: string;
}

export interface MathGallery {
  id: string;
  label: string;
  /** Ce que montre le bouton du ruban (LaTeX sans cases vides). */
  picture: string;
  sections: { name: string; templates: MathTemplate[] }[];
}

const t = (id: string, label: string, tex: string): MathTemplate => ({ id, label, tex });

/** Opérateurs « n-aires » : simple, bornes à côté (\nolimits), bornes dessus-dessous (\limits), borne du bas. */
const nary = (id: string, name: string, cmd: string): MathTemplate[] => [
  t(`nary.${id}`, name, `${cmd} ⬚`),
  t(`nary.${id}Limits`, `${name} avec bornes`, `${cmd}\\limits_{⬚}^{⬚}⬚`),
  t(`nary.${id}Scripts`, `${name} avec bornes en indice et exposant`, `${cmd}\\nolimits_{⬚}^{⬚}⬚`),
  t(`nary.${id}Lower`, `${name} avec borne inférieure`, `${cmd}\\limits_{⬚}⬚`),
];
const integral = (id: string, name: string, cmd: string): MathTemplate[] => [
  t(`int.${id}`, name, `${cmd} ⬚`),
  t(`int.${id}Limits`, `${name} avec bornes`, `${cmd}_{⬚}^{⬚}⬚`),
  t(`int.${id}Stacked`, `${name} avec bornes empilées`, `${cmd}\\limits_{⬚}^{⬚}⬚`),
];

export const STRUCTURES: MathGallery[] = [
  {
    id: 'fraction', label: 'Fraction', picture: '\\frac{x}{y}',
    sections: [
      { name: 'Fraction', templates: [
        t('frac.stacked', 'Fraction', '\\frac{⬚}{⬚}'),
        t('frac.skewed', 'Fraction en biais', '{}^{⬚}\\!/{}_{⬚}'),
        t('frac.linear', 'Fraction sur une ligne', '⬚/⬚'),
        t('frac.nobar', 'Empilement sans barre', '\\genfrac{}{}{0pt}{}{⬚}{⬚}'),
      ] },
      { name: 'Fractions courantes', templates: [
        t('frac.dydx', 'Différentielle', '\\frac{\\mathrm{d}y}{\\mathrm{d}x}'),
        t('frac.DyDx', 'Taux d’accroissement', '\\frac{\\Delta y}{\\Delta x}'),
        t('frac.partial', 'Dérivée partielle', '\\frac{\\partial y}{\\partial x}'),
        t('frac.delta', 'Petite variation', '\\frac{\\delta y}{\\delta x}'),
        t('frac.pi2', 'Pi sur 2', '\\frac{\\pi}{2}'),
        t('frac.half', 'Un demi', '\\frac{1}{2}'),
      ] },
    ],
  },
  {
    id: 'script', label: 'Script', picture: 'e^{x}',
    sections: [
      { name: 'Indices et exposants', templates: [
        t('script.sup', 'Exposant', '⬚^{⬚}'),
        t('script.sub', 'Indice', '⬚_{⬚}'),
        t('script.subsup', 'Indice et exposant', '⬚_{⬚}^{⬚}'),
        t('script.pre', 'Indice et exposant à gauche', '{}_{⬚}^{⬚}⬚'),
      ] },
      { name: 'Courants', templates: [
        t('script.un', 'Terme d’une suite', 'u_{n}'),
        t('script.un1', 'Terme suivant', 'u_{n+1}'),
        t('script.x2', 'Carré', 'x^{2}'),
        t('script.eiwt', 'Exponentielle', 'e^{-i\\omega t}'),
        t('script.xy2', 'Indice et exposant', 'x_{y}^{2}'),
      ] },
    ],
  },
  {
    id: 'radical', label: 'Radical', picture: '\\sqrt[n]{x}',
    sections: [
      { name: 'Radicaux', templates: [
        t('rad.sqrt', 'Racine carrée', '\\sqrt{⬚}'),
        t('rad.nth', 'Racine n-ième', '\\sqrt[⬚]{⬚}'),
        t('rad.sqrt2', 'Racine carrée avec indice', '\\sqrt[2]{⬚}'),
        t('rad.cbrt', 'Racine cubique', '\\sqrt[3]{⬚}'),
      ] },
      { name: 'Radicaux courants', templates: [
        t('rad.quadratic', 'Racines du trinôme', '\\frac{-b\\pm\\sqrt{b^{2}-4ac}}{2a}'),
        t('rad.delta', 'Racines avec Δ', '\\frac{-b\\pm\\sqrt{\\Delta}}{2a}'),
        t('rad.hyp', 'Hypoténuse', '\\sqrt{a^{2}+b^{2}}'),
      ] },
    ],
  },
  {
    id: 'integral', label: 'Intégrale', picture: '\\int_{-x}^{x}',
    sections: [
      { name: 'Intégrales', templates: [
        ...integral('plain', 'Intégrale', '\\int'),
        ...integral('double', 'Intégrale double', '\\iint'),
        ...integral('triple', 'Intégrale triple', '\\iiint'),
      ] },
      { name: 'Intégrales curvilignes', templates: [
        ...integral('contour', 'Intégrale curviligne', '\\oint'),
        ...integral('surface', 'Intégrale de surface', '\\oiint'),
      ] },
      { name: 'Différentielles', templates: [
        t('int.dx', 'Différentielle x', '\\mathrm{d}x'),
        t('int.dt', 'Différentielle t', '\\mathrm{d}t'),
        t('int.dtheta', 'Différentielle thêta', '\\mathrm{d}\\theta'),
      ] },
      { name: 'Intégrales courantes', templates: [
        t('int.abfx', 'Intégrale de a à b', '\\int_{a}^{b}f(x)\\,\\mathrm{d}x'),
        t('int.primitive', 'Crochet de primitive', '\\left[F(x)\\right]_{a}^{b}'),
      ] },
    ],
  },
  {
    id: 'largeOperator', label: 'Grand\nopérateur', picture: '\\sum_{i=0}^{n}',
    sections: [
      { name: 'Sommes', templates: nary('sum', 'Somme', '\\sum') },
      { name: 'Produits et coproduits', templates: [...nary('prod', 'Produit', '\\prod'), ...nary('coprod', 'Coproduit', '\\coprod')] },
      { name: 'Unions et intersections', templates: [...nary('union', 'Union', '\\bigcup'), ...nary('inter', 'Intersection', '\\bigcap')] },
      { name: 'Autres grands opérateurs', templates: [
        t('nary.or', 'OU logique', '\\bigvee ⬚'),
        t('nary.orLimits', 'OU logique avec bornes', '\\bigvee\\limits_{⬚}^{⬚}⬚'),
        t('nary.and', 'ET logique', '\\bigwedge ⬚'),
        t('nary.andLimits', 'ET logique avec bornes', '\\bigwedge\\limits_{⬚}^{⬚}⬚'),
        t('nary.oplus', 'Plus cerclé', '\\bigoplus ⬚'),
        t('nary.otimes', 'Croix cerclée', '\\bigotimes ⬚'),
        t('nary.odot', 'Point cerclé', '\\bigodot ⬚'),
        t('nary.uplus', 'Union avec plus', '\\biguplus ⬚'),
        t('nary.sqcup', 'Union carrée', '\\bigsqcup ⬚'),
      ] },
      { name: 'Grands opérateurs courants', templates: [
        t('nary.binomial', 'Somme des coefficients binomiaux', '\\sum_{k=0}^{n}\\binom{n}{k}'),
        t('nary.sum0n', 'Somme de 0 à n', '\\sum_{k=0}^{n}⬚'),
        t('nary.double', 'Double somme', '\\sum_{0\\le i\\le m,\\,0<j<n}P(i,j)'),
        t('nary.prodA', 'Produit des A', '\\prod_{k=1}^{n}A_{k}'),
        t('nary.unionXY', 'Union d’intersections', '\\bigcup_{n=1}^{m}\\left(X_{n}\\cap Y_{n}\\right)'),
      ] },
    ],
  },
  {
    id: 'bracket', label: 'Crochet', picture: '\\{()\\}',
    sections: [
      { name: 'Crochets', templates: [
        t('brk.paren', 'Parenthèses', '\\left(⬚\\right)'),
        t('brk.square', 'Crochets', '\\left[⬚\\right]'),
        t('brk.brace', 'Accolades', '\\left\\lbrace ⬚\\right\\rbrace'),
        t('brk.angle', 'Chevrons', '\\left\\langle ⬚\\right\\rangle'),
        t('brk.floor', 'Partie entière (inf.)', '\\left\\lfloor ⬚\\right\\rfloor'),
        t('brk.ceil', 'Partie entière (sup.)', '\\left\\lceil ⬚\\right\\rceil'),
        t('brk.abs', 'Valeur absolue', '\\left|⬚\\right|'),
        t('brk.norm', 'Norme', '\\left\\Vert ⬚\\right\\Vert'),
      ] },
      { name: 'Intervalles', templates: [
        t('brk.closed', 'Intervalle fermé', '\\left[⬚;⬚\\right]'),
        t('brk.open', 'Intervalle ouvert', '\\left]⬚;⬚\\right['),
        t('brk.closedOpen', 'Fermé à gauche, ouvert à droite', '\\left[⬚;⬚\\right['),
        t('brk.openClosed', 'Ouvert à gauche, fermé à droite', '\\left]⬚;⬚\\right]'),
        t('brk.integers', 'Intervalle d’entiers', '\\llbracket ⬚;⬚\\rrbracket'),
        t('brk.R+', 'ℝ privé de zéro', '\\mathbb{R}^{*}'),
      ] },
      { name: 'Crochets avec séparateur', templates: [
        t('brk.parenSep', 'Parenthèses avec séparateur', '\\left(⬚\\middle|⬚\\right)'),
        t('brk.braceSep', 'Accolades avec séparateur', '\\left\\lbrace ⬚\\middle|⬚\\right\\rbrace'),
        t('brk.angleSep', 'Chevrons avec séparateur', '\\left\\langle ⬚\\middle|⬚\\right\\rangle'),
      ] },
      { name: 'Crochets simples', templates: [
        t('brk.leftParen', 'Parenthèse gauche seule', '\\left(⬚\\right.'),
        t('brk.rightParen', 'Parenthèse droite seule', '\\left.⬚\\right)'),
        t('brk.leftSquare', 'Crochet gauche seul', '\\left[⬚\\right.'),
        t('brk.rightSquare', 'Crochet droit seul', '\\left.⬚\\right]'),
        t('brk.leftBrace', 'Accolade gauche seule', '\\left\\lbrace ⬚\\right.'),
        t('brk.rightBrace', 'Accolade droite seule', '\\left.⬚\\right\\rbrace'),
        t('brk.leftBar', 'Barre gauche seule', '\\left|⬚\\right.'),
        t('brk.evalBar', 'Barre droite seule', '\\left.⬚\\right|'),
      ] },
      { name: 'Systèmes et empilements', templates: [
        t('brk.cases2', 'Système (deux lignes)', '\\begin{cases}⬚\\\\⬚\\end{cases}'),
        t('brk.cases3', 'Système (trois lignes)', '\\begin{cases}⬚\\\\⬚\\\\⬚\\end{cases}'),
        t('brk.stack2', 'Empilement', '\\begin{matrix}⬚\\\\⬚\\end{matrix}'),
        t('brk.stack3', 'Empilement (trois)', '\\begin{matrix}⬚\\\\⬚\\\\⬚\\end{matrix}'),
        t('brk.binom', 'Coefficient binomial', '\\binom{⬚}{⬚}'),
      ] },
      { name: 'Crochets courants', templates: [
        t('brk.casesAbs', 'Valeur absolue par cas', 'f(x)=\\begin{cases}-x, & x<0\\\\x, & x\\ge 0\\end{cases}'),
        t('brk.nk', 'Coefficient binomial', '\\binom{n}{k}'),
        t('brk.system', 'Système 2×2', '\\begin{cases}ax+by=c\\\\a\'x+b\'y=c\'\\end{cases}'),
      ] },
    ],
  },
  {
    id: 'function', label: 'Fonction', picture: '\\sin\\theta',
    sections: [
      { name: 'Fonctions trigonométriques', templates: [
        t('fn.sin', 'Sinus', '\\sin ⬚'), t('fn.cos', 'Cosinus', '\\cos ⬚'), t('fn.tan', 'Tangente', '\\tan ⬚'),
        t('fn.csc', 'Cosécante', '\\csc ⬚'), t('fn.sec', 'Sécante', '\\sec ⬚'), t('fn.cot', 'Cotangente', '\\cot ⬚'),
      ] },
      { name: 'Fonctions réciproques', templates: [
        t('fn.arcsin', 'Arc sinus', '\\arcsin ⬚'), t('fn.arccos', 'Arc cosinus', '\\arccos ⬚'), t('fn.arctan', 'Arc tangente', '\\arctan ⬚'),
        t('fn.asin', 'Sinus⁻¹', '\\sin^{-1}⬚'), t('fn.acos', 'Cosinus⁻¹', '\\cos^{-1}⬚'), t('fn.atan', 'Tangente⁻¹', '\\tan^{-1}⬚'),
      ] },
      { name: 'Fonctions hyperboliques', templates: [
        t('fn.sinh', 'Sinus hyperbolique', '\\sinh ⬚'), t('fn.cosh', 'Cosinus hyperbolique', '\\cosh ⬚'),
        t('fn.tanh', 'Tangente hyperbolique', '\\tanh ⬚'), t('fn.coth', 'Cotangente hyperbolique', '\\coth ⬚'),
      ] },
      { name: 'Fonctions courantes', templates: [
        t('fn.f', 'Fonction de x', 'f\\left(⬚\\right)'),
        t('fn.compose', 'Composée', '\\left(g\\circ f\\right)\\left(x\\right)'),
        t('fn.sintheta', 'Sinus thêta', '\\sin\\theta'),
        t('fn.cos2x', 'Cosinus 2x', '\\cos 2x'),
        t('fn.tanIdentity', 'Formule de la tangente', '\\tan\\theta=\\frac{\\sin\\theta}{\\cos\\theta}'),
      ] },
    ],
  },
  {
    id: 'accent', label: 'Accent', picture: '\\ddot{a}',
    sections: [
      { name: 'Accents', templates: [
        t('acc.dot', 'Point', '\\dot{⬚}'), t('acc.ddot', 'Deux points', '\\ddot{⬚}'), t('acc.dddot', 'Trois points', '\\dddot{⬚}'),
        t('acc.hat', 'Chapeau', '\\hat{⬚}'), t('acc.widehat', 'Angle (chapeau large)', '\\widehat{⬚}'), t('acc.check', 'Caron', '\\check{⬚}'),
        t('acc.acute', 'Aigu', '\\acute{⬚}'), t('acc.grave', 'Grave', '\\grave{⬚}'), t('acc.breve', 'Brève', '\\breve{⬚}'),
        t('acc.tilde', 'Tilde', '\\tilde{⬚}'), t('acc.bar', 'Barre', '\\bar{⬚}'), t('acc.dbar', 'Double barre', '\\bar{\\bar{⬚}}'),
        t('acc.overbrace', 'Accolade au-dessus', '\\overbrace{⬚}'), t('acc.underbrace', 'Accolade en dessous', '\\underbrace{⬚}'),
        t('acc.braceAbove', 'Accolade avec texte au-dessus', '\\overbrace{⬚}^{⬚}'), t('acc.braceBelow', 'Accolade avec texte en dessous', '\\underbrace{⬚}_{⬚}'),
        t('acc.leftArrow', 'Flèche gauche au-dessus', '\\overleftarrow{⬚}'), t('acc.rightArrow', 'Flèche droite au-dessus (vecteur)', '\\overrightarrow{⬚}'),
        t('acc.bothArrow', 'Double flèche au-dessus', '\\overleftrightarrow{⬚}'), t('acc.vec', 'Vecteur', '\\vec{⬚}'),
      ] },
      { name: 'Formules encadrées', templates: [
        t('acc.boxed', 'Formule encadrée', '\\boxed{⬚}'),
        t('acc.boxedPythagoras', 'Formule encadrée (exemple)', '\\boxed{a^{2}=b^{2}+c^{2}}'),
      ] },
      { name: 'Barres au-dessus et en dessous', templates: [
        t('acc.overbar', 'Barre au-dessus', '\\overline{⬚}'),
        t('acc.underbar', 'Barre en dessous', '\\underline{⬚}'),
      ] },
      { name: 'Accents courants', templates: [
        t('acc.vecAB', 'Vecteur AB', '\\overrightarrow{AB}'),
        t('acc.vecU', 'Vecteur u', '\\vec{u}'),
        t('acc.angle', 'Angle ABC', '\\widehat{ABC}'),
        t('acc.zbar', 'Conjugué', '\\overline{z}'),
        t('acc.xbar', 'Moyenne', '\\bar{x}'),
      ] },
    ],
  },
  {
    id: 'limitLog', label: 'Limite\net log', picture: '\\lim_{n\\to\\infty}',
    sections: [
      { name: 'Fonctions', templates: [
        t('lim.logBase', 'Logarithme de base a', '\\log_{⬚}⬚'),
        t('lim.log', 'Logarithme', '\\log ⬚'),
        t('lim.ln', 'Logarithme népérien', '\\ln ⬚'),
        t('lim.exp', 'Exponentielle', 'e^{⬚}'),
        t('lim.lim', 'Limite', '\\lim_{⬚}⬚'),
        t('lim.min', 'Minimum', '\\min_{⬚}⬚'),
        t('lim.max', 'Maximum', '\\max_{⬚}⬚'),
      ] },
      { name: 'Limites courantes', templates: [
        t('lim.plusInf', 'Limite en +∞', '\\lim_{x\\to+\\infty}⬚'),
        t('lim.minusInf', 'Limite en −∞', '\\lim_{x\\to-\\infty}⬚'),
        t('lim.right', 'Limite à droite', '\\lim_{x\\to ⬚^{+}}⬚'),
        t('lim.left', 'Limite à gauche', '\\lim_{x\\to ⬚^{-}}⬚'),
        t('lim.seq', 'Limite d’une suite', '\\lim_{n\\to+\\infty}u_{n}'),
        t('lim.e', 'Exemple : le nombre e', '\\lim_{n\\to\\infty}\\left(1+\\frac{1}{n}\\right)^{n}'),
      ] },
    ],
  },
  {
    id: 'operator', label: 'Opérateur', picture: '\\triangleq',
    sections: [
      { name: 'Opérateurs courants', templates: [
        t('op.colonEq', 'Deux-points égal', '\\coloneqq'),
        t('op.defEq', 'Égal par définition', '\\overset{\\text{déf}}{=}'),
        t('op.delta', 'Égal delta', '\\triangleq'),
        t('op.approx', 'Environ égal', '\\approx'),
        t('op.equiv', 'Équivalent', '\\equiv'),
        t('op.sim', 'Équivalent (fonctions)', '\\sim'),
      ] },
      { name: 'Structures d’opérateur', templates: [
        t('op.rightArrowAbove', 'Flèche droite avec texte au-dessus', '\\xrightarrow{⬚}'),
        t('op.leftArrowAbove', 'Flèche gauche avec texte au-dessus', '\\xleftarrow{⬚}'),
        t('op.rightArrowBelow', 'Flèche droite avec texte en dessous', '\\xrightarrow[⬚]{}'),
        t('op.leftArrowBelow', 'Flèche gauche avec texte en dessous', '\\xleftarrow[⬚]{}'),
        t('op.RightArrowAbove', 'Double flèche droite avec texte', '\\xRightarrow{⬚}'),
        t('op.BothArrowAbove', 'Équivalence avec texte', '\\xLeftrightarrow{⬚}'),
        t('op.eqAbove', 'Texte au-dessus de =', '\\overset{⬚}{=}'),
        t('op.eqBelow', 'Texte en dessous de =', '\\underset{⬚}{=}'),
      ] },
      { name: 'Structures courantes', templates: [
        t('op.limArrow', 'Tend vers', '\\xrightarrow[n\\to+\\infty]{}'),
        t('op.ipp', 'Par parties', '\\overset{\\text{IPP}}{=}'),
      ] },
    ],
  },
  {
    id: 'matrix', label: 'Matrice', picture: '\\begin{bmatrix}1&0\\\\0&1\\end{bmatrix}',
    sections: [
      { name: 'Matrices vides', templates: [
        t('mat.1x2', 'Matrice 1×2', '\\begin{matrix}⬚&⬚\\end{matrix}'),
        t('mat.2x1', 'Matrice 2×1', '\\begin{matrix}⬚\\\\⬚\\end{matrix}'),
        t('mat.1x3', 'Matrice 1×3', '\\begin{matrix}⬚&⬚&⬚\\end{matrix}'),
        t('mat.3x1', 'Matrice 3×1', '\\begin{matrix}⬚\\\\⬚\\\\⬚\\end{matrix}'),
        t('mat.2x2', 'Matrice 2×2', '\\begin{matrix}⬚&⬚\\\\⬚&⬚\\end{matrix}'),
        t('mat.2x3', 'Matrice 2×3', '\\begin{matrix}⬚&⬚&⬚\\\\⬚&⬚&⬚\\end{matrix}'),
        t('mat.3x2', 'Matrice 3×2', '\\begin{matrix}⬚&⬚\\\\⬚&⬚\\\\⬚&⬚\\end{matrix}'),
        t('mat.3x3', 'Matrice 3×3', '\\begin{matrix}⬚&⬚&⬚\\\\⬚&⬚&⬚\\\\⬚&⬚&⬚\\end{matrix}'),
      ] },
      { name: 'Points', templates: [
        t('mat.cdots', 'Points médians', '\\cdots'),
        t('mat.ldots', 'Points de suspension', '\\ldots'),
        t('mat.vdots', 'Points verticaux', '\\vdots'),
        t('mat.ddots', 'Points diagonaux', '\\ddots'),
      ] },
      { name: 'Matrices identité', templates: [
        t('mat.id2', 'Identité 2×2', '\\begin{matrix}1&0\\\\0&1\\end{matrix}'),
        t('mat.id3', 'Identité 3×3', '\\begin{matrix}1&0&0\\\\0&1&0\\\\0&0&1\\end{matrix}'),
      ] },
      { name: 'Matrices entre crochets', templates: [
        t('mat.paren', 'Matrice 2×2 entre parenthèses', '\\begin{pmatrix}⬚&⬚\\\\⬚&⬚\\end{pmatrix}'),
        t('mat.square', 'Matrice 2×2 entre crochets', '\\begin{bmatrix}⬚&⬚\\\\⬚&⬚\\end{bmatrix}'),
        t('mat.det', 'Déterminant 2×2', '\\begin{vmatrix}⬚&⬚\\\\⬚&⬚\\end{vmatrix}'),
        t('mat.paren3', 'Matrice 3×3 entre parenthèses', '\\begin{pmatrix}⬚&⬚&⬚\\\\⬚&⬚&⬚\\\\⬚&⬚&⬚\\end{pmatrix}'),
      ] },
      { name: 'Matrices creuses', templates: [
        t('mat.sparse', 'Matrice n×n', '\\begin{pmatrix}a_{11}&\\cdots&a_{1n}\\\\\\vdots&\\ddots&\\vdots\\\\a_{m1}&\\cdots&a_{mn}\\end{pmatrix}'),
        t('mat.identityN', 'Identité n×n', '\\begin{bmatrix}1&0&\\cdots&0\\\\0&1&\\cdots&0\\\\\\vdots&\\vdots&\\ddots&\\vdots\\\\0&0&\\cdots&1\\end{bmatrix}'),
      ] },
    ],
  },
];

/** Jeux de symboles (groupe « Symboles » de l'onglet Équation), en commandes LaTeX que KaTeX comprend. */
export const SYMBOL_SETS: { name: string; symbols: string[] }[] = [
  { name: 'Mathématiques de base', symbols: (
    '\\pm \\infty = \\neq \\sim \\times \\div ! \\propto < \\ll > \\gg \\le \\ge \\mp \\cong \\approx \\equiv \\forall \\complement '
    + '\\partial \\sqrt{} \\cup \\cap \\varnothing \\% \\degree \\Delta \\nabla \\exists \\nexists \\in \\ni \\notin \\leftarrow \\uparrow '
    + '\\rightarrow \\downarrow \\leftrightarrow \\therefore + - \\neg \\alpha \\beta \\gamma \\delta \\varepsilon \\theta \\mu \\pi \\rho '
    + '\\sigma \\tau \\varphi \\omega \\ast \\cdot \\vdots \\cdots \\ddots \\aleph \\blacksquare').split(' ') },
  { name: 'Lettres grecques', symbols: (
    '\\alpha \\beta \\gamma \\delta \\epsilon \\varepsilon \\zeta \\eta \\theta \\vartheta \\iota \\kappa \\lambda \\mu \\nu \\xi o \\pi '
    + '\\varpi \\rho \\varrho \\sigma \\varsigma \\tau \\upsilon \\phi \\varphi \\chi \\psi \\omega \\Gamma \\Delta \\Theta \\Lambda \\Xi '
    + '\\Pi \\Sigma \\Upsilon \\Phi \\Psi \\Omega').split(' ') },
  { name: 'Ensembles et lettres', symbols: (
    '\\mathbb{N} \\mathbb{Z} \\mathbb{D} \\mathbb{Q} \\mathbb{R} \\mathbb{C} \\mathbb{N}^{*} \\mathbb{R}^{*} \\mathbb{R}_{+} \\mathbb{R}_{-} '
    + '\\mathcal{C} \\mathcal{P} \\mathcal{F} \\mathcal{L} \\mathscr{C} \\ell \\hbar \\imath \\jmath \\Re \\Im \\wp \\aleph \\beth').split(' ') },
  { name: 'Opérateurs', symbols: (
    '+ - \\div \\times \\pm \\mp \\propto \\ast \\circ \\bullet \\cdot \\cap \\cup \\uplus \\sqcap \\sqcup \\wedge \\vee \\oplus \\ominus '
    + '\\otimes \\oslash \\odot \\setminus \\wr = \\neq < > \\le \\ge \\nless \\nleq \\ngtr \\ngeq \\equiv \\sim \\simeq \\approx \\cong '
    + '\\not\\equiv \\ll \\gg \\in \\ni \\notin \\subset \\supset \\subseteq \\supseteq \\not\\subset \\prec \\succ \\preceq \\succeq '
    + '\\parallel \\perp \\vdash \\dashv \\bowtie \\asymp \\therefore \\because \\doteq \\coloneqq \\triangleq \\sum \\int \\iint \\iiint '
    + '\\oint \\prod \\coprod \\bigcap \\bigcup \\bigwedge \\bigvee \\bigodot \\bigoplus \\bigotimes').split(' ') },
  { name: 'Flèches', symbols: (
    '\\leftarrow \\rightarrow \\uparrow \\downarrow \\leftrightarrow \\updownarrow \\Leftarrow \\Rightarrow \\Uparrow \\Downarrow '
    + '\\Leftrightarrow \\Updownarrow \\longleftarrow \\longrightarrow \\longleftrightarrow \\Longleftarrow \\Longrightarrow '
    + '\\Longleftrightarrow \\mapsto \\longmapsto \\hookleftarrow \\hookrightarrow \\leftharpoonup \\leftharpoondown '
    + '\\rightharpoonup \\rightharpoondown \\rightleftharpoons \\nearrow \\searrow \\swarrow \\nwarrow \\circlearrowleft '
    + '\\circlearrowright \\curvearrowleft \\curvearrowright \\nRightarrow \\nLeftrightarrow').split(' ') },
  { name: 'Relations niées', symbols: (
    '\\neq \\nless \\ngtr \\nleq \\ngeq \\not\\equiv \\nsim \\ncong \\notin \\not\\ni \\not\\subset \\not\\supset \\nsubseteq \\nsupseteq '
    + '\\subsetneq \\supsetneq \\nmid \\nparallel \\nprec \\nsucc \\nexists').split(' ') },
  { name: 'Géométrie', symbols: (
    '\\angle \\measuredangle \\sphericalangle \\perp \\parallel \\nparallel \\triangle \\square \\Box \\diamond \\circ \\odot '
    + '\\overrightarrow{AB} \\widehat{ABC} \\overline{AB} \\vec{u} \\| \\cdot \\wedge').split(' ') },
];

/** Équations prêtes (Insertion › Équation) : celles de wordcraft, puis celles du programme. */
export const BUILT_INS: { id: string; label: string; tex: string }[] = [
  { id: 'pythagoras', label: 'Théorème de Pythagore', tex: 'a^{2}+b^{2}=c^{2}' },
  { id: 'area', label: 'Aire d’un disque', tex: '\\mathcal{A}=\\pi r^{2}' },
  { id: 'quadratic', label: 'Racines de ax²+bx+c', tex: 'x=\\frac{-b\\pm\\sqrt{b^{2}-4ac}}{2a}' },
  { id: 'binomial', label: 'Formule du binôme', tex: '(x+a)^{n}=\\sum_{k=0}^{n}\\binom{n}{k}x^{k}a^{n-k}' },
  { id: 'euler', label: 'Identité d’Euler', tex: 'e^{i\\pi}+1=0' },
  { id: 'derivative', label: 'Nombre dérivé', tex: 'f\'(a)=\\lim_{h\\to 0}\\frac{f(a+h)-f(a)}{h}' },
  { id: 'taylor', label: 'Série de l’exponentielle', tex: 'e^{x}=1+\\frac{x}{1!}+\\frac{x^{2}}{2!}+\\frac{x^{3}}{3!}+\\cdots' },
  { id: 'gaussian', label: 'Intégrale de Gauss', tex: '\\int_{-\\infty}^{+\\infty}e^{-x^{2}}\\,\\mathrm{d}x=\\sqrt{\\pi}' },
  { id: 'trig1', label: 'Somme de sinus', tex: '\\sin\\alpha\\pm\\sin\\beta=2\\sin\\frac{\\alpha\\pm\\beta}{2}\\cos\\frac{\\alpha\\mp\\beta}{2}' },
  { id: 'trig2', label: 'Somme de cosinus', tex: '\\cos\\alpha+\\cos\\beta=2\\cos\\frac{\\alpha+\\beta}{2}\\cos\\frac{\\alpha-\\beta}{2}' },
  { id: 'normal', label: 'Densité de la loi normale', tex: 'f(x)=\\frac{1}{\\sigma\\sqrt{2\\pi}}e^{-\\frac{(x-\\mu)^{2}}{2\\sigma^{2}}}' },
  { id: 'bayes', label: 'Formule de Bayes', tex: 'P(A|B)=\\frac{P(B|A)\\,P(A)}{P(B)}' },
  { id: 'ipp', label: 'Intégration par parties', tex: '\\int_{a}^{b}u\'v\\,\\mathrm{d}x=\\left[uv\\right]_{a}^{b}-\\int_{a}^{b}uv\'\\,\\mathrm{d}x' },
  { id: 'geomSum', label: 'Somme des termes d’une suite géométrique', tex: '\\sum_{k=0}^{n}q^{k}=\\frac{1-q^{n+1}}{1-q}' },
  { id: 'arithSum', label: 'Somme des n premiers entiers', tex: '\\sum_{k=1}^{n}k=\\frac{n(n+1)}{2}' },
  { id: 'moivre', label: 'Formule de Moivre', tex: '\\left(\\cos\\theta+i\\sin\\theta\\right)^{n}=\\cos(n\\theta)+i\\sin(n\\theta)' },
  { id: 'lnProduct', label: 'Logarithme d’un produit', tex: '\\ln(ab)=\\ln a+\\ln b' },
  { id: 'croissance', label: 'Croissances comparées', tex: '\\lim_{x\\to+\\infty}\\frac{e^{x}}{x}=+\\infty' },
];

const ALL = STRUCTURES.flatMap((g) => g.sections.flatMap((s) => s.templates));
export const templateById = (id: string) => ALL.find((x) => x.id === id);

/** Modèle → LaTeX de MathLive : les cases vides deviennent des `\placeholder{}` (Tab passe à la suivante). */
export const forEditing = (tex: string) => tex.replace(/⬚/g, '\\placeholder{}');

/** Modèle → LaTeX des vignettes KaTeX : un carré gris par case vide. */
export const forPreview = (tex: string) => tex.replace(/⬚/g, '{\\color{#9a958c}\\square}');

/** Recherche (« Rechercher une commande ») : tous les modèles et équations prêtes, avec leur nom. */
export const searchableEquations = () => [
  ...ALL.map((x) => ({ id: x.id, label: x.label, tex: x.tex })),
  ...BUILT_INS.map((b) => ({ id: `builtin.${b.id}`, label: b.label, tex: b.tex })),
];
