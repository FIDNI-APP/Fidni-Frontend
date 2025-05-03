// NotebookContent.tsx
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import TipTapRenderer from '@/components/editor/TipTapRenderer';
import { Highlighter, Pen, Type, Eraser, Trash2, X, Loader2 } from 'lucide-react';

interface NotebookTheme {
  bgColor: string;
  lineColor: string;
  isGrid: boolean;
  lineSpacing: number;
}

interface NotebookContentProps {
  content: string;
  lessonId?: string;
  className?: string;
  notebookTheme?: NotebookTheme;
  onReady?: () => void;
  onSaveAnnotations?: (annotations: Annotation[]) => Promise<void>;
  initialAnnotations?: Annotation[];
}

type Annotation = {
  id: string;
  type: 'highlight' | 'note' | 'pen';
  position: { x: number; y: number; width?: number; height?: number };
  color: string;
  content?: string;
  path?: string;
};

const notebookThemes = {
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

const NotebookContent: React.FC<NotebookContentProps> = ({
  content,
  lessonId,
  className = '',
  notebookTheme = notebookThemes.ruled,
  onReady,
  onSaveAnnotations,
  initialAnnotations = []
}) => {
  const navigate = useNavigate();
  const [contentLoaded, setContentLoaded] = useState(false);
  const [activeTool, setActiveTool] = useState<'highlight' | 'note' | 'pen' | 'eraser' | null>(null);
  const [activeColor, setActiveColor] = useState('#ffeb3b');
  const [annotations, setAnnotations] = useState<Annotation[]>(initialAnnotations);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState('');
  const [startPoint, setStartPoint] = useState<{x: number, y: number} | null>(null);
  const [highlightSize, setHighlightSize] = useState<{width: number, height: number} | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const annotationLayerRef = useRef<HTMLDivElement>(null);
  
  const colorPalette = ['#ffeb3b', '#4caf50', '#2196f3', '#f44336', '#9c27b0'];
  
  // Save annotations whenever they change
  useEffect(() => {
    const save = async () => {
      if (onSaveAnnotations && annotations !== initialAnnotations) {
        setIsSaving(true);
        try {
          await onSaveAnnotations(annotations);
        } catch (error) {
          console.error('Failed to save annotations:', error);
        } finally {
          setIsSaving(false);
        }
      }
    };
    
    const timer = setTimeout(save, 1000); // Debounce saves
    return () => clearTimeout(timer);
  }, [annotations, onSaveAnnotations, initialAnnotations]);

  const handleContentReady = () => {
    setContentLoaded(true);
    setupClickableHeadings();
    if (onReady) onReady();
  };
  
  const setupClickableHeadings = () => {
    if (!contentRef.current || !lessonId) return;
    
    const headings = contentRef.current.querySelectorAll('h1, h2, h3');
    
    headings.forEach(heading => {
      heading.style.cursor = 'pointer';
      heading.classList.add('hover:text-indigo-600', 'transition-colors');
      
      heading.addEventListener('mouseover', () => {
        heading.classList.add('text-indigo-500');
      });
      
      heading.addEventListener('mouseout', () => {
        heading.classList.remove('text-indigo-500');
      });
      
      heading.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        navigate(`/lessons/${lessonId}`);
      });
    });
  };
  
  const toggleTool = (tool: 'highlight' | 'note' | 'pen' | 'eraser') => {
    if (activeTool === tool) {
      setActiveTool(null);
    } else {
      setActiveTool(tool);
    }
  };
  
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!activeTool) return;
    
    const annotationLayer = annotationLayerRef.current;
    if (!annotationLayer) return;
    
    setIsDrawing(true);
    
    const rect = annotationLayer.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setStartPoint({x, y});
    
    if (activeTool === 'pen') {
      setCurrentPath(`M ${x} ${y}`);
    } else if (activeTool === 'note') {
      const newAnnotation: Annotation = {
        id: `annotation-${Date.now()}`,
        type: 'note',
        color: activeColor,
        position: {
          x,
          y,
          width: 150,
          height: 100,
        },
        content: '',
      };
      
      setAnnotations(prev => [...prev, newAnnotation]);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing || !activeTool) return;
    
    const annotationLayer = annotationLayerRef.current;
    if (!annotationLayer) return;
    
    const rect = annotationLayer.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    if (activeTool === 'pen') {
      setCurrentPath(prev => `${prev} L ${x} ${y}`);
    } else if (activeTool === 'highlight' && startPoint) {
      const width = Math.abs(x - startPoint.x);
      const height = Math.abs(y - startPoint.y);
      setHighlightSize({width, height});
    } else if (activeTool === 'eraser') {
      // Check for pen annotations to erase
      if (currentPath) {
        // Find pen annotations near the current position
        const annotationsToDelete = annotations.filter(ann => {
          if (ann.type === 'pen' && ann.path) {
            // Simple distance check - could be improved
            return ann.path.split('L').some(point => {
              const [px, py] = point.trim().split(' ').map(Number);
              return Math.abs(px - x) < 10 && Math.abs(py - y) < 10;
            });
          }
          return false;
        });
        
        if (annotationsToDelete.length > 0) {
          setAnnotations(prev => 
            prev.filter(ann => !annotationsToDelete.some(a => a.id === ann.id))
          );
        }
      } else {
        // Erase other annotations
        const annotationsToDelete = annotations.filter(ann => {
          if (ann.type === 'pen') return false;
          
          const { position } = ann;
          return (
            x >= position.x && 
            x <= position.x + (position.width || 0) && 
            y >= position.y && 
            y <= position.y + (position.height || 0)
          );
        });
        
        if (annotationsToDelete.length > 0) {
          setAnnotations(prev => 
            prev.filter(ann => !annotationsToDelete.some(a => a.id === ann.id))
          );
        }
      }
    }
  };

  const handleMouseUp = () => {
    if (!isDrawing || !activeTool) return;
    
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
    } else if (activeTool === 'highlight' && startPoint && highlightSize) {
      const newAnnotation: Annotation = {
        id: `highlight-${Date.now()}`,
        type: 'highlight',
        color: activeColor,
        position: {
          x: startPoint.x,
          y: startPoint.y,
          width: highlightSize.width,
          height: highlightSize.height,
        },
      };
      
      setAnnotations(prev => [...prev, newAnnotation]);
      setHighlightSize(null);
    }
    
    setIsDrawing(false);
    setStartPoint(null);
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
    <div className="notebook-content-wrapper" ref={containerRef}>
      <div className="sticky top-0 z-20 bg-white border-b border-gray-200 px-3 py-2 shadow-sm">
        <div className="flex items-center justify-between">
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
          
          {(activeTool === 'highlight' || activeTool === 'pen' || activeTool === 'note') && (
            <div className="flex space-x-1 ml-3 items-center">
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
          
          {activeTool && (
            <div className="ml-3 px-2 py-1 bg-gray-100 rounded text-xs text-gray-700">
              {activeTool.charAt(0).toUpperCase() + activeTool.slice(1)} tool active
            </div>
          )}
          
          <div className="ml-auto flex items-center">
            {isSaving && (
              <Loader2 className="w-4 h-4 mr-2 animate-spin text-gray-500" />
            )}
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
      </div>
      
      <div 
        className="relative min-h-[calc(100vh-150px)]"
        style={getNotebookStyle()}
      >
        <div className={`${className} h-full`} ref={contentRef}>
          <TipTapRenderer
            content={content}
            onReady={handleContentReady}
          />
        </div>
        
        <div 
          ref={annotationLayerRef}
          className={`absolute inset-0 z-10 pointer-events-none ${getCursorClass()}`}
          style={{ pointerEvents: activeTool ? 'auto' : 'none' }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
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
          
          {isDrawing && activeTool === 'highlight' && startPoint && highlightSize && (
            <div
              className="absolute pointer-events-none"
              style={{
                left: `${startPoint.x}px`,
                top: `${startPoint.y}px`,
                width: `${highlightSize.width}px`,
                height: `${highlightSize.height}px`,
                backgroundColor: activeColor,
                opacity: 0.5,
              }}
            />
          )}
        </div>
      </div>
      
      <style jsx global>{`
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
      `}</style>
    </div>
  );
};

export default NotebookContent;