// Vérifie chaque formule d'un contenu converti (sortie de `importer_contenu --apercu`) avec KaTeX,
// exactement comme le site la rendra (TipTapRenderer.tsx : mêmes délimiteurs, même macro \f).
// Une formule que KaTeX ne sait pas lire s'afficherait en rouge sur le site : c'est une erreur.
// Usage : node scripts/verifier-maths.mjs apercu.json   (code de sortie 1 en cas d'erreur)
import { readFileSync } from 'node:fs';
import katex from 'katex';

const decode = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
  .replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');

function* texts(structure) {
  for (const b of structure.blocks || []) {
    for (const part of [b.content, b.solution]) if (part?.html) yield [b.id, part.html];
    if (b.meta?.hint) yield [`${b.id} (indice)`, b.meta.hint];
    for (const sq of b.subQuestions || []) for (const part of [sq.content, sq.solution]) if (part?.html) yield [sq.id, part.html];
  }
  for (const s of structure.sections || []) {
    yield [s.id, s.content.html];
    for (const ss of s.subSections || []) yield [ss.id, ss.content.html];
  }
}

const data = JSON.parse(readFileSync(process.argv[2], 'utf-8'));
const errors = [];
const warnings = [];
let count = 0;
for (const [where, html] of texts(data.structure)) {
  const formulas = [];
  const rest = html.replace(/\$\$([\s\S]*?)\$\$/g, (_m, tex) => { formulas.push([tex, true]); return ' '; });
  rest.replace(/\$(?!\$)([^$\n]+?)\$(?!\$)/g, (_m, tex) => { formulas.push([tex, false]); return ' '; });
  for (const [raw, display] of formulas) {
    count++;
    const tex = decode(String(raw).trim());
    if (/<\/?[a-zA-Z][^>]*>/.test(tex)) {
      errors.push(`${where} : du HTML s'est retrouvé dans une formule (délimiteurs $ décalés)\n      formule : ${tex.slice(0, 80)}`);
      continue;
    }
    try {
      katex.renderToString(tex, {
        displayMode: display, throwOnError: true, trust: false, output: 'html',
        macros: { '\\f': '#1f(#2)' },
        strict: (code, msg) => { warnings.push(`${where} : ${msg} dans « ${tex} »`); return 'ignore'; },
      });
    } catch (e) {
      errors.push(`${where} : ${String(e.message).replace(/^KaTeX parse error: /, '')}\n      formule : ${tex}`);
    }
  }
}
for (const w of [...new Set(warnings)]) console.log(`  ⚠ ${w}`);
for (const e of errors) console.log(`  ✗ ${e}`);
console.log(errors.length ? `✗ ${errors.length} formule(s) invalide(s) sur ${count}` : `✓ ${count} formules valides`);
process.exit(errors.length ? 1 : 0);
