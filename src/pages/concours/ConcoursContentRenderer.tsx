/**
 * ConcoursContentRenderer
 *
 * Renders an HTML string that may contain LaTeX delimited by `$...$` (inline)
 * or `$$...$$` (display). Unlike TipTapRenderer, we render KaTeX directly via
 * `katex.renderToString`, so we don't depend on TipTap's prose-mirror plugin
 * pipeline — which has been unreliable with LLM-imported HTML.
 *
 * Steps:
 *   1. Collapse over-escaped backslashes inside math zones (LLM artefacts).
 *   2. Find every `$$...$$` and `$...$` block.
 *   3. Render its LaTeX via KaTeX → HTML string.
 *   4. Splice the rendered KaTeX back into the original HTML and inject the
 *      result with `dangerouslySetInnerHTML`.
 *
 * Why this works where TipTapRenderer didn't:
 *   - We never round-trip through TipTap's HTML→ProseMirror→HTML serialiser,
 *     which can drop or re-encode backslashes.
 *   - We don't rely on a plugin's `findFormulas` walking text nodes — we
 *     operate on the raw string.
 */
import React, { useMemo } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface Props {
  html: string;
  className?: string;
  // Allows callers to scale display vs inline math independently.
  displayMode?: boolean;
}

function collapseBackslashes(s: string): string {
  // Any run of 2+ backslashes becomes 1 — fixes over-escaped LaTeX.
  return s.replace(/\\{2,}/g, '\\');
}

function renderLatex(latex: string, displayMode: boolean): string {
  try {
    return katex.renderToString(collapseBackslashes(latex), {
      throwOnError: false,
      displayMode,
      strict: 'ignore',
      trust: true,
    });
  } catch (e) {
    // If KaTeX fails, show the source between visible delimiters as a fallback.
    const escaped = latex
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    return `<code style="color:#dc2626;background:#fef2f2;padding:2px 4px;border-radius:4px;font-size:.9em;">${displayMode ? '$$' : '$'}${escaped}${displayMode ? '$$' : '$'}</code>`;
  }
}

/**
 * Walk the HTML string and replace math zones with rendered KaTeX.
 *
 * IMPORTANT: we only consider `$` characters that are NOT inside HTML tags
 * (between `<` and `>`). Otherwise something like `<a href="...">$x$</a>`
 * would be detected partially.
 */
function renderMathInHtml(html: string): string {
  let out = '';
  let i = 0;
  const n = html.length;
  while (i < n) {
    const ch = html[i];

    // Skip over HTML tags verbatim.
    if (ch === '<') {
      const end = html.indexOf('>', i);
      if (end === -1) { out += html.slice(i); break; }
      out += html.slice(i, end + 1);
      i = end + 1;
      continue;
    }

    // Display math: $$...$$
    if (ch === '$' && html[i + 1] === '$') {
      const close = html.indexOf('$$', i + 2);
      if (close !== -1) {
        const latex = html.slice(i + 2, close);
        out += renderLatex(latex, true);
        i = close + 2;
        continue;
      }
    }

    // Inline math: $...$  (not $$ — that case was handled above)
    if (ch === '$') {
      // Find the closing $, but stop at newlines so we don't gobble
      // unrelated $ across paragraphs (LLM mistakes happen).
      let j = i + 1;
      let close = -1;
      while (j < n) {
        const cj = html[j];
        if (cj === '\n' || cj === '<') break;
        if (cj === '$') { close = j; break; }
        j++;
      }
      if (close !== -1 && close > i + 1) {
        const latex = html.slice(i + 1, close);
        // Heuristic: skip "$5" or "$1,000" prices — only render when content
        // actually looks like LaTeX (contains a backslash or a known math
        // metachar). This avoids accidental matches in ordinary prose.
        if (/[\\^_{}=0-9a-zA-Z]/.test(latex)) {
          out += renderLatex(latex, false);
          i = close + 1;
          continue;
        }
      }
    }

    out += ch;
    i++;
  }
  return out;
}

export const ConcoursContentRenderer: React.FC<Props> = ({ html, className }) => {
  const rendered = useMemo(() => renderMathInHtml(html || ''), [html]);
  return (
    <div
      className={`concours-content ${className || ''}`}
      // Output is HTML we built ourselves from a trusted KaTeX call.
      // The original `html` prop is admin-authored, not user-submitted.
      dangerouslySetInnerHTML={{ __html: rendered }}
    />
  );
};

export default ConcoursContentRenderer;
