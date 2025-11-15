import React, { useState, useRef, useEffect } from 'react';
import {
  Type,
  Divide,
  Sigma,
  Infinity,
  Pi,
  SquareRoot,
  Superscript,
  Subscript
} from 'lucide-react';

// Declare MathQuill on window (loaded via CDN)
declare global {
  interface Window {
    MathQuill: any;
  }
}

interface SimpleMathEditorProps {
  content?: string;
  setContent?: React.Dispatch<React.SetStateAction<string>>;
  initialContent?: string;
  onChange?: (content: string) => void;
  placeholder?: string;
}

/**
 * Simple MathQuill-based mathematical editor
 * Much simpler than TipTap, designed specifically for math content
 */
const SimpleMathEditor: React.FC<SimpleMathEditorProps> = ({
  content,
  setContent,
  initialContent,
  onChange,
  placeholder = 'Type your mathematical content here...',
}) => {
  const editorContent = initialContent || content || '';
  const handleChange = onChange || setContent || (() => {});

  const editorRef = useRef<HTMLDivElement>(null);
  const mathFieldRef = useRef<any>(null);
  const [isReady, setIsReady] = useState(false);

  // Initialize MathQuill
  useEffect(() => {
    if (!editorRef.current) return;

    // Wait for MathQuill to load from CDN
    const initMathQuill = () => {
      if (typeof window.MathQuill === 'undefined') {
        setTimeout(initMathQuill, 100);
        return;
      }

      const MQ = window.MathQuill.getInterface(2);

      // Create the math field
      const mathField = MQ.MathField(editorRef.current, {
        spaceBehavesLikeTab: false, // Keep space for LaTeX spacing
        leftRightIntoCmdGoes: 'up',
        restrictMismatchedBrackets: true,
        sumStartsWithNEquals: true,
        supSubsRequireOperand: false,
        charsThatBreakOutOfSupSub: '+-=<>',
        autoSubscriptNumerals: true,
        handlers: {
          edit: function(mathField: any) {
            const latex = mathField.latex();
            // Wrap in $ delimiters for rendering
            const wrappedContent = `<p>$${latex}$</p>`;
            handleChange(wrappedContent);
          },
        },
      });

      mathFieldRef.current = mathField;

      // Set initial content if provided
      if (editorContent) {
        // Extract LaTeX from HTML/wrapped content
        const latexMatch = editorContent.match(/\$([^$]+)\$/);
        if (latexMatch) {
          mathField.latex(latexMatch[1]);
        } else {
          // Try to extract from <p> tags
          const cleanContent = editorContent.replace(/<\/?p>/g, '').replace(/\$/g, '');
          if (cleanContent.trim()) {
            mathField.latex(cleanContent);
          }
        }
      }

      setIsReady(true);
    };

    initMathQuill();

    // Cleanup
    return () => {
      if (mathFieldRef.current) {
        mathFieldRef.current = null;
      }
    };
  }, []);

  // Insert LaTeX command into editor
  const insertLatex = (latex: string) => {
    if (mathFieldRef.current) {
      mathFieldRef.current.write(latex);
      mathFieldRef.current.focus();
    }
  };

  // Insert command and move cursor into it
  const insertCommand = (command: string) => {
    if (mathFieldRef.current) {
      mathFieldRef.current.cmd(command);
      mathFieldRef.current.focus();
    }
  };

  // Toolbar buttons configuration
  const mathButtons = [
    { label: 'Fraction', icon: <Divide className="w-4 h-4" />, action: () => insertCommand('\\frac') },
    { label: 'Superscript', icon: <Superscript className="w-4 h-4" />, action: () => insertCommand('^') },
    { label: 'Subscript', icon: <Subscript className="w-4 h-4" />, action: () => insertCommand('_') },
    { label: 'Square Root', icon: <SquareRoot className="w-4 h-4" />, action: () => insertCommand('\\sqrt') },
    { label: 'Sum', icon: <Sigma className="w-4 h-4" />, action: () => insertLatex('\\sum') },
    { label: 'Integral', icon: <Type className="w-4 h-4" />, action: () => insertLatex('\\int') },
    { label: 'Infinity', icon: <Infinity className="w-4 h-4" />, action: () => insertLatex('\\infty') },
    { label: 'Pi', icon: <Pi className="w-4 h-4" />, action: () => insertLatex('\\pi') },
  ];

  // Greek letters
  const greekLetters = [
    { label: 'α', latex: '\\alpha' },
    { label: 'β', latex: '\\beta' },
    { label: 'γ', latex: '\\gamma' },
    { label: 'δ', latex: '\\delta' },
    { label: 'ε', latex: '\\epsilon' },
    { label: 'θ', latex: '\\theta' },
    { label: 'λ', latex: '\\lambda' },
    { label: 'μ', latex: '\\mu' },
    { label: 'π', latex: '\\pi' },
    { label: 'σ', latex: '\\sigma' },
    { label: 'φ', latex: '\\phi' },
    { label: 'ω', latex: '\\omega' },
  ];

  return (
    <div className="simple-math-editor bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Toolbar */}
      <div className="border-b border-gray-200 p-3 bg-gray-50">
        <div className="flex flex-wrap gap-2 mb-3">
          {mathButtons.map((button, index) => (
            <button
              key={index}
              onClick={button.action}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-white border border-gray-300 rounded-md hover:bg-indigo-50 hover:border-indigo-400 transition-all"
              title={button.label}
            >
              {button.icon}
              <span className="hidden sm:inline">{button.label}</span>
            </button>
          ))}
        </div>

        {/* Greek letters */}
        <div className="flex flex-wrap gap-1">
          <span className="text-xs text-gray-600 mr-2 py-1">Greek:</span>
          {greekLetters.map((letter, index) => (
            <button
              key={index}
              onClick={() => insertLatex(letter.latex)}
              className="px-2 py-1 text-sm bg-white border border-gray-200 rounded hover:bg-indigo-50 hover:border-indigo-400 transition-all"
              title={letter.latex}
            >
              {letter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Editor */}
      <div className="p-6">
        {!isReady && (
          <div className="text-center text-gray-500 py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            Loading math editor...
          </div>
        )}

        <div
          ref={editorRef}
          className={`mathquill-container ${!isReady ? 'hidden' : ''}`}
          style={{
            minHeight: '400px',
            fontSize: '20px',
            fontFamily: 'Latin Modern Roman, Computer Modern, serif',
            padding: '20px',
            border: '2px solid #e5e7eb',
            borderRadius: '8px',
            backgroundColor: 'white',
          }}
        />
      </div>

      <style>{`
        /* MathQuill editor styling */
        .mathquill-container .mq-editable-field {
          border: none !important;
          box-shadow: none !important;
          min-height: 400px;
        }

        .mathquill-container .mq-editable-field.mq-focused {
          outline: none !important;
        }

        .mathquill-container:focus-within {
          border-color: #6366f1 !important;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
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
          padding: 12px;
        }

        /* Placeholder */
        .mq-empty:after {
          content: "${placeholder}";
          color: #9ca3af;
          font-style: italic;
        }
      `}</style>
    </div>
  );
};

export default SimpleMathEditor;
