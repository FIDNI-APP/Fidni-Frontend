// ============================================
// FILE: editor/TipTapRenderer.tsx
// Static renderer for detailed views (NOT for cards).
//
// Math is stored as raw `$...$` / `$$...$$` source text. We render it to
// KaTeX HTML directly here rather than relying on a live ProseMirror
// decoration plugin — the plugin's decorations get lost when content is
// loaded via setContent (full-replace transaction), which left the raw
// LaTeX source visible. A static pass is reliable in every context.
// ============================================

import React, { useEffect, useMemo, useState, memo } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { sanitizeHtml } from '@/lib/sanitize';

interface TipTapRendererProps {
  content: string;
  className?: string;
  onReady?: () => void;
}

// Stored HTML escapes `<`, `>`, `&`, etc. as entities, but KaTeX needs the
// real characters (math is full of `<`/`>` inequalities). Decode before render.
function decodeEntities(s: string): string {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&'); // must be last
}

function renderMath(latex: string, displayMode: boolean): string {
  const cls = displayMode ? 'math-display' : 'math-inline';
  const tex = decodeEntities(String(latex).trim());
  try {
    const rendered = katex.renderToString(tex, {
      displayMode, throwOnError: false, errorColor: '#cc0000',
      strict: false, trust: false, output: 'html',
      macros: { '\\f': '#1f(#2)' },
    });
    return `<span class="${cls}">${rendered}</span>`;
  } catch {
    return `<span class="${cls} math-error">${tex}</span>`;
  }
}

/** Render `$$...$$` (display) and `$...$` (inline) to KaTeX HTML. */
function processLatex(html: string): string {
  // Display math first so the inline pass doesn't eat `$$` pairs.
  html = html.replace(/\$\$([\s\S]*?)\$\$/g, (_m, latex) => renderMath(latex, true));
  // Inline math: a single `$...$` on one line (not `$$`).
  html = html.replace(/\$(?!\$)([^\$\n]+?)\$(?!\$)/g, (_m, latex) => renderMath(latex, false));
  return html;
}

/** Minimal TipTap-JSON → HTML fallback (content is normally already HTML). */
function jsonToHtml(json: any): string {
  if (!json) return '';
  const processNode = (node: any): string => {
    if (!node) return '';
    switch (node.type) {
      case 'doc':
        return (node.content || []).map(processNode).join('');
      case 'paragraph': {
        const inner = (node.content || []).map(processNode).join('');
        const align = node.attrs?.textAlign;
        return `<p${align ? ` style="text-align:${align}"` : ''}>${inner}</p>`;
      }
      case 'heading': {
        const level = Math.min(node.attrs?.level || 1, 2);
        return `<h${level}>${(node.content || []).map(processNode).join('')}</h${level}>`;
      }
      case 'bulletList':
        return `<ul class="list-disc pl-5">${(node.content || []).map(processNode).join('')}</ul>`;
      case 'orderedList':
        return `<ol class="list-decimal pl-5">${(node.content || []).map(processNode).join('')}</ol>`;
      case 'listItem':
        return `<li>${(node.content || []).map(processNode).join('')}</li>`;
      case 'blockquote':
        return `<blockquote>${(node.content || []).map(processNode).join('')}</blockquote>`;
      case 'image':
        return node.attrs?.src ? `<img class="renderer-image" src="${node.attrs.src}" alt="${node.attrs.alt || ''}" />` : '';
      case 'hardBreak':
        return '<br/>';
      case 'text': {
        let text = node.text || '';
        (node.marks || []).forEach((mark: any) => {
          if (mark.type === 'bold') text = `<strong>${text}</strong>`;
          else if (mark.type === 'italic') text = `<em>${text}</em>`;
          else if (mark.type === 'textStyle' && mark.attrs?.color) text = `<span style="color:${mark.attrs.color}">${text}</span>`;
        });
        return text;
      }
      default:
        return node.content ? (node.content || []).map(processNode).join('') : '';
    }
  };
  return processNode(json);
}

/**
 * HTML d'un bloc de contenu, maths rendues par KaTeX et filtré (sanitizeHtml), prêt à injecter.
 * Utilisé aussi par la feuille PDF, pour un rendu identique à celui du site.
 */
// eslint-disable-next-line react-refresh/only-export-components
const CALLOUT_LABELS: Record<string, string> = {
  theorem: 'Théorème', property: 'Propriété', definition: 'Définition', lemma: 'Lemme',
  corollary: 'Corollaire', example: 'Exemple', remark: 'Remarque', proof: 'Preuve',
  method: 'Méthode', warning: 'Attention',
};
const fold = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

/**
 * En-tête de chaque encadré : sa nature (« PROPRIÉTÉ », « THÉORÈME 1 ») puis, s'il en a un, son nom
 * (« PROPRIÉTÉ Conséquences », « THÉORÈME de la bijection »). Le titre vient de data-callout-title
 * (contenus importés) ou du premier paragraphe en gras que l'éditeur insère ; il n'est pas répété.
 * Appliqué après sanitizeHtml : on n'ajoute que du texte (textContent), jamais de HTML.
 */
function decorateCallouts(html: string): string {
  if (!html.includes('data-callout-type') || typeof DOMParser === 'undefined') return html;
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html');
  const root = doc.body.firstElementChild as HTMLElement;
  root.querySelectorAll<HTMLElement>('[data-callout-type]').forEach((box) => {
    if (box.querySelector(':scope > .callout-head')) return;
    const label = CALLOUT_LABELS[box.getAttribute('data-callout-type') || ''] || 'Remarque';
    let title = (box.getAttribute('data-callout-title') || '').trim();
    const first = box.firstElementChild;
    if (!title && first?.tagName === 'P' && first.children.length === 1 && first.firstElementChild?.tagName === 'STRONG'
        && first.textContent?.trim() === first.firstElementChild.textContent?.trim()) {
      title = first.textContent?.trim() || '';
      first.remove();
    }
    let kind = label;
    let name = '';
    if (title) {
      // « Propriétés », « Théorème 1 » : le titre commence par la nature → c'est l'étiquette.
      const m = fold(title).match(new RegExp(`^${fold(label)}s?\\b`));
      if (m) {
        const rest = title.slice(m[0].length).trim();
        if (!rest || /^[\dIVX]+[.)]?$/.test(rest)) kind = title;
        else { kind = title.slice(0, m[0].length); name = rest; }
      } else {
        name = title;
      }
    }
    const head = doc.createElement('div');
    head.className = 'callout-head';
    const k = doc.createElement('span');
    k.className = 'callout-kind';
    k.textContent = kind;
    head.appendChild(k);
    if (name) {
      const n = doc.createElement('span');
      n.className = 'callout-name';
      n.textContent = name;
      head.appendChild(n);
    }
    box.prepend(head);
  });
  return root.innerHTML;
}

export function renderContentHtml(content: string): string {
  if (!content) return '';
  let raw = content;
  // Some callers may pass serialized TipTap JSON instead of HTML.
  if (typeof content === 'string' && content.trim().startsWith('{')) {
    try {
      raw = jsonToHtml(JSON.parse(content));
    } catch {
      raw = content;
    }
  }
  // Contenu écrit par les utilisateurs : filtré après le rendu KaTeX, juste avant l'injection.
  try {
    return decorateCallouts(sanitizeHtml(processLatex(raw)));
  } catch (err) {
    console.error('TipTapRenderer: failed to process content', err);
    return sanitizeHtml(raw);
  }
}

const TipTapRenderer: React.FC<TipTapRendererProps> = memo(({
  content,
  className = '',
  onReady,
}) => {
  const [isReady, setIsReady] = useState(false);

  const html = useMemo(() => renderContentHtml(content), [content]);

  useEffect(() => {
    setIsReady(true);
    onReady?.();
  }, [html, onReady]);

  if (!content) return null;

  return (
    <div className={`tiptap-full-renderer ${className}`}>
      <div className={`ProseMirror transition-opacity duration-200 ${isReady ? 'opacity-100' : 'opacity-0'}`}>
        <div dangerouslySetInnerHTML={{ __html: html }} />
      </div>

      <style>{`
        .tiptap-full-renderer .ProseMirror {
          outline: none !important;
          word-wrap: break-word;
          overflow-wrap: break-word;
          word-break: normal;
        }

        .tiptap-full-renderer .ProseMirror p {
          margin-bottom: 0.75rem;
          word-wrap: break-word;
          overflow-wrap: break-word;
        }

        .tiptap-full-renderer .ProseMirror h1 {
          font-size: 1.5rem;
          font-weight: 700;
          margin-bottom: 1rem;
        }

        .tiptap-full-renderer .ProseMirror h2 {
          font-size: 1.25rem;
          font-weight: 600;
          margin-bottom: 0.75rem;
        }

        .tiptap-full-renderer .ProseMirror ul { list-style: disc; padding-left: 1.25rem; margin-bottom: 0.75rem; }
        .tiptap-full-renderer .ProseMirror ol { list-style: decimal; padding-left: 1.25rem; margin-bottom: 0.75rem; }

        .tiptap-full-renderer .renderer-image,
        .tiptap-full-renderer .ProseMirror img {
          display: block;
          margin: 1rem auto;
          max-width: 100%;
          border-radius: 0.5rem;
        }

        /* Formule en ligne : « inline » (pas inline-block) pour que KaTeX puisse passer à la ligne
           après un signe =, +, … au lieu de déborder à droite sur téléphone. */
        .tiptap-full-renderer .math-inline {
          display: inline;
          margin: 0 2px;
        }

        /* Formule centrée trop large pour l'écran : elle défile horizontalement au lieu d'être
           coupée par la carte (overflow-hidden). */
        .tiptap-full-renderer .math-display {
          display: block;
          margin: 1em 0;
          text-align: center;
          max-width: 100%;
          overflow-x: auto;
          overflow-y: hidden;
          -webkit-overflow-scrolling: touch;
          padding: 2px 0;
        }
        .tiptap-full-renderer .math-display .katex-display { margin: 0; }

        /* Tableaux et blocs de code larges : même traitement. */
        .tiptap-full-renderer .ProseMirror table,
        .tiptap-full-renderer .ProseMirror pre {
          display: block;
          max-width: 100%;
          overflow-x: auto;
        }

        .tiptap-full-renderer .math-error {
          color: #cc0000;
          font-family: monospace;
          font-size: 0.9em;
        }

        /* Encadrés (Définition, Théorème…) : palette du site — encre, vert pour les résultats, or pour
           les exemples et méthodes ; le texte reste à l'encre. Le titre vient de data-callout-title
           (contenus importés) ; un encadré créé dans l'éditeur porte déjà son étiquette dans le texte. */
        .tiptap-full-renderer .callout-block { margin: 1rem 0; }
        .tiptap-full-renderer [data-callout-type] {
          margin: 14px 0; padding: 12px 16px; border-radius: 10px; color: #33302b;
          background: #faf9f7; border: 1px solid #efece6; border-left: 3px solid #1a1a1a;
        }
        .tiptap-full-renderer .callout-head { display: flex; flex-wrap: wrap; align-items: baseline; gap: 2px 8px; margin-bottom: 6px; }
        .tiptap-full-renderer .callout-kind {
          font: 600 11px/1.4 'DM Mono', ui-monospace, monospace; letter-spacing: .08em; text-transform: uppercase; color: #1a1a1a;
        }
        .tiptap-full-renderer .callout-name { font-size: 14px; font-weight: 600; color: #1a1a1a; }
        .tiptap-full-renderer [data-callout-type="theorem"] .callout-kind,
        .tiptap-full-renderer [data-callout-type="property"] .callout-kind,
        .tiptap-full-renderer [data-callout-type="corollary"] .callout-kind,
        .tiptap-full-renderer [data-callout-type="lemma"] .callout-kind { color: #1a7a4a; }
        .tiptap-full-renderer [data-callout-type="example"] .callout-kind,
        .tiptap-full-renderer [data-callout-type="method"] .callout-kind { color: #9a6a1f; }
        .tiptap-full-renderer [data-callout-type="remark"] .callout-kind,
        .tiptap-full-renderer [data-callout-type="proof"] .callout-kind { color: #6b6862; }
        .tiptap-full-renderer [data-callout-type="warning"] .callout-kind { color: #a23b34; }
        .tiptap-full-renderer [data-callout-type="theorem"],
        .tiptap-full-renderer [data-callout-type="property"],
        .tiptap-full-renderer [data-callout-type="corollary"],
        .tiptap-full-renderer [data-callout-type="lemma"] { background: #f3f8f5; border-left-color: #1a7a4a; }
        .tiptap-full-renderer [data-callout-type="example"],
        .tiptap-full-renderer [data-callout-type="method"] { background: #fcf8f1; border-left-color: #c0892f; }
        .tiptap-full-renderer [data-callout-type="remark"],
        .tiptap-full-renderer [data-callout-type="proof"] { background: #fff; border-left-color: #b8b4ac; }
        .tiptap-full-renderer [data-callout-type="warning"] { background: #fcf4f2; border-left-color: #a23b34; }
        .tiptap-full-renderer [data-callout-type] > :last-child { margin-bottom: 0; }

        @media (max-width: 640px) {
          .tiptap-full-renderer .ProseMirror { min-width: 0 !important; max-width: 100% !important; }
          .tiptap-full-renderer .ProseMirror p,
          .tiptap-full-renderer .ProseMirror h1,
          .tiptap-full-renderer .ProseMirror h2,
          .tiptap-full-renderer .ProseMirror li {
            word-wrap: break-word !important;
            overflow-wrap: break-word !important;
            word-break: normal !important;
            hyphens: auto !important;
          }
        }
      `}</style>
    </div>
  );
}, (prev, next) => prev.content === next.content && prev.className === next.className);

export default TipTapRenderer;
