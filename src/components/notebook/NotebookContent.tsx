// NotebookContent.tsx - Fixed spacing and better annotation toolbar
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import TipTapRenderer from '@/components/editor/TipTapRenderer';
import { 
  Highlighter, 
  Pen, 
  Type, 
  Eraser, 
  Trash2, 
  Settings,
  Palette,
  MousePointer,
  Undo2,
  Redo2,
  Save
} from 'lucide-react';

interface NotebookTheme {
  bgColor: string;
  lineColor: string;
  marginLineColor: string;
  isGrid: boolean;
  lineSpacing: number;
  marginLeft: number;
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
  strokeWidth?: number;
};

const notebookThemes = {
  ruled: {
    bgColor: '#fefefe',
    lineColor: '#e8e9f3',
    marginLineColor: '#fca5a5',
    isGrid: false,
    lineSpacing: 1.5,
    marginLeft: 2.5
  },
  college: {
    bgColor: '#fffef7',
    lineColor: '#c7d2fe',
    marginLineColor: '#fca5a5',
    isGrid: false,
    lineSpacing: 1.8,
    marginLeft: 3
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
  const [activeTool, setActiveTool] = useState<'select' | 'highlight' | 'note' | 'pen' | 'eraser' | null>('select');
  const [activeColor, setActiveColor] = useState('#ffeb3b');
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [annotations, setAnnotations] = useState<Annotation[]>(initialAnnotations);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState('');
  const [startPoint, setStartPoint] = useState<{x: number, y: number} | null>(null);
  const [highlightSize, setHighlightSize] = useState<{width: number, height: number} | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [history, setHistory] = useState<Annotation[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  
  // Update annotations when initialAnnotations prop changes
  useEffect(() => {
    setAnnotations(initialAnnotations);
  }, [initialAnnotations]);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const annotationLayerRef = useRef<HTMLDivElement>(null);
  
  const colorPalette = [
    { name: 'Yellow', value: '#ffeb3b' },
    { name: 'Green', value: '#4caf50' },
    { name: 'Blue', value: '#2196f3' },
    { name: 'Red', value: '#f44336' },
    { name: 'Purple', value: '#9c27b0' },
    { name: 'Orange', value: '#ff9800' },
    { name: 'Pink', value: '#e91e63' },
    { name: 'Cyan', value: '#00bcd4' }
  ];

  const tools = [
    { name: 'select', icon: MousePointer, label: 'Sélectionner' },
    { name: 'highlight', icon: Highlighter, label: 'Surligner' },
    { name: 'pen', icon: Pen, label: 'Dessiner' },
    { name: 'note', icon: Type, label: 'Note' },
    { name: 'eraser', icon: Eraser, label: 'Effacer' }
  ];
  
  // Save to history when annotations change
  useEffect(() => {
    if (annotations.length > 0 || historyIndex >= 0) {
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push([...annotations]);
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
    }
  }, [annotations]);

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
    
    const timer = setTimeout(save, 1000);
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
      
      heading.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        navigate(`/lessons/${lessonId}`);
      });
    });
  };
  
  const selectTool = (tool: typeof activeTool) => {
    setActiveTool(tool);
    setShowColorPicker(false);
  };

  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setAnnotations(history[historyIndex - 1] || []);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setAnnotations(history[historyIndex + 1]);
    }
  };
  
  const handleMouseDown = (e: React.MouseEvent) => {
    if (activeTool === 'select' || !activeTool) return;
    
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
        position: { x, y, width: 200, height: 120 },
        content: '',
      };
      setAnnotations(prev => [...prev, newAnnotation]);
      // Automatically switch back to select tool after creating text annotation
      setActiveTool('select');
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing || activeTool === 'select' || !activeTool) return;
    
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
    }
  };

  const handleMouseUp = () => {
    if (!isDrawing || activeTool === 'select') return;
    
    if (activeTool === 'pen' && currentPath) {
      const newAnnotation: Annotation = {
        id: `pen-${Date.now()}`,
        type: 'pen',
        color: activeColor,
        position: { x: 0, y: 0 },
        path: currentPath,
        strokeWidth: strokeWidth,
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

  const handleTextAnnotationChange = (id: string, content: string) => {
    setAnnotations(prev => 
      prev.map(ann => 
        ann.id === id ? { ...ann, content } : ann
      )
    );
  };
  
  const getNotebookStyle = (): React.CSSProperties => {
    return {
      backgroundColor: notebookTheme.bgColor,
      backgroundImage: `
        repeating-linear-gradient(
          transparent,
          transparent ${notebookTheme.lineSpacing - 0.05}rem,
          ${notebookTheme.lineColor} ${notebookTheme.lineSpacing - 0.05}rem,
          ${notebookTheme.lineColor} ${notebookTheme.lineSpacing}rem
        ),
        linear-gradient(90deg, ${notebookTheme.marginLineColor} 1px, transparent 1px)
      `,
      backgroundSize: `100% ${notebookTheme.lineSpacing}rem, 100% 100%`,
      backgroundPosition: `0 0.5rem, ${notebookTheme.marginLeft}rem 0`,
      position: 'relative' as const,
    };
  };
  
  const getCursorClass = () => {
    if (!activeTool || activeTool === 'select') return '';
    
    switch(activeTool) {
      case 'highlight': return 'cursor-crosshair';
      case 'pen': return 'cursor-crosshair';
      case 'note': return 'cursor-text';
      case 'eraser': return 'cursor-pointer';
      default: return '';
    }
  };

  return (
    <div className="notebook-content-wrapper relative bg-gray-50" ref={containerRef}>
      {/* Professional Annotation Toolbar */}
      <div className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center justify-between px-4 py-2">
          {/* Left: Tools */}
          <div className="flex items-center space-x-1">
            {tools.map((tool) => {
              const Icon = tool.icon;
              const isActive = activeTool === tool.name;
              return (
                <button
                  key={tool.name}
                  onClick={() => selectTool(tool.name as typeof activeTool)}
                  className={`
                    relative p-2 rounded-md transition-all duration-200 group
                    ${isActive 
                      ? 'bg-blue-100 text-blue-700 shadow-sm' 
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }
                  `}
                  title={tool.label}
                >
                  <Icon className="w-4 h-4" />
                  {isActive && (
                    <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-blue-600 rounded-full" />
                  )}
                </button>
              );
            })}
            
            <div className="h-4 w-px bg-gray-300 mx-2" />
            
            {/* Color Picker */}
            <div className="relative">
              <button
                onClick={() => setShowColorPicker(!showColorPicker)}
                className="p-2 rounded-md hover:bg-gray-100 transition-colors"
                title="Couleurs"
              >
                <div className="flex items-center space-x-1">
                  <Palette className="w-4 h-4 text-gray-600" />
                  <div 
                    className="w-3 h-3 rounded-full border border-gray-300"
                    style={{ backgroundColor: activeColor }}
                  />
                </div>
              </button>
              
              {showColorPicker && (
                <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 p-3 z-10">
                  <div className="grid grid-cols-4 gap-2">
                    {colorPalette.map((color) => (
                      <button
                        key={color.value}
                        onClick={() => {
                          setActiveColor(color.value);
                          setShowColorPicker(false);
                        }}
                        className={`
                          w-8 h-8 rounded-full border-2 transition-all duration-200 hover:scale-110
                          ${activeColor === color.value ? 'border-gray-400 ring-2 ring-gray-200' : 'border-gray-200'}
                        `}
                        style={{ backgroundColor: color.value }}
                        title={color.name}
                      />
                    ))}
                  </div>
                  {activeTool === 'pen' && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <label className="block text-xs text-gray-600 mb-1">Épaisseur</label>
                      <input
                        type="range"
                        min="1"
                        max="8"
                        value={strokeWidth}
                        onChange={(e) => setStrokeWidth(Number(e.target.value))}
                        className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                      />
                      <div className="flex justify-between text-xs text-gray-400 mt-1">
                        <span>1</span>
                        <span>8</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          
          {/* Center: Actions */}
          <div className="flex items-center space-x-1">
            <button
              onClick={undo}
              disabled={historyIndex <= 0}
              className="p-2 rounded-md text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Annuler"
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button
              onClick={redo}
              disabled={historyIndex >= history.length - 1}
              className="p-2 rounded-md text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Refaire"
            >
              <Redo2 className="w-4 h-4" />
            </button>
            
            {annotations.length > 0 && (
              <>
                <div className="h-4 w-px bg-gray-300 mx-2" />
                <button
                  onClick={() => setAnnotations([])}
                  className="p-2 rounded-md text-red-600 hover:bg-red-50 transition-colors"
                  title="Effacer tout"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
          
          {/* Right: Status */}
          <div className="flex items-center space-x-2">
            {isSaving ? (
              <div className="flex items-center space-x-2 text-sm text-blue-600">
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
                <span>Sauvegarde...</span>
              </div>
            ) : annotations.length > 0 ? (
              <div className="flex items-center space-x-2 text-sm text-green-600">
                <div className="w-2 h-2 bg-green-600 rounded-full" />
                <span>Sauvegardé</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <div className="w-2 h-2 bg-gray-400 rounded-full" />
                <span>Aucune annotation</span>
              </div>
            )}
            
            <button
              onClick={() => onSaveAnnotations?.(annotations)}
              className="p-2 rounded-md text-gray-600 hover:bg-gray-100 transition-colors"
              title="Sauvegarder"
            >
              <Save className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
      
      {/* Paper with enhanced notebook styling */}
      <div 
        className="relative min-h-[calc(100vh-120px)]"
        style={getNotebookStyle()}
      >
        {/* Paper texture overlay */}
        <div 
          className="absolute inset-0 opacity-[0.02] pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='0.1'%3E%3Ccircle cx='7' cy='7' r='1'/%3E%3Ccircle cx='53' cy='53' r='1'/%3E%3Ccircle cx='23' cy='45' r='1'/%3E%3Ccircle cx='37' cy='15' r='1'/%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
        
        {/* Holes for spiral binding */}
        <div className="absolute left-3 top-0 bottom-0 flex flex-col justify-start pt-6 gap-8 pointer-events-none">
          {Array.from({ length: 20 }).map((_, i) => (
            <div 
              key={i}
              className="w-2 h-2 bg-white border border-gray-300 rounded-full shadow-inner"
              style={{ boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.1)' }}
            />
          ))}
        </div>

        <div className={`${className} h-full relative z-10`} ref={contentRef}>
          {/* Content with proper margins - FIXED SPACING */}
          <div 
            className="py-8 pr-8 min-h-full"
            style={{ 
              marginLeft: `${notebookTheme.marginLeft + 0.5}rem`, // Fixed: reduced gap
              paddingLeft: '1rem', // Fixed: reduced padding
              lineHeight: `${notebookTheme.lineSpacing}rem`
            }}
          >
            <TipTapRenderer
              content={content}
              onReady={handleContentReady}
            />
          </div>
        </div>
        
        {/* Annotation layer */}
        <div 
          ref={annotationLayerRef}
          className={`absolute inset-0 z-20 pointer-events-none ${getCursorClass()}`}
          style={{ pointerEvents: activeTool && activeTool !== 'select' ? 'auto' : 'none' }}
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
                  className="absolute opacity-60 hover:opacity-80 transition-opacity rounded-sm"
                  style={{
                    left: `${annotation.position.x}px`,
                    top: `${annotation.position.y}px`,
                    width: `${annotation.position.width}px`,
                    height: `${annotation.position.height}px`,
                    backgroundColor: annotation.color,
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
                  <div className="bg-yellow-50 border-l-4 border-yellow-400 shadow-lg rounded-r-md">
                    <textarea
                      value={annotation.content || ''}
                      onChange={(e) => handleTextAnnotationChange(annotation.id, e.target.value)}
                      className="w-full h-full p-3 bg-transparent resize-both border-none outline-none text-sm"
                      style={{ 
                        fontFamily: 'Inter, system-ui, sans-serif',
                        lineHeight: '1.4',
                      }}
                      placeholder="Tapez votre note ici..."
                    />
                  </div>
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
                    strokeWidth={annotation.strokeWidth || 2}
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
          
          {/* Live drawing preview */}
          {isDrawing && currentPath && (
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              <path
                d={currentPath}
                stroke={activeColor}
                strokeWidth={strokeWidth}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
          
          {/* Live highlight preview */}
          {isDrawing && activeTool === 'highlight' && startPoint && highlightSize && (
            <div
              className="absolute pointer-events-none opacity-50 rounded-sm"
              style={{
                left: `${startPoint.x}px`,
                top: `${startPoint.y}px`,
                width: `${highlightSize.width}px`,
                height: `${highlightSize.height}px`,
                backgroundColor: activeColor,
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default NotebookContent;