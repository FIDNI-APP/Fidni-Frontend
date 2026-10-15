// Mode sombre (15/10/2026) : génère src/styles/mode-sombre.css.
//   node scripts/generer-mode-sombre.mjs
// Les couleurs nommées (encre, papier, filet, vert, or) passent par des variables CSS (tailwind.config.js, index.css).
// Restent les couleurs écrites en dur dans les composants (bg-white, bg-[#f2f1ee], text-[#a23b34], border-slate-200…) :
// ce script relève toutes celles qui existent dans src/ et leur donne un équivalent sombre (même teinte, luminosité
// inversée : les fonds clairs deviennent sombres, les textes foncés deviennent clairs, les filets restent discrets).
// Il traite aussi les couleurs de src/index.css. À relancer quand de nouvelles couleurs apparaissent dans le code.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const SRC = path.join(ROOT, 'src');
const OUT = path.join(SRC, 'styles', 'mode-sombre.css');

// Palette Tailwind par défaut (seulement les neutres, les seuls utilisés en dur).
const TW = {
  white: '#ffffff', black: '#000000',
  slate: { 50: '#f8fafc', 100: '#f1f5f9', 200: '#e2e8f0', 300: '#cbd5e1', 400: '#94a3b8', 500: '#64748b', 600: '#475569', 700: '#334155', 800: '#1e293b', 900: '#0f172a' },
  gray: { 50: '#f9fafb', 100: '#f3f4f6', 200: '#e5e7eb', 300: '#d1d5db', 400: '#9ca3af', 500: '#6b7280', 600: '#4b5563', 700: '#374151', 800: '#1f2937', 900: '#111827' },
  zinc: { 50: '#fafafa', 100: '#f4f4f5', 200: '#e4e4e7', 300: '#d4d4d8', 400: '#a1a1aa', 500: '#71717a', 600: '#52525b', 700: '#3f3f46', 800: '#27272a', 900: '#18181b' },
  neutral: { 50: '#fafafa', 100: '#f5f5f5', 200: '#e5e5e5', 300: '#d4d4d4', 400: '#a3a3a3', 500: '#737373', 600: '#525252', 700: '#404040', 800: '#262626', 900: '#171717' },
  stone: { 50: '#fafaf9', 100: '#f5f5f4', 200: '#e7e5e4', 300: '#d6d3d1', 400: '#a8a29e', 500: '#78716c', 600: '#57534e', 700: '#44403c', 800: '#292524', 900: '#1c1917' },
};

// ── Couleurs
const hexToRgb = (h) => {
  h = h.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
};
const rgbToHsl = ([r, g, b]) => {
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min, s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h / 6, s, l];
};
const hslToHex = ([h, s, l]) => {
  const f = (n) => {
    const k = (n + h * 12) % 12, a = s * Math.min(l, 1 - l);
    return Math.round((l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))) * 255).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
};
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

/** rôle : 'fond' | 'texte' | 'filet' */
function sombre(hex, role) {
  const [h, s, l] = rgbToHsl(hexToRgb(hex));
  const neutre = s < 0.15;
  if (role === 'fond') {
    if (l > 0.99) return '#24221f'; // blanc des cartes : la surface sombre du site (papier chaud)
    if (l >= 0.5) return neutre ? hslToHex([h, s * 0.6, clamp(0.16 + (1 - l) * 0.9, 0.16, 0.34)])
      : hslToHex([h, s * 0.5, clamp(0.15 + (1 - l) * 0.6, 0.15, 0.3)]);
    // fonds foncés (boutons) : gardés, sauf l'encre presque noire, éclaircie pour rester visible
    return neutre && l < 0.25 ? hslToHex([h, s, 0.3]) : hex;
  }
  if (role === 'texte') {
    if (l >= 0.6) return hex; // texte déjà clair (sur fond foncé)
    return neutre ? hslToHex([h, s, clamp(0.93 - l * 0.55, 0.6, 0.93)]) : hslToHex([h, Math.min(s, 0.6), clamp(0.62 + l * 0.25, 0.62, 0.8)]);
  }
  // filet
  if (l >= 0.5) return neutre ? hslToHex([h, s * 0.6, clamp(0.15 + (1 - l) * 0.9, 0.17, 0.42)])
    : hslToHex([h, s * 0.5, clamp(0.22 + (1 - l) * 0.7, 0.22, 0.4)]);
  return hslToHex([h, s, clamp(0.55 + l * 0.3, 0.55, 0.8)]);
}

const withAlpha = (hex, a) => {
  if (a === null) return hex;
  const [r, g, b] = hexToRgb(hex).map((x) => Math.round(x * 255));
  return `rgb(${r} ${g} ${b} / ${a})`;
};

// ── Classes de couleur écrites en dur dans src/
const UTIL = {
  bg: ['background-color', 'fond'],
  text: ['color', 'texte'],
  border: ['border-color', 'filet'],
  'border-t': ['border-top-color', 'filet'], 'border-b': ['border-bottom-color', 'filet'],
  'border-l': ['border-left-color', 'filet'], 'border-r': ['border-right-color', 'filet'],
  'border-x': ['border-left-color', 'filet'], 'border-y': ['border-top-color', 'filet'],
  'border-s': ['border-inline-start-color', 'filet'], 'border-e': ['border-inline-end-color', 'filet'],
  divide: ['border-color', 'filet'],
  ring: ['--tw-ring-color', 'filet'],
  outline: ['outline-color', 'filet'],
  fill: ['fill', 'fond'],
  stroke: ['stroke', 'texte'],
  decoration: ['text-decoration-color', 'texte'],
  placeholder: ['color', 'texte'],
};
const COLOR = String.raw`(?:\[#[0-9a-fA-F]{3,8}\]|white|black|(?:slate|gray|zinc|neutral|stone)-\d{2,3})`;
const TOKEN = new RegExp(String.raw`(?<![\w-])((?:[a-z-]+:)*)(${Object.keys(UTIL).sort((a, b) => b.length - a.length).join('|')})-(${COLOR})(?:\/(\d{1,3}))?(?![\w\[-])`, 'g');
const VARIANTS = {
  hover: ':hover', focus: ':focus', 'focus-visible': ':focus-visible', 'focus-within': ':focus-within',
  active: ':active', disabled: ':disabled', checked: ':checked',
};
const MEDIA = { sm: 640, md: 768, lg: 1024, xl: 1280, '2xl': 1536 };

const files = [];
(function walk(d) {
  for (const f of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, f.name);
    if (f.isDirectory()) walk(p);
    else if (/\.(tsx|ts)$/.test(f.name)) files.push(p);
  }
})(SRC);

const tokens = new Map();
for (const f of files) {
  for (const m of fs.readFileSync(f, 'utf8').matchAll(TOKEN)) tokens.set(m[0], m);
}

const esc = (cls) => cls.replace(/([^a-zA-Z0-9_-])/g, '\\$1');
const colorOf = (c) => {
  if (c.startsWith('[')) return c.slice(1, -1);
  if (c === 'white' || c === 'black') return TW[c];
  const [fam, n] = c.split('-');
  return TW[fam]?.[n];
};

const rules = [];
const skipped = new Set();
for (const [cls, m] of [...tokens.entries()].sort()) {
  const [, prefix, util, color, alpha] = m;
  const [prop, role] = UTIL[util];
  if (util === 'text' && color === 'white') continue; // texte blanc sur bouton : reste blanc
  if (util === 'bg' && color === 'black') continue;
  const hex = colorOf(color);
  if (!hex) { skipped.add(cls); continue; }
  const value = withAlpha(sombre(hex, role), alpha ? Number(alpha) / 100 : null);
  const variants = prefix ? prefix.slice(0, -1).split(':') : [];
  let pseudo = '', group = '', media = null, ok = true;
  for (const v of variants) {
    if (VARIANTS[v]) pseudo += VARIANTS[v];
    else if (v === 'group-hover') group = '.group:hover ';
    else if (MEDIA[v]) media = MEDIA[v];
    else ok = false;
  }
  if (!ok) { skipped.add(cls); continue; }
  // .fd-fixe : illustrations à couleurs fixes (dossiers dorés…), laissées telles quelles en mode sombre.
  let sel = `.dark ${group}.${esc(cls)}:not(.fd-fixe *)${pseudo}`;
  if (util === 'divide') sel += ' > :not([hidden]) ~ :not([hidden])';
  if (util === 'placeholder') sel += '::placeholder';
  const rule = `${sel} { ${prop}: ${value}; }`;
  rules.push(media ? `@media (min-width: ${media}px) { ${rule} }` : rule);
}

// ── Feuilles de style : src/index.css et les blocs CSS écrits dans les composants (ReadingStyles, TipTapRenderer…)
const PROPS = { background: 'fond', 'background-color': 'fond', color: 'texte', 'border-color': 'filet', border: 'filet',
  'border-top': 'filet', 'border-bottom': 'filet', 'border-left': 'filet', 'border-right': 'filet', 'outline': 'filet',
  'box-shadow': null, fill: 'fond', stroke: 'texte' };
// Feuilles imprimables (PDF façon sujet) : restent claires, la page les sort du mode sombre (PaperExport).
const PAPIER = /[\/](paper[\/]|PaperExport\.tsx)/;
function parseCss(text) {
  const out = [];
  for (const m of text.matchAll(/([^{}@;]+)\{([^{}]*)\}/g)) {
    const selectors = m[1].trim();
    if (!selectors || selectors.includes('${') || selectors.startsWith(':root') || selectors.startsWith('.dark')
      || /^(html|body)$/.test(selectors) || /^(from|to|\d+%)/.test(selectors)) continue;
    const decls = [];
    for (const d of m[2].split(';')) {
      const [p, ...rest] = d.split(':');
      const prop = (p || '').trim(), val = rest.join(':').trim();
      if (!(prop in PROPS) || !PROPS[prop] || !/#[0-9a-fA-F]{3,6}\b/.test(val) || val.includes('${')) continue;
      decls.push(`${prop}: ${val.replace(/#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b/g, (h) => sombre(h, PROPS[prop]))}`);
    }
    if (!decls.length) continue;
    const sel = selectors.split(',').map((x) => x.trim()).filter(Boolean).map((x) => `.dark ${x}`).join(', ');
    out.push(`${sel} { ${decls.join('; ')}; }`);
  }
  return out;
}
const cssRules = parseCss(fs.readFileSync(path.join(SRC, 'index.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*@import[^;]*;/gm, ''));
let embedded = [];
const hexInCode = new Set();
for (const f of files) {
  if (PAPIER.test(f)) continue;
  const code = fs.readFileSync(f, 'utf8');
  // Blocs CSS dans des chaînes `…` ; les interpolations ${…} (polices…) sont neutralisées avant l'analyse.
  for (const lit of code.matchAll(/`([^`]*)`/g)) {
    if (lit[1].includes('{')) {
      embedded = embedded.concat(parseCss(lit[1].replace(/\/\*[\s\S]*?\*\//g, '').replace(/\$\{[^}]*\}/g, '0')));
    }
  }
  // Couleurs en style en ligne ou en attribut SVG : '#e7e3dc', "1px solid #f0e0b4", fill="#c0892f"…
  for (const h of code.matchAll(/['"`][^'"`\n]*?(#[0-9a-fA-F]{6})\b[^'"`\n]*?['"`]/g)) hexInCode.add(h[1].toLowerCase());
}
embedded = [...new Set(embedded)];

// Styles en ligne : le navigateur les écrit « background: rgb(253, 244, 220) » dans l'attribut style ; on les cible
// par sélecteur d'attribut (avec !important, seul moyen de passer devant un style en ligne).
const inline = [];
for (const hex of [...hexInCode].sort()) {
  const [r, g, b] = hexToRgb(hex).map((x) => Math.round(x * 255));
  const rgb = `rgb(${r}, ${g}, ${b})`;
  const n = ':not(.fd-fixe *)';
  inline.push(`.dark [style*="background: ${rgb}"]${n}, .dark [style*="background-color: ${rgb}"]${n} { background-color: ${sombre(hex, 'fond')} !important; }`);
  inline.push(`.dark [style^="color: ${rgb}"]${n}, .dark [style*="; color: ${rgb}"]${n} { color: ${sombre(hex, 'texte')} !important; }`);
  inline.push(`.dark [style*="solid ${rgb}"]${n}, .dark [style*="border-color: ${rgb}"]${n} { border-color: ${sombre(hex, 'filet')} !important; }`);
  inline.push(`.dark [fill="${hex}" i] { fill: ${sombre(hex, 'fond')}; } .dark [stroke="${hex}" i] { stroke: ${sombre(hex, 'filet')}; }`);
}

const out = `/* Généré par scripts/generer-mode-sombre.mjs — ne pas modifier à la main (relancer le script). */
/* ${rules.length} classes de couleur, ${cssRules.length + embedded.length} règles CSS, ${hexInCode.size} couleurs en style en ligne. */

/* Couleurs écrites en dur dans les classes des composants */
${rules.join('\n')}

/* Feuilles de style (index.css, blocs CSS des composants) */
${cssRules.join('\n')}
${embedded.join('\n')}

/* Styles en ligne et attributs SVG */
${inline.join('\n')}
`;
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, out);
console.log(`${OUT} : ${rules.length} classes, ${cssRules.length + embedded.length} règles CSS, ${hexInCode.size} couleurs en ligne${skipped.size ? `, ignorées : ${[...skipped].join(' ')}` : ''}`);
