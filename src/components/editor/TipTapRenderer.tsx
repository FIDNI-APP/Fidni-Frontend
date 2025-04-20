import React, { useState, useEffect, memo } from 'react';
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

// Create a wrapper component that handles visibility
const TipTapRendererWithLoadingState: React.FC<TipTapRendererProps> = (props) => {
  const [isReady, setIsReady] = useState(false);
  
  // Handler to set ready state
  const handleReady = () => {
    setIsReady(true);
    // Also call the original onReady if provided
    if (props.onReady) {
      props.onReady();
    }
  };
  
  return (
    <div style={{ 
      visibility: isReady ? 'visible' : 'hidden',
      position: 'relative',
      minHeight: '1rem'
    }}>
      {/* Hide the real content until it's ready */}
      <div style={{ 
        opacity: isReady ? 1 : 0,
        transition: 'opacity 150ms ease-in-out'
      }}>
        <TipTapRenderer {...props} onReady={handleReady} />
      </div>
      
      {/* Show nothing while loading (no placeholder) */}
      {!isReady && (
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%' }}>
          {/* Intentionally empty */}
        </div>
      )}
    </div>
  );
};

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

  // Update content when it changes
  useEffect(() => {
    if (editor && content) {
      if (editor.getHTML() !== content) {
        editor.commands.setContent(content);
      }
    }
  }, [editor, content]);

  // Notify when editor is ready
  useEffect(() => {
    if (editor && onReady) {
      // Wait a bit to ensure content has been processed
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

// Create a memoized version for better performance
const MemoizedTipTapRenderer = memo(TipTapRendererWithLoadingState);

export default MemoizedTipTapRenderer;