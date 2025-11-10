// Modified version of your TipTapRenderer.tsx
import React, { useState, useRef, useEffect, Component, ErrorInfo, ReactNode } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import {TextStyle} from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import TextAlign from '@tiptap/extension-text-align';
import ListItem from '@tiptap/extension-list-item';
import BulletList from '@tiptap/extension-bullet-list';
import OrderedList from '@tiptap/extension-ordered-list';
import Heading from '@tiptap/extension-heading';
import ImageResize from 'tiptap-extension-resize-image';
import { useNavigate } from 'react-router-dom';
import { Highlighter, Pen, Type, Eraser, Trash2, X } from 'lucide-react';
import { RealTimeMathExtension } from './RealTimeMathExtension';

// Error Boundary for TipTap renderer
interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class TipTapErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('TipTap Renderer Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <h3 className="text-red-800 font-semibold mb-2">Error rendering content</h3>
          <p className="text-red-600 text-sm">
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="mt-2 px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

interface TipTapRendererProps {
  content: string;
  className?: string;
  maxHeight?: string;
  notebookStyle?: boolean;
  notebookTheme?: {
    bgColor: string;
    lineColor: string;
    isGrid: boolean;
    lineSpacing: number;
  };
  enableAnnotations?: boolean;
  compact?: boolean;
  onReady?: () => void;
  lessonId?: string;
}

// Define notebook themes within the component
const defaultNotebookThemes = {
  ruled: {
    bgColor: '#ffffff',
    lineColor: '#e5e7eb',
    isGrid: false,
    lineSpacing: 2
  },
  grid: {
    bgColor: '#ffffff',
    lineColor: '#e5e7eb',
    isGrid: true,
    lineSpacing: 2
  },
  vintage: {
    bgColor: '#fffbeb',
    lineColor: '#e9e4d3',
    isGrid: false,
    lineSpacing: 2
  },
  dark: {
    bgColor: '#1f2937',
    lineColor: '#374151',
    isGrid: false,
    lineSpacing: 2
  }
};

// Annotation type
type Annotation = {
  id: string;
  type: 'highlight' | 'note' | 'pen';
  position: { x: number; y: number; width?: number; height?: number };
  color: string;
  content?: string;
  path?: string;
};

const TipTapRenderer: React.FC<TipTapRendererProps> = ({ 
  content, 
  className = '',
  maxHeight,
  notebookStyle = false,
  notebookTheme = defaultNotebookThemes.ruled,
  enableAnnotations = false,
  compact = true,
  onReady,
  lessonId
}) => {
  // For navigation
  const navigate = useNavigate();
  
  // State for content loading
  const [contentLoaded, setContentLoaded] = useState(false);
  
  // States for annotation functionality
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [activeTool, setActiveTool] = useState<'highlight' | 'note' | 'pen' | 'eraser' | null>(null);
  const [activeColor, setActiveColor] = useState('#ffeb3b'); // Default yellow for highlighting
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState('');
  
  // Refs for annotation layer
  const annotationLayerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  
  // Color palette for annotations
  const colorPalette = ['#ffeb3b', '#4caf50', '#2196f3', '#f44336', '#9c27b0'];

  // Initialize TipTap editor for content rendering
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        bulletList: false,
        orderedList: false,
        listItem: false,
      }),
      TextStyle,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Color,
      Heading.configure({
        levels: [1, 2],
      }),
      BulletList.configure({
        HTMLAttributes: {
          class: 'list-disc pl-5',
        },
      }),
      OrderedList.configure({
        HTMLAttributes: {
          class: 'list-decimal pl-5',
        },
      }),
      ListItem,
      ImageResize.configure({
        allowBase64: true,
        inline: false,
        HTMLAttributes: {
          class: 'content-image rounded-lg max-w-full',
        },
      }),
      RealTimeMathExtension.configure({
        delimiters: [
          { left: '$$', right: '$$', display: true },
          { left: '$', right: '$', display: false },
        ],
      }),
    ],
    content: content,
    editable: false,
  });


  // Update content when it changes
  useEffect(() => {
    if (!editor || !content) return;

    try {
      // Parse content to determine if it's JSON or HTML
      let parsedContent = content;

      // Try to parse as JSON first (TipTap format)
      try {
        if (typeof content === 'string' && content.trim().startsWith('{')) {
          parsedContent = JSON.parse(content);
        }
      } catch (parseError) {
        // If parsing fails, treat as HTML/plain text
        console.log('Content is not JSON, treating as HTML/text');
      }

      // Use requestAnimationFrame for smooth updates
      const rafId = requestAnimationFrame(() => {
        try {
          // Only update if content actually changed
          const currentContent = editor.getJSON();
          const contentChanged = JSON.stringify(currentContent) !== JSON.stringify(parsedContent);

          if (contentChanged) {
            editor.commands.setContent(parsedContent, false);
          }
        } catch (error) {
          console.error('Error updating editor content:', error);
        }
      });

      return () => cancelAnimationFrame(rafId);
    } catch (error) {
      console.error('Error in content update effect:', error);
    }
  }, [editor, content]);

  // Notify when editor is ready and setup clickable headings
  useEffect(() => {
    if (!editor) return;

    let mounted = true;

    // Wait for MathJax and content to be fully rendered
    const checkRendering = async () => {
      try {
        // Initial delay
        await new Promise(resolve => setTimeout(resolve, 100));

        // Check if editor view is available before accessing DOM
        if (!editor.view || !editor.view.dom) {
          if (mounted) {
            setContentLoaded(true);
            if (onReady) onReady();
          }
          return;
        }

        // Check if MathJax SVG elements are rendered
        const editorElement = editor.view.dom;
        const mathElements = editorElement.querySelectorAll('.math-inline, .math-display');

        if (mathElements.length > 0) {
          // Wait for MathJax to be fully rendered
          let attempts = 0;
          let allRendered = false;

          while (!allRendered && attempts < 10 && mounted) {
            allRendered = Array.from(mathElements).every(el => {
              const hasSvg = el.querySelector('svg');
              const hasHeight = (el as HTMLElement).offsetHeight > 0;
              return hasSvg && hasHeight;
            });

            if (!allRendered) {
              await new Promise(resolve => setTimeout(resolve, 50));
              attempts++;
            }
          }
        }

        if (mounted) {
          setContentLoaded(true);

          // Setup clickable titles after content is loaded
          if (lessonId) {
            setupClickableHeadings();
          }

          if (onReady) onReady();
        }
      } catch (error) {
        console.error('Error in rendering check:', error);
        if (mounted) {
          setContentLoaded(true);
          if (onReady) onReady();
        }
      }
    };

    checkRendering();

    return () => {
      mounted = false;
    };
  }, [editor, onReady, lessonId]);
  
  // Setup clickable headings for navigation to lesson detail
  const setupClickableHeadings = () => {
    if (!editor || !lessonId) return;

    try {
      // Find all h1, h2, h3 elements in the editor
      const editorElement = editor.view.dom;
      const headings = editorElement.querySelectorAll('h1, h2, h3');

      // Add click handlers to each heading
      headings.forEach(heading => {
        try {
          (heading as HTMLElement).style.cursor = 'pointer';
          heading.classList.add('hover:text-indigo-600', 'transition-colors');

          // Add hover effect for better UX
          const handleMouseOver = () => {
            heading.classList.add('text-indigo-500');
          };

          const handleMouseOut = () => {
            heading.classList.remove('text-indigo-500');
          };

          // Add click handler
          const handleClick = (e: Event) => {
            e.stopPropagation();
            e.preventDefault();
            navigate(`/lessons/${lessonId}`);
          };

          heading.addEventListener('mouseover', handleMouseOver);
          heading.addEventListener('mouseout', handleMouseOut);
          heading.addEventListener('click', handleClick);

          // Store handlers for cleanup (optional, helps prevent memory leaks)
          (heading as any)._headingHandlers = {
            handleMouseOver,
            handleMouseOut,
            handleClick
          };
        } catch (error) {
          console.error('Error setting up heading click handler:', error);
        }
      });
    } catch (error) {
      console.error('Error in setupClickableHeadings:', error);
    }
  };

  // Toggle active tool (improved to allow cancelling the active tool)
  const toggleTool = (tool: 'highlight' | 'note' | 'pen' | 'eraser') => {
    if (activeTool === tool) {
      // If clicking the active tool, deactivate it
      setActiveTool(null);
    } else {
      // Otherwise, activate the clicked tool
      setActiveTool(tool);
    }
  };

  // Annotation event handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!enableAnnotations || !activeTool) return;
    
    const annotationLayer = annotationLayerRef.current;
    if (!annotationLayer) return;
    
    setIsDrawing(true);
    
    const rect = annotationLayer.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    if (activeTool === 'pen') {
      setCurrentPath(`M ${x} ${y}`);
    } else if (activeTool === 'highlight' || activeTool === 'note') {
      const newAnnotation: Annotation = {
        id: `annotation-${Date.now()}`,
        type: activeTool,
        color: activeColor,
        position: {
          x,
          y,
          width: activeTool === 'highlight' ? 100 : 150,
          height: activeTool === 'highlight' ? 20 : 100,
        },
        content: activeTool === 'note' ? '' : undefined,
      };
      
      setAnnotations(prev => [...prev, newAnnotation]);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing || !activeTool || activeTool !== 'pen') return;
    
    const annotationLayer = annotationLayerRef.current;
    if (!annotationLayer) return;
    
    const rect = annotationLayer.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setCurrentPath(prev => `${prev} L ${x} ${y}`);
  };

  const handleMouseUp = () => {
    if (!isDrawing) return;
    
    if (activeTool === 'pen' && currentPath) {
      const newAnnotation: Annotation = {
        id: `pen-${Date.now()}`,
        type: 'pen',
        color: activeColor,
        position: { x: 0, y: 0 },
        path: currentPath,
      };
      
      setAnnotations(prev => [...prev, newAnnotation]);
      setCurrentPath('');
    }
    
    setIsDrawing(false);
  };

  const handleDeleteAnnotation = (id: string) => {
    setAnnotations(prev => prev.filter(ann => ann.id !== id));
  };

  const handleClearAllAnnotations = () => {
    if (window.confirm('Are you sure you want to clear all annotations?')) {
      setAnnotations([]);
    }
  };

  const handleTextAnnotationChange = (id: string, content: string) => {
    setAnnotations(prev => 
      prev.map(ann => 
        ann.id === id ? { ...ann, content } : ann
      )
    );
  };

  // Generate notebook background style
  const getNotebookStyle = (): React.CSSProperties => {
    if (notebookTheme.isGrid) {
      return {
        backgroundColor: notebookTheme.bgColor,
        backgroundImage: `
          linear-gradient(${notebookTheme.lineColor} 1px, transparent 1px),
          linear-gradient(90deg, ${notebookTheme.lineColor} 1px, transparent 1px)
        `,
        backgroundSize: `${notebookTheme.lineSpacing}rem ${notebookTheme.lineSpacing}rem`,
      };
    } else {
      return {
        backgroundColor: notebookTheme.bgColor,
        backgroundImage: `linear-gradient(${notebookTheme.lineColor} 1px, transparent 1px)`,
        backgroundSize: `100% ${notebookTheme.lineSpacing}rem`,
        backgroundPosition: '0 1rem',
      };
    }
  };

  // Style based on props
  const containerStyle: React.CSSProperties = {
    ...(maxHeight ? { maxHeight, overflow: 'auto' } : {}),
    ...(notebookStyle ? getNotebookStyle() : {}),
  };

  // Add class based on compact mode
  const containerClass = ` tiptap-readonly-editor latex-style text-lg ${compact ? 'tiptap-compact' : ''} ${className}`;

  // Get cursor class based on active tool
  const getCursorClass = () => {
    if (!activeTool) return '';
    
    switch(activeTool) {
      case 'highlight': return 'cursor-highlighter';
      case 'pen': return 'cursor-pen';
      case 'note': return 'cursor-text-note';
      case 'eraser': return 'cursor-eraser';
      default: return '';
    }
  };

  return (
    <TipTapErrorBoundary>
      <div className="relative" ref={containerRef}>
        {/* Annotation Tools (only show if annotations are enabled) */}
        {enableAnnotations && (
        <div className="liquid-glass sticky top-0 z-10 bg-white border-b border-gray-200 px-3 py-2 flex items-center space-x-2 shadow-sm">
          <div className="flex items-center">
            <button
              onClick={() => toggleTool('highlight')}
              className={`p-1.5 rounded mr-1 ${activeTool === 'highlight' ? 'bg-indigo-100 text-indigo-700 shadow-sm' : 'text-gray-700 hover:bg-gray-100'}`}
              title="Highlighter (Click again to cancel)"
            >
              <Highlighter className="w-4 h-4" />
            </button>
            <button
              onClick={() => toggleTool('pen')}
              className={`p-1.5 rounded mr-1 ${activeTool === 'pen' ? 'bg-indigo-100 text-indigo-700 shadow-sm' : 'text-gray-700 hover:bg-gray-100'}`}
              title="Pen (Click again to cancel)"
            >
              <Pen className="w-4 h-4" />
            </button>
            <button
              onClick={() => toggleTool('note')}
              className={`p-1.5 rounded mr-1 ${activeTool === 'note' ? 'bg-indigo-100 text-indigo-700 shadow-sm' : 'text-gray-700 hover:bg-gray-100'}`}
              title="Add Note (Click again to cancel)"
            >
              <Type className="w-4 h-4" />
            </button>
            <button
              onClick={() => toggleTool('eraser')}
              className={`p-1.5 rounded mr-1 ${activeTool === 'eraser' ? 'bg-indigo-100 text-indigo-700 shadow-sm' : 'text-gray-700 hover:bg-gray-100'}`}
              title="Eraser (Click again to cancel)"
            >
              <Eraser className="w-4 h-4" />
            </button>
            
            {activeTool && (
              <button
                onClick={() => setActiveTool(null)}
                className="p-1.5 rounded text-gray-700 hover:bg-gray-100 ml-1"
                title="Cancel Tool"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          
          {/* Color Palette - only show when a color-based tool is active */}
          {(activeTool === 'highlight' || activeTool === 'pen' || activeTool === 'note') && (
            <div className="liquid-glass flex space-x-1 ml-3 items-center">
              <span className="text-xs text-gray-500 mr-1">Color:</span>
              {colorPalette.map(color => (
                <button
                  key={color}
                  onClick={() => setActiveColor(color)}
                  className={`w-5 h-5 rounded-full border ${activeColor === color ? 'ring-2 ring-gray-400 scale-110' : 'hover:scale-110'} transition-transform`}
                  style={{ backgroundColor: color }}
                  title={`Use ${color} color`}
                />
              ))}
            </div>
          )}
          
          {/* Show active tool status */}
          {activeTool && (
            <div className="ml-3 px-2 py-1 bg-gray-100 rounded text-xs text-gray-700">
              {activeTool.charAt(0).toUpperCase() + activeTool.slice(1)} tool active
            </div>
          )}
          
          {/* Clear button */}
          <div className="ml-auto">
            <button
              onClick={handleClearAllAnnotations}
              className={`p-1.5 rounded ${annotations.length > 0 ? 'text-gray-700 hover:bg-gray-100' : 'text-gray-400 cursor-not-allowed'}`}
              title="Clear All Annotations"
              disabled={annotations.length === 0}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
      
      {/* Content Container */}
      <div style={containerStyle} className={containerClass}>
        {/* The actual content */}
        <div 
          className={`relative ${contentLoaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}
          ref={contentRef}
        >
          <EditorContent editor={editor} />
        </div>
        
        {/* Annotation Layer */}
        {enableAnnotations && (
          <div 
            ref={annotationLayerRef}
            className={`absolute inset-0 z-10 pointer-events-none ${getCursorClass()}`}
            style={{ pointerEvents: activeTool ? 'auto' : 'none' }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {/* Render existing annotations */}
            {annotations.map(annotation => {
              if (annotation.type === 'highlight') {
                return (
                  <div
                    key={annotation.id}
                    className="absolute"
                    style={{
                      left: `${annotation.position.x}px`,
                      top: `${annotation.position.y}px`,
                      width: `${annotation.position.width}px`,
                      height: `${annotation.position.height}px`,
                      backgroundColor: annotation.color,
                      opacity: 0.5,
                      pointerEvents: 'auto',
                      cursor: activeTool === 'eraser' ? 'pointer' : 'move',
                    }}
                    onClick={() => activeTool === 'eraser' && handleDeleteAnnotation(annotation.id)}
                  />
                );
              } else if (annotation.type === 'note') {
                return (
                  <div
                    key={annotation.id}
                    className="absolute"
                    style={{
                      left: `${annotation.position.x}px`,
                      top: `${annotation.position.y}px`,
                      minWidth: `${annotation.position.width}px`,
                      minHeight: `${annotation.position.height}px`,
                      pointerEvents: 'auto',
                    }}
                    onClick={() => activeTool === 'eraser' && handleDeleteAnnotation(annotation.id)}
                  >
                    <textarea
                      value={annotation.content || ''}
                      onChange={(e) => handleTextAnnotationChange(annotation.id, e.target.value)}
                      className="w-full h-full p-2 border border-gray-300 rounded resize-both"
                      style={{ 
                        backgroundColor: `${annotation.color}20`,
                        color: annotation.color,
                        fontFamily: 'Comic Sans MS, cursive, sans-serif',
                      }}
                      placeholder="Add your note here..."
                    />
                  </div>
                );
              } else if (annotation.type === 'pen') {
                return (
                  <svg
                    key={annotation.id}
                    className="absolute inset-0 w-full h-full pointer-events-none"
                    style={{ pointerEvents: activeTool === 'eraser' ? 'auto' : 'none' }}
                  >
                    <path
                      d={annotation.path || ''}
                      stroke={annotation.color}
                      strokeWidth="2"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      onClick={() => activeTool === 'eraser' && handleDeleteAnnotation(annotation.id)}
                      style={{ cursor: activeTool === 'eraser' ? 'pointer' : 'default' }}
                    />
                  </svg>
                );
              }
              return null;
            })}
            
            {/* Current drawing path */}
            {isDrawing && currentPath && (
              <svg className="absolute inset-0 w-full h-full pointer-events-none">
                <path
                  d={currentPath}
                  stroke={activeColor}
                  strokeWidth="2"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </div>
        )}
      </div>
      
      {/* CSS for custom cursors and formula rendering */}
      <style>
  {`
        /* Hide source text for formulas */
        .math-source-hidden {
          font-size: 0 !important;
          line-height: 0 !important;
          display: inline !important;
          width: 0 !important;
          height: 0 !important;
          opacity: 0 !important;
          pointer-events: none !important;
          position: absolute !important;
        }

        /* Math styling */
        .math-inline {
          display: inline-block;
          vertical-align: middle;
          margin: 0 2px;
        }

        .math-display {
          display: block;
          margin: 1em 0;
          text-align: center;
          width: 100%;
        }

        .math-editable {
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .math-hover {
          background-color: rgba(99, 102, 241, 0.1);
          border-radius: 4px;
        }

        .math-error {
          color: #f44336;
          background-color: #ffebee;
          padding: 2px 4px;
          border-radius: 3px;
          font-family: monospace;
        }

        /* Custom cursors */
        .cursor-pen {
          cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23000000' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M12 19l7-7 3 3-7 7-3-3z'%3E%3C/path%3E%3Cpath d='M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z'%3E%3C/path%3E%3Cpath d='M2 2l7.586 7.586'%3E%3C/path%3E%3Cpath d='M11 11l2 2'%3E%3C/path%3E%3C/svg%3E") 0 24, auto;
        }
        
        .cursor-highlighter {
          cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23facc15' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M9 11l-6 6v3h9l3-3'%3E%3C/path%3E%3Cpath d='M22 12l-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4'%3E%3C/path%3E%3C/svg%3E") 0 24, auto;
        }
        
        .cursor-text-note {
          cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23000000' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cline x1='17' y1='10' x2='3' y2='10'%3E%3C/line%3E%3Cline x1='21' y1='6' x2='3' y2='6'%3E%3C/line%3E%3Cline x1='21' y1='14' x2='3' y2='14'%3E%3C/line%3E%3Cline x1='17' y1='18' x2='3' y2='18'%3E%3C/line%3E%3C/svg%3E") 0 24, auto;
        }
        
        .cursor-eraser {
          cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23f43f5e' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6'%3E%3C/path%3E%3Cpath d='M15.5 2H18a2 2 0 0 1 2 2v2.5'%3E%3C/path%3E%3Cpath d='M22 13H18V9'%3E%3C/path%3E%3Cpath d='M22 2 11 13'%3E%3C/path%3E%3C/svg%3E") 0 24, auto;
        }
          @media print {
          .tiptap-readonly-editor {
            color: #000 !important;
            background: #fff !important;
          }

          .tiptap-readonly-editor * {
            color: #000 !important;
            background: transparent !important;
          }

          .tiptap-readonly-editor img {
            max-width: 100% !important;
          }

          .ProseMirror {
            overflow: visible !important;
          }
        }

      `}</style>
      </div>
    </TipTapErrorBoundary>
  );
};

export default TipTapRenderer;