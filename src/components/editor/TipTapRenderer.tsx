import React, { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Image from '@tiptap/extension-image';
import Mathematics from '@tiptap-pro/extension-mathematics';
import 'katex/dist/katex.min.css';

interface TipTapRendererProps {
  content: string;
  className?: string;
  maxHeight?: string;
  compact?: boolean;
  theme?: 'light' | 'dark' | 'print' | 'pastel';
}

const TipTapRenderer: React.FC<TipTapRendererProps> = ({ 
  content, 
  className = '',
  maxHeight,
  compact = true,
  theme = 'light'
}) => {
  // Initialize read-only TipTap editor for content rendering
  const editor = useEditor({
    extensions: [
      StarterKit,
      TextStyle,
      Color,
      // Configure Image extension with proper options
      Image.configure({
        HTMLAttributes: {
          class: 'content-image rounded-lg shadow-sm',
          loading: 'lazy',
        },
        allowBase64: true,
      }),
      
      Mathematics.configure({
        // Use standard LaTeX syntax ($ for inline, $ for block)
        regex: /\$([^\$]+)\$|\$\$([^\$]+)\$\$/gi,
        // Configure KaTeX options if needed
        katexOptions: {
          throwOnError: false,
          strict: false,
          displayMode: true
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

  // Get theme-specific classes
  const getThemeClasses = () => {
    switch (theme) {
      case 'dark':
        return 'bg-gray-900 text-gray-100';
      case 'print':
        return 'bg-white text-gray-900 print:font-serif';
      case 'pastel':
        return 'bg-blue-50 text-gray-800';
      case 'light':
      default:
        return 'bg-white text-gray-800';
    }
  };

  // Style based on props
  const containerStyle: React.CSSProperties = {
    ...(maxHeight ? { maxHeight, overflow: 'auto' } : {}),
  };

  // Add class based on compact mode and theme
  const containerClass = `tiptap-readonly-editor latex-style rounded-lg p-4 ${
    compact ? 'tiptap-compact text-base' : 'text-lg'
  } ${getThemeClasses()} ${className}`;

  return (
    <div style={containerStyle} className={containerClass}>
      <EditorContent editor={editor} />
      
      {/* Custom styling for the renderer */}
      <style jsx>{`
        .tiptap-readonly-editor {
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          border: 1px solid rgba(0, 0, 0, 0.1);
          border-radius: 0.5rem;
          transition: all 0.2s ease;
        }
        
        .tiptap-readonly-editor:hover {
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        
        .tiptap-compact .ProseMirror {
          padding: 0.5rem;
        }
        
        .content-image {
          display: block;
          margin: 1rem auto;
          max-width: 100%;
          height: auto;
        }
        
        /* Math styling */
        .katex-display {
          margin: 1.5em 0;
          overflow-x: auto;
          overflow-y: hidden;
        }
        
        /* Print optimization */
        @media print {
          .tiptap-readonly-editor {
            box-shadow: none;
            border: none;
          }
          
          .katex {
            color: black !important;
          }
        }
      `}</style>
    </div>
  );
};

export default TipTapRenderer;