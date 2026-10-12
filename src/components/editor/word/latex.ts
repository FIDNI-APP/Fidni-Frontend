/**
 * Documents ↔ LaTeX (12/10/2026) : « Exporter en LaTeX (.tex) » et « Importer un fichier LaTeX » de
 * l'éditeur de documents, pour les profs qui ont déjà leurs devoirs en LaTeX (ou qui veulent les finir sous
 * Overleaf). Sous-ensemble courant d'un sujet de maths : sections, gras/italique, listes, formules en
 * ligne et centrées (equation, align…), encadrés (théorème, définition…), tableaux simples, saut de page.
 * Ce qui n'est pas compris reste du texte : rien n'est perdu sans le dire.
 */

const CALLOUT_ENV: Record<string, string> = {
  theorem: 'theoreme', property: 'propriete', definition: 'definition', lemma: 'lemme', corollary: 'corollaire',
  example: 'exemple', remark: 'remarque', proof: 'preuve', method: 'methode', warning: 'attention',
};
const ENV_TITLES: Record<string, string> = {
  theoreme: 'Théorème', propriete: 'Propriété', definition: 'Définition', lemme: 'Lemme', corollaire: 'Corollaire',
  exemple: 'Exemple', remarque: 'Remarque', preuve: 'Preuve', methode: 'Méthode', attention: 'Attention',
};
/** Environnements LaTeX courants (anglais et français) → type d'encadré FIDNI. */
const ENV_TO_CALLOUT: Record<string, string> = {
  theorem: 'theorem', theoreme: 'theorem', thm: 'theorem', proposition: 'property', propriete: 'property', prop: 'property',
  definition: 'definition', defn: 'definition', def: 'definition', lemma: 'lemma', lemme: 'lemma', corollary: 'corollary',
  corollaire: 'corollary', example: 'example', exemple: 'example', remark: 'remark', remarque: 'remark', rem: 'remark',
  proof: 'proof', preuve: 'proof', demonstration: 'proof', methode: 'method', method: 'method', attention: 'warning',
};
const DISPLAY_ENVS = ['equation', 'equation*', 'align', 'align*', 'gather', 'gather*', 'multline', 'multline*', 'eqnarray', 'eqnarray*'];

// ─────────────────────────────── Export

const texEscape = (s: string) => s
  .replace(/\\/g, '\\textbackslash{}')
  .replace(/([#%&_{}])/g, '\\$1')
  .replace(/\^/g, '\\^{}')
  .replace(/~/g, '\\~{}')
  .replace(/\u00a0/g, '~')
  .replace(/\u202f/g, '\\,');

/** Texte d'un nœud : texte échappé, formules `$…$` / `$$…$$` laissées telles quelles. */
function inlineText(text: string): string {
  const out: string[] = [];
  let last = 0;
  const re = /\$\$([\s\S]+?)\$\$|\$([^$]+?)\$/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    out.push(texEscape(text.slice(last, m.index)));
    // Tableau de variations : on retire ses réglages (commentaire `%TV…`), le tableau reste.
    const tex = (m[1] ?? m[2] ?? '').replace(/^%TV[^\n]*\n/, '');
    out.push(m[1] !== undefined ? `\n\\[\n${tex.trim()}\n\\]\n` : `$${tex}$`);
    last = m.index + m[0].length;
  }
  out.push(texEscape(text.slice(last)));
  return out.join('');
}

function inline(node: Node): string {
  if (node.nodeType === 3) return inlineText(node.textContent || '');
  if (node.nodeType !== 1) return '';
  const el = node as Element;
  const inner = Array.from(el.childNodes).map(inline).join('');
  switch (el.tagName) {
    case 'STRONG': case 'B': return `\\textbf{${inner}}`;
    case 'EM': case 'I': return `\\emph{${inner}}`;
    case 'U': return `\\underline{${inner}}`;
    case 'S': return `\\sout{${inner}}`;
    case 'SUB': return `\\textsubscript{${inner}}`;
    case 'SUP': return `\\textsuperscript{${inner}}`;
    case 'BR': return '\\\\\n';
    case 'A': return `\\href{${(el.getAttribute('href') || '').replace(/([#%{}])/g, '\\$1')}}{${inner}}`;
    default: return inner;
  }
}

function block(el: Element): string {
  switch (el.tagName) {
    case 'H1': return `\\section*{${Array.from(el.childNodes).map(inline).join('')}}\n`;
    case 'H2': return `\\subsection*{${Array.from(el.childNodes).map(inline).join('')}}\n`;
    case 'H3': return `\\subsubsection*{${Array.from(el.childNodes).map(inline).join('')}}\n`;
    case 'P': {
      const t = Array.from(el.childNodes).map(inline).join('').trim();
      const align = (el as HTMLElement).style?.textAlign;
      if (!t) return '';
      return align === 'center' ? `\\begin{center}\n${t}\n\\end{center}\n` : `${t}\n`;
    }
    case 'UL': case 'OL': {
      const env = el.tagName === 'UL' ? 'itemize' : 'enumerate';
      const items = Array.from(el.children).filter((c) => c.tagName === 'LI')
        .map((li) => `  \\item ${Array.from(li.children).map(block).join('').trim() || Array.from(li.childNodes).map(inline).join('').trim()}`);
      return `\\begin{${env}}\n${items.join('\n')}\n\\end{${env}}\n`;
    }
    case 'BLOCKQUOTE': return `\\begin{quote}\n${Array.from(el.children).map(block).join('\n').trim()}\n\\end{quote}\n`;
    case 'HR': return '\\noindent\\rule{\\linewidth}{0.4pt}\n';
    case 'TABLE': {
      const rows = Array.from(el.querySelectorAll('tr'));
      const n = Math.max(1, ...rows.map((r) => r.children.length));
      const body = rows.map((r) => Array.from(r.children).map((c) => Array.from(c.childNodes).map((x) => (x.nodeType === 1 && (x as Element).tagName === 'P' ? Array.from(x.childNodes).map(inline).join('') : inline(x))).join(' ').trim()).join(' & ')).join(' \\\\ \\hline\n');
      return `\\begin{center}\n\\begin{tabular}{|${'c|'.repeat(n)}}\n\\hline\n${body} \\\\ \\hline\n\\end{tabular}\n\\end{center}\n`;
    }
    case 'IMG': return `% Image : ${el.getAttribute('src') || ''}\n`;
    default:
      if (el.hasAttribute('data-page-break')) return '\\newpage\n';
      if (el.hasAttribute('data-callout-type')) {
        const env = CALLOUT_ENV[el.getAttribute('data-callout-type') || ''] || 'remarque';
        // Premier paragraphe tout en gras = nom de l'encadré : \begin{theoreme}[nom].
        const kids = Array.from(el.children);
        const first = kids[0];
        const named = first?.tagName === 'P' && first.children.length === 1 && first.firstElementChild?.tagName === 'STRONG'
          && first.textContent?.trim() === first.firstElementChild.textContent?.trim();
        const opt = named ? `[${Array.from(first.firstElementChild!.childNodes).map(inline).join('')}]` : '';
        return `\\begin{${env}}${opt}\n${(named ? kids.slice(1) : kids).map(block).join('\n').trim()}\n\\end{${env}}\n`;
      }
      if (el.children.length) return Array.from(el.children).map(block).join('\n');
      return `${inlineText(el.textContent || '')}\n`;
  }
}

/** Document complet, compilable (pdflatex / Overleaf). */
export function htmlToLatex(html: string, title: string): string {
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html');
  const root = doc.body.firstElementChild;
  const body = root ? Array.from(root.children).map(block).filter(Boolean).join('\n') : '';
  const envs = Object.entries(ENV_TITLES).map(([env, t]) => `\\newtheorem*{${env}}{${t}}`).join('\n');
  return `% Exporté depuis Fidni (fidni.fr)
\\documentclass[11pt,a4paper]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage[french]{babel}
\\usepackage{amsmath,amssymb,amsthm,stmaryrd}
\\usepackage[margin=2.5cm]{geometry}
\\usepackage{hyperref}
\\usepackage[normalem]{ulem}
${envs}
\\title{${texEscape(title || 'Document')}}
\\date{}

\\begin{document}
\\maketitle

${body}
\\end{document}
`;
}

// ─────────────────────────────── Import

const htmlEscape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Commandes de texte courantes → HTML ; formules en ligne laissées en `$…$`. */
function inlineFromTex(src: string): string {
  // On protège les formules en ligne avant d'échapper le reste.
  const maths: { tex: string; display: boolean }[] = [];
  let s = src.replace(/\\\[([\s\S]+?)\\\]|\$\$([\s\S]+?)\$\$|\\\(([\s\S]+?)\\\)|\$([^$]+?)\$/g,
    (_m, d1: string | undefined, d2: string | undefined, a: string | undefined, b: string | undefined) => {
      const display = d1 !== undefined || d2 !== undefined;
      maths.push({ tex: (d1 ?? d2 ?? a ?? b ?? '').trim(), display });
      return `\u0000${maths.length - 1}\u0000`;
    });
  s = htmlEscape(s)
    .replace(/\\textbf\{([^{}]*)\}/g, '<strong>$1</strong>')
    .replace(/\\(?:emph|textit)\{([^{}]*)\}/g, '<em>$1</em>')
    .replace(/\\underline\{([^{}]*)\}/g, '<u>$1</u>')
    .replace(/\\(?:text|textrm|textsf|texttt|mbox)\{([^{}]*)\}/g, '$1')
    .replace(/\\href\{([^{}]*)\}\{([^{}]*)\}/g, (_m, url: string, t: string) => (/^https?:/.test(url) ? `<a href="${url}">${t}</a>` : t))
    .replace(/\\\\(\[[^\]]*\])?/g, '<br>')
    .replace(/~/g, '\u00a0')
    .replace(/\\([#%&_{}$])/g, '$1')
    .replace(/\\(?:noindent|medskip|bigskip|smallskip|centering|par|hfill|vfill|indent)\b/g, '')
    .replace(/``|''/g, '"');
  // eslint-disable-next-line no-control-regex -- jetons de protection
  return s.replace(/\u0000(\d+)\u0000/g, (_m, i: string) => {
    const f = maths[Number(i)];
    if (!f) return '';
    return f.display ? `$$${htmlEscape(f.tex)}$$` : `$${htmlEscape(f.tex)}$`;
  }).trim();
}

/** Fichier .tex → HTML du document (formules `$…$` / `$$…$$`, encadrés, listes, tableaux). */
export function latexToHtml(tex: string): { html: string; title: string } {
  let s = tex.replace(/\r\n?/g, '\n');
  // Commentaires (pas les « \% »).
  s = s.replace(/(^|[^\\])%[^\n]*/g, '$1');
  const title = (s.match(/\\title\{([^{}]*)\}/)?.[1] || '').trim();
  const begin = s.indexOf('\\begin{document}');
  if (begin >= 0) s = s.slice(begin + '\\begin{document}'.length);
  s = s.replace(/\\end\{document\}[\s\S]*$/, '').replace(/\\maketitle/g, '');
  // Formules en ligne mises de côté : un `\begin{pmatrix}` écrit dans `$…$` n'est pas un bloc.
  const inlineMaths: string[] = [];
  s = s.replace(/\\\(([\s\S]+?)\\\)|(?<!\$)\$(?!\$)([^$]+?)\$(?!\$)/g, (_m, a: string | undefined, b: string | undefined) => {
    inlineMaths.push((a ?? b ?? '').trim());
    return `\u0001${inlineMaths.length - 1}\u0001`;
  });
  const out: string[] = [];
  const parts: { kind: 'text' | 'html'; v: string }[] = [];
  // Formules centrées et environnements de bloc, découpés avant les paragraphes.
  const blockRe = new RegExp(
    String.raw`\\\[([\s\S]+?)\\\]|\$\$([\s\S]+?)\$\$|\\begin\{(${DISPLAY_ENVS.map((e) => e.replace('*', '\\*')).join('|')})\}([\s\S]+?)\\end\{\3\}`
    + String.raw`|\\begin\{(itemize|enumerate)\}([\s\S]+?)\\end\{\5\}|\\begin\{(tabular)\}\{[^}]*\}([\s\S]+?)\\end\{tabular\}`
    + String.raw`|\\begin\{(center|flushleft|flushright|quote)\}([\s\S]+?)\\end\{\9\}`
    + String.raw`|\\begin\{(\w+)\}(?:\[([^\]]*)\])?([\s\S]+?)\\end\{\11\}|\\(newpage|clearpage|pagebreak)\b`
    + String.raw`|\\(section|subsection|subsubsection)\*?\{([^{}]*)\}`, 'g');
  let last = 0;
  let m: RegExpExecArray | null;
  const pushText = (t: string) => { if (t.trim()) parts.push({ kind: 'text', v: t }); };
  while ((m = blockRe.exec(s)) !== null) {
    pushText(s.slice(last, m.index));
    last = m.index + m[0].length;
    if (m[1] !== undefined || m[2] !== undefined) {
      parts.push({ kind: 'html', v: `<p>$$${htmlEscape((m[1] ?? m[2]).trim())}$$</p>` });
    } else if (m[3]) {
      // align / equation… : en `aligned` (KaTeX), étiquettes retirées.
      const body = m[4].replace(/\\label\{[^}]*\}/g, '').replace(/\\nonumber|\\notag/g, '').trim();
      const tex = /align|eqnarray/.test(m[3]) ? `\\begin{aligned}${body}\\end{aligned}` : /gather|multline/.test(m[3]) ? `\\begin{gathered}${body}\\end{gathered}` : body;
      parts.push({ kind: 'html', v: `<p>$$${htmlEscape(tex)}$$</p>` });
    } else if (m[5]) {
      const tag = m[5] === 'itemize' ? 'ul' : 'ol';
      const items = m[6].split(/\\item\b/).slice(1).map((it) => `<li><p>${inlineFromTex(it.replace(/^\[[^\]]*\]/, ''))}</p></li>`);
      parts.push({ kind: 'html', v: `<${tag}>${items.join('')}</${tag}>` });
    } else if (m[7]) {
      const rows = m[8].replace(/\\hline|\\cline\{[^}]*\}/g, '').split(/\\\\/).map((r) => r.trim()).filter(Boolean)
        .map((r) => `<tr>${r.split('&').map((c) => `<td><p>${inlineFromTex(c)}</p></td>`).join('')}</tr>`);
      parts.push({ kind: 'html', v: `<table><tbody>${rows.join('')}</tbody></table>` });
    } else if (m[9]) {
      const inner = latexToHtml(`\\begin{document}${m[10]}\\end{document}`).html;
      parts.push({ kind: 'html', v: m[9] === 'center' ? inner.replace(/<p>/g, '<p style="text-align: center">') : inner });
    } else if (m[11]) {
      const type = ENV_TO_CALLOUT[m[11].toLowerCase().replace(/\*$/, '')];
      const inner = latexToHtml(`\\begin{document}${m[13]}\\end{document}`).html || '<p></p>';
      if (type) {
        const name = m[12] ? `<p><strong>${inlineFromTex(m[12])}</strong></p>` : '';
        parts.push({ kind: 'html', v: `<div data-callout-type="${type}">${name}${inner}</div>` });
      } else {
        parts.push({ kind: 'html', v: inner });
      }
    } else if (m[14]) {
      parts.push({ kind: 'html', v: '<div data-page-break=""></div>' });
    } else if (m[15]) {
      const tag = m[15] === 'section' ? 'h1' : m[15] === 'subsection' ? 'h2' : 'h3';
      parts.push({ kind: 'html', v: `<${tag}>${inlineFromTex(m[16])}</${tag}>` });
    }
  }
  pushText(s.slice(last));
  parts.forEach((p) => {
    if (p.kind === 'html') { out.push(p.v); return; }
    p.v.split(/\n\s*\n/).map((para) => para.replace(/\s*\n\s*/g, ' ').trim()).filter(Boolean)
      .forEach((para) => out.push(`<p>${inlineFromTex(para)}</p>`));
  });
  // eslint-disable-next-line no-control-regex -- jetons de protection
  const restore = (h: string): string => h.replace(/\u0001(\d+)\u0001/g, (m0, i: string) => (inlineMaths[Number(i)] !== undefined ? `$${htmlEscape(inlineMaths[Number(i)])}$` : m0));
  return { html: restore(out.join('')), title };
}
