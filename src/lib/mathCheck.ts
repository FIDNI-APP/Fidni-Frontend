// Contrôle des formules avant publication : chaque $…$ / $$…$$ doit compiler avec KaTeX (mêmes
// découpage et options que TipTapRenderer). Sert à la relecture des brouillons de l'IA (Pilotage › IA).
import katex from 'katex';

export interface MathProblem { where: string; tex: string; message: string }

const decode = (s: string) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
  .replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');

function checkHtml(html: string, where: string, out: MathProblem[]) {
  const formulas: [string, boolean][] = [];
  const rest = html.replace(/\$\$([\s\S]*?)\$\$/g, (_m, tex) => { formulas.push([tex, true]); return ' '; });
  rest.replace(/\$(?!\$)([^$\n]+?)\$(?!\$)/g, (_m, tex) => { formulas.push([tex, false]); return ' '; });
  for (const [tex, displayMode] of formulas) {
    try {
      katex.renderToString(decode(tex.trim()), { displayMode, throwOnError: true, strict: false, trust: false, macros: { '\\f': '#1f(#2)' } });
    } catch (e) {
      out.push({ where, tex: decode(tex.trim()), message: (e as Error).message.replace(/^KaTeX parse error: /, '') });
    }
  }
}

type Part = { html?: string } | undefined;
interface Node { id?: string; title?: string; type?: string; content?: Part; solution?: Part; subQuestions?: Node[]; subSections?: Node[] }

/** Formules qui ne compilent pas, dans une structure stockée (blocks ou sections). */
export function checkStructureMath(structure: unknown): MathProblem[] {
  const out: MathProblem[] = [];
  const s = (structure ?? {}) as { blocks?: Node[]; sections?: Node[] };
  let q = 0;
  (s.blocks ?? []).forEach((b, i) => {
    if (b.type === 'question') q += 1;
    const label = b.type === 'question' ? `Question ${q}` : `Bloc ${i + 1}`;
    if (b.content?.html) checkHtml(b.content.html, label, out);
    if (b.solution?.html) checkHtml(b.solution.html, `${label} (solution)`, out);
    (b.subQuestions ?? []).forEach((sq, j) => {
      if (sq.content?.html) checkHtml(sq.content.html, `${label}.${j + 1}`, out);
      if (sq.solution?.html) checkHtml(sq.solution.html, `${label}.${j + 1} (solution)`, out);
    });
  });
  (s.sections ?? []).forEach((sec, i) => {
    const label = sec.title || `Partie ${i + 1}`;
    if (sec.content?.html) checkHtml(sec.content.html, label, out);
    (sec.subSections ?? []).forEach((ss) => { if (ss.content?.html) checkHtml(ss.content.html, `${label} · ${ss.title ?? ''}`, out); });
  });
  return out;
}

export function checkHtmlMath(html: string, where: string): MathProblem[] {
  const out: MathProblem[] = [];
  checkHtml(html, where, out);
  return out;
}
