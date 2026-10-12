/** Aperçus de documents (Mes documents, « Publier sur FIDNI ») : texte avec ses formules rendues. */
import React from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

/** Aperçu du texte : les formules `$…$` / `$$…$$` rendues en ligne ; une formule coupée par l'aperçu est retirée. */
export const Excerpt: React.FC<{ text: string }> = ({ text }) => {
  const parts: React.ReactNode[] = [];
  const re = /\$\$([\s\S]+?)\$\$|\$([^$]+?)\$/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    // Numéro d'équation (`\tag{1}`) : seulement en mode centré, pas dans un aperçu en ligne.
    const tex = (m[1] ?? m[2] ?? '').replace(/\\tag\{[^{}]*\}/g, '').replace(/\\displaystyle\s*/g, '');
    let html = '';
    try { html = katex.renderToString(tex, { throwOnError: false, strict: false, trust: false }); } catch { html = ''; }
    parts.push(html ? <span key={m.index} dangerouslySetInnerHTML={{ __html: html }} /> : tex);
    last = m.index + m[0].length;
  }
  const rest = text.slice(last);
  parts.push(rest.includes('$') ? `${rest.slice(0, rest.indexOf('$')).trimEnd()} …` : rest);
  return <>{parts}</>;
};
