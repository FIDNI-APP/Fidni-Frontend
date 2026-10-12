/**
 * Documents → LaTeX (12/10/2026) : « Exporter en LaTeX (.tex) » de l'éditeur de documents, pour les profs
 * qui veulent finir un sujet sous Overleaf (l'import .tex a été retiré au profit de l'import Word). Sous-ensemble courant d'un sujet de maths : sections, gras/italique, listes, formules en
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
