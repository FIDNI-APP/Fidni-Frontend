#!/usr/bin/env node
// Interface en arabe (15/10/2026) : chaque t('texte français') du code a-t-il sa traduction dans src/i18n/ar/*.json ?
// Usage : node scripts/verifier-traductions.mjs [fichiers ou dossiers…]   (par défaut : tout src/)
// Affiche les textes sans traduction (fichier:ligne), les fichiers JSON invalides, et les variables {x} qui
// diffèrent entre le français et l'arabe. Code de sortie 1 s'il manque quelque chose.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const FRONT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(FRONT, 'src');
const AR_DIR = path.join(SRC, 'i18n', 'ar');

let ok = true;
const ar = {};
const origine = {};
const conflits = [];
for (const f of fs.readdirSync(AR_DIR).filter((x) => x.endsWith('.json')).sort()) {
  try {
    for (const [k, v] of Object.entries(JSON.parse(fs.readFileSync(path.join(AR_DIR, f), 'utf8')))) {
      if (k in ar && ar[k] !== v) conflits.push(`${JSON.stringify(k)} : ${origine[k]} ${JSON.stringify(ar[k])} ≠ ${f} ${JSON.stringify(v)}`);
      ar[k] = v;
      origine[k] = f;
    }
  } catch (e) {
    ok = false;
    console.log(`JSON invalide : src/i18n/ar/${f} — ${e.message}`);
  }
}
// Un même texte traduit différemment selon la zone : le dernier fichier l'emporte, à harmoniser (--conflits).
if (process.argv.includes('--conflits')) {
  conflits.forEach((c) => console.log(`traductions différentes : ${c}`));
  console.log(`${conflits.length} textes traduits différemment selon la zone.`);
  process.exit(0);
}

const cibles = process.argv.slice(2).filter((a) => !a.startsWith('--')).map((p) => path.resolve(process.cwd(), p));
const fichiers = [];
const parcourir = (p) => {
  const st = fs.statSync(p);
  if (st.isDirectory()) for (const e of fs.readdirSync(p)) parcourir(path.join(p, e));
  // Seulement les fichiers qui importent t de '@/i18n' (d'autres ont leur propre fonction t, ex. l'éditeur).
  else if (/\.(tsx?|jsx?)$/.test(p) && !p.includes(`${path.sep}i18n${path.sep}`)
    && /from '@\/i18n'/.test(fs.readFileSync(p, 'utf8'))) fichiers.push(p);
};
(cibles.length ? cibles : [SRC]).forEach(parcourir);

// t('…'), t("…"), t(`…`) sans ${} : le premier argument littéral.
const APPEL = /(?<![\w.$])t\(\s*(['"`])((?:(?!\1)[^\\]|\\.)*)\1/g;
const decoder = (q, s) => (q === '`' ? s : JSON.parse('"' + s.replace(/\\'/g, "'").replace(/"/g, '\\"') + '"'));
const vars = (s) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');

let manquants = 0;
let total = 0;
for (const f of fichiers) {
  const src = fs.readFileSync(f, 'utf8');
  for (const m of src.matchAll(APPEL)) {
    if (m[1] === '`' && m[2].includes('${')) {
      ok = false;
      console.log(`${path.relative(FRONT, f)}:${src.slice(0, m.index).split('\n').length}  t(\`…\${…}\`) : utiliser t('… {x}', { x })`);
      continue;
    }
    let fr;
    try { fr = decoder(m[1], m[2]); } catch { continue; }
    total++;
    const ligne = src.slice(0, m.index).split('\n').length;
    if (!(fr in ar)) {
      manquants++;
      ok = false;
      console.log(`${path.relative(FRONT, f)}:${ligne}  sans traduction : ${JSON.stringify(fr)}`);
    } else if (vars(fr) !== vars(ar[fr])) {
      ok = false;
      console.log(`${path.relative(FRONT, f)}:${ligne}  variables différentes : ${JSON.stringify(fr)} → ${JSON.stringify(ar[fr])}`);
    }
  }
}
console.log(`${total} textes, ${manquants} sans traduction, ${Object.keys(ar).length} traductions en tout.`);
process.exit(ok ? 0 : 1);
