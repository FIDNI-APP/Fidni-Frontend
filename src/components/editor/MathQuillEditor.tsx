import React, { useEffect, useRef, useState } from 'react';

// Declare MathQuill on window (loaded via CDN)
declare global {
  interface Window {
    MathQuill: any;
  }
}

interface MathQuillEditorProps {
  content?: string;
  onChange?: (latex: string, html: string) => void;
  placeholder?: string;
  readOnly?: boolean;
}

/**
 * MathQuill-based editor for mathematical content
 * Much simpler than TipTap and specifically designed for math
 */
const MathQuillEditor: React.FC<MathQuillEditorProps> = ({
  content = '',
  onChange,
  placeholder = 'Type your mathematical content here...',
  readOnly = false,
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const mathFieldRef = useRef<any>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!editorRef.current) return;

    // Wait for MathQuill to load from CDN
    if (typeof window.MathQuill === 'undefined') {
      console.error('MathQuill not loaded');
      return;
    }

    // Initialize MathQuill
    const MQ = window.MathQuill.getInterface(2);

    // Create the math field
    const mathField = MQ.MathField(editorRef.current, {
      spaceBehavesLikeTab: true, // Easier navigation with space
      leftRightIntoCmdGoes: 'up', // Better cursor movement
      restrictMismatchedBrackets: true, // Auto-close brackets
      sumStartsWithNEquals: true, // Better sum notation
      supSubsRequireOperand: true, // Cleaner superscripts/subscripts
      charsThatBreakOutOfSupSub: '+-=<>', // Better navigation
      autoSubscriptNumerals: true, // Auto subscript numbers
      handlers: {
        edit: function(mathField: any) {
          const latex = mathField.latex();
          const html = mathField.html();

          // Wrap in $ delimiters for rendering
          const wrappedLatex = `$${latex}$`;

          if (onChange) {
            onChange(latex, wrappedLatex);
          }
        },
      },
    });

    mathFieldRef.current = mathField;

    // Set initial content if provided
    if (content) {
      // Remove $ delimiters if present
      const cleanContent = content.replace(/^\$+|\$+$/g, '');
      mathField.latex(cleanContent);
    }

    setIsReady(true);

    // Cleanup
    return () => {
      if (mathFieldRef.current) {
        mathFieldRef.current = null;
      }
    };
  }, []);

  // Update content when it changes externally
  useEffect(() => {
    if (mathFieldRef.current && content !== undefined) {
      const currentLatex = mathFieldRef.current.latex();
      const cleanContent = content.replace(/^\$+|\$+$/g, '');

      if (cleanContent !== currentLatex) {
        mathFieldRef.current.latex(cleanContent);
      }
    }
  }, [content]);

  // Handle read-only mode
  useEffect(() => {
    if (mathFieldRef.current) {
      if (readOnly) {
        mathFieldRef.current.config({ readOnly: true });
      } else {
        mathFieldRef.current.config({ readOnly: false });
      }
    }
  }, [readOnly]);

  return (
    <div className="mathquill-editor-wrapper">
      <div
        ref={editorRef}
        className={`mathquill-editor ${!isReady ? 'opacity-50' : 'opacity-100'}`}
        style={{
          minHeight: '300px',
          padding: '20px',
          fontSize: '18px',
          fontFamily: 'Latin Modern Roman, Computer Modern, serif',
          border: '2px solid #e5e7eb',
          borderRadius: '8px',
          backgroundColor: 'white',
          cursor: readOnly ? 'default' : 'text',
        }}
      />

      {!isReady && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-gray-500">Loading editor...</div>
        </div>
      )}

      <style>{`
        .mathquill-editor-wrapper {
          position: relative;
          width: 100%;
        }

        /* MathQuill editor styling */
        .mq-editable-field {
          border: none !important;
          box-shadow: none !important;
        }

        .mq-editable-field.mq-focused {
          outline: 2px solid #6366f1 !important;
          outline-offset: 2px;
        }

        /* Cursor styling */
        .mq-cursor {
          border-left: 2px solid #4f46e5 !important;
          animation: blink 1s infinite;
        }

        @keyframes blink {
          0%, 49% { opacity: 1; }
          50%, 100% { opacity: 0; }
        }

        /* Selected text */
        .mq-selection {
          background-color: rgba(99, 102, 241, 0.2) !important;
        }

        /* Font styling */
        .mq-math-mode {
          font-family: 'Latin Modern Roman', 'Computer Modern', serif !important;
        }

        /* Better spacing */
        .mq-root-block {
          padding: 8px;
        }
      `}</style>
    </div>
  );
};

export default MathQuillEditor;
