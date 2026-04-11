// ============================================
// FILE: editor/TipTapRenderer.tsx
// Full renderer for detailed views (NOT for cards)
// ============================================

import React, { useEffect, useState, memo } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { TextAlign } from '@tiptap/extension-text-align';
import { Heading } from '@tiptap/extension-heading';
import { BulletList } from '@tiptap/extension-bullet-list';
import { OrderedList } from '@tiptap/extension-ordered-list';
import { ListItem } from '@tiptap/extension-list-item';
import ImageResize from 'tiptap-extension-resize-image';
import { RealTimeMathExtension } from './MathExtension';
import { CalloutExtension } from './extensions/CalloutExtension';

interface TipTapRendererProps {
  content: string;
  className?: string;
  onReady?: () => void;
}

const TipTapRenderer: React.FC<TipTapRendererProps> = memo(({
  content,
  className = '',
  onReady,
}) => {
  const [isReady, setIsReady] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        bulletList: false,
        orderedList: false,
        listItem: false,
      }),
      TextStyle,
      Color,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Heading.configure({ levels: [1, 2] }),
      BulletList.configure({ HTMLAttributes: { class: 'list-disc pl-5' } }),
      OrderedList.configure({ HTMLAttributes: { class: 'list-decimal pl-5' } }),
      ListItem,
      ImageResize.configure({
        allowBase64: true,
        inline: false,
        HTMLAttributes: { class: 'renderer-image' },
      }),
      RealTimeMathExtension.configure({
        delimiters: [
          { left: '$$', right: '$$', display: true },
          { left: '$', right: '$', display: false },
        ],
      }),
      CalloutExtension,
    ],
    content: content || '<p></p>',
    editable: false,
    onCreate: () => {
      setTimeout(() => {
        setIsReady(true);
        onReady?.();
      }, 150);
    },
  });

  useEffect(() => {
    if (!editor || !content) return;
    
    try {
      let parsedContent = content;
      if (typeof content === 'string' && content.trim().startsWith('{')) {
        try {
          parsedContent = JSON.parse(content);
        } catch {
          // HTML/text content
        }
      }
      editor.commands.setContent(parsedContent);
    } catch (error) {
      console.error('Error updating content:', error);
    }
  }, [editor, content]);

  if (!editor) return null;

  return (
    <div className={`tiptap-full-renderer ${className}`}>
      <div className={`transition-opacity duration-200 ${isReady ? 'opacity-100' : 'opacity-0'}`}>
        <EditorContent editor={editor} />
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
        
        .tiptap-full-renderer .renderer-image {
          display: block;
          margin: 1rem auto;
          max-width: 100%;
          border-radius: 0.5rem;
        }
        
        .tiptap-full-renderer .math-source-hidden {
          font-size: 0 !important;
          line-height: 0 !important;
          width: 0 !important;
          height: 0 !important;
          opacity: 0 !important;
          pointer-events: none !important;
          position: absolute !important;
        }
        
        .tiptap-full-renderer .math-inline {
          display: inline-block;
          vertical-align: middle;
          margin: 0 2px;
        }
        
        .tiptap-full-renderer .math-display {
          display: block;
          margin: 1em 0;
          text-align: center;
          width: 100%;
        }

        /* Callout boxes */
        .tiptap-full-renderer .callout-block {
          margin: 1rem 0;
        }

        .tiptap-full-renderer [data-callout-type] {
          border-radius: 0.5rem;
          padding: 1rem;
          margin: 1rem 0;
          border-left-width: 4px;
          box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
        }

        /* Callout type colors */
        .tiptap-full-renderer [data-callout-type="theorem"] {
          background-color: #eff6ff;
          border-left-color: #3b82f6;
          color: #1e3a8a;
        }

        .tiptap-full-renderer [data-callout-type="property"] {
          background-color: #eef2ff;
          border-left-color: #6366f1;
          color: #312e81;
        }

        .tiptap-full-renderer [data-callout-type="definition"] {
          background-color: #f5f3ff;
          border-left-color: #8b5cf6;
          color: #4c1d95;
        }

        .tiptap-full-renderer [data-callout-type="lemma"] {
          background-color: #ecfeff;
          border-left-color: #06b6d4;
          color: #164e63;
        }

        .tiptap-full-renderer [data-callout-type="corollary"] {
          background-color: #f0fdfa;
          border-left-color: #14b8a6;
          color: #134e4a;
        }

        .tiptap-full-renderer [data-callout-type="example"] {
          background-color: #fffbeb;
          border-left-color: #f59e0b;
          color: #78350f;
        }

        .tiptap-full-renderer [data-callout-type="remark"] {
          background-color: #f8fafc;
          border-left-color: #94a3b8;
          color: #1e293b;
        }

        .tiptap-full-renderer [data-callout-type="proof"] {
          background-color: #ecfdf5;
          border-left-color: #10b981;
          color: #064e3b;
        }

        .tiptap-full-renderer [data-callout-type="method"] {
          background-color: #faf5ff;
          border-left-color: #a855f7;
          color: #581c87;
        }

        .tiptap-full-renderer [data-callout-type="warning"] {
          background-color: #fef2f2;
          border-left-color: #ef4444;
          color: #7f1d1d;
        }

        /* Mobile-specific fixes */
        @media (max-width: 640px) {
          .tiptap-full-renderer .ProseMirror {
            min-width: 0 !important;
            max-width: 100% !important;
          }

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
}, (prevProps, nextProps) => prevProps.content === nextProps.content);

export default TipTapRenderer;