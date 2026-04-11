// ============================================
// FILE: editor/ContentPreview.tsx
// Safe, contained preview for cards - NO overflow
// ============================================

import React, { useEffect, useState, useRef, memo } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface ContentPreviewProps {
  content: string;
  maxHeight?: number;
  className?: string;
}

const ContentPreview: React.FC<ContentPreviewProps> = memo(({
  content,
  maxHeight = 120,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [processedHtml, setProcessedHtml] = useState<string>('');
  const [isOverflowing, setIsOverflowing] = useState(false);

  useEffect(() => {
    if (!content) {
      setProcessedHtml('');
      return;
    }

    try {
      let html = content;

      // Parse JSON content if needed
      if (typeof content === 'string' && content.trim().startsWith('{')) {
        try {
          const parsed = JSON.parse(content);
          if (parsed.content) {
            html = jsonToHtml(parsed);
          }
        } catch {
          // Use as-is
        }
      }

      // Process math formulas
      html = processLatex(html);
      
      // Clean up empty paragraphs
      html = html.replace(/<p>\s*<\/p>/g, '');
      html = html.replace(/<p>&nbsp;<\/p>/g, '');

      setProcessedHtml(html);
    } catch (error) {
      console.error('ContentPreview error:', error);
      setProcessedHtml('<p class="text-slate-400 italic">Aperçu non disponible</p>');
    }
  }, [content]);

  useEffect(() => {
    if (containerRef.current) {
      setIsOverflowing(containerRef.current.scrollHeight > containerRef.current.clientHeight);
    }
  }, [processedHtml, maxHeight]);

  if (!processedHtml) {
    return (
      <div className={`text-slate-400 text-sm italic ${className}`}>
        Aucun contenu
      </div>
    );
  }

  return (
    <div className={`content-preview-root ${className}`}>
      <div
        ref={containerRef}
        className="content-preview-container"
        style={{ maxHeight: `${maxHeight}px` }}
      >
        <div
          className="content-preview-inner"
          dangerouslySetInnerHTML={{ __html: processedHtml }}
        />
      </div>

      <style>{`
        .content-preview-root {
          position: relative;
        }

        .content-preview-container {
          overflow: hidden;
          position: relative;
        }

        .content-preview-inner {
          font-size: 13px;
          line-height: 1.6;
          color: #64748b;
          word-wrap: break-word;
          overflow-wrap: break-word;
        }

        .content-preview-inner p {
          margin: 0 0 0.4rem 0;
        }

        .content-preview-inner p:last-child {
          margin-bottom: 0;
        }

        .content-preview-inner h1,
        .content-preview-inner h2,
        .content-preview-inner h3 {
          font-size: 0.95em;
          font-weight: 600;
          margin: 0 0 0.4rem 0;
          color: #334155;
        }

        .content-preview-inner ul,
        .content-preview-inner ol {
          margin: 0 0 0.4rem 0;
          padding-left: 1.25rem;
        }

        .content-preview-inner li {
          margin-bottom: 0.1rem;
        }

        .content-preview-inner img {
          display: none !important;
        }

        .content-preview-inner blockquote {
          margin: 0.3rem 0;
          padding-left: 0.6rem;
          border-left: 2px solid #e2e8f0;
          color: #94a3b8;
          font-style: italic;
          font-size: 1.2em;
        }

        .content-preview-inner strong {
          font-weight: 600;
          color: #475569;
        }

        .content-preview-inner em {
          font-style: italic;
        }

        /* Math - Compact and contained */
        .content-preview-inner .math-inline {
          display: inline;
          font-size: 1.2em;
          vertical-align: baseline;
        }

        .content-preview-inner .math-block {
          display: block;
          text-align: center;
          margin: 0.4rem 0;
          font-size: 0.85em;
          overflow: hidden;
        }

        .content-preview-inner .katex {
          font-size: inherit !important;
        }

        .content-preview-inner .katex-display {
          margin: 0 !important;
          overflow: hidden;
        }

        .content-preview-inner .katex-display > .katex {
          white-space: normal;
        }

        /* Prevent any overflow */
        .content-preview-inner * {
          max-width: 100% !important;
          overflow-wrap: break-word;
          word-break: break-word;
        }

        .content-preview-inner .katex-html {
          white-space: normal;
          word-wrap: break-word;
        }
      `}</style>
    </div>
  );
});

/**
 * Process LaTeX formulas
 */
function processLatex(html: string): string {
  // Display math: $$...$$
  html = html.replace(/\$\$([\s\S]*?)\$\$/g, (_, latex) => {
    try {
      const rendered = katex.renderToString(latex.trim(), {
        displayMode: true,
        throwOnError: false,
        errorColor: '#94a3b8',
        output: 'html',
      });
      return `<span class="math-block">${rendered}</span>`;
    } catch {
      return `<span class="math-block text-slate-400">[${latex.trim().substring(0, 20)}...]</span>`;
    }
  });

  // Inline math: $...$
  html = html.replace(/\$(?!\$)([^\$\n]+?)\$(?!\$)/g, (_, latex) => {
    try {
      const rendered = katex.renderToString(latex.trim(), {
        displayMode: false,
        throwOnError: false,
        errorColor: '#94a3b8',
        output: 'html',
      });
      return `<span class="math-inline">${rendered}</span>`;
    } catch {
      return `<span class="math-inline text-slate-400">[${latex.trim().substring(0, 15)}]</span>`;
    }
  });

  return html;
}

/**
 * Convert TipTap JSON to HTML
 */
function jsonToHtml(json: any): string {
  if (!json || !json.content) return '';

  const processNode = (node: any): string => {
    if (!node) return '';

    switch (node.type) {
      case 'doc':
        return (node.content || []).map(processNode).join('');
      
      case 'paragraph': {
        const pContent = (node.content || []).map(processNode).join('');
        if (!pContent.trim()) return '';
        const align = node.attrs?.textAlign;
        const style = align ? ` style="text-align:${align}"` : '';
        return `<p${style}>${pContent}</p>`;
      }
      
      case 'heading': {
        const level = Math.min(node.attrs?.level || 1, 3);
        const hContent = (node.content || []).map(processNode).join('');
        return `<h${level}>${hContent}</h${level}>`;
      }
      
      case 'text': {
        let text = node.text || '';
        if (node.marks) {
          node.marks.forEach((mark: any) => {
            switch (mark.type) {
              case 'bold':
                text = `<strong>${text}</strong>`;
                break;
              case 'italic':
                text = `<em>${text}</em>`;
                break;
              case 'textStyle':
                if (mark.attrs?.color) {
                  text = `<span style="color:${mark.attrs.color}">${text}</span>`;
                }
                break;
            }
          });
        }
        return text;
      }
      
      case 'bulletList':
        return `<ul>${(node.content || []).map(processNode).join('')}</ul>`;
      
      case 'orderedList':
        return `<ol>${(node.content || []).map(processNode).join('')}</ol>`;
      
      case 'listItem': {
        const liContent = (node.content || []).map(processNode).join('');
        // Remove wrapping <p> tags inside list items for cleaner rendering
        const cleanContent = liContent.replace(/^<p>(.*)<\/p>$/s, '$1');
        return `<li>${cleanContent}</li>`;
      }
      
      case 'blockquote':
        return `<blockquote>${(node.content || []).map(processNode).join('')}</blockquote>`;
      
      case 'image':
        return ''; // Skip images in preview
      
      case 'hardBreak':
        return ' ';
      
      default:
        if (node.content) {
          return (node.content || []).map(processNode).join('');
        }
        return '';
    }
  };

  return processNode(json);
}

export default ContentPreview;