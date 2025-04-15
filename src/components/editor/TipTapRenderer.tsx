import React, { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Image from '@tiptap/extension-image';
import Mathematics from '@tiptap-pro/extension-mathematics';
import 'katex/dist/katex.min.css';
import TextAlign from '@tiptap/extension-text-align';

interface TipTapRendererProps {
  content: string;
  className?: string;
  maxHeight?: string;
  compact?: boolean;
  onReady?: () => void;
}

const TipTapRenderer: React.FC<TipTapRendererProps> = ({ 
  content, 
  className = '',
  maxHeight,
  compact = true,
  onReady 
}) => {
  // Initialize read-only TipTap editor for content rendering
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      TextStyle,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Color,
      Image.configure({
        HTMLAttributes: {
          class: 'content-image rounded-lg max-w-full',
          loading: 'lazy',
        },
        allowBase64: true,
      }),
      Mathematics.configure({
        regex: /\$([^\$]+)\$|\$\$([^\$]+)\$\$/gi,
        katexOptions: {
          throwOnError: false,
          strict: false
        },
        shouldRender: (state, pos, node) => {
          const $pos = state.doc.resolve(pos);
          return node.type.name === 'text' && $pos.parent.type.name !== 'codeBlock';
        }
      })
    ],
    content: content,
    editable: false,
  });

  // Simple effect to update content when it changes
  useEffect(() => {
    if (editor && content) {
      if (editor.getHTML() !== content) {
        editor.commands.setContent(content);
      }
    }
  }, [editor, content]);

  // Simple effect to notify when editor is ready
  useEffect(() => {
    if (editor && onReady) {
      // Simple timeout to ensure content has been processed
      setTimeout(() => {
        onReady();
      }, 300);
    }
  }, [editor, onReady]);

  // Style based on props
  const containerStyle: React.CSSProperties = {
    ...(maxHeight ? { maxHeight, overflow: 'auto' } : {}),
  };

  // Add class based on compact mode
  const containerClass = `tiptap-readonly-editor latex-style text-lg ${compact ? 'tiptap-compact' : ''} ${className}`;

  return (
    <div style={containerStyle} className={containerClass}>
      <EditorContent editor={editor} />
    </div>
  );
};

export default TipTapRenderer;