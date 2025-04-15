import React, { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Image from '@tiptap/extension-image';
import Mathematics from '@tiptap-pro/extension-mathematics';
import 'katex/dist/katex.min.css';
import TextAlign from '@tiptap/extension-text-align';
// Suppression de l'import Heading car il est déjà inclus dans StarterKit

interface TipTapRendererProps {
  content: string;
  className?: string;
  maxHeight?: string;
  compact?: boolean;
}

const TipTapRenderer: React.FC<TipTapRendererProps> = ({ 
  content, 
  className = '',
  maxHeight,
  compact = true
}) => {
  // Initialize read-only TipTap editor for content rendering
  const editor = useEditor({
    extensions: [
      // Configurer StarterKit pour personnaliser l'extension heading
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
      // Configure Image extension with proper options
      Image.configure({
        HTMLAttributes: {
          class: 'content-image rounded-lg max-w-full',
          loading: 'lazy',
        },
        allowBase64: true,
      }),
      
      Mathematics.configure({
        // Use standard LaTeX syntax ($ for inline, $$ for block)
        regex: /\$([^\$]+)\$|\$\$([^\$]+)\$\$/gi,
        // Configure KaTeX options if needed
        katexOptions: {
          throwOnError: false,
          strict: false
        },
        // Only render in non-code blocks
        shouldRender: (state, pos, node) => {
          const $pos = state.doc.resolve(pos);
          return node.type.name === 'text' && $pos.parent.type.name !== 'codeBlock';
        }
      })
    ],
    content: content,
    editable: false, // Make it read-only
  });

  // Effet pour mettre à jour le contenu lorsqu'il change
  useEffect(() => {
    if (editor && content) {
      // Seulement mettre à jour si le contenu est différent pour éviter les boucles infinies
      if (editor.getHTML() !== content) {
        editor.commands.setContent(content);
      }
    }
  }, [editor, content]);

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